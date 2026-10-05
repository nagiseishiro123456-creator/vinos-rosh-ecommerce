import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga")
  .regex(/[A-Z]/, "Incluye al menos una mayúscula")
  .regex(/[a-z]/, "Incluye al menos una minúscula")
  .regex(/\d/, "Incluye al menos un número");

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Ingresa tus nombres").max(80),
  lastName: z.string().trim().min(2, "Ingresa tus apellidos").max(80),
  email: z.string().trim().toLowerCase().email("Correo electrónico inválido"),
  phone: z
    .string()
    .trim()
    .regex(/^9\d{8}$/, "Ingresa un celular peruano válido de 9 dígitos")
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
