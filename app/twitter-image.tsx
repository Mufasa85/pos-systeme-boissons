import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "JOAC — Point de vente moderne pour boissons";
export const size = { width: 1200, height: 675 };
export const contentType = "image/png";

/**
 * Dynamic Twitter / X image (1200×675 — the required aspect
 * ratio for `summary_large_image` cards).
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
        padding: "72px 88px",
        background:
          "linear-gradient(135deg, #0EA5E9 0%, #0369A1 55%, #0B1220 100%)",
        color: "#F8FAFC",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
            fontWeight: 800,
            color: "#0EA5E9",
          }}
        >
          J
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44, fontWeight: 800 }}>JOAC</div>
          <div
            style={{
              fontSize: 18,
              color: "#E0F2FE",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            @joac_cd
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          Caisse, stock & analytics.
          <br />
          Pensé pour Kinshasa.
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#E0F2FE",
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Facturation FC / USD, gestion du stock, et tableau de bord temps réel
          pour les bars & restaurants.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 22,
          color: "#E0F2FE",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#22C55E",
          }}
        />
        joac.cd — Specialty drinks & more
      </div>
    </div>,
    { ...size },
  );
}
