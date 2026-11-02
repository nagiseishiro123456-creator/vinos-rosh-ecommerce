import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { automaticCheckoutFixture, automaticSandbox } from "./helpers/automatic-checkout";
import { beginMicuentawebSandboxAttempt } from "../src/modules/payments/izipay/attempt-service";
import { acceptIzipayNotification } from "../src/modules/payments/izipay/notification-service";
import { openGatewayCredentials, sealGatewayCredentials } from "../src/modules/payments/izipay/gateway-crypto";
import { saveGatewaySettings, resolveGatewayEnvironment } from "../src/modules/payments/izipay/gateway-settings";
import { readMicuentawebPaymentStatus } from "../src/modules/payments/izipay/status-service";
import { cancelUnpaidReservation } from "../src/modules/orders/reservation-service";

process.env.GATEWAY_ENCRYPTION_KEY=randomBytes(32).toString("base64");
test.after(()=>prisma.$disconnect());
async function paymentFixture(t: TestContext, live=false) {
  const f=await automaticCheckoutFixture(t);
  const attempt=await beginMicuentawebSandboxAttempt(f.user.id,f.order.id,automaticSandbox);
  const credentials={merchantId:"12345678",mode:live?"PRODUCTION" as const:"SANDBOX" as const,apiPassword:live?"prodpassword_fake":"testpassword_fake",publicKey:`12345678:${live?"publickey_":"testpublickey_"}fake`,hmacKey:"fake-browser-hmac"};
  const sealed=sealGatewayCredentials(credentials,process.env.GATEWAY_ENCRYPTION_KEY),versionId=randomUUID();
  await prisma.$executeRaw`INSERT INTO "IzipayGatewayVersion" ("id","mode","merchantId","secretBox","fingerprint") VALUES
    (${versionId}::uuid,${credentials.mode},${credentials.merchantId},${sealed.secretBox},${createHmac('sha256',versionId).update(sealed.fingerprint).digest('hex')})`;
  await prisma.$executeRaw`UPDATE "PaymentAttempt" SET "gatewayVersionId"=${versionId}::uuid,"mode"=${live?"PRODUCTION":"TEST"} WHERE "id"=${attempt.attempt.id}`;
  if(live) await prisma.order.update({where:{id:f.order.id},data:{paymentMode:'PRODUCTION'}});
  t.after(async()=>{await prisma.$executeRaw`DELETE FROM "IzipayGatewayVersion" WHERE "id"=${versionId}::uuid`;});
  const body={shopId:credentials.merchantId,orderStatus:"PAID",orderDetails:{orderId:attempt.attempt.providerReference,mode:live?"PRODUCTION":"TEST",orderCurrency:"PEN",orderTotalAmount:9820,orderEffectiveAmount:9820},transactions:[{uuid:randomUUID().replaceAll('-',''),shopId:credentials.merchantId,status:"PAID",amount:9820,currency:"PEN",operationType:"DEBIT"}]};
  const submit=(value=body,source:"ipn"|"browser"="ipn",owner=f.user.id)=>{const raw=JSON.stringify(value),signature=createHmac('sha256',source==='ipn'?credentials.apiPassword:credentials.hmacKey).update(raw).digest('hex');return acceptIzipayNotification(raw,signature,source,owner,f.order.id);};
  return {...f,credentials,body,submit,attempt:attempt.attempt,versionId};
}
test("Izipay TEST approval never marks an order paid, dispatches or enqueues commercial email; duplicates are harmless",async t=>{
  const f=await paymentFixture(t);
  const results=await Promise.all([f.submit(),f.submit(),f.submit(f.body,"browser")]);
  assert.equal(results.filter(x=>x==='TEST_APPROVED').length,1);
  const order=await prisma.order.findUniqueOrThrow({where:{id:f.order.id}});
  assert.equal(order.status,'PENDING_PAYMENT');assert.equal(order.paidAt,null);
  assert.equal((await readMicuentawebPaymentStatus(f.user.id,order.id)).testResult,'APPROVED');
  assert.equal(await prisma.payment.count({where:{orderId:order.id}}),0);
  assert.equal(await prisma.paymentConfirmationOutbox.count({where:{orderId:order.id}}),0);
  assert.equal((await prisma.product.findUniqueOrThrow({where:{id:f.product.id}})).stock,7);
});
test("Izipay LIVE signed IPN applies payment and outbox once without discounting stock again",async t=>{
  const f=await paymentFixture(t,true);
  assert.equal(await f.submit(f.body,'browser'),'WAITING');
  const results=await Promise.all([f.submit(),f.submit(),f.submit()]);
  assert.equal(results.filter(x=>x==='APPROVED').length,1);
  assert.equal((await prisma.order.findUniqueOrThrow({where:{id:f.order.id}})).status,'PAID');
  assert.equal(await prisma.payment.count({where:{orderId:f.order.id}}),1);
  assert.equal(await prisma.paymentConfirmationOutbox.count({where:{orderId:f.order.id}}),1);
  assert.equal((await prisma.product.findUniqueOrThrow({where:{id:f.product.id}})).stock,7);
});
test("Izipay: late payment preserves released stock and records reconciliation without fulfillment",async t=>{
  const f=await paymentFixture(t,true); await cancelUnpaidReservation(f.user.id,f.order.number);
  assert.equal(await f.submit(),'REVIEW');
  assert.equal((await prisma.order.findUniqueOrThrow({where:{id:f.order.id}})).status,'CANCELLED');
  assert.equal((await prisma.product.findUniqueOrThrow({where:{id:f.product.id}})).stock,10);
  assert.equal(await prisma.paymentConfirmationOutbox.count({where:{orderId:f.order.id}}),0);
  const payments=await prisma.payment.findMany({where:{orderId:f.order.id},include:{reconciliation:true}});
  assert.equal(payments[0].status,'UNDER_REVIEW');assert.ok(payments[0].reconciliation);
});
test("Izipay: wrong amount or currency cannot approve an order even with a valid signature",async t=>{
  const f=await paymentFixture(t,true);
  assert.equal(await f.submit({...f.body,orderDetails:{...f.body.orderDetails,orderTotalAmount:100}}),'REVIEW');
  assert.equal(await f.submit({...f.body,transactions:[{...f.body.transactions[0],currency:'USD'}]}),'REVIEW');
  assert.equal((await prisma.order.findUniqueOrThrow({where:{id:f.order.id}})).status,'PENDING_PAYMENT');
  assert.equal(await prisma.payment.count({where:{orderId:f.order.id}}),0);
});
test("Izipay: invalid signatures and another account's browser return make no changes",async t=>{
  const f=await paymentFixture(t); await assert.rejects(f.submit(f.body,'browser','cm00000000000000000000000'));
  await assert.rejects(acceptIzipayNotification(JSON.stringify(f.body),'0'.repeat(64),'ipn'));
  assert.equal(await prisma.izipayPaymentEvent.count({where:{attemptId:f.attempt.id}}),0);
});
test("Izipay: outbox failure rolls back payment, order and event atomically",async t=>{
  const f=await paymentFixture(t,true); await prisma.user.update({where:{id:f.user.id},data:{email:`invalid-${randomUUID()}`}});
  await assert.rejects(f.submit());
  assert.equal((await prisma.order.findUniqueOrThrow({where:{id:f.order.id}})).status,'PENDING_PAYMENT');
  assert.equal(await prisma.payment.count({where:{orderId:f.order.id}}),0);
  assert.equal(await prisma.izipayPaymentEvent.count({where:{attemptId:f.attempt.id}}),0);
});
test("Izipay settings: reauthentication, encrypted storage, revision checks and fail-closed precedence",async t=>{
  const f=await automaticCheckoutFixture(t),password='QA-admin-only-123';
  const credentials={merchantId:'12345678',mode:'SANDBOX' as const,apiPassword:'testpassword_fake',publicKey:'12345678:testpublickey_fake',hmacKey:'fake-browser-hmac'};
  await assert.rejects(saveGatewaySettings(f.user.id,credentials,0,password,true));
  await prisma.user.update({where:{id:f.user.id},data:{role:'ADMIN',passwordHash:await hash(password,4)}});
  await assert.rejects(saveGatewaySettings(f.user.id,credentials,0,'wrong-password',true));
  await saveGatewaySettings(f.user.id,credentials,0,password,true);
  t.after(async()=>{await prisma.$executeRaw`DELETE FROM "IzipayGatewayConfiguration" WHERE "updatedBy"=${f.user.id}`;await prisma.$executeRaw`DELETE FROM "IzipayConfigurationAudit" WHERE "actorId"=${f.user.id}`;});
  const env=await resolveGatewayEnvironment({...automaticSandbox,GATEWAY_ENCRYPTION_KEY:process.env.GATEWAY_ENCRYPTION_KEY});
  assert.equal(env.IZIPAY_MCW_MERCHANT_ID,'12345678');assert.equal(env.IZIPAY_MCW_REST_TEST_PASSWORD,'testpassword_fake');
  await assert.rejects(saveGatewaySettings(f.user.id,credentials,0,password,true));
  await assert.rejects(resolveGatewayEnvironment({...automaticSandbox,GATEWAY_ENCRYPTION_KEY:randomBytes(32).toString('base64')}));
  const [stored]=await prisma.$queryRaw<Array<{secretBox:string}>>`SELECT v."secretBox" FROM "IzipayGatewayVersion" v JOIN "IzipayGatewayConfiguration" c ON c."versionId"=v."id" WHERE c."id"='izipay'`;
  assert.doesNotMatch(stored.secretBox,/testpassword|testpublickey/);
  assert.equal(openGatewayCredentials(stored.secretBox,process.env.GATEWAY_ENCRYPTION_KEY).merchantId,'12345678');
  const production={...credentials,mode:'PRODUCTION' as const,apiPassword:'prodpassword_fake',publicKey:'12345678:publickey_fake'};
  await assert.rejects(saveGatewaySettings(f.user.id,production,1,password,true));
  await saveGatewaySettings(f.user.id,production,1,password,false);
  const dormant=await resolveGatewayEnvironment({...automaticSandbox,GATEWAY_ENCRYPTION_KEY:process.env.GATEWAY_ENCRYPTION_KEY});
  assert.equal(dormant.PAYMENTS_IZIPAY_ENABLED,'false');assert.equal(dormant.IZIPAY_PRODUCTION_ENABLED,'false');
  await saveGatewaySettings(f.user.id,production,2,password,true,'ACTIVAR PRODUCCION');
  const activated=await resolveGatewayEnvironment({...automaticSandbox,GATEWAY_ENCRYPTION_KEY:process.env.GATEWAY_ENCRYPTION_KEY});
  assert.equal(activated.IZIPAY_PRODUCTION_ENABLED,'true');
  await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id,f.order.id,activated)); // A TEST reservation cannot become live.
  const competing=await Promise.allSettled([saveGatewaySettings(f.user.id,credentials,3,password,false),saveGatewaySettings(f.user.id,credentials,3,password,false)]);
  assert.equal(competing.filter(result=>result.status==='fulfilled').length,1);
});
