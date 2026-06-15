import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Dynamic favicon (32×32). Generated on the edge so the favicon
 * always matches the current brand colors and is resolution
 * independent — no binary asset to update.
 */
export default async function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, #38BDF8)`,
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: 800,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      J
    </div>,
    { ...size },
  );
}
