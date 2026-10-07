import type { Metadata } from "next";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { resetPassword } from "@/modules/auth/password-reset";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token ?? "";
  const invalidToken = params.error === "invalid-token" || !token;
  const invalidPassword = params.error === "invalid-password";

  return (
    <main className="authPage">
      <section className="authVisual">
        <Link className="brand" href="/" aria-label="Ir al inicio de Vinos ROSH">
          <BrandLogo light />
        </Link>
        <div>
          <span className="eyebrow">CUENTA SEGURA</span>
          <h1>Crea una nueva contraseña.</h1>
          <p>Usa una contraseña distinta a la de otros servicios y evita compartirla.</p>
        </div>
      </section>

      <section className="authPanel">
        <form className="authCard" action={resetPassword}>
          <span className="eyebrow wine">NUEVA CONTRASEÑA</span>
          <h2>Restablecer acceso</h2>

          {invalidToken ? (
            <div className="authError">
              El enlace es inválido o ya venció. Solicita uno nuevo.
            </div>
          ) : null}

          {invalidPassword ? (
            <div className="authError">
              La contraseña debe tener 8 caracteres como mínimo e incluir mayúscula, minúscula y número. Ambas contraseñas deben coincidir.
            </div>
          ) : null}

          {!invalidToken ? (
            <>
              <input type="hidden" name="token" value={token} />
              <div className="formGrid">
                <div className="formField full">
                  <label htmlFor="password">Nueva contraseña</label>
                  <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
                </div>
                <div className="formField full">
                  <label htmlFor="confirmPassword">Confirmar contraseña</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
                </div>
              </div>

              <button className="authSubmit" type="submit">Guardar nueva contraseña</button>
            </>
          ) : (
            <Link className="authSubmit authSubmitLink" href="/recuperar-contrasena">Solicitar otro enlace</Link>
          )}

          <div className="authSwitch">
            <Link href="/iniciar-sesion">Volver al inicio de sesión</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
