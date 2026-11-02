import {expect,test} from "@playwright/test";
import {prisma,resetCheckoutFixture,loginCustomer} from "./checkout-fixture";
test.use({actionTimeout:15000});
test.afterAll(()=>prisma.$disconnect());
test("single ROSH product: editable origin, price, traced stock and guest/account purchase",async({page,browser})=>{
 test.setTimeout(120000);const {product}=await resetCheckoutFixture();const original=await prisma.product.findUniqueOrThrow({where:{id:product.id}});
 await prisma.product.update({where:{id:product.id},data:{sku:"ROSH-750"}});
 const context=await browser.newContext();
 try{
  await page.goto("/iniciar-sesion?callbackUrl=/admin/producto");await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);await page.getByLabel("Contraseña",{exact:true}).fill(process.env.ADMIN_PASSWORD!);await page.getByRole("button",{name:"Iniciar sesión",exact:true}).click();await expect(page).toHaveURL(/\/admin\/producto$/);
  await page.getByLabel("Precio (S/) *",{exact:true}).fill("41.90");await page.getByLabel("Descripción y origen *",{exact:true}).fill("Origen QA editable desde administración.");await page.getByLabel("Stock *",{exact:true}).fill("7");await page.getByRole("button",{name:"Guardar producto e inventario",exact:true}).click();await expect(page).toHaveURL(/status=updated/);
  const saved=await prisma.product.findUniqueOrThrow({where:{id:product.id}});expect(saved.stock).toBe(7);expect(saved.price.toFixed(2)).toBe("41.90");expect(await prisma.inventoryMovement.count({where:{productId:product.id,type:"MANUAL_ADJUSTMENT",quantity:-3}})).toBeGreaterThan(0);
  await page.goto("/admin");await expect(page.getByRole("link",{name:/Categorías|Inventario|^Confirmaciones/})).toHaveCount(0);await page.goto("/admin/pagos");await page.getByRole("link",{name:"Confirmaciones de pago",exact:true}).click();await expect(page).toHaveURL(/\/admin\/notificaciones/);
  const guest=await context.newPage();await guest.emulateMedia({reducedMotion:"reduce"});await guest.addInitScript(()=>localStorage.setItem("rosh-analytics-consent-v1","rejected"));await guest.goto("/");await guest.locator("#pour").scrollIntoViewIfNeeded();await expect(guest.locator("#pbuy .price")).toContainText("41.90");await expect(guest.locator("#historia2")).toContainText("Origen QA editable");await guest.getByRole("button",{name:"Agregar una unidad",exact:true}).click({clickCount:2});await guest.getByRole("button",{name:"Comprar ahora",exact:true}).click();await expect(guest.getByRole("dialog",{name:"Tu carrito",exact:true})).toBeVisible();await expect(guest.locator("#cart-drawer input[name=quantity]")).toHaveValue("3");
  const customer=await browser.newContext();try{const cp=await customer.newPage();await cp.emulateMedia({reducedMotion:"reduce"});await loginCustomer(cp);await cp.goto("/");await cp.locator("#pour").scrollIntoViewIfNeeded();await cp.getByRole("button",{name:"Agregar una unidad",exact:true}).click();await cp.getByRole("button",{name:"Comprar ahora",exact:true}).click();await expect(cp.locator("#cart-drawer input[name=quantity]")).toHaveValue("5");}finally{await customer.close();}
 }finally{await context.close();await prisma.product.update({where:{id:product.id},data:{sku:original.sku,price:original.price,stock:original.stock,description:original.description,categoryId:original.categoryId}});}
});
