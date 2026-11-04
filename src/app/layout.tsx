import type { Metadata } from "next";
import "./globals.css";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { UserProvider } from "@/components/providers/UserProvider";
import NotificationPromptPopup from "@/components/NotificationPromptPopup";

export const metadata: Metadata = {
  title: "Eventrix",
  description: "Modern Event Management, Hackathon Portal & Real-Time Engagement Platform",
};

const appearanceScript = `
  (function() {
    try {
      var THEMES = {
        dark: {
          '--bg': '#09090b',
          '--chrome': 'rgba(12,12,14,.72)',
          '--card': 'rgba(24,24,27,.72)',
          '--card2': 'rgba(39,39,42,.55)',
          '--text': '#f4f4f5',
          '--muted': '#a1a1aa',
          '--subtle': '#71717a',
          '--border': 'rgba(255,255,255,.08)',
          '--input': 'rgba(255,255,255,.04)'
        },
        light: {
          '--bg': '#f6f7f9',
          '--chrome': 'rgba(255,255,255,.78)',
          '--card': 'rgba(255,255,255,.92)',
          '--card2': '#eef1f5',
          '--text': '#0f172a',
          '--muted': '#334155',
          '--subtle': '#64748b',
          '--border': 'rgba(15,23,42,.14)',
          '--input': '#ffffff'
        }
      };
      var ACC = {
        indigo: ['#6366f1', '#8b5cf6'],
        violet: ['#8b5cf6', '#d946ef'],
        emerald: ['#10b981', '#14b8a6'],
        rose: ['#f43f5e', '#ec4899'],
        cyan: ['#06b6d4', '#3b82f6'],
        amber: ['#f59e0b', '#ea580c']
      };

      var storedTheme = localStorage.getItem("cc_theme");
      var storedSettings = localStorage.getItem("cc_user_settings");
      var settings = storedSettings ? JSON.parse(storedSettings) : {};
      
      var theme = storedTheme || settings.theme || "dark";
      var accent = settings.accentColor || "indigo";
      var compact = settings.compactMode || false;
      var smooth = settings.smoothAnimations !== false;
      
      var isDark = true;
      if (theme === "light") {
        isDark = false;
      } else if (theme === "system") {
        isDark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
      } else {
        isDark = true;
      }

      var root = document.documentElement;
      var t = isDark ? "dark" : "light";
      var tokens = THEMES[t];
      for (var k in tokens) {
        root.style.setProperty(k, tokens[k]);
      }
      var a = ACC[accent] || ACC.indigo;
      root.style.setProperty("--accent", a[0]);
      root.style.setProperty("--accent2", a[1]);
      root.style.setProperty("--accent-hex", a[0]);
      root.style.setProperty("--accent-color", a[0]);
      root.style.setProperty("--pad", compact ? "14px" : "20px");
      root.style.setProperty("--gap", compact ? "12px" : "18px");
      root.style.colorScheme = t;

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
      if (!smooth) {
        root.classList.add("no-animations");
        root.classList.add("no-anim");
      }
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Playfair+Display:ital,wght@0,600;1,500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=block"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: appearanceScript,
          }}
        />
      </head>
      <body className="antialiased selection:bg-indigo-500/30 selection:text-white">
        <AppearanceProvider>
          <ToastProvider>
            <UserProvider>
              {children}
              <NotificationPromptPopup />
            </UserProvider>
          </ToastProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
