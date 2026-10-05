"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const consentKey = "rosh-analytics-consent-v1";

type Consent = "accepted" | "rejected" | null;

export function AnalyticsConsent() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "";
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
  const enabled = Boolean(gaId || metaPixelId);
  const [consent, setConsent] = useState<Consent>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const stored = window.localStorage.getItem(consentKey);
    if (stored === "accepted" || stored === "rejected") {
      setConsent(stored);
    }
    setLoaded(true);
  }, [enabled]);

  if (!enabled || !loaded) return null;

  function decide(value: Exclude<Consent, null>) {
    window.localStorage.setItem(consentKey, value);
    setConsent(value);
  }

  return (
    <>
      {consent === "accepted" && gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="afterInteractive"
          />
          <Script id="rosh-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {consent === "accepted" && metaPixelId ? (
        <Script id="rosh-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {consent === null ? (
        <aside className="analyticsConsent" role="dialog" aria-label="Preferencias de analítica">
          <div>
            <strong>Analítica opcional</strong>
            <p>
              Podemos usar Google Analytics y/o Meta Pixel para medir el funcionamiento de la tienda. No se cargan hasta que aceptes.
            </p>
          </div>
          <div className="analyticsConsentActions">
            <button type="button" className="button analyticsReject" onClick={() => decide("rejected")}>
              Rechazar
            </button>
            <button type="button" className="button buttonPrimary" onClick={() => decide("accepted")}>
              Aceptar analítica
            </button>
          </div>
        </aside>
      ) : null}
    </>
  );
}
