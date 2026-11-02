import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertTransactionAdmin } from "@/modules/admin/transaction-auth";
import { gatewayCredentialsSchema, GatewayConfigurationError, openGatewayCredentials, sealGatewayCredentials, type GatewayCredentials } from "./gateway-crypto";
import type { SandboxEnvironment } from "./micuentaweb-core";

type Saved = { versionId: string; enabled: boolean; revision: number; merchantId: string; mode: string; secretBox: string };
async function saved() {
  const rows = await prisma.$queryRaw<Saved[]>`SELECT c."versionId",c."enabled",c."revision",v."merchantId",v."mode",v."secretBox"
    FROM "IzipayGatewayConfiguration" c JOIN "IzipayGatewayVersion" v ON v."id"=c."versionId" WHERE c."id"='izipay'`;
  return rows[0] ?? null;
}
export async function gatewaySettingsSummary() {
  const row = await saved();
  return row ? { source: "database" as const, merchantId: row.merchantId, mode: row.mode, enabled: row.enabled, revision: row.revision }
    : { source: "environment" as const, merchantId: process.env.IZIPAY_MCW_MERCHANT_ID ?? "", mode: process.env.IZIPAY_MODE === "PRODUCTION" ? "PRODUCTION" : "SANDBOX", enabled: false, revision: 0 };
}
export async function gatewayPaymentEvents() {
  return prisma.$queryRaw<Array<{ id: string; orderId: string; orderNumber: string; transactionUuid: string; outcome: string; mode: string; amountMinor: bigint; currency: string }>>`
    SELECT e."id",a."orderId",o."number" AS "orderNumber",e."transactionUuid",e."outcome",e."mode",e."amountMinor",e."currency"
    FROM "IzipayPaymentEvent" e JOIN "PaymentAttempt" a ON a."id"=e."attemptId" JOIN "Order" o ON o."id"=a."orderId"
    ORDER BY e."createdAt" DESC LIMIT 20`;
}
export async function saveGatewaySettings(adminId: string, value: unknown, revision: number, password: string, enabled: boolean, productionConfirmation = "") {
  const parsed = gatewayCredentialsSchema.safeParse(value);
  if (!parsed.success || !Number.isSafeInteger(revision) || revision < 0 || password.length > 1024) throw new GatewayConfigurationError();
  if (enabled && parsed.data.mode === "PRODUCTION" && (productionConfirmation !== "ACTIVAR PRODUCCION" || parsed.data.merchantId === "69876357")) throw new GatewayConfigurationError();
  const current = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true, passwordHash: true } });
  if (current?.role !== "ADMIN" || !await compare(password, current.passwordHash)) throw new GatewayConfigurationError();
  const encrypted = sealGatewayCredentials(parsed.data, process.env.GATEWAY_ENCRYPTION_KEY);
  return prisma.$transaction(async tx => {
    await assertTransactionAdmin(tx, adminId);
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(71930221)`;
    const [previous] = await tx.$queryRaw<Array<{ revision: number }>>`SELECT "revision" FROM "IzipayGatewayConfiguration" WHERE "id"='izipay' FOR UPDATE`;
    if ((previous?.revision ?? 0) !== revision) throw new GatewayConfigurationError();
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO "IzipayGatewayVersion" ("id","mode","merchantId","secretBox","fingerprint")
      VALUES (${id}::uuid,${parsed.data.mode},${parsed.data.merchantId},${encrypted.secretBox},${encrypted.fingerprint}) ON CONFLICT ("fingerprint") DO NOTHING`;
    const [version] = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "IzipayGatewayVersion" WHERE "fingerprint"=${encrypted.fingerprint}`;
    // Live activation is separate from choosing a mode and requires an explicit confirmation + current password.
    await tx.$executeRaw`INSERT INTO "IzipayGatewayConfiguration" ("id","versionId","enabled","revision","updatedBy")
      VALUES ('izipay',${version.id}::uuid,${enabled},${revision+1},${adminId})
      ON CONFLICT ("id") DO UPDATE SET "versionId"=EXCLUDED."versionId","enabled"=EXCLUDED."enabled",
      "revision"=EXCLUDED."revision","updatedBy"=EXCLUDED."updatedBy","updatedAt"=CURRENT_TIMESTAMP`;
    await tx.$executeRaw`INSERT INTO "IzipayConfigurationAudit" ("id","actorId","revision","mode")
      VALUES (${randomUUID()}::uuid,${adminId},${revision+1},${parsed.data.mode})`;
  });
}
export async function versionCredentials(versionId: string) {
  const [row] = await prisma.$queryRaw<Array<{ secretBox: string }>>`SELECT "secretBox" FROM "IzipayGatewayVersion" WHERE "id"=${versionId}::uuid`;
  if (!row) throw new GatewayConfigurationError();
  return openGatewayCredentials(row.secretBox, process.env.GATEWAY_ENCRYPTION_KEY);
}
async function rememberEnvironmentVersion(credentials: GatewayCredentials) {
  const encrypted = sealGatewayCredentials(credentials, process.env.GATEWAY_ENCRYPTION_KEY);
  await prisma.$executeRaw`INSERT INTO "IzipayGatewayVersion" ("id","mode","merchantId","secretBox","fingerprint")
    VALUES (${randomUUID()}::uuid,${credentials.mode},${credentials.merchantId},${encrypted.secretBox},${encrypted.fingerprint}) ON CONFLICT ("fingerprint") DO NOTHING`;
  const [row] = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "IzipayGatewayVersion" WHERE "fingerprint"=${encrypted.fingerprint}`;
  return row.id;
}
/** Whole configuration fallback, never per-key mixing or fallback on a DB/decryption failure. */
export async function resolveGatewayEnvironment(environment: SandboxEnvironment = process.env, freeze = false): Promise<SandboxEnvironment> {
  const row = await saved();
  let credentials: GatewayCredentials;
  if (row) credentials = openGatewayCredentials(row.secretBox, environment.GATEWAY_ENCRYPTION_KEY);
  else {
    if (!["TEST", "SANDBOX", "PRODUCTION"].includes(environment.IZIPAY_MODE ?? "")) return { ...environment, PAYMENTS_IZIPAY_ENABLED: "false" };
    const parsed = gatewayCredentialsSchema.safeParse({ merchantId: environment.IZIPAY_MCW_MERCHANT_ID,
      mode: environment.IZIPAY_MODE === "PRODUCTION" ? "PRODUCTION" : "SANDBOX",
      apiPassword: environment.IZIPAY_MCW_REST_TEST_PASSWORD, publicKey: environment.IZIPAY_MCW_PUBLIC_TEST_KEY, hmacKey: environment.IZIPAY_MCW_BROWSER_HMAC_TEST_KEY });
    if (!parsed.success) return { ...environment, PAYMENTS_IZIPAY_ENABLED: "false" };
    credentials = parsed.data;
  }
  const enabled = row ? row.enabled : environment.PAYMENTS_IZIPAY_ENABLED === "true";
  const versionId = row?.versionId ?? (freeze && enabled ? await rememberEnvironmentVersion(credentials) : undefined);
  return { ...environment, PAYMENTS_IZIPAY_ENABLED: enabled ? "true" : "false", IZIPAY_INTEGRATION: "MICUENTAWEB_V4",
    IZIPAY_PRODUCTION_ENABLED: row ? enabled && credentials.mode === "PRODUCTION" ? "true" : "false" : environment.IZIPAY_PRODUCTION_ENABLED,
    ...(row ? { IZIPAY_MCW_INITIATE_ENABLED: enabled ? "true" : "false", IZIPAY_MCW_RESERVE_ENABLED: enabled ? "true" : "false", IZIPAY_MCW_FORM_ENABLED: enabled ? "true" : "false" } : {}),
    IZIPAY_MODE: credentials.mode === "SANDBOX" ? "TEST" : "PRODUCTION", IZIPAY_MCW_MERCHANT_ID: credentials.merchantId,
    IZIPAY_MCW_REST_TEST_PASSWORD: credentials.apiPassword, IZIPAY_MCW_PUBLIC_TEST_KEY: credentials.publicKey,
    IZIPAY_MCW_BROWSER_HMAC_TEST_KEY: credentials.hmacKey, IZIPAY_CONFIG_VERSION_ID: versionId };
}
