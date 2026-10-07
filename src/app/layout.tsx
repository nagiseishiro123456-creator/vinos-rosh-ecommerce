import type { Metadata, Viewport } from "next";

import { AnalyticsConsent } from "@/components/analytics-consent";

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
import "./order-timeline.css";
import "./analytics-consent.css";
import "./mobile-performance.css";

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
    index: true,
    follow: true,
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
