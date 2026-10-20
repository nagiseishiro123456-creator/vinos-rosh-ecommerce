import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { CartProvider } from "@/components/cart-provider";
import { GuestCartQuoteProvider } from "@/components/guest-cart-quote-provider";
import { authOptions } from "@/lib/auth";
import { readAccountCart } from "@/modules/cart/account-service";
import type { AccountCartSnapshot } from "@/modules/cart/account-contract";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { GuestCartProvider } from "@/components/guest-cart-provider";

import "./globals.css";
import "./checkout.css";
import "./admin-products.css";
import "./admin-customers.css";
import "./admin-dashboard.css";
import "./admin-categories.css";
import "./admin-settings.css";
import "./admin-launch.css";
import "./account-reviews.css";
import "./account-catalog-tools.css";
import "./auth-security.css";
import "./order-security.css";
import "./analytics-consent.css";
import "./mobile-performance.css";
import "./contact.css";
import "./history-faq.css";
import "./admin-backup.css";
import "./purchase-flow.css";
import "./guest-cart.css";
import "./cart-drawer.css";

const previewMode = process.env.PREVIEW_MODE === "true";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Vinos ROSH | Bebidas de uva sin alcohol",
    template: "%s | Vinos ROSH",
  },
  description:
    "Bebidas de uva sin alcohol de producción propia. Conoce la historia, productos y experiencia ROSH.",
  applicationName: "Vinos ROSH",
  robots: {
    index: !previewMode,
    follow: !previewMode,
    noarchive: previewMode,
    nosnippet: previewMode,
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "Vinos ROSH",
    title: "Vinos ROSH | De nuestro viñedo a tu mesa",
    description: "Bebidas de uva sin alcohol de producción propia.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3e0a0f",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  let initial: AccountCartSnapshot | null = null;
  if (userId) {
    try { initial = await readAccountCart(userId); }
    catch (error) { console.error("ROOT_CART_ERROR", error); }
  }
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <AnalyticsConsent />
        <GuestCartProvider><GuestCartQuoteProvider>
          <CartProvider key={userId ?? "guest"} userId={userId} initial={initial}>{children}</CartProvider>
        </GuestCartQuoteProvider></GuestCartProvider>
      </body>
    </html>
  );
}
