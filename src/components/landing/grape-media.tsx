"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { LANDING_ASSETS, resolveLandingMedia, type LandingMediaItem } from "./landing-media";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };
function connection() { return (navigator as Navigator & { connection?: Connection }).connection; }
function canAnimateMedia() {
  const network = connection();
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !network?.saveData
    && !["slow-2g", "2g", "3g"].includes(network?.effectiveType ?? "");
}
function subscribe(callback: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const network = connection();
  reduced.addEventListener("change", callback);
  network?.addEventListener("change", callback);
  return () => { reduced.removeEventListener("change", callback); network?.removeEventListener("change", callback); };
}
const sparks = Array.from({ length: 14 }, (_, index) => ({
  left: `${8 + (index * 37) % 86}%`, top: `${35 + (index * 23) % 60}%`,
  width: `${4 + index % 10}px`, height: `${4 + index % 10}px`,
  animationDuration: `${6 + index % 8}s`, animationDelay: `${-index * 1.7}s`,
  "--spark-drift": `${(index % 2 ? 1 : -1) * (10 + index % 21)}px`,
} as CSSProperties));

function MediaFrame({ item, active, playable }: { item: LandingMediaItem; active: boolean; playable: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = video.current;
    if (!node) return;
    if (active && playable) void node.play().catch(() => { /* Keep the supplied poster when autoplay is unavailable. */ });
    else node.pause();
    return () => node.pause();
  }, [active, playable]);
  return <div className={`landingMediaFrame${active ? " is-active" : ""}`} aria-hidden={!active}>
    <Image src={item.type === "image" ? item.url : item.posterUrl ?? `${LANDING_ASSETS}/frame-familia.jpg`}
      alt={item.alt} width={896} height={720} sizes="(max-width: 820px) 92vw, 54vw" unoptimized
      className="landingMediaPoster" />
    {item.type === "video" && playable ? <video ref={video} src={item.url} poster={item.posterUrl}
      className={ready ? "is-playing" : ""} muted loop playsInline autoPlay preload="metadata"
      aria-label={item.alt} onPlaying={() => setReady(true)} onError={() => setReady(false)} /> : null}
  </div>;
}

export function GrapeMedia({ media }: { media?: readonly LandingMediaItem[] }) {
  const items = resolveLandingMedia(media);
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const animate = useSyncExternalStore(subscribe, canAnimateMedia, () => false);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (items.length < 2 || !animate || !visible) return;
    const timer = setTimeout(() => setActiveIndex((index) => (index + 1) % items.length), items[activeIndex % items.length].type === "image" ? 5000 : 10000);
    return () => clearTimeout(timer);
  }, [activeIndex, items, animate, visible]);
  const selected = animate ? activeIndex % items.length : 0;
  return <div ref={container} className="landingDream" data-motion={animate ? "on" : "off"}>
    <div className="landingHalo landingHaloOne" aria-hidden="true" />
    <div className="landingHalo landingHaloTwo" aria-hidden="true" />
    <div className="landingGrapeMask">
      {items.map((item, index) => <MediaFrame key={`${item.type}:${item.url}:${index}`} item={item} active={index === selected} playable={animate && visible && index === selected} />)}
      <div className="landingGrapeShade" aria-hidden="true" />
      <div className="landingGrapeSpec" aria-hidden="true" />
    </div>
    <Image className="landingGrapeFallback" src={`${LANDING_ASSETS}/cluster.png`} alt={items[selected].alt} width={1020} height={820} unoptimized />
    <Image className="landingStem" src={`${LANDING_ASSETS}/stem-leaf.svg`} alt="" aria-hidden="true" width={1020} height={820} unoptimized />
    <div className="landingSparks" aria-hidden="true">{sparks.map((style, index) => <span key={index} style={style} />)}</div>
  </div>;
}
