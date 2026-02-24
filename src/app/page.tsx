import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/layout/PageTransition";

export default function Home() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden">
      
      {/* 🌟 LUMA-STYLE BACKGROUND GLOWS 🌟 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-rose-500/20 blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-6xl mx-auto">
        <div className="text-xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-2">
          {/* A tiny logo accent */}
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-violet-600"></div>
          CommunityConnect
        </div>
        <div className="space-x-4">
          <Link href="/login" className="text-sm font-semibold text-zinc-600 hover:text-indigo-600 transition-colors">
            Log in
          </Link>
          <Link href="/register">
            <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm px-6">
              Sign up
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-32 pb-20 max-w-4xl mx-auto space-y-8">
        
        {/* Modern Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 shadow-sm text-sm font-medium text-zinc-600">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
          Discover events near you
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-zinc-900">
          Experience the <br className="hidden md:block" />
          {/* Gradient Text Effect */}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-rose-500">
            magic of community.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl font-medium">
          Discover, register, and manage your next hackathon, workshop, or local tech meetup all in one beautiful place.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full sm:w-auto">
          <Link href="/events" className="w-full sm:w-auto">
            <Button size="lg" className="w-full rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 px-8 py-6 text-lg font-semibold transition-all hover:scale-105">
              Explore Events
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full rounded-full px-8 py-6 text-lg font-semibold border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 shadow-sm transition-all hover:scale-105">
              Host an Event
            </Button>
          </Link>
        </div>
      </main>
    </div>
    </PageTransition>
  );
}