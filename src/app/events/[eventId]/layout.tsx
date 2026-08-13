import { Metadata } from "next";

type Props = {
  params: Promise<{ eventId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${apiBaseUrl}/events/${eventId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    const event = data?.data?.event || data?.data || data?.event || data;

    const title = event?.title ? `${event.title} | CommunityConnect` : "Event Details | CommunityConnect";
    const rawDescription = event?.description || "";
    const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, "").slice(0, 160);
    const description = cleanDescription || "Join this event on CommunityConnect!";
    
    let rawBannerUrl = event?.banner_url || event?.bannerUrl || event?.banner;
    let bannerUrl = rawBannerUrl;

    if (bannerUrl && !bannerUrl.startsWith("http://") && !bannerUrl.startsWith("https://")) {
      bannerUrl = `${appBaseUrl}${bannerUrl.startsWith("/") ? "" : "/"}${bannerUrl}`;
    }

    if (!bannerUrl) {
      bannerUrl = `${appBaseUrl}/icon.png`;
    }

    const eventUrl = `${appBaseUrl}/events/${eventId}`;

    return {
      metadataBase: new URL(appBaseUrl),
      title,
      description,
      openGraph: {
        title,
        description,
        url: eventUrl,
        siteName: "CommunityConnect",
        images: [
          {
            url: bannerUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [bannerUrl],
      },
    };
  } catch (error) {
    const fallbackBanner = `${appBaseUrl}/icon.png`;
    return {
      metadataBase: new URL(appBaseUrl),
      title: "Event Details | CommunityConnect",
      description: "Join tech events and hackathons on CommunityConnect.",
      openGraph: {
        title: "Event Details | CommunityConnect",
        description: "Join tech events and hackathons on CommunityConnect.",
        images: [{ url: fallbackBanner, width: 1200, height: 630, alt: "CommunityConnect" }],
      },
    };
  }
}

export default function EventLayout({ children }: Props) {
  return <>{children}</>;
}

