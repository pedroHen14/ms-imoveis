import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
          background: "linear-gradient(145deg, #1b4332 0%, #143326 100%)",
          borderRadius: "36px",
          padding: "16px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "24px",
            border: "3px solid rgba(200, 159, 101, 0.75)",
          }}
        >
          <span
            style={{
              color: "#faf9f6",
              fontSize: 72,
              fontWeight: 700,
              fontFamily: "Georgia, serif",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            MS
          </span>
          <span
            style={{
              marginTop: 8,
              color: "#c89f65",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            IMÓVEIS
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
