import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginSchema } from "@/modules/auth/schemas";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/iniciar-sesion",
  },
  providers: [
    CredentialsProvider({
      name: "Correo y contraseña",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const ip = getClientIp(request.headers);
        const identifier = `${ip}:${parsed.data.email}`;
        const rateLimit = await consumeRateLimit({
          scope: "auth-login",
          identifier,
          limit: 20,
          windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });

        if (!user?.passwordHash) return null;

        const passwordIsValid = await compare(parsed.data.password, user.passwordHash);
        if (!passwordIsValid) return null;

        // Un acceso válido no debe consumir el cupo de intentos fallidos.
        await clearRateLimit("auth-login", identifier);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as "CUSTOMER" | "ADMIN";
      }
      return session;
    },
  },
};
