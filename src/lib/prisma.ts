import { PrismaClient } from "@prisma/client";

function createClient() {
  const client = new PrismaClient({ log: [{ emit: "event", level: "error" }] });
  // Database errors can include bound values and row payloads. Keep those out of application logs.
  client.$on("error", () => console.error("DATABASE_OPERATION_FAILED"));
  return client;
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma =
  globalForPrisma.prisma ??
  createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
