import assert from "node:assert/strict";
import test, { after } from "node:test";
import { prisma } from "../src/lib/prisma";
import { checkoutFixture } from "./helpers/checkout";
import { archiveDeliveryAddress, DeliveryAddressError, makeDeliveryAddressPrimary, saveDeliveryAddress } from "../src/modules/addresses/service";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
after(() => prisma.$disconnect());
const values = { label:"Casa",recipient:"QA Entrega",phone:"987654321",addressLine1:"Dirección QA de prueba",reference:"",isDefault:true };
test("two simultaneous first addresses leave exactly one active primary", async (t) => {
  const f=await checkoutFixture(t); await prisma.address.delete({ where:{id:f.address.id} });
  await Promise.all([saveDeliveryAddress(f.user.id,{...values,shippingZoneId:f.zone.id}),saveDeliveryAddress(f.user.id,{...values,label:"Oficina",shippingZoneId:f.zone.id})]);
  assert.equal(await prisma.address.count({where:{userId:f.user.id,active:true}}),2);
  assert.equal(await prisma.address.count({where:{userId:f.user.id,active:true,isDefault:true}}),1);
});
test("archiving and selecting a primary concurrently preserves a valid surviving address", async (t) => {
  const f=await checkoutFixture(t);
  const other=await saveDeliveryAddress(f.user.id,{...values,shippingZoneId:f.zone.id});
  await Promise.allSettled([archiveDeliveryAddress(f.user.id,other.id),makeDeliveryAddressPrimary(f.user.id,other.id)]);
  const active=await prisma.address.findMany({where:{userId:f.user.id,active:true}});
  assert.equal(active.length,1); assert.equal(active[0].id,f.address.id); assert.equal(active[0].isDefault,true);
  assert.equal((await prisma.address.findUniqueOrThrow({where:{id:other.id}})).isDefault,false);
});
test("another account cannot edit, archive or choose someone else's address", async (t) => {
  const f=await checkoutFixture(t); const other=await checkoutFixture(t);
  for(const action of [()=>saveDeliveryAddress(other.user.id,{...values,shippingZoneId:f.zone.id},f.address.id),()=>archiveDeliveryAddress(other.user.id,f.address.id),()=>makeDeliveryAddressPrimary(other.user.id,f.address.id)]) {
    await assert.rejects(action,(error:unknown)=>error instanceof DeliveryAddressError&&error.code==="NOT_FOUND");
  }
  assert.equal((await prisma.address.findUniqueOrThrow({where:{id:f.address.id}})).addressLine1,f.address.addressLine1);
});
test("a paused rate cannot save a delivery address and does not displace the primary", async(t)=>{
  const f=await checkoutFixture(t); await makeDeliveryAddressPrimary(f.user.id,f.address.id);
  await prisma.shippingZone.update({where:{id:f.zone.id},data:{active:false}});
  await assert.rejects(saveDeliveryAddress(f.user.id,{...values,shippingZoneId:f.zone.id}),(error:unknown)=>error instanceof DeliveryAddressError&&error.code==="UNSUPPORTED_ZONE");
  assert.equal(await prisma.address.count({where:{userId:f.user.id,active:true}}),1);
  assert.equal((await prisma.address.findUniqueOrThrow({where:{id:f.address.id}})).isDefault,true);
});
test("editing or archiving a saved address preserves the order's delivery snapshot", async(t)=>{
  const f=await checkoutFixture(t); const order=await reserveManualOrder(f.user.id,f.input);
  await saveDeliveryAddress(f.user.id,{...values,shippingZoneId:f.zone.id},f.address.id);
  await archiveDeliveryAddress(f.user.id,f.address.id);
  const persisted=await prisma.order.findUniqueOrThrow({where:{id:order.id}});
  assert.equal(persisted.shippingAddress,f.address.addressLine1); assert.equal(persisted.shippingPhone,f.address.phone);
  assert.equal((await prisma.product.findUniqueOrThrow({where:{id:f.product.id}})).stock,7);
});
test("address limits are enforced inside the account transaction and legacy duplicate primaries are repaired",async(t)=>{
  const f=await checkoutFixture(t);
  for(let i=0;i<9;i++) await prisma.address.create({data:{userId:f.user.id,recipient:"QA",phone:"987654321",department:f.zone.department,province:f.zone.province,district:f.zone.district,addressLine1:"Dirección QA "+i,isDefault:true}});
  await assert.rejects(saveDeliveryAddress(f.user.id,{...values,shippingZoneId:f.zone.id}),(error:unknown)=>error instanceof DeliveryAddressError&&error.code==="LIMIT");
  await makeDeliveryAddressPrimary(f.user.id,f.address.id);
  assert.equal(await prisma.address.count({where:{userId:f.user.id,active:true,isDefault:true}}),1);
});
