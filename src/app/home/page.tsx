import { Suspense } from "react";
import HomeContent from "./HomeContent";

function HomeLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 overflow-hidden relative">
      {/* Ambient Background Glow (Optional, matches your profile page) */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-zinc-950 to-zinc-950 pointer-events-none" />

      {/* Navbar Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl h-16 flex items-center px-6">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <div className="w-32 h-6 bg-zinc-800 rounded-md animate-pulse" />
          <div className="w-10 h-10 bg-zinc-800 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-24 relative z-10">
        
        {/* Hero / Header Section Skeleton */}
        <div className="flex flex-col items-center justify-center space-y-5 mb-14 mt-6">
          <div className="w-3/4 md:w-1/2 h-10 md:h-12 bg-zinc-800/80 rounded-xl animate-pulse" />
          <div className="w-1/2 md:w-1/3 h-5 bg-zinc-800/50 rounded-lg animate-pulse" />
          
          {/* Search/Filter Bar Skeleton */}
          <div className="w-full max-w-2xl h-14 mt-6 bg-zinc-900/80 border border-white/5 rounded-2xl animate-pulse" />
        </div>

        {/* Grid Skeleton (e.g., for Users/Profiles or Events) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 h-[280px] flex flex-col"
            >
              {/* Card Header (Avatar + Title) */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                <div className="space-y-3 flex-1">
                  <div className="h-5 bg-zinc-800 rounded-md w-3/4 animate-pulse" />
                  <div className="h-4 bg-zinc-800/50 rounded-md w-1/2 animate-pulse" />
                </div>
              </div>
              
              {/* Card Body (Text Lines) */}
              <div className="space-y-3 mb-auto">
                <div className="h-3 bg-zinc-800/40 rounded w-full animate-pulse" />
                <div className="h-3 bg-zinc-800/40 rounded w-5/6 animate-pulse" />
                <div className="h-3 bg-zinc-800/40 rounded w-4/6 animate-pulse" />
              </div>

              {/* Card Footer (Tags / Buttons) */}
              <div className="flex gap-2 mt-6">
                <div className="h-8 w-20 bg-zinc-800/60 rounded-xl animate-pulse" />
                <div className="h-8 w-24 bg-zinc-800/60 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}