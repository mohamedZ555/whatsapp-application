import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { PLANS, USER_ROLES } from "@/lib/constants";
import { computePlanDisabledPerms } from "@/lib/access";

const hasGoogleProvider = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const adapter: Adapter | undefined = hasGoogleProvider
  ? (PrismaAdapter(prisma) as Adapter)
  : undefined;

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
            include: { role: true, vendorUserDetail: true },
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

          let vendorUid: string | null = null;
          if (user.vendorId) {
            const vendor = await prisma.vendor.findUnique({
              where: { id: user.vendorId },
              select: { uid: true },
            });
            vendorUid = vendor?.uid ?? null;
          }

          // Determine if super admin has explicitly restricted this vendor admin's permissions.
          // permissionsRestricted=true means the permissions array should be enforced (not bypassed).
          const permissionsRestricted =
            user.roleId === USER_ROLES.VENDOR &&
            user.vendorUserDetail !== null &&
            user.vendorUserDetail.permissions !== null;

          const permissions = (user.vendorUserDetail?.permissions as string[]) ?? [];

          // Compute which permissions are blocked by the vendor's current subscription plan.
          // Stored in token so proxy.ts can enforce without a DB call.
          let planDisabledPerms: string[] = [];
          if (user.vendorId) {
            const subscription = await prisma.subscription.findFirst({
              where: { vendorId: user.vendorId, status: "active" },
              orderBy: { createdAt: "desc" },
            });
            const planId = subscription?.planId ?? "free";
            const plan = PLANS[planId as keyof typeof PLANS] ?? PLANS.free;
            planDisabledPerms = computePlanDisabledPerms(plan.features);
          }

          return {
            id: user.id,
            uid: user.uid,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            roleId: user.roleId,
            vendorId: user.vendorId,
            vendorUid,
            permissions,
            permissionsRestricted,
            planDisabledPerms,
          } as any;
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
        token.id = user.id;
        token.uid = (user as any).uid;
        token.roleId = (user as any).roleId;
        token.vendorId = (user as any).vendorId;
        token.vendorUid = (user as any).vendorUid;
        token.permissions = (user as any).permissions;
        token.permissionsRestricted = (user as any).permissionsRestricted;
        token.planDisabledPerms = (user as any).planDisabledPerms;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).uid = token.uid;
        (session.user as any).roleId = token.roleId;
        (session.user as any).vendorId = token.vendorId;
        (session.user as any).vendorUid = token.vendorUid;
        (session.user as any).permissions = token.permissions;
        (session.user as any).permissionsRestricted = token.permissionsRestricted;
        (session.user as any).planDisabledPerms = token.planDisabledPerms;
      }
      return session;
    },
  },
};
