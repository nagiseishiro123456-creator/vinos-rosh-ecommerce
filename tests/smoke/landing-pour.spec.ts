import { expect,test } from "@playwright/test";
test.beforeEach(async({page})=>{await page.addInitScript(()=>{sessionStorage.setItem("rosh-landing-original-intro-v1","seen");localStorage.setItem("rosh-analytics-consent-v1","rejected");});});
test("second landing fills to 750 ml, hides unfocusable purchase and reverses with scroll",async({page},info)=>{
 await page.emulateMedia({reducedMotion:"no-preference"});await page.goto("/");await expect(page.locator(".roshPour")).toHaveAttribute("data-ready","true");
 async function at(p:number){await page.evaluate(p=>{const r=document.querySelector("#pour")!.getBoundingClientRect();window.scrollTo({top:scrollY+r.top+p*(r.height-innerHeight),behavior:"instant"});},p);await expect.poll(async()=>Number(await page.locator(".roshPour").getAttribute("data-progress"))).toBeCloseTo(p,2);}
 await at(.3);expect(Number(await page.locator("#pml").textContent())).toBeGreaterThan(400);await expect(page.locator("#pbuy")).toHaveAttribute("inert","");
 await page.screenshot({path:info.outputPath("pour-filling.png")});
 await at(.49);await expect(page.locator("#pml")).toHaveText("750");expect(await page.locator("#pb").evaluate(e=>e.style.getPropertyValue("--top"))).toBe("0%");
 await at(.85);await expect(page.locator("#pbuy")).not.toHaveAttribute("inert","");await expect(page.locator(".roshLanding")).toHaveAttribute("data-night","true");await page.screenshot({path:info.outputPath("pour-purchase.png")});
 await at(.15);expect(Number(await page.locator("#pml").textContent())).toBeLessThan(100);
});
test("second landing reduced motion is static and fits all reference widths",async({page},info)=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 for(const width of [1440,1024,820,390,360,320]){await page.setViewportSize({width,height:844});await page.evaluate(()=>{const r=document.querySelector("#pour")!.getBoundingClientRect();window.scrollTo({top:scrollY+r.top+1,behavior:"instant"});});await expect(page.locator(".roshLanding")).toHaveAttribute("data-night","true");await expect(page.locator("#pml")).toHaveText("750");await expect(page.locator("#pbuy")).not.toHaveAttribute("inert","");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator("#pour").evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(844);await page.screenshot({path:info.outputPath(`pour-final-${width}.png`),style:"nextjs-portal{display:none!important}"});}
});
