import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/siteConfig";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#16231c",
        }}
      >
        <div
          style={{
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#e8a33d",
            textTransform: "uppercase",
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            fontSize: 32,
            marginTop: 28,
            color: "#e9e4d4",
            opacity: 0.85,
          }}
        >
          Routes worth riding, recommended by locals
        </div>
      </div>
    ),
    { ...size }
  );
}
