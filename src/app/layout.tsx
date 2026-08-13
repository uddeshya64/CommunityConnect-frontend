import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import NotificationPromptPopup from "@/components/NotificationPromptPopup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Community Connect",
  description: "Dynamic Community Event Management Platform",
};

const appearanceScript = `
  (function() {
    try {
      var stored = localStorage.getItem("cc_user_settings");
      var settings = stored ? JSON.parse(stored) : {};
      var theme = settings.theme || "dark";
      var accent = settings.accentColor || "indigo";
      var compact = settings.compactMode || false;
      var smooth = settings.smoothAnimations !== false;
      
      var isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      var root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
        root.setAttribute("data-theme", "light");
      }
      root.setAttribute("data-accent", accent);
      if (compact) root.classList.add("compact-mode");
      if (!smooth) root.classList.add("no-animations");
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: appearanceScript,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppearanceProvider>
          <ToastProvider>
            {children}
            <NotificationPromptPopup />
          </ToastProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
