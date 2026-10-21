/** Browser-safe contracts; authoritative prices cross as decimal strings. */
export type AccountCartItem = {
  id: string; productId: string; name: string; slug: string; quantity: number;
  unitPrice: string | null; lineTotal: string | null; maxQuantity: number;
  available: boolean; imageUrl: string | null; imageAlt: string | null;
};
export type AccountCartSnapshot = {
  userId: string; revision: number; items: AccountCartItem[]; subtotal: string;
  hasInvalidItems: boolean; exceedsOrderLimit: boolean;
};
export type CartCommand = { action: "add" | "remove"; productId: string }
  | { action: "set"; productId: string; quantity: number };
export type CartCommandRequest = CartCommand & { expectedUserId: string; operationId: string };
export type CartCommandResult = { productId: string; quantity: number; adjusted: boolean };
export type CartCommandResponse = {
  userId: string; operationId: string; replayed: boolean; result: CartCommandResult; cart: AccountCartSnapshot;
};
