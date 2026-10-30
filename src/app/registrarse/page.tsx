"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { useGuestCart } from "@/components/guest-cart-provider";
import { authenticationDestination, safeInternalDestination } from "@/modules/auth/destination";
import { registerSchema, type RegisterInput } from "@/modules/auth/schemas";

type FieldErrors = Partial<Record<keyof RegisterInput, string[]>>;
const fieldNames = ["firstName", "lastName", "email", "phone", "password"] as const;
function focusError(form: HTMLFormElement, errors: FieldErrors) {
  const field = fieldNames.find((name) => errors[name]?.length);
  const input = field && form.elements.namedItem(field);
  if (input instanceof HTMLElement) input.focus();
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guest = useGuestCart();
  const destination = safeInternalDestination(searchParams.get("callbackUrl"));
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function fieldFeedback(event: FormEvent<HTMLFormElement>, force = false) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !fieldNames.includes(input.name as keyof RegisterInput)) return;
    const name = input.name as keyof RegisterInput;
    if (!force && !errors[name]?.length) return;
    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    const next = parsed.success ? undefined : parsed.error.flatten().fieldErrors[name];
    setErrors((previous) => ({ ...previous, [name]: next }));
  }
  function feedback(name: keyof RegisterInput) {
    return errors[name]?.length ? <ul className="registrationFieldError" id={`registration-${name}-error`} aria-live="polite">
      {errors[name]!.map((error) => <li key={error}>{error}</li>)}
    </ul> : null;
  }
  function inputFeedback(name: keyof RegisterInput) {
    return {
      "aria-invalid": Boolean(errors[name]?.length),
      "aria-describedby": [name === "password" ? "registration-password-help" : name === "phone" ? "registration-phone-help" : "",
        errors[name]?.length ? `registration-${name}-error` : ""].filter(Boolean).join(" ") || undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const formElement = event.currentTarget;
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      phone: form.get("phone"),
      password: form.get("password"),
    };

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(fieldErrors);
      focusError(formElement, fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json();

      if (!response.ok) {
        const fieldErrors: FieldErrors = {};
        for (const name of fieldNames) {
          const messages: unknown = data.errors?.[name];
          if (Array.isArray(messages)) fieldErrors[name] = messages.filter((value): value is string => typeof value === "string");
        }
        if (response.status === 409) fieldErrors.email = ["Ya existe una cuenta con este correo. Inicia sesión o utiliza otro correo."];
        setErrors(fieldErrors);
        focusError(formElement, fieldErrors);
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
        <form className="authCard" noValidate onSubmit={handleSubmit}
          onBlur={(event) => {
            // Let submit validate together so new messages do not move the button during a click.
            if (event.relatedTarget instanceof HTMLButtonElement && event.relatedTarget.type === "submit") return;
            fieldFeedback(event, true);
          }} onChange={fieldFeedback}>
          <span className="eyebrow wine">CLIENTE ROSH</span>
          <h2>Crear cuenta</h2>
          <p>Completa tus datos principales. La dirección se solicitará al comprar.</p>

          <div className="formGrid">
            <div className="formField">
              <label htmlFor="firstName">Nombres</label>
              <input id="firstName" name="firstName" autoComplete="given-name" required {...inputFeedback("firstName")} />
              {feedback("firstName")}
            </div>
            <div className="formField">
              <label htmlFor="lastName">Apellidos</label>
              <input id="lastName" name="lastName" autoComplete="family-name" required {...inputFeedback("lastName")} />
              {feedback("lastName")}
            </div>
            <div className="formField full">
              <label htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autoComplete="email" required {...inputFeedback("email")} />
              {feedback("email")}
            </div>
            <div className="formField full">
              <label htmlFor="phone">Celular (opcional)</label>
              <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="987654321" autoComplete="tel" {...inputFeedback("phone")} />
              <small id="registration-phone-help">9 dígitos y empieza con 9, sin +51. Puedes dejarlo vacío.</small>
              {feedback("phone")}
            </div>
            <div className="formField full">
              <label htmlFor="password">Contraseña</label>
              <input id="password" name="password" type="password" autoComplete="new-password"
                minLength={8} maxLength={72} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}"
                {...inputFeedback("password")} required />
              <small id="registration-password-help">Usa entre 8 y 72 caracteres, con mayúscula, minúscula y número.</small>
              {feedback("password")}
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
