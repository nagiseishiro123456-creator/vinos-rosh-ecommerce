import { prisma } from "../src/lib/prisma";
import { unlockLocalRegistration } from "../src/modules/auth/local-registration-unlock";

async function main() {
  const result = await unlockLocalRegistration(process.env, process.argv.slice(2));
  console.log(`Registro local: se eliminaron ${result.count} límites para las IP seleccionadas. No se modificaron cuentas ni contraseñas.`);
}
main().catch((error: unknown) => {
  if (error instanceof Error && error.message === "LOCAL_REGISTRATION_ONLY") {
    console.error("Operación rechazada: usa una BD local vinos_rosh/vinos_rosh_test/vinos_rosh_ci, URLs de aplicación locales y NODE_ENV distinto de production.");
  } else if (error instanceof Error && error.message === "INVALID_LOCAL_REGISTRATION_IP") {
    console.error("La IP opcional no es válida. Ejemplo: npm run auth:unlock-local -- 192.168.1.20");
  } else {
    console.error("No se pudo desbloquear el registro local. Comprueba que PostgreSQL esté iniciado y la configuración local sea correcta.");
  }
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
