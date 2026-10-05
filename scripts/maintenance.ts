import { prisma } from "../src/lib/prisma";

async function main() {
  const now = new Date();

  const [rateLimits, resetTokens] = await prisma.$transaction([
    prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: now } },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { usedAt: { not: null } },
        ],
      },
    }),
  ]);

  console.log(
    `Mantenimiento completado: ${rateLimits.count} límites vencidos y ${resetTokens.count} tokens eliminados.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
