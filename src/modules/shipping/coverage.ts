export type ShippingLocation = { department: string; province: string; district: string };
export type CoverageZone = ShippingLocation & { id: string; active?: boolean };

export function normalizeLocation(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
}
export function shippingLocationKey(location: ShippingLocation) {
  return JSON.stringify([location.department, location.province, location.district].map(normalizeLocation));
}
/** The browser and server use the same identity. Never choose between duplicate rates. */
export function resolveShippingCoverage<T extends CoverageZone>(location: ShippingLocation, zones: readonly T[]):
  { kind: "available"; zone: T } | { kind: "unavailable" | "ambiguous" } {
  const key = shippingLocationKey(location);
  const matching = zones.filter((zone) => zone.active !== false && shippingLocationKey(zone) === key);
  if (matching.length === 1) return { kind: "available", zone: matching[0] };
  return { kind: matching.length > 1 ? "ambiguous" : "unavailable" };
}
export function unambiguousShippingZones<T extends CoverageZone>(zones: readonly T[]) {
  const counts = new Map<string, number>();
  for (const zone of zones) if (zone.active !== false) {
    const key = shippingLocationKey(zone); counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return zones.filter((zone) => zone.active !== false && counts.get(shippingLocationKey(zone)) === 1);
}
