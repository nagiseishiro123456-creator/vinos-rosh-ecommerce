import { getServerSession } from "next-auth";
import localFont from "next/font/local";
import { RoshLanding } from "@/components/landing/rosh-landing";
import { authOptions } from "@/lib/auth";
import { publicPageMetadata } from "@/lib/seo";
import { getCommerceSettings } from "@/modules/settings/queries";
import "./landing-original.css";
import "./landing-pour.css";
import { getRoshProduct } from "@/modules/products/single-product";

const lora = localFont({
  src: "./fonts/Lora-Variable.ttf", weight: "500 600", display: "swap",
  preload: true, variable: "--font-rosh-landing", fallback: ["Georgia", "serif"],
});
const jost = localFont({src:"./fonts/Jost-Variable.ttf",weight:"400 500",display:"swap",variable:"--font-rosh-ui"});
export const dynamic = "force-dynamic";
export const viewport = { themeColor: "#fdfcfe" };
export const metadata = publicPageMetadata({
  path: "/", title: "ROSH | Vino de uvas sin alcohol", absoluteTitle: true,
  description: "ROSH, vino de uvas sin alcohol. Un único producto para compartir momentos especiales.",
  image: "/media/rosh/landing/bottle.png", imageAlt: "Botella ROSH, vino de uvas sin alcohol",
});

export default async function HomePage() {
  const [session, commerce, product] = await Promise.all([getServerSession(authOptions), getCommerceSettings(), getRoshProduct()]);
  return <div className={`${lora.variable} ${jost.variable}`}><RoshLanding
    product={product?.active ? {id:product.id,price:product.price.toFixed(2),stock:product.stock,origin:product.description} : null}
    userId={session?.user?.id ?? null} isAuthenticated={Boolean(session?.user)}
    isAdmin={session?.user?.role === "ADMIN"} phone={commerce.whatsappPhone}
  /></div>;
}
