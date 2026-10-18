import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { isCurrentAdmin } from "@/modules/admin/auth";
import { buildBusinessBackup } from "@/modules/admin/backup/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!(await isCurrentAdmin(session))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const backup = await buildBusinessBackup();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vinos-rosh-backup-${date}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
