import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createGuestMergeHandler } from "@/modules/cart/guest-merge-handler";

export const POST = createGuestMergeHandler(async () => (await getServerSession(authOptions))?.user?.id ?? null);
