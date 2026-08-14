"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ListPlus, Sparkles } from "lucide-react";
import Sidebar from "@/app/home/SideBar";
import { EVENT_TEMPLATES, CUSTOM_TEMPLATE_ID } from "@/lib/eventTemplates";
import { useAppearance } from "@/components/providers/AppearanceProvider";

const TEMPLATE_STYLES: Record<string, { gradient: string }> = {
  hackathon: { gradient: "from-indigo-500 to-purple-600" },
  workshop: { gradient: "from-amber-500 to-orange-600" },
  conference: { gradient: "from-rose-500 to-pink-600" },
};

const DEFAULT_GRADIENT = "from-zinc-500 to-zinc-700";

export default function SelectTemplatePage() {
  const router = useRouter();
  const { isDark, activeAccent } = useAppearance();
  const [query, setQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EVENT_TEMPLATES;
    return EVENT_TEMPLATES.filter((tpl) => tpl.label.toLowerCase().includes(q));
  }, [query]);

  const handleSelect = (templateId: string) => {
    router.push(`/events/create/new?template=${templateId}`);
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${
      isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    }`}>
      <Sidebar />

      <main className="flex-1 px-4 sm:px-8 py-10 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${
            isDark ? "text-white" : "text-zinc-900"
          }`}>
            Create an Event
          </h1>
          <p className={`font-medium ${
            isDark ? "text-zinc-400" : "text-zinc-500"
          }`}>
            Pick a template to get started, or build your own from scratch.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 ${activeAccent.ring} transition-colors ${
              isDark
                ? "bg-zinc-900/80 border border-white/10 text-white placeholder:text-zinc-500"
                : "bg-white border border-zinc-200 text-zinc-800 placeholder:text-zinc-400 shadow-sm"
            }`}
          />
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => {
            const style = TEMPLATE_STYLES[tpl.id] || { gradient: DEFAULT_GRADIENT };
            return (
              <motion.button
                key={tpl.id}
                type="button"
                onClick={() => handleSelect(tpl.id)}
                whileHover={{ y: -3 }}
                className={`text-left rounded-3xl border shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer ${
                  isDark
                    ? "bg-zinc-900/60 border-white/10 hover:border-white/20"
                    : "bg-white border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className={`h-24 bg-gradient-to-br ${style.gradient} relative overflow-hidden`}>
                  <img
                    src={tpl.imageUrl}
                    alt={tpl.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <h3 className={`text-base font-bold mb-1 ${isDark ? "text-white" : "text-zinc-900"}`}>
                    {tpl.label}
                  </h3>
                </div>
              </motion.button>
            );
          })}

          {/* Custom template card */}
          <motion.button
            type="button"
            onClick={() => handleSelect(CUSTOM_TEMPLATE_ID)}
            whileHover={{ y: -3 }}
            className={`text-left rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col cursor-pointer ${
              isDark
                ? "bg-zinc-900/40 border-zinc-700 hover:border-indigo-400 hover:shadow-xl"
                : "bg-white border-zinc-300 hover:border-indigo-400 hover:shadow-lg"
            }`}
          >
            <div className={`h-24 flex items-center justify-center ${
              isDark ? "bg-zinc-950/40" : "bg-zinc-50"
            }`}>
              <ListPlus className={`w-8 h-8 ${activeAccent.text}`} />
            </div>
            <div className="p-5">
              <h3 className={`text-base font-bold mb-1 flex items-center gap-1.5 ${isDark ? "text-white" : "text-zinc-900"}`}>
                Custom <Sparkles className={`w-4 h-4 ${activeAccent.text}`} />
              </h3>
              <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Build your own fields and agenda from scratch
              </p>
            </div>
          </motion.button>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 text-zinc-400 font-medium text-sm">
            No templates match &quot;{query}&quot; — try Custom instead.
          </div>
        )}
      </main>
    </div>
  );
}