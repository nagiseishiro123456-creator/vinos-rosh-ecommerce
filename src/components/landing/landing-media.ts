export type LandingMediaItem = Readonly<{
  type: "image" | "video";
  url: string;
  posterUrl?: string;
  alt: string;
}>;

export const LANDING_ASSETS = "/media/rosh/landing";
export const DEFAULT_LANDING_MEDIA: readonly LandingMediaItem[] = [{
  type: "video",
  url: `${LANDING_ASSETS}/sueno.mp4`,
  posterUrl: `${LANDING_ASSETS}/frame-familia.jpg`,
  alt: "Momentos para compartir con ROSH, vino de uvas sin alcohol",
}];

// The existing admin has no published Home-media collection yet. The supplied default
// is intentional; no draft/admin upload endpoint is introduced by this landing change.
export function resolveLandingMedia(items?: readonly LandingMediaItem[]): readonly LandingMediaItem[] {
  return items?.length ? items : DEFAULT_LANDING_MEDIA;
}
