/** Only normalized, same-origin application paths; never trust a callback query directly. */
export function safeInternalDestination(value: string | null | undefined, fallback = "/mi-cuenta") {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)
    || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f|25)/i.test(value)) return fallback;
  try {
    const url = new URL(value, "https://rosh.invalid");
    if (url.origin !== "https://rosh.invalid" || /^\/(?:api(?:\/|$)|iniciar-sesion(?:\/|$)|registrarse(?:\/|$))/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}
export function authenticationDestination(callback: string, hasGuestSelection: boolean) {
  const safe = safeInternalDestination(callback);
  if (!hasGuestSelection || safe === "/carrito") return safe;
  return `/carrito?continuar=${encodeURIComponent(safe)}`;
}
