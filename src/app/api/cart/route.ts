import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAccountCartHandlers } from "@/modules/cart/account-handler";
export const dynamic = "force-dynamic";
const handlers = createAccountCartHandlers(async () => (await getServerSession(authOptions))?.user?.id ?? null);
export const GET = handlers.GET;
export const POST = handlers.POST;
