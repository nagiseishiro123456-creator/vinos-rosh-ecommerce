import { getServerSession } from "next-auth";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
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
import "../admin-brand.css";

export const metadata = privatePageMetadata();

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  const admin = await isCurrentAdmin(session);

  return (
    <div className="adminWorkspace">
      {admin ? (
        <header className="adminHeader">
          <div className="shell adminHeaderInner">
            <Link className="adminBrand" href="/admin" aria-label="Panel de administración ROSH"><BrandLogo light /><span>Administración</span></Link>
            <nav className="adminHeaderNav" aria-label="Sesión administrativa">
              <Link href="/admin">Panel</Link>
              <Link href="/admin/producto">Producto</Link>
              <Link href="/admin/pedidos">Pedidos</Link>
              <Link href="/admin/pagos">Pagos</Link>
            </nav>
            <div className="adminHeaderActions"><Link href="/">Ver tienda</Link><SignOutButton className="adminHeaderSignOut" /></div>
          </div>
        </header>
      ) : null}
      {children}
    </div>
  );
}
