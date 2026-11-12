import { Metadata } from "next";
import { headers } from "next/headers";
import { API_BASE_URL, APP_URL } from "@/config/env";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

const PUBLIC_FALLBACK_BANNER =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let currentOrigin = APP_URL;
  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) {
      currentOrigin = `${proto}://${host}`;
    }
  } catch (err) {}

  const pageUrl = `${currentOrigin}/dashboard/team/${id}`;

  try {
    const res = await fetch(`${API_BASE_URL}/team-dashboard/${id}`, {
      cache: "no-store",
    });

    let team: any = null;
    if (res.ok) {
      const data = await res.json();
      team = data?.data;
    }

    const eventTitle = team?.event?.title || "Event";
    const spaceName = team?.name || "Participant Space";
    const title = `${spaceName} · ${eventTitle} | Eventrix`;

    const description =
      team?.event?.description
        ? team.event.description.replace(/<[^>]*>?/gm, "").trim().slice(0, 180)
        : `Participant workspace and digital pass for ${spaceName} at ${eventTitle}.`;

    let bannerUrl = team?.event?.banner_url || team?.event?.bannerUrl;
    if (bannerUrl && !bannerUrl.startsWith("http://") && !bannerUrl.startsWith("https://")) {
      bannerUrl = `${currentOrigin}${bannerUrl.startsWith("/") ? "" : "/"}${bannerUrl}`;
    }

    if (!bannerUrl || bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) {
      bannerUrl = PUBLIC_FALLBACK_BANNER;
    }

    const isPng = bannerUrl.toLowerCase().endsWith(".png");
    const mimeType = isPng ? "image/png" : "image/jpeg";

    return {
      metadataBase: new URL(currentOrigin.startsWith("http") ? currentOrigin : `https://${currentOrigin}`),
      title,
      description,
      openGraph: {
        title,
        description,
        url: pageUrl,
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
        description,
        images: [bannerUrl],
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
      title: "Participant Dashboard | Eventrix",
      description: "Manage your team, agenda, and entry pass on Eventrix.",
      openGraph: {
        title: "Participant Dashboard | Eventrix",
        description: "Manage your team, agenda, and entry pass on Eventrix.",
        url: pageUrl,
        siteName: "Eventrix",
        images: [
          {
            url: fallbackBanner,
            secureUrl: fallbackBanner,
            width: 1200,
            height: 630,
            alt: "Eventrix",
            type: "image/jpeg",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Participant Dashboard | Eventrix",
        description: "Manage your team, agenda, and entry pass on Eventrix.",
        images: [fallbackBanner],
      },
      other: {
        image: fallbackBanner,
      },
    };
  }
}

export default function TeamDashboardLayout({ children }: Props) {
  return <>{children}</>;
}

