import { ImageResponse } from "next/og";

import { siteConfig } from "../../lib/site";

export async function GET(request: Request) {
  const title =
    new URL(request.url).searchParams.get("title")?.trim().slice(0, 90) ||
    "Focus better. Finish what matters.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          padding: "72px 78px",
          background: "#f7f5ef",
          color: "#132019",
          fontFamily: "Arial, sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            top: -230,
            right: -80,
            borderRadius: "50%",
            background: "#dfff91",
            opacity: 0.55,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 27,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "#132019",
              color: "#dfff91",
              fontSize: 25,
            }}
          >
            D
          </div>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              maxWidth: 1010,
              marginBottom: 28,
              fontFamily: "Georgia, serif",
              fontSize: title.length > 55 ? 68 : 82,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "#59665f",
              fontSize: 23,
            }}
          >
            Calm tools for focused work
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#8eaa58",
              }}
            />
            deepflow.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
