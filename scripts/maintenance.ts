import { prisma } from "../src/lib/prisma";
import { runMaintenance } from "../src/modules/maintenance/service";

async function main() {
  const result = await runMaintenance();

  console.log(
    [
      "Mantenimiento completado:",
      `${result.rateLimitsDeleted} límites vencidos eliminados`,
      `${result.resetTokensDeleted} tokens eliminados`,
      `${result.expiredOrdersReleased} pedidos vencidos liberados`,
      `reserva manual configurada en ${result.holdMinutes} minutos`,
    ].join(" · "),
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
