import { BookOpen, Grape, Heart, Leaf, Sprout, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Nuestra historia",
  description:
    "Conoce el origen familiar de ROSH, su vínculo con la uva y la historia que inspira la marca.",
};

export default function HistoryPage() {
  return (
    <main className="historyPage">
      <section className="historyHero">
        <Image
          src={`${siteConfig.prototypeAssetsBase}/story.jpg`}
          alt="Uvas y viñedo vinculados a la historia de ROSH"
          fill
          priority
          sizes="100vw"
        />
        <div className="historyHeroOverlay" aria-hidden="true" />
        <StoreHeader />
        <div className="historyHeroCopy shell">
          <p className="eyebrow">NUESTRA HISTORIA</p>
          <h1>Una marca que nace de familia, esfuerzo y propósito.</h1>
          <p>
            ROSH reúne una historia vinculada a Víctor Rosh, al colportaje, al trabajo familiar
            y a una pasión que fue creciendo alrededor del cultivo de la uva.
          </p>
        </div>
      </section>

      <section className="historyIntro shell">
        <div>
          <p className="eyebrow wine">EL ORIGEN</p>
          <h2>Antes del producto, estuvo la historia.</h2>
        </div>
        <div className="historyIntroCopy">
          <p>
            La identidad de ROSH no se construye únicamente alrededor de una botella. Su punto de
            partida es una historia familiar que queremos conservar con respeto y contar de manera
            auténtica.
          </p>
          <p>
            Por eso esta página está preparada para crecer con fotografías, fechas, recuerdos y
            testimonios que la familia decida compartir. No añadimos hechos que todavía no hayan
            sido validados por ellos.
          </p>
        </div>
      </section>

      <section className="historyValuesSection">
        <div className="shell">
          <div className="historyValuesHeading">
            <p className="eyebrow wine">LO QUE QUEREMOS TRANSMITIR</p>
            <h2>Origen, trabajo y una experiencia hecha para compartir.</h2>
          </div>

          <div className="historyValueGrid">
            <article>
              <span><UsersRound size={22} /></span>
              <strong>Familia</strong>
              <p>La marca se presenta desde una historia humana y cercana, no desde un discurso industrial.</p>
            </article>
            <article>
              <span><BookOpen size={22} /></span>
              <strong>Colportaje</strong>
              <p>Una parte del relato familiar está vinculada al servicio, la perseverancia y el trabajo de colportaje.</p>
            </article>
            <article>
              <span><Sprout size={22} /></span>
              <strong>Cultivo</strong>
              <p>La uva y el cuidado de su origen forman parte central de la identidad visual y narrativa de ROSH.</p>
            </article>
            <article>
              <span><Heart size={22} /></span>
              <strong>Propósito</strong>
              <p>La experiencia busca conservar el vínculo entre producto, historia y quienes lo comparten.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="historyProcess shell">
        <div className="historyProcessVisual">
          <Image
            src={`${siteConfig.prototypeAssetsBase}/hero.jpg`}
            alt="Viñedo ROSH"
            fill
            sizes="(max-width: 900px) 92vw, 48vw"
          />
        </div>

        <div className="historyProcessCopy">
          <p className="eyebrow wine">DEL VIÑEDO A LA MESA</p>
          <h2>Una narrativa sencilla y transparente.</h2>
          <div className="historySteps">
            <article>
              <span><Grape size={20} /></span>
              <div><strong>1. Origen</strong><p>Mostrar de dónde nace la uva y quiénes están detrás de la marca.</p></div>
            </article>
            <article>
              <span><Leaf size={20} /></span>
              <div><strong>2. Elaboración</strong><p>Explicar el proceso real cuando la familia valide el contenido técnico definitivo.</p></div>
            </article>
            <article>
              <span><Heart size={20} /></span>
              <div><strong>3. Experiencia</strong><p>Presentar ROSH como una bebida de uva sin alcohol pensada para compartir.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="historyClosing">
        <div className="shell historyClosingInner">
          <div>
            <p className="eyebrow">SIGUE CONOCIENDO ROSH</p>
            <h2>La historia continuará creciendo con contenido real de la familia.</h2>
          </div>
          <div className="historyClosingActions">
            <Link className="button buttonLight" href="/productos">Ver productos</Link>
            <Link className="button buttonGhost" href="/contacto">Contactar</Link>
          </div>
        </div>
      </section>

      <WhatsAppFab />
    </main>
  );
}
