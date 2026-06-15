import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "JOAC — Point de vente moderne pour boissons";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic OpenGraph image (1200×630).
 *
 * Generated on the edge with `next/og` so the preview card always
 * reflects the current brand. We deliberately avoid remote fonts
 * to keep the route fast & self-contained — the only font is
 * referenced by a relative system-stack fallback.
 */
export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 80px",
        background:
          "linear-gradient(135deg, #0B1220 0%, #0F172A 45%, #0EA5E9 100%)",
        color: "#F8FAFC",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top: brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "linear-gradient(135deg, #0EA5E9, #38BDF8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 800,
            color: "#0B1220",
            boxShadow: "0 12px 30px rgba(14,165,233,0.45)",
          }}
        >
          J
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            JOAC
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#94A3B8",
              letterSpacing: 4,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            Specialty drinks & more
          </div>
        </div>
      </div>

      {/* Middle: tagline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 950,
          }}
        >
          Le point de vente
          <br />
          <span style={{ color: "#38BDF8" }}>des boissons</span> à Kinshasa.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#CBD5E1",
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Caisse, stock, analytics, facturation FC/USD — tout dans une seule
          interface moderne.
        </div>
      </div>

      {/* Bottom: chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          {["POS", "Stock", "Dashboard", "Rapports", "Multi-devise"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "rgba(248,250,252,0.08)",
                  border: "1px solid rgba(248,250,252,0.15)",
                  color: "#F8FAFC",
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#22C55E",
            }}
          />
          <div style={{ fontSize: 20, color: "#94A3B8" }}>joac.cd</div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
