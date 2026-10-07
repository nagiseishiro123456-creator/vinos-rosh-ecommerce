"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetCompleted = searchParams.get("reset") === "success";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.ok) {
      const callbackUrl = searchParams.get("callbackUrl");
      const safeCallback =
        callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/mi-cuenta";

      router.push(safeCallback);
      router.refresh();
      return;
    }

    setError("Correo o contraseña incorrectos.");
    setLoading(false);
  }

  return (
    <main className="authPage">
      <section className="authVisual">
        <Link className="brand" href="/">
          VINOS <strong>ROSH</strong>
        </Link>
        <div>
          <span className="eyebrow">BIENVENIDO</span>
          <h1>Vuelve a tu cuenta ROSH.</h1>
          <p>
            Revisa tus pedidos, direcciones, carrito y las compras habilitadas
            para reseña.
          </p>
        </div>
      </section>

      <section className="authPanel">
        <form className="authCard" onSubmit={handleSubmit}>
          <span className="eyebrow wine">ACCESO</span>
          <h2>Iniciar sesión</h2>
          <p>Ingresa con el correo y contraseña usados al registrarte.</p>

          {resetCompleted ? (
            <div className="authSuccess">Contraseña actualizada. Ya puedes iniciar sesión.</div>
          ) : null}

          <div className="formGrid">
            <div className="formField full">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="formField full">
              <div className="authFieldHeading">
                <label htmlFor="password">Contraseña</label>
                <Link href="/recuperar-contrasena">¿La olvidaste?</Link>
              </div>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
          </div>

          {error ? <div className="authError">{error}</div> : null}

          <button className="authSubmit" disabled={loading} type="submit">
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>

          <div className="authSwitch">
            ¿Aún no tienes cuenta? <Link href="/registrarse">Crear cuenta</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="authPage" aria-busy="true" />}>
      <LoginContent />
    </Suspense>
  );
}
