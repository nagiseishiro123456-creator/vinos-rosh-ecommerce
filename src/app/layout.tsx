import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { CartProvider } from "@/components/cart-provider";
import { GuestCartQuoteProvider } from "@/components/guest-cart-quote-provider";
import { authOptions } from "@/lib/auth";
import { readAccountCart } from "@/modules/cart/account-service";
import type { AccountCartSnapshot } from "@/modules/cart/account-contract";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SITE_TITLE, readSeoConfig, publicPageMetadata } from "@/lib/seo";
import { GuestCartProvider } from "@/components/guest-cart-provider";

import "./globals.css";
import "./checkout.css";
import "./commerce-shared.css";
import "./account-reviews.css";
import "./account-catalog-tools.css";
import "./auth-security.css";
import "./order-security.css";
import "./analytics-consent.css";
import "./mobile-performance.css";
import "./contact.css";
import "./history-faq.css";
import "./purchase-flow.css";
import "./guest-cart.css";
import "./cart-drawer.css";
import "./automatic-payment.css";

const seo = readSeoConfig();

export const metadata: Metadata = {
  metadataBase: new URL(seo.origin ?? "http://localhost:3000"),
  title: {
    default: DEFAULT_SITE_TITLE,
    template: "%s | Vinos ROSH",
  },
  description: DEFAULT_SITE_DESCRIPTION,
  applicationName: "Vinos ROSH",
  robots: publicPageMetadata({ path: "/", title: DEFAULT_SITE_TITLE, description: DEFAULT_SITE_DESCRIPTION, absoluteTitle: true }, seo).robots,
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
