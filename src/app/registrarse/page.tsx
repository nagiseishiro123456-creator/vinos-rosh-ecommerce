"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { useGuestCart } from "@/components/guest-cart-provider";
import { authenticationDestination, safeInternalDestination } from "@/modules/auth/destination";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guest = useGuestCart();
  const destination = safeInternalDestination(searchParams.get("callbackUrl"));
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? "No se pudo crear la cuenta.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });

      if (result?.ok) {
        const selection = guest.getSnapshot();
        router.push(authenticationDestination(destination, Boolean(selection.items.length || selection.pending)) as Route);
        router.refresh();
        return;
      }

      setMessage("La cuenta fue creada. Ahora inicia sesión.");
    } catch {
      setMessage("No pudimos completar el registro o ingreso. Revisa tu conexión; si la cuenta ya se creó, puedes iniciar sesión.");
    }
    setLoading(false);
  }

  return (
    <main className="authPage">
      <section className="authVisual">
        <Link className="brand" href="/" aria-label="Ir al inicio de Vinos ROSH">
          <BrandLogo light />
        </Link>
        <div>
          <span className="eyebrow">CREA TU CUENTA</span>
          <h1>Tu experiencia ROSH comienza aquí.</h1>
          <p>
            Regístrate para guardar tu carrito, gestionar direcciones, revisar
            pedidos y dejar reseñas verificadas después de comprar.
          </p>
        </div>
      </section>

      <section className="authPanel">
        <form className="authCard" onSubmit={handleSubmit}>
          <span className="eyebrow wine">CLIENTE ROSH</span>
          <h2>Crear cuenta</h2>
          <p>Completa tus datos principales. La dirección se solicitará al comprar.</p>

          <div className="formGrid">
            <div className="formField">
              <label htmlFor="firstName">Nombres</label>
              <input id="firstName" name="firstName" autoComplete="given-name" required />
            </div>
            <div className="formField">
              <label htmlFor="lastName">Apellidos</label>
              <input id="lastName" name="lastName" autoComplete="family-name" required />
            </div>
            <div className="formField full">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="formField full">
              <label htmlFor="phone">Celular (opcional)</label>
              <input id="phone" name="phone" inputMode="numeric" placeholder="987654321" autoComplete="tel" />
            </div>
            <div className="formField full">
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </div>

          {message ? <div className="authError" role="alert">{message}</div> : null}

          <button className="authSubmit" disabled={loading} type="submit">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <div className="authSwitch">
            ¿Ya tienes cuenta? <Link href={`/iniciar-sesion?callbackUrl=${encodeURIComponent(destination)}`}>Inicia sesión</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return <Suspense fallback={<main className="authPage" aria-busy="true" />}><RegisterContent /></Suspense>;
}
