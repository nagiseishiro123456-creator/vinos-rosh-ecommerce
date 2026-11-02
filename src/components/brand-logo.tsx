import Image from "next/image";

export function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <Image
      className={`brandLogo${light ? " brandLogoLight" : ""}`}
      src="/media/rosh/landing/logo.png"
      alt="Vinos ROSH"
      width={640}
      height={253}
      unoptimized
    />
  );
}
