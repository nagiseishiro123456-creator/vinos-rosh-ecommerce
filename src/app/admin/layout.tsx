import { getServerSession } from "next-auth";
import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);

  return (
    <>
      {session?.user?.role === "ADMIN" ? (
        <nav className="shell adminSessionBar" aria-label="Sesión administrativa">
          <Link className="textLink" href="/">Ver tienda</Link>
          <SignOutButton />
        </nav>
      ) : null}
      {children}
    </>
  );
}
