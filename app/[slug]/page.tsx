import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { CmsImage } from "@/components/cms-image";
import { RichText } from "@/components/rich-text";
import { Icon } from "@/components/icon";
import { ContactBanner } from "@/components/site-shell";
import { getPage, getSiteContent } from "@/lib/cms/data";
import { faqSections, pageHref, plainText } from "@/lib/cms/content";
import { site } from "@/lib/site";
import Loading from "./loading";

export async function generateStaticParams() {
  return (await getSiteContent()).pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Pagina niet gevonden" };
  return {
    title: page.title,
    description: plainText(page.content).slice(0, 160),
    alternates: { canonical: pageHref(slug) },
  };
}

async function PageContent({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  if (slug === "home") permanentRedirect("/");
  const page = await getPage(slug);
  if (!page) notFound();
  const isPatients = slug === "informatie-voor-patienten";
  const isReferrers = slug === "informatie-voor-verwijzers";
  const isContact = slug === "contact";
  const faq = isPatients ? faqSections(page.content) : null;
  return (
    <>
      <section className="page-heading">
        <div className="container">
          <nav className="breadcrumb" aria-label="Broodkruimelpad">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>{page.title}</span>
          </nav>
          <h1>{page.title}</h1>
        </div>
      </section>
      <div className="container content-layout">
        <article className="page-article">
          {page.image && (
            <CmsImage
              image={page.image}
              className="page-cover"
              sizes="(max-width: 900px) 100vw, 800px"
              preload
            />
          )}
          {faq && faq.questions.length ? (
            <>
              <RichText nodes={faq.introduction} />
              <div className="faq-list">
                {faq.questions.map(({ question, answer }) => (
                  <details key={question}>
                    <summary>
                      {question}
                      <Icon name="plus" />
                    </summary>
                    <RichText nodes={answer} />
                  </details>
                ))}
              </div>
              <RichText nodes={faq.remainder} />
            </>
          ) : (
            <RichText nodes={page.content} />
          )}
        </article>
        <aside
          className="page-sidebar"
          aria-label="Contact en praktische informatie"
        >
          <div className="sidebar-panel">
            <Icon name={isReferrers ? "people" : isContact ? "pin" : "heart"} />
            <h2>
              {isReferrers
                ? "Een patiënt aanmelden"
                : isContact
                  ? "Van harte welkom"
                  : "We denken met u mee"}
            </h2>
            <p>
              {isReferrers
                ? "Neem contact op om de beschikbaarheid en mogelijkheden te bespreken."
                : isContact
                  ? `${site.address}, ${site.city}`
                  : "Heeft u vragen over de zorg of uw verblijf? Bel ons gerust."}
            </p>
            <a href={site.phoneHref} className="sidebar-phone">
              <Icon name="phone" />
              {site.phone}
            </a>
            <a
              className="button button-primary"
              href={`mailto:${isReferrers ? site.referralEmail : site.email}`}
            >
              <Icon name="mail" />
              {isReferrers ? "E-mail voor aanmelding" : "Stuur een e-mail"}
            </a>
            {isContact && (
              <a
                className="text-link"
                href="https://www.google.com/maps/dir/?api=1&destination=Mamelisserweg+9a+6294NH+Vijlen"
                target="_blank"
                rel="noopener noreferrer"
              >
                Plan uw route <Icon name="arrow" />
                <span className="visually-hidden">
                  (opent in een nieuw tabblad)
                </span>
              </a>
            )}
          </div>
          <div className="sidebar-links">
            <h2>Ook handig om te weten</h2>
            {[
              { slug: "eerstelijnsverblijf", title: "Eerstelijnsverblijf" },
              { slug: "respijtzorg", title: "Respijtzorg" },
              {
                slug: "informatie-voor-patienten",
                title: "Uw verblijf & veelgestelde vragen",
              },
              {
                slug: "informatie-voor-verwijzers",
                title: "Informatie voor verwijzers",
              },
            ]
              .filter((p) => p.slug !== slug)
              .map((p) => (
                <Link key={p.slug} href={pageHref(p.slug)}>
                  {p.title}
                  <Icon name="arrow" />
                </Link>
              ))}
          </div>
        </aside>
      </div>
      <ContactBanner />
    </>
  );
}

export default function Page(props: PageProps<"/[slug]">) {
  return (
    <main id="main">
      <Suspense fallback={<Loading />}>
        <PageContent {...props} />
      </Suspense>
    </main>
  );
}
