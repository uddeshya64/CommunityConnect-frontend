"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { isDark } = useAppearance();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error = useCallback((message: string) => toast(message, "error"), [toast]);
  const info = useCallback((message: string) => toast(message, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast container on bottom right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full"
            >
              <div
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-xl backdrop-blur-xl ${
                  t.type === "success"
                    ? isDark
                      ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-300"
                      : "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100/50"
                    : t.type === "error"
                    ? isDark
                      ? "bg-red-950/80 border-red-500/20 text-red-300"
                      : "bg-red-50 border-red-200 text-red-900 shadow-red-100/50"
                    : isDark
                    ? "bg-zinc-900/90 border-white/10 text-zinc-100"
                    : "bg-zinc-50 border-zinc-200 text-zinc-900 shadow-zinc-100/50"
                }`}
              >
                {t.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                {t.type === "error" && <AlertTriangle className="w-5 h-5 shrink-0" />}
                {t.type === "info" && <Info className="w-5 h-5 shrink-0" />}
                
                <p className="text-sm font-semibold flex-1 leading-snug">{t.message}</p>
                
                <button
                  onClick={() => removeToast(t.id)}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-600 hover:text-black"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
