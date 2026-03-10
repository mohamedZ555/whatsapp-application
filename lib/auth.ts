import { NextAuthOptions, type Session } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { USER_ROLES } from "@/lib/constants";
import { getPlanDisabledPermsForVendor, toPermissionArray } from "@/lib/permissions";

const ACCESS_SYNC_INTERVAL_MS = 5 * 60_000; // 5 minutes

type AccessClaims = {
  uid: string;
  roleId: number;
  vendorId: string | null;
  vendorUid: string | null;
  permissions: string[];
  permissionsRestricted: boolean;
  planDisabledPerms: string[];
};

type AuthorizedUser = {
  id: string;
  email: string;
  name: string;
} & AccessClaims;

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

const hasGoogleProvider = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const adapter: Adapter | undefined = hasGoogleProvider
  ? (PrismaAdapter(prisma) as Adapter)
  : undefined;

async function syncTokenAccessClaims(token: JWT): Promise<JWT> {
  const userId = readString(token.id);
  if (!userId) return token;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      firstName: true,
      lastName: true,
      email: true,
      roleId: true,
      vendorId: true,
      status: true,
      vendor: { select: { uid: true } },
      vendorUserDetail: { select: { permissions: true } },
    },
  });

  if (!dbUser || dbUser.status !== 1) return token;

  const permissions = toPermissionArray(dbUser.vendorUserDetail?.permissions);
  const permissionsRestricted =
    dbUser.roleId === USER_ROLES.VENDOR &&
    dbUser.vendorUserDetail !== null &&
    dbUser.vendorUserDetail.permissions !== null;
  const planDisabledPerms = dbUser.vendorId
    ? await getPlanDisabledPermsForVendor(dbUser.vendorId)
    : [];

  token.id = dbUser.id;
  token.uid = dbUser.uid;
  token.name = `${dbUser.firstName} ${dbUser.lastName}`;
  token.email = dbUser.email;
  token.roleId = dbUser.roleId;
  token.vendorId = dbUser.vendorId;
  token.vendorUid = dbUser.vendor?.uid ?? null;
  token.permissions = permissions;
  token.permissionsRestricted = permissionsRestricted;
  token.planDisabledPerms = planDisabledPerms;
  token.accessSyncedAt = Date.now();

  return token;
}

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const loginId = credentials.email.trim().toLowerCase();
          const user = await prisma.user.findFirst({
            where: {
              OR: [{ email: loginId }, { username: loginId }],
            },
            include: {
              vendor: { select: { uid: true } },
              vendorUserDetail: true,
            },
          });

          if (!user || !user.password) return null;
          if (user.status !== 1) return null;

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password,
          );
          if (!isValid) return null;

          await prisma.loginLog
            .create({ data: { userId: user.id } })
            .catch(() => {});

          const permissions = toPermissionArray(user.vendorUserDetail?.permissions);
          const permissionsRestricted =
            user.roleId === USER_ROLES.VENDOR &&
            user.vendorUserDetail !== null &&
            user.vendorUserDetail.permissions !== null;
          const planDisabledPerms = user.vendorId
            ? await getPlanDisabledPermsForVendor(user.vendorId)
            : [];

          const authorizedUser: AuthorizedUser = {
            id: user.id,
            uid: user.uid,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            roleId: user.roleId,
            vendorId: user.vendorId,
            vendorUid: user.vendor?.uid ?? null,
            permissions,
            permissionsRestricted,
            planDisabledPerms,
          };

          return authorizedUser;
        } catch (error) {
          console.error("Credentials authorize error:", error);
          return null;
        }
      },
    }),
    ...(hasGoogleProvider
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userLike = user as unknown as Record<string, unknown>;

        token.id = user.id;
        token.uid = readString(userLike.uid);
        token.roleId = readNumber(userLike.roleId);
        token.vendorId = readNullableString(userLike.vendorId);
        token.vendorUid = readNullableString(userLike.vendorUid);
        token.permissions = readStringArray(userLike.permissions) ?? [];
        token.permissionsRestricted = readBoolean(userLike.permissionsRestricted) ?? false;
        token.planDisabledPerms = readStringArray(userLike.planDisabledPerms) ?? [];
        token.accessSyncedAt = Date.now();
      }

      const lastSyncedAt = readNumber(token.accessSyncedAt) ?? 0;
      const shouldSync =
        typeof token.id === "string" &&
        (Boolean(user) || Date.now() - lastSyncedAt >= ACCESS_SYNC_INTERVAL_MS);

      if (shouldSync) {
        try {
          token = await syncTokenAccessClaims(token);
        } catch (error) {
          console.error("JWT access sync error:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as Session["user"] & {
          uid?: string;
          roleId?: number;
          vendorId?: string | null;
          vendorUid?: string | null;
          permissions?: string[];
          permissionsRestricted?: boolean;
          planDisabledPerms?: string[];
        };

        if (typeof token.id === "string") {
          session.user.id = token.id;
        }
        sessionUser.uid = readString(token.uid) ?? "";
        sessionUser.roleId = readNumber(token.roleId) ?? USER_ROLES.VENDOR_USER;
        sessionUser.vendorId = readNullableString(token.vendorId) ?? null;
        sessionUser.vendorUid = readNullableString(token.vendorUid) ?? null;
        sessionUser.permissions = readStringArray(token.permissions) ?? [];
        sessionUser.permissionsRestricted = readBoolean(token.permissionsRestricted) ?? false;
        sessionUser.planDisabledPerms = readStringArray(token.planDisabledPerms) ?? [];
      }
      return session;
    },
  },
};
