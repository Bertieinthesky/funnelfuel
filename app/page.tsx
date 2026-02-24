export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.05em" }}>
        Funnel<span style={{ color: "var(--accent)" }}>Fuel</span>
      </div>
      <p style={{ color: "var(--text-muted)", maxWidth: 420, textAlign: "center" }}>
        Tracking engine is live. Dashboard coming next.
      </p>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "1rem",
        }}
      >
        {[
          { label: "Pixel endpoint", path: "/api/pixel" },
          { label: "Split test router", path: "/go/[slug]" },
          { label: "Stripe webhook", path: "/api/webhooks/stripe" },
          { label: "GHL webhook", path: "/api/webhooks/ghl" },
          { label: "Whop webhook", path: "/api/webhooks/whop" },
          { label: "Calendly webhook", path: "/api/webhooks/calendly" },
        ].map((route) => (
          <div
            key={route.path}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0.5rem 0.875rem",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{route.label}</span>
            <code
              style={{
                display: "block",
                color: "var(--accent)",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {route.path}
            </code>
          </div>
        ))}
      </div>
    </main>
  );
}
