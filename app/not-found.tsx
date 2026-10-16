import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="container message-page">
      <p>Pagina niet gevonden</p>
      <h1>
        We helpen u graag
        <br />
        op weg.
      </h1>
      <p>Deze pagina bestaat niet of is verplaatst.</p>
      <Link href="/" className="button button-primary">
        Terug naar de homepage
      </Link>
    </main>
  );
}
