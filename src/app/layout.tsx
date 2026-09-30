import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinos ROSH",
  description: "Tienda online de Vinos ROSH",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
