"use server";
import { Prisma, InventoryMovementType } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { moneyInputSchema } from "@/modules/checkout/pricing";
import { ROSH_PRODUCT_SKU } from "@/modules/products/single-product";
import { LANDING_FIELDS, landingCopySchema } from "@/modules/products/landing-content";
const schema=z.object({name:z.string().trim().min(2).max(120),stock:z.coerce.number().int().min(0).max(999999),price:moneyInputSchema({min:"0.00",max:"999999.00"})});
export async function saveSingleProduct(form:FormData){
 const session=await requireAdmin("/admin/producto");
 const input=schema.safeParse({name:form.get("name"),stock:form.get("stock"),price:form.get("price")||"0.00"});
 const content=landingCopySchema.safeParse(Object.fromEntries(LANDING_FIELDS.map(([key])=>[key,form.get(key)])));
 if(!input.success||!content.success)redirect("/admin/producto?status=invalid");
 const publishRequested=form.get("active")==="on";
 const active=publishRequested&&Number(input.data.price)>0;
 const {name,stock,price}=input.data;
 for(let attempt=0;;attempt++){
  try{
   await prisma.$transaction(async tx=>{
    const old=await tx.product.findUnique({where:{sku:ROSH_PRODUCT_SKU}});
    const data={name,price:new Prisma.Decimal(price),stock,active,description:content.data.origin,shortDescription:content.data.subtitle.slice(0,220),landingContent:content.data};
    const product=old?await tx.product.update({where:{id:old.id},data}):await tx.product.create({data:{...data,sku:ROSH_PRODUCT_SKU,slug:"rosh-750",images:{create:{url:"/media/rosh/landing-2/bottle-up.png",alt:name,position:0}}}});
    const delta=stock-(old?.stock??0);
    if(delta)await tx.inventoryMovement.create({data:{productId:product.id,actorUserId:session.user.id,type:old?InventoryMovementType.MANUAL_ADJUSTMENT:InventoryMovementType.INITIAL_STOCK,quantity:delta,stockAfter:stock,note:"Ajuste desde Producto ROSH"}});
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   break;
  }catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&["P2034","P2002"].includes(error.code)&&attempt<2)continue;throw error;}
 }
 for(const path of ["/","/admin","/admin/producto","/productos"])revalidatePath(path);
 redirect(publishRequested&&!active?"/admin/producto?status=price-required":"/admin/producto?status=updated");
}
