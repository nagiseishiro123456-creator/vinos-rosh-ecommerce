import localFont from "next/font/local";

export const cambria = localFont({
  src: [
    { path: "./brand/cambria-regular.woff2", weight: "400", style: "normal" },
    { path: "./brand/cambria-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-rosh-landing",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  fallback: ["Cambria", "Georgia", "serif"],
});

export const jane = localFont({
  src: "./brand/jane-regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-rosh-ui",
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
});
