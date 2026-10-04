import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "Administrador";
  const lastName = process.env.ADMIN_LAST_NAME?.trim() || "ROSH";

  if (!email) {
    throw new Error("ADMIN_EMAIL es obligatorio para crear el administrador inicial.");
  }

  if (!password || password.length < 12) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  }

  const passwordHash = await hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      email,
      firstName,
      lastName,
      role: UserRole.ADMIN,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log("Administrador inicial listo:", admin);
}

main()
  .catch((error) => {
    console.error("SEED_ERROR", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
