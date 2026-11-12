import { Metadata } from "next";
import { headers } from "next/headers";
import { API_BASE_URL, APP_URL } from "@/config/env";

type Props = {
  params: Promise<{ eventId: string }>;
  children: React.ReactNode;
};

// High-resolution public fallback image that WhatsApp & Google Chat can always download over the internet
const PUBLIC_FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;

  // 1. Detect public origin dynamically from request headers (supports custom domains, ngrok, tunnels, and production)
  let currentOrigin = APP_URL;
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) {
      currentOrigin = `${proto}://${host}`;
    }
  } catch (err) {
    // fallback to APP_URL
  }

  const eventUrl = `${currentOrigin}/events/${eventId}`;

  try {
    // 2. Fetch event data directly from backend
    const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      cache: "no-store",
    });

    let event: any = null;
    if (res.ok) {
      const data = await res.json();
      event = data?.data?.event || data?.data || data?.event || data;
    }

    const title = event?.title
      ? `${event.title} | Eventrix`
      : "Event Details | Eventrix";

    const rawDescription = event?.description || "";
    const cleanDescription =
      rawDescription.replace(/<[^>]*>?/gm, "").trim().slice(0, 200) ||
      "Join this event on Eventrix — participate, register tickets, and collaborate in real-time.";

    // 3. Process banner photo for WhatsApp & Google Chat crawlers
    let rawBannerUrl = event?.banner_url || event?.bannerUrl || event?.banner;
    let bannerUrl = rawBannerUrl;

    if (bannerUrl && !bannerUrl.startsWith("http://") && !bannerUrl.startsWith("https://")) {
      bannerUrl = `${currentOrigin}${bannerUrl.startsWith("/") ? "" : "/"}${bannerUrl}`;
    }

    // If no banner is set, or if it points to localhost (which WhatsApp/Google Chat servers cannot reach),
    // provide the high-resolution public photo
    if (!bannerUrl || bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) {
      bannerUrl = PUBLIC_FALLBACK_BANNER;
    }

    const isPng = bannerUrl.toLowerCase().endsWith(".png");
    const mimeType = isPng ? "image/png" : "image/jpeg";

    return {
      metadataBase: new URL(currentOrigin.startsWith("http") ? currentOrigin : `https://${currentOrigin}`),
      title,
      description: cleanDescription,
      applicationName: "Eventrix",
      authors: [{ name: event?.creator?.name || "Eventrix" }],
      keywords: [
        "event",
        "hackathon",
        event?.type?.name || event?.category || "conference",
        "Eventrix",
        event?.title || "Event",
      ],
      openGraph: {
        title,
        description: cleanDescription,
        url: eventUrl,
        siteName: "Eventrix",
        locale: "en_US",
        type: "website",
        images: [
          {
            url: bannerUrl,
            secureUrl: bannerUrl.startsWith("https://") ? bannerUrl : undefined,
            width: 1200,
            height: 630,
            alt: title,
            type: mimeType,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: cleanDescription,
        images: [bannerUrl],
        creator: "@Eventrix",
        site: "@Eventrix",
      },
      alternates: {
        canonical: eventUrl,
      },
      other: {
        "og:image:width": "1200",
        "og:image:height": "630",
        "og:image:type": mimeType,
        image: bannerUrl,
      },
    };
  } catch (error) {
    const fallbackBanner = PUBLIC_FALLBACK_BANNER;
    return {
      metadataBase: new URL(currentOrigin.startsWith("http") ? currentOrigin : `https://${currentOrigin}`),
      title: "Event Details | Eventrix",
      description: "Join tech events, hackathons, and conferences on Eventrix.",
      openGraph: {
        title: "Event Details | Eventrix",
        description: "Join tech events, hackathons, and conferences on Eventrix.",
        url: eventUrl,
        siteName: "Eventrix",
        images: [
          {
            url: fallbackBanner,
            secureUrl: fallbackBanner,
            width: 1200,
            height: 630,
            alt: "Eventrix Event",
            type: "image/jpeg",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Event Details | Eventrix",
        description: "Join tech events, hackathons, and conferences on Eventrix.",
        images: [fallbackBanner],
      },
      other: {
        image: fallbackBanner,
      },
    };
  }
}

export default function EventLayout({ children }: Props) {
  return <>{children}</>;
}
