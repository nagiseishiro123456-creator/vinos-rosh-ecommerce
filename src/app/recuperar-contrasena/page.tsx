import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordReset } from "@/modules/auth/password-reset";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ sent?: string }>;
};

export default async function RecoverPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <main className="authPage">
      <section className="authVisual">
        <Link className="brand" href="/">
          VINOS <strong>ROSH</strong>
        </Link>
        <div>
          <span className="eyebrow">SEGURIDAD</span>
          <h1>Recupera el acceso a tu cuenta.</h1>
          <p>El enlace de recuperación es temporal, de un solo uso y nunca revela si un correo está registrado.</p>
        </div>
      </section>

      <section className="authPanel">
        <form className="authCard" action={requestPasswordReset}>
          <span className="eyebrow wine">RECUPERACIÓN</span>
          <h2>Olvidé mi contraseña</h2>
          <p>Ingresa tu correo. Si existe una cuenta asociada, enviaremos instrucciones para restablecerla.</p>

          {sent ? (
            <div className="authSuccess">
              Si el correo está registrado, recibirás un enlace válido durante 30 minutos.
            </div>
          ) : null}

          <div className="formGrid">
            <div className="formField full">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
          </div>

          <button className="authSubmit" type="submit">Enviar instrucciones</button>

          <div className="authSwitch">
            <Link href="/iniciar-sesion">← Volver a iniciar sesión</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
