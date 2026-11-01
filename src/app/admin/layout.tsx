import { getServerSession } from "next-auth";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";
import { isCurrentAdmin } from "@/modules/admin/auth";
import { privatePageMetadata } from "@/lib/seo";
import "../admin-products.css";
import "../admin-customers.css";
import "../admin-dashboard.css";
import "../admin-categories.css";
import "../admin-settings.css";
import "../admin-launch.css";
import "../admin-backup.css";

export const metadata = privatePageMetadata();

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  const admin = await isCurrentAdmin(session);

  return (
    <>
      {admin ? (
        <nav className="shell adminSessionBar" aria-label="Sesión administrativa">
          <Link className="textLink" href="/">Ver tienda</Link>
          <SignOutButton />
        </nav>
      ) : null}
      {children}
    </>
  );
}
