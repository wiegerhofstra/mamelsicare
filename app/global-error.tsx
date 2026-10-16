"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="nl">
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          maxWidth: 700,
          margin: "80px auto",
          padding: 24,
          color: "#254c50",
        }}
      >
        <main>
          <h1>Mamelis Care</h1>
          <p>
            De website is tijdelijk niet beschikbaar. U kunt ons bellen op{" "}
            <a href="tel:+31433112814">043 311 28 14</a>.
          </p>
          <button onClick={reset} style={{ padding: 16, cursor: "pointer" }}>
            Opnieuw proberen
          </button>
        </main>
      </body>
    </html>
  );
}
