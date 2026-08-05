import { Suspense } from "react";
import SettingsContent from "./SettingsContent";

function SettingsLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 overflow-hidden relative pb-24">
      {/* Ambient background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/5 via-zinc-50 to-zinc-50 pointer-events-none" />

      {/* Top Navbar Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/70 backdrop-blur-xl h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="w-24 h-6 bg-zinc-200 rounded-md animate-pulse" />
          <div className="flex gap-2">
            <div className="w-20 h-8 bg-zinc-200 rounded-full animate-pulse" />
            <div className="w-24 h-8 bg-zinc-200 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 relative z-10">
        <div className="space-y-3 mb-8">
          <div className="w-48 h-8 bg-zinc-200 rounded-xl animate-pulse" />
          <div className="w-80 h-4 bg-zinc-200/50 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-full h-14 bg-zinc-100/60 border border-zinc-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>

          {/* Main Card Skeleton */}
          <div className="lg:col-span-9 space-y-6">
            <div className="w-full h-64 bg-zinc-100/40 border border-zinc-200 rounded-3xl p-8 animate-pulse" />
            <div className="w-full h-48 bg-zinc-100/40 border border-zinc-200 rounded-3xl p-8 animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
