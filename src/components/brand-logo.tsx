import Image from "next/image";

export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <Image
      className={`brandLogo${light ? " brandLogoLight" : ""}`}
      src="/brand/logo-rosh.webp"
      alt="Vinos ROSH"
      width={640}
      height={285}
      unoptimized
    />
  );
}
