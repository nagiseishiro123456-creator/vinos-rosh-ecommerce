/** Exact origins, development route only. No wildcard provider permissions for the shop. */
export function micuentawebLabCsp(base: string) {
  const additions: Record<string, string> = {
    "script-src": "https://static.micuentaweb.pe",
    "style-src": "https://static.micuentaweb.pe",
    "connect-src": "https://static.micuentaweb.pe https://api.micuentaweb.pe",
    "font-src": "https://static.micuentaweb.pe",
  };
  return [...base.split(";").map(item => item.trim()).filter(Boolean).map(item => {
    const directive = item.split(" ", 1)[0];
    return additions[directive] ? `${item} ${additions[directive]}` : item;
  }), "frame-src https://static.micuentaweb.pe https://api.micuentaweb.pe"].join("; ");
}
