import Link from "next/link";
import { requireAdmin } from "@/modules/admin/auth";
import { readHistory } from "@/modules/history/store";
import { HistoryEditor } from "./history-editor";
export const dynamic = "force-dynamic";
export default async function HistoryAdminPage() {
  await requireAdmin("/admin/historia");
  const page = await readHistory();
  return <main className="shell adminPage"><div className="adminTopbar"><div><h1>Nuestra historia</h1><p>Edita la cabecera, los tres capítulos, las fotografías y el cierre de la página.</p></div><Link href="/admin">Panel</Link></div>
    <p><Link className="textLink" href="/nuestra-historia" target="_blank" rel="noopener">Ver página pública ↗</Link></p>
    <HistoryEditor initial={page.content} revision={page.revision} />
  </main>;
}
