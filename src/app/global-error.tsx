"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="et">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h1>Midagi läks valesti</h1>
        <p style={{ color: "#666", marginTop: "1rem" }}>
          Kontrolli Vercel-is: <strong>NEXTAUTH_SECRET</strong>, <strong>NEXTAUTH_URL</strong>, <strong>DATABASE_URL</strong>.
        </p>
        <p style={{ fontSize: "0.875rem", color: "#999" }}>Digest: {error.digest ?? "—"}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Proovi uuesti
        </button>
      </body>
    </html>
  );
}
