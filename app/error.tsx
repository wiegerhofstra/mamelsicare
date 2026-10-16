"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container message-page">
      <h1>
        De pagina kan niet
        <br />
        worden geladen.
      </h1>
      <p>
        Probeer het opnieuw, of bel ons op{" "}
        <a href="tel:+31433112814">043 311 28 14</a>.
      </p>
      <button className="button button-primary" onClick={reset}>
        Opnieuw proberen
      </button>
    </main>
  );
}
