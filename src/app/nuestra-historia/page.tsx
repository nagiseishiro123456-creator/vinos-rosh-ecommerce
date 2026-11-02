import Image from "next/image";
import Link from "next/link";
import { publicPageMetadata } from "@/lib/seo";
import { StoreHeader } from "@/components/store-header";
import { RoshFooter } from "@/components/landing/rosh-footer";
import { getHistory } from "@/modules/history/queries";
import type { HistoryPhoto } from "@/modules/history/content";
import styles from "./story.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { content: { texts: t, images } } = await getHistory();
  return publicPageMetadata({ path: "/nuestra-historia", title: t.title, description: t.lead.slice(0, 280), image: images.cover.src, imageAlt: images.cover.alt });
}
function Photo({ photo, shape, cover = false }: { photo: HistoryPhoto; shape: string; cover?: boolean }) {
  return <figure className={`${styles.photo} ${shape}`}><div className={styles.photoFrame}>
    <Image src={photo.src} alt={photo.alt} fill sizes={cover ? "(max-width: 820px) 200px, 270px" : "(max-width: 820px) 68vw, 300px"}
      preload={cover} unoptimized={photo.src.startsWith("/api/story-images/")} style={{ objectFit: "cover", objectPosition: `${photo.x}% ${photo.y}%` }} />
  </div></figure>;
}
export default async function HistoryPage() {
  const { content: { texts: t, images } } = await getHistory();
  const facts = [[t.fact1Value, t.fact1Label], [t.fact2Value, t.fact2Label], [t.fact3Value, t.fact3Label], [t.fact4Value, t.fact4Label]];
  const occasions = [[t.occasion1Title, t.occasion1Text], [t.occasion2Title, t.occasion2Text], [t.occasion3Title, t.occasion3Text]];
  return <div className={styles.page}>
    <div className={styles.headerSpace}><StoreHeader /></div>
    <main id="story-content">
      <header className={styles.top}><div className={styles.wrap}>
        <div className={styles.read}><span className={styles.kicker}>{t.eyebrow}</span><h1>{t.title}</h1><p className={styles.lead}>{t.lead}</p>
          <ul className={styles.facts} aria-label="Datos de la botella">{facts.map(([value, label], i) => <li key={i}><b>{value}</b><span>{label}</span></li>)}</ul>
        </div><Photo photo={images.cover} shape={styles.cover} cover />
      </div></header>
      <article>
        <section className={styles.chapter} aria-labelledby="grape-title"><div className={styles.wrap}>
          <div className={styles.read}><p className={styles.number}>{t.grapeLabel}</p><h2 id="grape-title">{t.grapeTitle}</h2>
            <p>{t.grapeBody1}</p><p>{t.grapeBody2}</p>{t.grapeNote && <p className={styles.note}>{t.grapeNote}</p>}
          </div><Photo photo={images.grape} shape={styles.arch} />
        </div></section>
        <section className={`${styles.chapter} ${styles.reverse}`} aria-labelledby="juice-title"><div className={styles.wrap}>
          <div className={styles.read}><p className={styles.number}>{t.juiceLabel}</p><h2 id="juice-title">{t.juiceTitle}</h2>
            <p>{t.juiceBody}</p><blockquote className={styles.quote}>{t.quote}</blockquote>{t.juiceNote && <p className={styles.note}>{t.juiceNote}</p>}
          </div><Photo photo={images.juice} shape={styles.round} />
        </div></section>
        <section className={styles.chapter} aria-labelledby="table-title"><div className={styles.wrap}>
          <div className={styles.read}><p className={styles.number}>{t.tableLabel}</p><h2 id="table-title">{t.tableTitle}</h2><p>{t.tableBody}</p>
            <ul className={styles.occasions}>{occasions.map(([title, body], i) => <li key={i}><b>{title}</b> {body}</li>)}</ul>
          </div><Photo photo={images.table} shape={styles.leaf} />
        </div></section>
      </article>
      <section className={styles.end}><div className={styles.read}><p>{t.closing}</p><nav className={styles.links} aria-label="Seguir">
        <Link href="/#comprar">{t.buyLabel}</Link><Link href="/contacto">{t.contactLabel}</Link>
      </nav></div></section>
    </main>
    <div className={styles.footerSurface}><RoshFooter text={t.footer} className={styles.footer} /></div>
  </div>;
}
