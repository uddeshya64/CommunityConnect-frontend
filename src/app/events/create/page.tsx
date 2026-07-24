"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ListPlus, Sparkles } from "lucide-react";
import Sidebar from "@/app/home/SideBar"; // <-- swap in your existing sidebar import/path
import { EVENT_TEMPLATES, CUSTOM_TEMPLATE_ID } from "@/lib/eventTemplates";

// Optional: give a few templates a distinct icon/gradient. Falls back to a default look.
const TEMPLATE_STYLES: Record<string, { gradient: string }> = {
  hackathon: { gradient: "from-indigo-500 to-purple-600" },
  workshop: { gradient: "from-amber-500 to-orange-600" },
  conference: { gradient: "from-rose-500 to-pink-600" },
};

const DEFAULT_GRADIENT = "from-zinc-500 to-zinc-700";

export default function SelectTemplatePage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      <Sidebar />

      <main className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Create an event</h1>
          <p className="text-zinc-500 font-medium">Pick a template to get started, or build your own.</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-zinc-200 text-sm font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-zinc-400"
          />
        </div>

        {/* Template cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const style = TEMPLATE_STYLES[tpl.id] || { gradient: DEFAULT_GRADIENT };
            return (
              <motion.button
                key={tpl.id}
                type="button"
                onClick={() => handleSelect(tpl.id)}
                whileHover={{ y: -2 }}
                className="text-left rounded-3xl bg-white border border-zinc-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all overflow-hidden"
              >
                <div className={`h-20 bg-gradient-to-br ${style.gradient}`} ><img
  src={tpl.imageUrl}
  alt={tpl.label}
  className="w-full h-full object-cover"
/></div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-zinc-900 mb-1">{tpl.label}</h3>
                  
                </div>
              </motion.button>
            );
          })}

          {/* Custom template card - always shown, unaffected by search */}
          <motion.button
            type="button"
            onClick={() => handleSelect(CUSTOM_TEMPLATE_ID)}
            whileHover={{ y: -2 }}
            className="text-left rounded-3xl bg-white border-2 border-dashed border-zinc-300 hover:border-indigo-300 hover:shadow-lg transition-all overflow-hidden flex flex-col"
          >
            <div className="h-20 bg-zinc-50 flex items-center justify-center">
              <ListPlus className="w-8 h-8 text-zinc-400" />
            </div>
            <div className="p-5">
              <h3 className="text-base font-bold text-zinc-900 mb-1 flex items-center gap-1.5">
                Custom <Sparkles className="w-4 h-4 text-indigo-500" />
              </h3>
              <p className="text-sm text-zinc-500 font-medium">Build your own fields from scratch</p>
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