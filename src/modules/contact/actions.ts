"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
});

export async function submitContactMessage(formData: FormData) {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
    website: formData.get("website") || undefined,
  });

  // Honeypot: respond as if accepted without storing spam.
  if (String(formData.get("website") ?? "").trim()) {
    redirect("/contacto?sent=1");
  }

  if (!parsed.success) {
    redirect("/contacto?error=validation");
  }

  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  const rate = await consumeRateLimit({
    scope: "contact-message",
    identifier: ip,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    redirect("/contacto?error=rate");
  }

  await prisma.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
    },
  });

  redirect("/contacto?sent=1");
}
