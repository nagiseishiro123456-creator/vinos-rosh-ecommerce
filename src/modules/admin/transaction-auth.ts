import type { Prisma } from "@prisma/client";

export class AdminOperationError extends Error {
  constructor(public code: "FORBIDDEN" | "STATE_CHANGED" | "INCONSISTENT" | "INVALID_INPUT" | "DUPLICATE_OPERATION" | "NOTIFICATION_UNAVAILABLE") {
    super(code);
    this.name = "AdminOperationError";
  }
}

// A JWT role may outlive an administrator's permissions. Check the current DB role.
export async function assertTransactionAdmin(tx: Prisma.TransactionClient, adminId: string) {
  const admin = await tx.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (admin?.role !== "ADMIN") throw new AdminOperationError("FORBIDDEN");
}
