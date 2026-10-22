import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { CartCommandError, executeCartCommand, readAccountCart } from "../../src/modules/cart/account-service";
import { mergeGuestCart } from "../../src/modules/cart/guest-merge-service";

type Context = { userId: string; productId: string; importId: string; operationId: string; importHash: string; commandHash: string };
const contextPath = process.env.S206_CONTEXT_PATH;
assert.ok(contextPath);
assert.equal(process.env.CI, "true");
assert.match(new URL(process.env.DATABASE_URL ?? "").pathname, /^\/rosh_s206_(source|target)_\d+$/);

async function main() {
  if (process.argv[2] === "seed") {
    const user = await prisma.user.create({ data: { email: "restore-" + randomUUID() + "@example.com",
      passwordHash: "synthetic-recovery-fixture-only", firstName: "QA", lastName: "Recovery", cart: { create: {} } }, include: { cart: true } });
    const product = await prisma.product.create({ data: { name: "QA recovery", slug: "restore-" + randomUUID(),
      description: "Synthetic PostgreSQL recovery contract", price: "29.90", stock: 10 } });
    await prisma.cartItem.create({ data: { cartId: user.cart!.id, productId: product.id, quantity: 1 } });
    const context: Context = { userId: user.id, productId: product.id, importId: "g2_" + randomUUID().replaceAll("-", ""),
      operationId: randomUUID(), importHash: "", commandHash: "" };
    await mergeGuestCart(user.id, { expectedUserId: user.id, importId: context.importId, items: [{ productId: product.id, quantity: 2 }] });
    await executeCartCommand(user.id, { expectedUserId: user.id, operationId: context.operationId, productId: product.id, action: "add" });
    context.importHash = (await prisma.cartImport.findFirstOrThrow({ where: { userId: user.id } })).requestHash;
    context.commandHash = (await prisma.cartMutation.findFirstOrThrow({ where: { userId: user.id } })).requestHash;
    const cart = await readAccountCart(user.id);
    assert.equal(cart.items[0].quantity, 4); assert.equal(cart.revision, 2);
    writeFileSync(contextPath!, JSON.stringify(context));
    return;
  }
  assert.equal(process.argv[2], "verify");
  const context = JSON.parse(readFileSync(contextPath!, "utf8")) as Context;
  const { userId, productId, importId, operationId } = context;
  const migrations = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  assert.equal(Number(migrations[0].count), 13);
  assert.equal((await prisma.cartImport.findFirstOrThrow({ where: { userId } })).requestHash, context.importHash);
  assert.equal((await prisma.cartMutation.findFirstOrThrow({ where: { userId } })).requestHash, context.commandHash);
  const replayImport = await mergeGuestCart(userId, { expectedUserId: userId, importId, items: [{ productId, quantity: 2 }] });
  assert.equal(replayImport.replayed, true);
  const command = { expectedUserId: userId, operationId, productId, action: "add" as const };
  const replayCommand = await executeCartCommand(userId, command);
  assert.equal(replayCommand.replayed, true);
  assert.equal(replayCommand.cart.revision, 2); assert.equal(replayCommand.cart.items[0].quantity, 4);
  assert.equal(await prisma.cartImport.count({ where: { userId } }), 1);
  assert.equal(await prisma.cartMutation.count({ where: { userId } }), 1);
  await assert.rejects(executeCartCommand(userId, { ...command, action: "set", quantity: 2 }),
    (error: unknown) => error instanceof CartCommandError && error.code === "CONFLICT");
  await executeCartCommand(userId, { ...command, operationId: randomUUID(), action: "set", quantity: 3 });
  const current = await executeCartCommand(userId, command);
  assert.equal(current.replayed, true); assert.equal(current.result.quantity, 4);
  assert.equal(current.cart.items[0].quantity, 3); assert.equal(current.cart.revision, 3);
  assert.equal(await prisma.cartMutation.count({ where: { userId } }), 2);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 10);
  assert.equal(await prisma.order.count({ where: { userId } }), 0);
  console.log("S206_RESTORE_CONTRACT " + JSON.stringify({ passed: true, migrations: 13, imports: 1, commands: 2,
    restoredQuantity: 4, restoredRevision: 2, finalQuantity: 3, finalRevision: 3, stock: 10, orders: 0 }));
}
main().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
