import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { Suspense } from "react";
import { Header, HeaderFallback, Footer } from "@/components/site-shell";
import { site } from "@/lib/site";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Mamelis Care | Persoonlijke zorg in Vijlen",
    template: "%s | Mamelis Care",
  },
  description:
    "Kleinschalige, persoonlijke zorg in Vijlen. Ontdek eerstelijnsverblijf en respijtzorg bij Mamelis Care, voor patiënten, naasten en verwijzers.",
  openGraph: { locale: "nl_NL", type: "website", siteName: site.name },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={figtree.variable}>
      <body>
        <a className="skip-link" href="#main">
          Ga naar de inhoud
        </a>
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        {children}
        <Suspense
          fallback={
            <footer className="container site-footer" aria-busy="true">
              Mamelis Care
            </footer>
          }
        >
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
