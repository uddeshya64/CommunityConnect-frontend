"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, LogOut, User as UserIcon, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar({ theme = "light" }: { theme?: "light" | "dark" }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className={`fixed top-0 w-full z-[100] transition-all duration-300 px-6 py-4 ${
            isDark ? "bg-zinc-950/80 border-white/5" : "bg-white/80 border-zinc-200"
          } backdrop-blur-md border-b`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/home" className={`flex items-center gap-2 font-black text-2xl tracking-tighter ${isDark ? "text-white" : "text-zinc-900"}`}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">C</div>
              Community<span className="text-indigo-600">Connect</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" className={isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> My Events
                </Button>
              </Link>
              <div className={`h-8 w-px ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isDark ? "bg-white/5 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>
                <UserIcon className="w-4 h-4" />
                <span className="text-sm font-bold">Profile</span>
              </div>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}