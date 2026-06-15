import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Apple touch icon (180×180). Edge-rendered so iOS picks up the
 * current brand automatically — no need to ship a binary `.png`.
 */
export default async function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 38,
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, #38BDF8)`,
        color: "#FFFFFF",
        fontSize: 110,
        fontWeight: 800,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      J
    </div>,
    { ...size },
  );
}
