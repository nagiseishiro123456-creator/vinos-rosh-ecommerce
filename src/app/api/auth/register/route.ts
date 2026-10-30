import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { registerSchema } from "@/modules/auth/schemas";
import { registrationRateLimit, registrationWait } from "@/modules/auth/registration-policy";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const rateLimit = await consumeRateLimit({
      ...registrationRateLimit(process.env),
      identifier: ip,
    });

    if (!rateLimit.allowed) {
      const feedback = registrationWait(rateLimit.retryAfterMs);
      return NextResponse.json(
        {
          ok: false,
          ...feedback,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(feedback.retryAfterSeconds),
          },
        },
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Revisa los datos ingresados.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password, firstName, lastName, phone } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, message: "Ya existe una cuenta con este correo." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        cart: { create: {} },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo crear la cuenta." },
      { status: 500 },
    );
  }
}
