"use server";

import { hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { passwordSchema } from "@/modules/auth/schemas";

const emailSchema = z.string().trim().toLowerCase().email();

const resetSchema = z.object({
  token: z.string().min(40).max(200),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Las contraseñas no coinciden",
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAppUrl() {
  const candidate = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  return candidate?.replace(/\/$/, "") || "http://localhost:3000";
}

async function currentIp() {
  return getClientIp(await headers());
}

export async function requestPasswordReset(formData: FormData) {
  const ip = await currentIp();
  const rateLimit = await consumeRateLimit({
    scope: "password-reset-request",
    identifier: ip,
    limit: 5,
    windowMs: 30 * 60 * 1000,
  });

  // Respuesta deliberadamente genérica: no revelamos existencia de cuenta ni bloqueo.
  if (!rateLimit.allowed) {
    redirect("/recuperar-contrasena?sent=1");
  }

  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    redirect("/recuperar-contrasena?sent=1");
  }

  const user = await prisma.user.findUnique({
    where: { email: parsedEmail.data },
    select: { id: true, email: true, firstName: true },
  });

  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const resetUrl = `${getAppUrl()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetUrl,
    });
  }

  redirect("/recuperar-contrasena?sent=1");
}

export async function resetPassword(formData: FormData) {
  const ip = await currentIp();
  const rateLimit = await consumeRateLimit({
    scope: "password-reset-submit",
    identifier: ip,
    limit: 10,
    windowMs: 30 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    redirect("/restablecer-contrasena?error=invalid-token");
  }

  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const token = typeof formData.get("token") === "string" ? String(formData.get("token")) : "";
    redirect(`/restablecer-contrasena?token=${encodeURIComponent(token)}&error=invalid-password`);
  }

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    redirect("/restablecer-contrasena?error=invalid-token");
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: record.userId,
        id: { not: record.id },
        usedAt: null,
      },
    }),
  ]);

  redirect("/iniciar-sesion?reset=success");
}
