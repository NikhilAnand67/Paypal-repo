import { ImageResponse } from "next/og";

export const alt = "PayPilot AI. Your money. Your AI. Your control.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 72px",
          backgroundColor: "#06060b",
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(139,92,246,0.32), transparent 55%), radial-gradient(circle at 82% 88%, rgba(34,211,238,0.22), transparent 55%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundImage: "linear-gradient(135deg, #8b5cf6, #d946ef, #22d3ee)",
              fontSize: 30,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            P
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>PayPilot</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 3,
                color: "#67e8f9",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              AI
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              alignItems: "center",
              border: "1px solid rgba(52,211,153,0.28)",
              backgroundColor: "rgba(52,211,153,0.08)",
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 16,
              color: "#a7f3d0",
            }}
          >
            PayPal Sandbox
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 20, letterSpacing: 5, color: "#67e8f9" }}>
            THINK SMARTER. PAY FASTER. STAY IN CONTROL.
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: -2.6,
              lineHeight: 1.04,
            }}
          >
            <span>Your money.</span>
            <span style={{ color: "#c4b5fd" }}>Your AI.</span>
            <span>Your control.</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22, color: "#94a3b8" }}>
          <span>Prepare a payment request in plain language.</span>
          <span style={{ color: "#a78bfa" }}>Review it.</span>
          <span style={{ color: "#67e8f9" }}>Approve it.</span>
          <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 18 }}>
            Agent + PayPal Orders API
          </span>
        </div>
      </div>
    ),
    size
  );
}
