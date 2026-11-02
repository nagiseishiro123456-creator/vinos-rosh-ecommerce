import {redirect} from "next/navigation";
import {requireAdmin} from "@/modules/admin/auth";
export default async function LegacyProduct(){await requireAdmin("/admin/producto");redirect("/admin/producto");}
