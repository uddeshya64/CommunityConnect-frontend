import { ImageResponse } from "next/og";
import { API_BASE_URL } from "@/config/env";

export const runtime = "nodejs";
export const alt = "Eventrix Event";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function Image({ params }: Props) {
  const { eventId } = await params;

  let eventTitle = "Featured Event on Eventrix";
  let eventCategory = "Hackathon";
  let eventMode = "In-Person";
  let eventDate = "Upcoming";
  let eventLocation = "Eventrix Platform";
  let bannerUrl = "";

  try {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const event = data?.data?.event || data?.data || data?.event || data;
      if (event) {
        eventTitle = event.title || eventTitle;
        eventCategory = event.type?.name || event.category || eventCategory;
        eventMode = event.mode || eventMode;
        eventLocation = event.location || eventLocation;
        bannerUrl = event.banner_url || event.bannerUrl || "";
        if (event.start_date) {
          const d = new Date(event.start_date);
          if (!isNaN(d.getTime())) {
            eventDate = d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }
        }
      }
    }
  } catch (err) {
    // fallback defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          background: "linear-gradient(135deg, #0b0b1a 0%, #1e1b4b 60%, #31104b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient Radial Glow */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-150px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.45) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
          }}
        />

        {/* Top Header Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: "bold",
              }}
            >
              ✦
            </div>
            <div style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.02em" }}>
              Eventrix
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: "10px" }}>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontSize: "14px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#e2e8f0",
              }}
            >
              {eventCategory}
            </div>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                fontSize: "14px",
                fontWeight: "600",
                color: "#34d399",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {eventMode}
            </div>
          </div>
        </div>

        {/* Middle Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", zIndex: 10, maxWidth: "980px" }}>
          <div
            style={{
              fontSize: "56px",
              fontWeight: "800",
              lineHeight: "1.15",
              letterSpacing: "-0.03em",
              color: "#ffffff",
              textShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            }}
          >
            {eventTitle}
          </div>
        </div>

        {/* Bottom Footer Info Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "32px", fontSize: "18px", color: "rgba(255, 255, 255, 0.85)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📅</span>
              <span>{eventDate}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📍</span>
              <span>{eventLocation}</span>
            </div>
          </div>

          <div
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#a855f7",
              letterSpacing: "0.02em",
            }}
          >
            eventrix.live
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

