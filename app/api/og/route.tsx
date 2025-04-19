import { ImageResponse } from "next/og"

export const runtime = "edge"

// Set cache headers
export async function GET() {
  return new ImageResponse(
    <div
      style={{
        fontSize: 128,
        background: "linear-gradient(to bottom, #18181b, #09090b)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "40px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "rgba(0, 0, 0, 0.3)",
          padding: "40px",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div style={{ fontSize: 80, fontWeight: "bold", marginBottom: 20 }}>
          <span style={{ color: "#ff5722" }}>W</span>ORD <span style={{ color: "#4caf50" }}>L</span>ADDER{" "}
          <span style={{ color: "#ff5722" }}>W</span>AR
        </div>
        <div style={{ fontSize: 32, opacity: 0.8, maxWidth: "80%", textAlign: "center" }}>
          Form words from a single word. Climb the ladder. Flex your vocabulary skills.
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      // Add cache headers
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  )
}
