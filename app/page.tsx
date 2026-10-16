import Link from "next/link";
import { Suspense } from "react";
import { CmsImage } from "@/components/cms-image";
import { Icon } from "@/components/icon";
import { RichText } from "@/components/rich-text";
import { ContactBanner } from "@/components/site-shell";
import { getSiteContent } from "@/lib/cms/data";
import { pageHref, type Page } from "@/lib/cms/content";

export const metadata = { alternates: { canonical: "/" } };

const careDescriptions: Record<string, string> = {
  eerstelijnsverblijf:
    "Tijdelijk de verzorging en begeleiding die u nodig heeft, met uw herstel en terugkeer naar huis voorop.",
  respijtzorg:
    "Vertrouwde zorg voor uw naaste, zodat u als mantelzorger even tijd voor uzelf heeft.",
};

function CareCard({ page }: { page: Page }) {
  return (
    <Link href={pageHref(page.slug)} className="care-card">
      {page.image && (
        <div className="care-image">
          <CmsImage image={page.image} sizes="(max-width: 700px) 100vw, 50vw" />
        </div>
      )}
      <div className="care-card-body">
        <div>
          <h3>{page.title}</h3>
          <p>{careDescriptions[page.slug]}</p>
        </div>
        <span className="round-arrow">
          <Icon name="arrow" />
        </span>
      </div>
    </Link>
  );
}

async function HomeContent() {
  const { pages } = await getSiteContent();
  const home = pages.find((p) => p.slug === "home");
  const patients = pages.find((p) => p.slug === "informatie-voor-patienten");
  const referrers = pages.find((p) => p.slug === "informatie-voor-verwijzers");
  const care = ["eerstelijnsverblijf", "respijtzorg"].flatMap((slug) =>
    pages.filter((p) => p.slug === slug),
  );
  return (
    <main id="main">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <span className="location-label">
            <Icon name="pin" />
            Welkom bij Mamelis Care in Vijlen
          </span>
          <h1 id="hero-heading">
            Alle aandacht.
            <br />
            Voor uw herstel.
          </h1>
          {home?.content.length ? (
            <RichText nodes={home.content.slice(0, 1)} className="hero-intro" />
          ) : (
            <p className="hero-intro">
              Kortdurende zorg in een persoonlijke, huiselijke omgeving.
            </p>
          )}
          <div className="hero-actions">
            <a className="button button-primary" href="#onze-zorg">
              Ontdek onze zorg
              <Icon name="arrow" />
            </a>
            <Link href="/contact" className="text-link">
              Neem contact op
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          {home?.image && (
            <CmsImage
              image={home.image}
              alt="Het gebouw en terras van Mamelis Care in Vijlen"
              sizes="(max-width: 800px) 100vw, 55vw"
              preload
            />
          )}
          <div className="photo-caption">
            <Icon name="home" />
            <span>
              Een vertrouwde plek.
              <br />
              <strong>Even tussen ziekenhuis en thuis.</strong>
            </span>
          </div>
        </div>
      </section>
      <section
        className="audience-section container"
        aria-labelledby="audience-heading"
      >
        <h2 id="audience-heading" className="visually-hidden">
          Waar kunnen we u mee helpen?
        </h2>
        <a href="#onze-zorg" className="audience-link">
          <Icon name="heart" />
          <div>
            <h3>Ik zoek zorg</h3>
            <p>Welke zorg past bij uw situatie?</p>
          </div>
          <Icon name="arrow" />
        </a>
        {patients && (
          <Link href={pageHref(patients.slug)} className="audience-link">
            <Icon name="home" />
            <div>
              <h3>Voor patiënten & naasten</h3>
              <p>Alles over uw verblijf en bezoek.</p>
            </div>
            <Icon name="arrow" />
          </Link>
        )}
        {referrers && (
          <Link href={pageHref(referrers.slug)} className="audience-link">
            <Icon name="people" />
            <div>
              <h3>Ik ben verwijzer</h3>
              <p>Informatie en direct aanmelden.</p>
            </div>
            <Icon name="arrow" />
          </Link>
        )}
      </section>
      <section
        className="section container care-section"
        id="onze-zorg"
        aria-labelledby="care-heading"
      >
        <div className="section-heading">
          <h2 id="care-heading">
            Goede zorg begint
            <br />
            met aandacht voor u.
          </h2>
          <p>
            Soms is thuis zijn even niet mogelijk.
            <br />
            Dan zijn wij er voor u, met deskundige zorg
            <br className="desktop-break" /> en de tijd om aan te sterken.
          </p>
        </div>
        <div className="care-grid">
          {care.map((page) => (
            <CareCard page={page} key={page.id} />
          ))}
        </div>
      </section>
      <section className="about-section" aria-labelledby="about-heading">
        <div className="container about-grid">
          <div className="about-visual">
            {patients?.image && (
              <CmsImage
                image={patients.image}
                alt="De lichte gezamenlijke woonkamer van Mamelis Care"
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            )}
            <div className="about-note">
              <Icon name="heart" />
              <span>
                Kleinschalig.
                <br />
                Met ruimte voor u.
              </span>
            </div>
          </div>
          <div className="about-copy">
            <h2 id="about-heading">
              Bij ons gaat het
              <br />
              om mensen.
            </h2>
            {home && <RichText nodes={home.content.slice(1)} />}
            {patients && (
              <Link className="text-link" href={pageHref(patients.slug)}>
                Meer over uw verblijf
                <Icon name="arrow" />
              </Link>
            )}
          </div>
        </div>
      </section>
      <ContactBanner />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main id="main" className="container loading-page" role="status">
          <div className="loading-line" />
          <p>De pagina wordt geladen…</p>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
