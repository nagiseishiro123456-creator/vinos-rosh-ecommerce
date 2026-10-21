import type { GuestLine } from "./guest-selection";

export type GuestPreviewItem = GuestLine & {
  name: string;
  slug: string;
  unitPrice: string;
  lineTotal: string;
  imageUrl: string | null;
  imageAlt: string | null;
};
export type GuestPreview = {
  items: GuestPreviewItem[];
  subtotal: string;
  exceedsOrderLimit: boolean;
  changes: { productId: string; kind: "unavailable" | "quantity-reduced"; quantity: number }[];
};
