import {Prisma} from "@prisma/client";
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
  await page.getByLabel("Título principal",{exact:true}).fill("Borrador ROSH editable");await page.getByLabel("Precio (S/)",{exact:true}).fill("");await page.getByLabel("Stock disponible",{exact:true}).fill("7");await page.getByLabel("Publicar producto y habilitar compra",{exact:true}).check();await page.getByRole("button",{name:"Guardar producto, stock y textos",exact:true}).click();await expect(page).toHaveURL(/status=price-required/);const draft=await prisma.product.findUniqueOrThrow({where:{id:product.id}});expect(draft.active).toBe(false);expect(draft.price.toFixed(2)).toBe("0.00");expect(draft.stock).toBe(7);
  const preview=await context.newPage();await preview.emulateMedia({reducedMotion:"reduce"});await preview.goto("/");await expect(preview.locator("#pbuy h2")).toHaveText("Borrador ROSH editable");await expect(preview.getByRole("button",{name:"Comprar ahora",exact:true})).toBeDisabled();await preview.close();

  await page.getByLabel("Título principal",{exact:true}).fill("ROSH para compartir");await page.getByLabel("Subtítulo",{exact:true}).fill("Nuestra botella de uva");await page.getByLabel("Publicar producto y habilitar compra",{exact:true}).check();
  await page.getByLabel("Precio (S/)",{exact:true}).fill("41.90");await page.getByLabel("Texto de origen",{exact:true}).fill("Origen QA editable desde administración.");await page.getByLabel("Stock disponible",{exact:true}).fill("7");await page.getByRole("button",{name:"Guardar producto, stock y textos",exact:true}).click();await expect.poll(async()=>(await prisma.product.findUniqueOrThrow({where:{id:product.id}})).price.toFixed(2)).toBe("41.90");await expect(page).toHaveURL(/status=updated/);
  const saved=await prisma.product.findUniqueOrThrow({where:{id:product.id}});expect(saved.stock).toBe(7);expect(saved.price.toFixed(2)).toBe("41.90");expect(await prisma.inventoryMovement.count({where:{productId:product.id,type:"MANUAL_ADJUSTMENT",quantity:-3}})).toBeGreaterThan(0);
  await page.goto("/admin");await expect(page.getByRole("link",{name:/Categorías|Inventario|^Confirmaciones/})).toHaveCount(0);await page.goto("/admin/pagos");await page.getByRole("link",{name:"Confirmaciones de pago",exact:true}).click();await expect(page).toHaveURL(/\/admin\/notificaciones/);
  const guest=await context.newPage();await guest.emulateMedia({reducedMotion:"reduce"});await guest.addInitScript(()=>localStorage.setItem("rosh-analytics-consent-v1","rejected"));await guest.goto("/");await guest.locator("#pour").scrollIntoViewIfNeeded();await expect(guest.locator("#pbuy h2")).toHaveText("ROSH para compartir");await expect(guest.locator("#pbuy .price")).toContainText("41.90");await expect(guest.locator("#historia2")).toContainText("Origen QA editable");await guest.getByRole("spinbutton",{name:"Cantidad de botellas",exact:true}).fill("3");await guest.getByRole("button",{name:"Comprar ahora",exact:true}).click();await expect(guest.getByRole("dialog",{name:"Tu carrito",exact:true})).toBeVisible();await expect(guest.locator("#cart-drawer input[name=quantity]")).toHaveValue("3");
  const customer=await browser.newContext();try{const cp=await customer.newPage();await cp.emulateMedia({reducedMotion:"reduce"});await loginCustomer(cp);await cp.goto("/");await cp.locator("#pour").scrollIntoViewIfNeeded();await cp.getByRole("button",{name:"Agregar una unidad",exact:true}).click();await cp.getByRole("button",{name:"Comprar ahora",exact:true}).click();await expect(cp.locator("#cart-drawer input[name=quantity]")).toHaveValue("5");}finally{await customer.close();}
  await page.goto("/admin/producto");await page.getByLabel("Stock disponible",{exact:true}).fill("0");await page.getByRole("button",{name:"Guardar producto, stock y textos",exact:true}).click();await expect.poll(async()=>(await prisma.product.findUniqueOrThrow({where:{id:product.id}})).stock).toBe(0);await guest.reload();await expect(guest.getByRole("button",{name:"Agotado",exact:true})).toBeDisabled();
 }finally{await context.close();await prisma.product.update({where:{id:product.id},data:{sku:original.sku,price:original.price,stock:original.stock,description:original.description,shortDescription:original.shortDescription,active:original.active,categoryId:original.categoryId,landingContent:original.landingContent??Prisma.DbNull}});}
});

test("single product starts as one editable form and creates exactly one sellable record",async({page,browser})=>{
 test.setTimeout(120000);expect(await prisma.product.count({where:{sku:"ROSH-750"}})).toBe(0);
 const context=await browser.newContext();
 try{
  await page.goto("/iniciar-sesion?callbackUrl=/admin/producto");await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);await page.getByLabel("Contraseña",{exact:true}).fill(process.env.ADMIN_PASSWORD!);await page.getByRole("button",{name:"Iniciar sesión",exact:true}).click();await expect(page).toHaveURL(/\/admin\/producto$/);
  await expect(page.getByRole("link",{name:/Crear producto|Nuevo producto|Productos/})).toHaveCount(0);
  await page.getByLabel("Nombre del producto",{exact:true}).fill("ROSH QA ficha única");await page.getByLabel("Precio (S/)",{exact:true}).fill("25.50");await page.getByLabel("Stock disponible",{exact:true}).fill("3");await page.getByLabel("Título principal",{exact:true}).fill("Texto editable desde la única ficha");await page.getByLabel("Publicar producto y habilitar compra",{exact:true}).check();await page.getByRole("button",{name:"Guardar producto, stock y textos",exact:true}).click();await expect(page).toHaveURL(/status=updated/);
  expect(await prisma.product.count({where:{sku:"ROSH-750"}})).toBe(1);
  await page.goto("/admin/productos/nuevo");await expect(page).toHaveURL(/\/admin\/producto$/);
  const guest=await context.newPage();await guest.emulateMedia({reducedMotion:"reduce"});await guest.goto("/");await expect(guest.locator("#pbuy h2")).toHaveText("Texto editable desde la única ficha");await guest.getByRole("spinbutton",{name:"Cantidad de botellas",exact:true}).fill("2");await guest.getByRole("button",{name:"Comprar ahora",exact:true}).click();await expect(guest.locator("#cart-drawer input[name=quantity]")).toHaveValue("2");
 }finally{
  await context.close();const created=await prisma.product.findUnique({where:{sku:"ROSH-750"}});
  if(created?.name==="ROSH QA ficha única"){await prisma.inventoryMovement.deleteMany({where:{productId:created.id}});await prisma.productImage.deleteMany({where:{productId:created.id}});await prisma.product.delete({where:{id:created.id}});}
 }
});
