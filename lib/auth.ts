import { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const hasGoogleProvider = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const adapter: Adapter | undefined = hasGoogleProvider ? (PrismaAdapter(prisma) as Adapter) : undefined;

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
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

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          await prisma.loginLog
            .create({
              data: { userId: user.id },
            })
            .catch(() => {
              // Do not block login if login-log insert fails.
            });

          return {
            id: user.id,
            uid: user.uid,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            roleId: user.roleId,
            vendorId: user.vendorId,
            permissions: (user.vendorUserDetail?.permissions as string[]) ?? [],
          } as any;
        } catch (error) {
          console.error('Credentials authorize error:', error);
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
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).uid = token.uid;
        (session.user as any).roleId = token.roleId;
        (session.user as any).vendorId = token.vendorId;
        (session.user as any).permissions = token.permissions;
      }
      return session;
    },
  },
};
