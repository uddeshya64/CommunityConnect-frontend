"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export default function Navbar({ theme }: { theme?: "light" | "dark" }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const appearance = useAppearance();
  const isDark = theme ? theme === "dark" : appearance.isDark;
  const activeAccent = appearance.activeAccent;

  useEffect(() => {
    const controlNavbar = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false); // Hide on scroll down
      } else {
        setIsVisible(true); // Show on scroll up
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className={`fixed top-0 w-full z-[100] transition-all duration-300 px-6 py-4 ${isDark ? "bg-zinc-950/80 border-white/5" : "bg-white/80 border-zinc-200"
            } backdrop-blur-md border-b`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link
              href="/home"
              className={`flex items-center gap-2 font-black text-2xl tracking-tighter ${isDark ? "text-white" : "text-zinc-900"
                }`}
            >
              <div
                className={`w-8 h-8 ${activeAccent.bg} rounded-lg flex items-center justify-center text-white shadow-md`}
              >
                C
              </div>
              Community<span className={activeAccent.text}>Connect</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className={
                    isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" /> My Events
                </Button>
              </Link>
              <div
                className={`h-8 w-px ${isDark ? "bg-white/10" : "bg-zinc-200"}`}
              />
              <Link href="/settings" title="Settings">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-105 ${isDark
                      ? "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
                    }`}
                >
                  <Settings className="w-4 h-4" />
                </div>
              </Link>
              <Link href="/profile/me">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-all hover:scale-105 ${isDark
                      ? "bg-white/5 text-zinc-300 hover:bg-white/10"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="text-sm font-bold">Profile</span>
                </div>
              </Link>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}