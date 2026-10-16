import Image from "next/image";
import Link from "next/link";
import { getSiteContent } from "@/lib/cms/data";
import { pageHref } from "@/lib/cms/content";
import { site } from "@/lib/site";
import { Icon } from "./icon";
import { Navigation } from "./navigation";

export function HeaderFallback() {
  return (
    <header className="site-header" aria-busy="true">
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Kleinschalige zorg in het Limburgse heuvelland</span>
          <a href={site.phoneHref}>
            <Icon name="phone" />
            {site.phone}
          </a>
        </div>
      </div>
      <div className="container header-inner">
        <Link
          className="brand"
          href="/"
          aria-label="Mamelis Care — naar de homepage"
        >
          <Image src="/logo.svg" width={200} height={91} alt="Mamelis Care" />
        </Link>
        <span className="visually-hidden">Navigatie wordt geladen…</span>
      </div>
    </header>
  );
}

export async function Header() {
  const { navigation } = await getSiteContent();
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Kleinschalige zorg in het Limburgse heuvelland</span>
          <a href={site.phoneHref}>
            <Icon name="phone" />
            {site.phone}
          </a>
        </div>
      </div>
      <div className="container header-inner">
        <Link
          className="brand"
          href="/"
          aria-label="Mamelis Care — naar de homepage"
        >
          <Image
            src="/logo.svg"
            width={200}
            height={91}
            alt="Mamelis Care"
            preload
          />
        </Link>
        <Navigation items={navigation} />
      </div>
    </header>
  );
}

export function ContactBanner() {
  return (
    <section className="contact-banner" aria-labelledby="contact-heading">
      <div className="container contact-banner-inner">
        <div>
          <h2 id="contact-heading">We helpen u graag verder.</h2>
          <p>
            Een vraag over uw verblijf of een patiënt aanmelden?
            <br />
            Neem gerust contact met ons op.
          </p>
        </div>
        <div className="contact-banner-actions">
          <a className="button button-white" href={site.phoneHref}>
            <Icon name="phone" />
            {site.phone}
          </a>
          <Link className="text-link" href="/contact">
            Alle contactgegevens <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function Footer() {
  const { pages } = await getSiteContent();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Image src="/logo.svg" width={180} height={82} alt="Mamelis Care" />
            <p>
              Persoonlijke zorg.
              <br />
              Een vertrouwde omgeving.
            </p>
          </div>
          <div>
            <h2>U vindt ons in Vijlen</h2>
            <address>
              {site.address}
              <br />
              {site.city}
            </address>
            <Link href="/contact" className="footer-link">
              Contact & bereikbaarheid
            </Link>
          </div>
          <div>
            <h2>Neem contact op</h2>
            <a href={site.phoneHref}>{site.phone}</a>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <a href={`mailto:${site.referralEmail}`}>Een patiënt aanmelden</a>
          </div>
          <div>
            <h2>Goed om te weten</h2>
            {pages
              .filter((p) =>
                [
                  "informatie-voor-patienten",
                  "informatie-voor-verwijzers",
                  "wnt",
                ].includes(p.slug),
              )
              .map((p) => (
                <Link key={p.id} href={pageHref(p.slug)}>
                  {p.title === "WNT" ? "WNT-verantwoording" : p.title}
                </Link>
              ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© Mamelis Care</span>
          <span>
            Privacy- en beleidsverklaring op te vragen via{" "}
            <a href={`mailto:${site.email}`}>e-mail</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
