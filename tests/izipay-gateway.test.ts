import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac, randomBytes } from "node:crypto";
import { gatewayCredentialsSchema, sealGatewayCredentials, openGatewayCredentials } from "../src/modules/payments/izipay/gateway-crypto";
import { verifiedProviderAnswer } from "../src/modules/payments/izipay/notification-contract";

const credentials = { merchantId: "12345678", mode: "SANDBOX" as const, apiPassword: "testpassword_fake", publicKey: "12345678:testpublickey_fake", hmacKey: "fake-browser-hmac" };
export const signedAnswer = (mode = "TEST", reference = "qa-reference", total = 9820) => ({ shopId: "12345678", orderStatus: "PAID", orderDetails: {
  orderId: reference, mode, orderCurrency: "PEN", orderTotalAmount: total, orderEffectiveAmount: total }, transactions: [{
  uuid: "123456781234123412341234567890ab", shopId: "12345678", status: "PAID", amount: total, currency: "PEN", operationType: "DEBIT" }] });

test("Izipay credentials: randomized authenticated encryption rejects tampering, wrong keys and invalid inputs", () => {
  const key = randomBytes(32).toString("base64"), a = sealGatewayCredentials(credentials,key), b = sealGatewayCredentials(credentials,key);
  assert.notEqual(a.secretBox,b.secretBox); assert.equal(a.fingerprint,b.fingerprint);
  assert.deepEqual(openGatewayCredentials(a.secretBox,key),credentials);
  assert.doesNotMatch(a.secretBox,/testpassword|testpublickey|hmac/);
  assert.throws(()=>openGatewayCredentials(a.secretBox,randomBytes(32).toString("base64")),/GATEWAY_CONFIGURATION_UNAVAILABLE/);
  assert.throws(()=>openGatewayCredentials(a.secretBox.slice(0,-5)+"AAAAA",key));
  assert.throws(()=>sealGatewayCredentials(credentials,"too-short"));
  assert.equal(gatewayCredentialsSchema.safeParse({...credentials,mode:"PRODUCTION"}).success,false);
});
test("Izipay signatures: browser and IPN keys are distinct and the original answer must match", () => {
  const raw=JSON.stringify(signedAnswer()), ipn=createHmac("sha256",credentials.apiPassword).update(raw).digest("hex");
  assert.equal(verifiedProviderAnswer(raw,ipn,credentials,"ipn").orderStatus,"PAID");
  assert.throws(()=>verifiedProviderAnswer(raw,ipn,credentials,"browser"));
  assert.throws(()=>verifiedProviderAnswer(raw.replace('9820','1'),ipn,credentials,"ipn"));
  for(const data of [{...signedAnswer(),shopId:"87654321"},{...signedAnswer(),orderDetails:{...signedAnswer().orderDetails,mode:"PRODUCTION"}}]) {
    const answer=JSON.stringify(data),hash=createHmac("sha256",credentials.apiPassword).update(answer).digest("hex");
    assert.throws(()=>verifiedProviderAnswer(answer,hash,credentials,"ipn"));
  }
});
