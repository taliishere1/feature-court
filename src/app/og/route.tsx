import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { join } from "path";

export const contentType = "image/png";

export async function GET() {
  const sealPath = join(process.cwd(), "public/images/seal.png");
  const sealBuffer = readFileSync(sealPath);
  const sealBase64 = sealBuffer.toString("base64");
  const sealDataUrl = `data:image/png;base64,${sealBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0a06 0%, #1a1208 50%, #0f0a06 100%)",
          fontFamily: "'Georgia', serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #c8a03c, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #c8a03c, transparent)",
          }}
        />
        <img
          src={sealDataUrl}
          width={180}
          height={180}
          style={{ marginBottom: 20, opacity: 0.9 }}
          alt=""
        />
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "0.08em",
            color: "#c8a03c",
            marginBottom: 12,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            fontFamily: "'Georgia', serif",
            lineHeight: 1,
          }}
        >
          FEATURE COURT
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#8b7355",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            fontFamily: "'Courier New', monospace",
            marginBottom: 28,
          }}
        >
          In the Court of Product Decisions
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#a0937d",
            fontStyle: "italic",
            textAlign: "center",
            maxWidth: 600,
            lineHeight: 1.6,
          }}
        >
          Every feature stands trial. The prosecution charges. The defense argues. You deliver the verdict.
        </div>
        <div
          style={{
            marginTop: 32,
            width: 100,
            height: 1,
            background: "#c8a03c",
            opacity: 0.5,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}