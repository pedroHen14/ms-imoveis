import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b4332",
          borderRadius: "7px",
          border: "1.5px solid #c89f65",
        }}
      >
        <span
          style={{
            color: "#faf9f6",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
          MS
        </span>
      </div>
    ),
    { ...size },
  );
}
