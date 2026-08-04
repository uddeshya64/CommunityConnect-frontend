import { Suspense } from "react";
import DiscoverContent from "./DiscoverContent";

function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-zinc-950 to-zinc-950 pointer-events-none" />

      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl h-16 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="w-36 h-6 bg-zinc-800 rounded-md animate-pulse" />
          <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-24 relative z-10">
        <div className="flex flex-col items-center justify-center space-y-4 mb-10 mt-4">
          <div className="w-2/3 md:w-1/3 h-10 bg-zinc-800/80 rounded-xl animate-pulse" />
          <div className="w-1/2 md:w-1/4 h-4 bg-zinc-800/50 rounded-lg animate-pulse" />
        </div>

        <div className="w-full h-20 bg-zinc-900/40 border border-white/5 rounded-3xl mb-8 animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 h-[340px] flex flex-col"
            >
              <div className="w-full h-36 bg-zinc-800/80 rounded-2xl animate-pulse mb-4" />
              <div className="h-5 bg-zinc-800 rounded-md w-3/4 animate-pulse mb-3" />
              <div className="h-4 bg-zinc-800/50 rounded-md w-1/2 animate-pulse mb-auto" />
              <div className="flex justify-between items-center mt-4">
                <div className="h-6 w-20 bg-zinc-800/60 rounded-xl animate-pulse" />
                <div className="h-9 w-28 bg-zinc-800/80 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverLoading />}>
      <DiscoverContent />
    </Suspense>
  );
}
