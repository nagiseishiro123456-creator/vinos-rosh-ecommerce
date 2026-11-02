import { Facebook, Instagram } from "lucide-react";

// The client requested icons only. Add links when official profile URLs exist.
export function SocialIcons({ className = "landingSocials" }: { className?: string }) {
  return <div className={className} role="group" aria-label="Redes sociales">
    <span role="img" aria-label="Instagram" title="Instagram"><Instagram size={22} strokeWidth={1.6} aria-hidden="true" /></span>
    <span role="img" aria-label="Facebook" title="Facebook"><Facebook size={22} strokeWidth={1.6} aria-hidden="true" /></span>
    <span role="img" aria-label="TikTok" title="TikTok">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47V14a2 2 0 1 0 1.5 1.94V3H14c.45 2.7 2.3 4.3 5 4.5V10c-2-.15-3.6-.85-5-2.1" />
      </svg>
    </span>
  </div>;
}
