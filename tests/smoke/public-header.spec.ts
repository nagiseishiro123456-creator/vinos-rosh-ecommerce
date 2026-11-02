import { test, expect, type Page } from "@playwright/test";
import { PUBLIC_DESKTOP_NAVIGATION, PUBLIC_NAVIGATION } from "../../src/lib/public-navigation";
import { loginCustomer } from "./checkout-fixture";
import { capture } from "./capture";

async function signature(page: Page) {
  return page.locator(".publicHeader").evaluate(header => {
    const style = getComputedStyle(header);
    const cart = header.querySelector<HTMLElement>(".landingCart")!, login = header.querySelector<HTMLElement>(".landingLogin")!, history = header.querySelector<HTMLElement>(".landingHistory")!;
    const font = (node: HTMLElement) => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.color]; };
    return { height: header.getBoundingClientRect().height, font: [style.fontFamily, style.fontSize, style.fontWeight], padding: [style.paddingLeft, style.paddingRight], cart: [cart.getBoundingClientRect().width, cart.getBoundingClientRect().height], history: font(history), login: font(login) };
  });
}

test("one public navbar keeps landing typography, dimensions, cart and routes across customer screens and client navigation", async ({ page }, info) => {
  test.setTimeout(150000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  await page.goto("/"); await expect(page.locator(".roshLanding")).toHaveAttribute("data-intro", "done");
  const reference = await signature(page), width = page.viewportSize()!.width;
  expect(reference.height).toBe(width <= 1100 ? 64 : 84);
  expect(reference.cart).toEqual(width <= 1100 ? [44, 44] : [52, 52]);
  for (const path of ["/nuestra-historia", "/envios", "/contacto", "/preguntas-frecuentes", "/carrito", "/iniciar-sesion", "/registrarse", "/recuperar-contrasena"]) {
    await page.goto(path); await expect(page.locator(".publicHeader")).toHaveCount(1);
    expect(await signature(page), path).toEqual(reference);
    await expect(page.locator(".mobileBottomNav")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    for (const item of PUBLIC_DESKTOP_NAVIGATION) await expect(page.locator(".publicHeader .landingDesktopNav").getByRole("link", { name: item.label, exact: true, includeHidden: true })).toHaveAttribute("href", item.href);
  }
  await page.goto("/"); await expect(page.locator(".roshLanding")).toHaveAttribute("data-intro", "done");
  await page.evaluate(() => { (window as Window & { headerDocument?: string }).headerDocument = "shared-navbar"; });
  if (width <= 1100) {
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    const nav = page.getByRole("navigation", { name: "Navegación móvil", exact: true });
    for (const item of PUBLIC_NAVIGATION) await expect(nav.getByRole("link", { name: item.label, exact: true })).toHaveAttribute("href", item.href);
    await nav.getByRole("link", { name: "Nuestra historia", exact: true }).click();
    await expect(nav).toHaveCount(0);
  } else await page.getByRole("navigation", { name: "Navegación principal", exact: true }).getByRole("link", { name: "Nuestra historia", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/nuestra-historia");
  expect(await page.evaluate(() => (window as Window & { headerDocument?: string }).headerDocument)).toBe("shared-navbar");
  expect(await signature(page)).toEqual(reference);
  await page.locator(".publicHeader .landingCart").click();
  const cart = page.getByRole("dialog", { name: "Tu carrito", exact: true }); await expect(cart).toBeVisible();
  await cart.getByRole("button", { name: "Cerrar carrito", exact: true }).click(); await expect(cart).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await page.getByRole("link", { name: "Ir al inicio de Vinos ROSH", exact: true }).click(); await expect(page).toHaveURL(url => url.pathname === "/");
  expect(await signature(page)).toEqual(reference);
  await loginCustomer(page);
  for (const path of ["/mi-cuenta", "/mi-cuenta/perfil", "/mi-cuenta/direcciones"]) {
    await page.goto(path); expect(await signature(page), path).toEqual(reference);
    await expect(page.locator(".publicHeader a[href='/mi-cuenta']").first()).toHaveAttribute("href", "/mi-cuenta");
  }
  await capture(page, info, "navbar-unificado-cuenta");
});
