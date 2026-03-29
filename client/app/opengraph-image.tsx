import { ImageResponse } from "next/og";

export const alt = "AjoFlow — AI-Powered Savings Circles";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #1B2A4A 0%, #223760 55%, #17253F 100%)",
          color: "#F7F5F2",
          fontFamily:
            'Geist, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 18% 20%, rgba(201,146,42,0.28), transparent 34%), radial-gradient(circle at 80% 75%, rgba(201,146,42,0.16), transparent 30%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 14,
            background: "#C9922A",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "74px 80px 64px 96px",
            width: "100%",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(247,245,242,0.74)",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 9999,
                background: "#C9922A",
                display: "flex",
              }}
            />
            Secured by Interswitch
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              maxWidth: 860,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                fontSize: 84,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              <span style={{ color: "#C9922A", display: "flex" }}>Ajo</span>
              <span style={{ display: "flex" }}>Flow</span>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 40,
                lineHeight: 1.2,
                fontWeight: 600,
                color: "#F7F5F2",
              }}
            >
              AI-Powered Savings Circles
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 26,
                lineHeight: 1.45,
                color: "rgba(247,245,242,0.76)",
                maxWidth: 760,
              }}
            >
              Digitising traditional Ajo and Esusu with trustless wallets,
              automated payouts, and transparent AI trust scoring.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
              color: "rgba(247,245,242,0.82)",
              fontSize: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: 9999,
                background: "rgba(247,245,242,0.08)",
                border: "1px solid rgba(247,245,242,0.12)",
              }}
            >
              Trustless Wallet
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 18px",
                borderRadius: 9999,
                background: "rgba(247,245,242,0.08)",
                border: "1px solid rgba(247,245,242,0.12)",
              }}
            >
              AI Queue Protection
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
