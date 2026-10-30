import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga")
  .regex(/[A-Z]/, "Incluye al menos una mayúscula")
  .regex(/[a-z]/, "Incluye al menos una minúscula")
  .regex(/\d/, "Incluye al menos un número");

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Ingresa tus nombres con al menos 2 caracteres.").max(80, "Usa como máximo 80 caracteres para tus nombres."),
  lastName: z.string().trim().min(2, "Ingresa tus apellidos con al menos 2 caracteres.").max(80, "Usa como máximo 80 caracteres para tus apellidos."),
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido, por ejemplo nombre@dominio.com."),
  phone: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) return;
      const message = !/^\d+$/.test(value)
        ? "Usa solo números, sin espacios ni código de país. Ejemplo: 987654321."
        : value.length !== 9
          ? `El celular debe tener 9 dígitos; ingresaste ${value.length}. Ejemplo: 987654321.`
          : !value.startsWith("9") ? "El celular peruano debe empezar con 9. Ejemplo: 987654321." : null;
      if (message) ctx.addIssue({ code: "custom", message });
    })
    .optional()
    .or(z.literal("")),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
