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
    "El legado de Víctor Rosh: del colportaje y los caminos rurales al cultivo familiar de la uva.",
};

export default function HistoryPage() {
  return (
    <main className="historyPage">
      <section className="historyHero">
        <Image
          src={`${siteConfig.prototypeAssetsBase}/story.jpg`}
          alt="Uvas y viñedo vinculados al legado de Víctor Rosh"
          fill
          priority
          sizes="100vw"
        />
        <div className="historyHeroOverlay" aria-hidden="true" />
        <StoreHeader />
        <div className="historyHeroCopy shell">
          <p className="eyebrow">EL LEGADO DE VÍCTOR ROSH</p>
          <h1>De los caminos de tierra al fruto de la vid.</h1>
          <p>
            Toda gran historia comienza con paciencia. El origen de ROSH se encuentra en los
            caminos rurales recorridos por Víctor Rosh, en el trabajo familiar y en una forma
            de mirar la tierra con perseverancia y propósito.
          </p>
        </div>
      </section>

      <section className="historyIntro shell">
        <div>
          <p className="eyebrow wine">1968 — 1975</p>
          <h2>Los años de colportaje.</h2>
        </div>
        <div className="historyIntroCopy">
          <p>
            A finales de la década de 1960, Víctor trabajaba como colportor. Viajaba de pueblo
            en pueblo llevando libros, enciclopedias y textos de formación a comunidades alejadas.
          </p>
          <p>
            Aquellos años fortalecieron tres valores que la familia asocia hoy con ROSH:
            perseverancia, escucha y respeto por los ciclos de la naturaleza.
          </p>
        </div>
      </section>

      <section className="historyValuesSection">
        <div className="shell">
          <div className="historyValuesHeading">
            <p className="eyebrow wine">1974</p>
            <h2>El intercambio que cambió el rumbo.</h2>
            <p>
              Durante una travesía por el valle, Víctor llegó a una pequeña finca. Según el relato
              familiar, un agricultor le ofreció alimento, cobijo y un terreno pedregoso a cambio
              de uno de sus libros. Allí nació la idea de cultivar uva y convertir la tierra en un
              legado para la familia.
            </p>
          </div>

          <div className="historyValueGrid">
            <article>
              <span><UsersRound size={22} /></span>
              <strong>Familia</strong>
              <p>El proyecto se construyó desde una historia cercana, transmitida entre generaciones.</p>
            </article>
            <article>
              <span><BookOpen size={22} /></span>
              <strong>Colportaje</strong>
              <p>El servicio, la lectura y la constancia forman parte del relato que precede al viñedo.</p>
            </article>
            <article>
              <span><Sprout size={22} /></span>
              <strong>Tierra</strong>
              <p>Un terreno difícil se convirtió en símbolo de paciencia, aprendizaje y trabajo manual.</p>
            </article>
            <article>
              <span><Heart size={22} /></span>
              <strong>Propósito</strong>
              <p>ROSH busca conservar la historia detrás de cada presentación y compartirla en familia.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="historyProcess shell">
        <div className="historyProcessVisual">
          <Image
            src={`${siteConfig.prototypeAssetsBase}/hero.jpg`}
            alt="Viñedo asociado a la historia familiar ROSH"
            fill
            sizes="(max-width: 900px) 92vw, 48vw"
          />
        </div>

        <div className="historyProcessCopy">
          <p className="eyebrow wine">1978</p>
          <h2>La primera cosecha.</h2>
          <p>
            Cuatro años después del encuentro que marcó el origen del proyecto, la familia sitúa
            en 1978 la primera cosecha del viñedo. Víctor limpió la tierra, seleccionó sarmientos
            y aplicó al cultivo la misma disciplina que había desarrollado durante sus años de
            colportaje.
          </p>
          <div className="historySteps">
            <article>
              <span><Grape size={20} /></span>
              <div><strong>1. Cultivar</strong><p>Trabajar la uva desde una relación paciente con la tierra.</p></div>
            </article>
            <article>
              <span><Leaf size={20} /></span>
              <div><strong>2. Conservar</strong><p>Mantener vivo el vínculo entre producto, familia e historia.</p></div>
            </article>
            <article>
              <span><Heart size={20} /></span>
              <div><strong>3. Compartir</strong><p>Hoy ROSH presenta bebidas de uva sin alcohol pensadas para acompañar momentos especiales.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="historyClosing">
        <div className="shell historyClosingInner">
          <div>
            <p className="eyebrow">ROSH HOY</p>
            <h2>Historias que se comparten con el alma.</h2>
            <p>
              Décadas después, ROSH mantiene como inspiración la paciencia, el trabajo manual y
              el coraje de sembrar en terrenos difíciles. La propuesta actual es una línea de
              bebidas de uva sin alcohol, creada para compartir esa historia en nuevos momentos.
            </p>
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
