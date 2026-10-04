import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "@/modules/profile/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/mi-cuenta/perfil");
  }

  const [params, user] = await Promise.all([
    searchParams,
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) redirect("/iniciar-sesion");

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact"><StoreHeader /></div>

      <section className="shell accountToolShell">
        <div className="accountToolHeading">
          <div>
            <p className="eyebrow wine">MI CUENTA</p>
            <h1>Datos personales</h1>
            <p>Actualiza la información que usamos para identificar tu cuenta y facilitar las entregas.</p>
          </div>
          <Link className="textLink" href="/mi-cuenta">← Volver a mi cuenta</Link>
        </div>

        {params.status === "updated" ? <div className="accountNotice success">Tus datos se actualizaron correctamente.</div> : null}
        {params.error ? <div className="accountNotice error">Revisa los datos ingresados e inténtalo nuevamente.</div> : null}

        <div className="accountToolGrid single">
          <section className="accountToolCard">
            <form className="accountToolForm" action={updateProfile}>
              <div className="accountToolFormGrid">
                <label className="accountToolField">
                  <span>Nombres</span>
                  <input name="firstName" required minLength={2} maxLength={80} defaultValue={user.firstName} autoComplete="given-name" />
                </label>

                <label className="accountToolField">
                  <span>Apellidos</span>
                  <input name="lastName" required minLength={2} maxLength={100} defaultValue={user.lastName} autoComplete="family-name" />
                </label>

                <label className="accountToolField">
                  <span>Celular</span>
                  <input name="phone" inputMode="tel" autoComplete="tel" maxLength={16} defaultValue={user.phone ?? ""} placeholder="987654321" />
                </label>

                <label className="accountToolField">
                  <span>Correo de acceso</span>
                  <input value={user.email} readOnly aria-readonly="true" />
                  <small>Por seguridad, el cambio de correo se habilitará después con verificación.</small>
                </label>
              </div>

              <div className="accountToolActions">
                <button className="button buttonDark" type="submit">Guardar cambios</button>
              </div>
            </form>
          </section>

          <aside className="accountSecurityCard">
            <p className="eyebrow wine">CUENTA</p>
            <strong>Información protegida</strong>
            <p>No mostramos tu correo ni tu número telefónico en reseñas públicas.</p>
            <small>Cuenta creada el {user.createdAt.toLocaleDateString("es-PE")}.</small>
          </aside>
        </div>
      </section>
    </main>
  );
}
