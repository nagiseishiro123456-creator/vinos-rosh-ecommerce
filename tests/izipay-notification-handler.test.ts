import assert from "node:assert/strict";
import { test } from "node:test";
import { createIzipayNotificationHandler } from "../src/modules/payments/izipay/notification-handler";

const userId='cm123456789012345678901234', orderId='cm223456789012345678901234';
const allowed=async()=>({allowed:true,retryAfterMs:0,remaining:19});
function request(body: unknown, origin='https://rosh.example.test') { return new Request('https://rosh.example.test/api/payment/return',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}); }
const input={orderId,expectedUserId:userId,rawClientAnswer:'{"signed":"answer"}',hash:'a'.repeat(64)};
test('Izipay browser return requires origin, session, owner identity and a strict signed body',async()=>{
  let calls=0;
  const handler=createIzipayNotificationHandler('browser',{authenticate:async()=>userId,consume:allowed,
    environment:{NEXT_PUBLIC_APP_URL:'https://rosh.example.test'},accept:async()=>{calls++;return 'TEST_APPROVED';}});
  assert.equal((await handler(request(input,'https://attacker.example'))).status,403);
  assert.equal((await handler(request({...input,expectedUserId:orderId}))).status,409);
  assert.equal((await handler(request({...input,amount:1}))).status,400);
  assert.equal((await handler(request({...input,hash:'bad'}))).status,400);
  assert.equal(calls,0);
  const response=await handler(request(input));assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(calls,1);
  const anonymous=createIzipayNotificationHandler('browser',{authenticate:async()=>null,consume:allowed,environment:{NEXT_PUBLIC_APP_URL:'https://rosh.example.test'}});
  assert.equal((await anonymous(request(input))).status,401);
});
test('Izipay IPN accepts no cookie requirement but rejects duplicated fields or browser-key context',async()=>{
  let calls=0;
  const handler=createIzipayNotificationHandler('ipn',{authenticate:async()=>{throw Error('IPN must not depend on a session');},consume:allowed,accept:async()=>{calls++;return 'APPROVED';}});
  const body=new URLSearchParams({'kr-answer':'{"answer":true}','kr-hash':'a'.repeat(64),'kr-hash-algorithm':'sha256_hmac','kr-hash-key':'password','kr-answer-type':'V4/Payment'});
  const post=(params:URLSearchParams)=>handler(new Request('https://rosh.example.test/api/payment/webhook',{method:'POST',body:params}));
  assert.equal((await post(body)).status,200);body.append('kr-answer','another');assert.equal((await post(body)).status,400);
  body.delete('kr-answer');body.set('kr-answer','one');body.set('kr-hash-key','sha256_hmac');assert.equal((await post(body)).status,400);
  body.delete('kr-hash-key');body.delete('kr-hash-algorithm');body.delete('kr-answer-type');
  assert.equal((await post(body)).status,200); // The official minimal answer/hash contract does not change the server-selected key.
  assert.equal(calls,2);
});
test('Izipay notifications enforce byte limits and never expose sensitive exception messages',async()=>{
  let calls=0;
  const handler=createIzipayNotificationHandler('browser',{authenticate:async()=>userId,consume:allowed,environment:{NEXT_PUBLIC_APP_URL:'https://rosh.example.test'},accept:async()=>{calls++;throw Error('PRIVATE-KEY-PAYLOAD');}});
  assert.equal((await handler(request({...input,rawClientAnswer:'x'.repeat(196609)}))).status,400);assert.equal(calls,0);
  const response=await handler(request(input));assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/PRIVATE|KEY|PAYLOAD/);
});
