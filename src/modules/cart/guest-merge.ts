export type CartMergeResult = {
  lines: { productId: string; quantity: number }[];
  changes: { productId: string; kind: "unavailable" | "quantity-reduced"; quantity: number }[];
};
export type CartMergeResponse = { importId: string; userId: string; replayed: boolean; result: CartMergeResult };
