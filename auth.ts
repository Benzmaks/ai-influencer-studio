import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { developmentLoginAllowed } from '@/lib/env';
import { developmentTokenAllowed } from '@/lib/auth-policy';
const credentialsSchema = z.object({ email: z.email(), password: z.string().min(12).max(128) });
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        if (!developmentLoginAllowed()) return null;
        const result = credentialsSchema.safeParse(credentials);
        if (!result.success) return null;
        const user = await db.user.findUnique({
          where: { email: result.data.email.toLowerCase() },
        });
        if (!user?.passwordHash || !(await compare(result.data.password, user.passwordHash)))
          return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (!developmentLoginAllowed()) return null;
        token.userId = user.id;
        token.developmentSession = true;
      }
      return developmentTokenAllowed(token) ? token : null;
    },
    async session({ session, token }) {
      if (session.user)
        session.user.id =
          developmentTokenAllowed(token) && typeof token.userId === 'string' ? token.userId : '';
      return session;
    },
  },
});
