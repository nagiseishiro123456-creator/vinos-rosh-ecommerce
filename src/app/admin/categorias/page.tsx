import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/admin/auth";
export default async function LegacyPage(){await requireAdmin("/admin/categorias");redirect("/admin/producto");}
