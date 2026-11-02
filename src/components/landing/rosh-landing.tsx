"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { GrapeMedia } from "./grape-media";
import { LANDING_ASSETS, type LandingMediaItem } from "./landing-media";
import { PourLanding, type PourProduct } from "./pour-landing";
import { useLandingIntro } from "./landing-intro";
import type { LandingCopy } from "@/modules/products/landing-content";

type Props = { copy: LandingCopy; product?: PourProduct | null; userId: string | null; isAuthenticated: boolean; isAdmin: boolean; phone: string | null; media?: readonly LandingMediaItem[] };

export function RoshLanding({ userId, isAuthenticated, isAdmin, phone, media, product, copy }: Props) {
  const root = useRef<HTMLElement>(null), slot = useRef<HTMLDivElement>(null);
  useLandingIntro(root, slot);
  function finishIntro() { root.current?.dispatchEvent(new Event("rosh:skip-intro")); }
  return <main ref={root} className="roshLanding" id="inicio" data-phase="boot" data-intro="boot" data-animate="false">
    <h1 className="landingSrOnly">ROSH · Vino de uvas sin alcohol</h1>
    <a className="landingSkip" href="#landing-scene" onClick={finishIntro}>Saltar animación</a>
    <SiteHeader userId={userId} isAuthenticated={isAuthenticated} isAdmin={isAdmin} phone={phone} logoSlotRef={slot} />
    <Link className="landingLogo" href="/#inicio" aria-label="Ir al inicio de Vinos ROSH" onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); finishIntro(); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }}><Image src={`${LANDING_ASSETS}/logo.png`} alt="ROSH" width={640} height={253} unoptimized preload /></Link>
    <section className="landingScene" id="landing-scene" aria-label="Vino ROSH, un único producto">
      <Image className="landingBottle" src={`${LANDING_ASSETS}/bottle.png`} alt="Botella Rosh, vino de uvas sin alcohol" width={570} height={810} sizes="(max-width: 820px) 80vw, 50vw" unoptimized preload />
      <div className="landingStage"><GrapeMedia media={media} /></div>
    </section>
    <div className="landingNightTransition" aria-hidden="true" /><PourLanding copy={copy} product={product ?? null} userId={userId} />
  </main>;
}
