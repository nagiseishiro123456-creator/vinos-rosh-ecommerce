type Environment = Readonly<Record<string, string | undefined>>;
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Checks configuration only. It neither connects nor logs a connection string. */
export function isLocalRegistrationEnvironment(environment: Environment) {
  if (environment.NODE_ENV === "production") return false;
  try {
    const database = new URL(environment.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(database.protocol) || !loopback.has(database.hostname)
      || !/^\/vinos_rosh(?:_(?:test|ci))?$/.test(database.pathname)) return false;
    // Do not accept a connection-string override of the checked host.
    if (["host", "hostaddr", "service"].some((key) => database.searchParams.has(key))) return false;
    return [environment.NEXT_PUBLIC_APP_URL, environment.NEXTAUTH_URL].every((value) => {
      const url = new URL(value ?? "");
      return ["http:", "https:"].includes(url.protocol) && loopback.has(url.hostname);
    });
  } catch { return false; }
}

export function registrationRateLimit(environment: Environment) {
  if (environment.NODE_ENV === "development" && environment.LOCAL_REGISTRATION_TEST_MODE === "true"
    && isLocalRegistrationEnvironment(environment)) {
    // Separate scope: an old one-hour bucket does not block this opt-in local policy.
    return { scope: "auth-register-local", limit: 60, windowMs: 10 * 60_000 };
  }
  return { scope: "auth-register", limit: 6, windowMs: 60 * 60_000 };
}

export function registrationWait(retryAfterMs: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return { retryAfterSeconds,
    message: `Se alcanzó el límite de solicitudes para crear cuentas. Vuelve a intentarlo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.` };
}
