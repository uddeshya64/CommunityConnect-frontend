"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, MapPin, Calendar, Clock, Bell, Plus, ChevronRight, CalendarX, Sparkles, Compass, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventService } from "@/services/event.service";

interface AppEvent {
  id: string;
  title: string;
  category?: string;
  date: string;
  location: string;
  attendees?: number; 
}

const CATEGORIES = ["All", "Hackathons", "Meetups", "Workshops", "Tech Talks"];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { 
  hidden: { opacity: 0, y: 20 }, 
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring" as const, stiffness: 300, damping: 24 } 
  } 
};

export default function HomePage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hardcoded for now, but we can wire this to your /api/profile later!
  const userName = "Uddeshya"; 

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventService.getFeed();
        console.log("🔥 BACKEND FEED DATA:", response); 

        // 1. The Bulletproof Array Extractor
        let rawEvents: any[] = [];
        
        if (Array.isArray(response)) {
          rawEvents = response;
        } else if (response && Array.isArray(response.data)) {
          rawEvents = response.data; // Handles { data: [...] }
        } else if (response && Array.isArray(response.events)) {
          rawEvents = response.events; // Handles { events: [...] }
        } else if (response?.data && Array.isArray(response.data.data)) {
          rawEvents = response.data.data; // Handles { data: { data: [...] } } axios quirk
        } else if (response?.data && Array.isArray(response.data.events)) {
          rawEvents = response.data.events; // Handles { data: { events: [...] } }
        } else {
          console.error("🚨 Could not find the array in the response! Look at the console log above.");
        }

        // 2. Translate backend keys to frontend keys safely
        const formattedEvents = rawEvents.map((evt: any) => ({
          id: evt.id || evt._id, 
          title: evt.title,
          category: evt.type || evt.category || "Meetup", 
          date: evt.start_date || evt.date || new Date().toISOString(), 
          location: evt.location || evt.mode || "TBA", 
          attendees: evt.capacity || 0,
        }));

        // 3. Update the state!
        setEvents(formattedEvents); 
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden pb-20">
      {/* Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      <div className="fixed top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 font-extrabold text-xl text-zinc-900 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm flex items-center justify-center">
              <span className="text-white text-xs font-black">CC</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" className="rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100">
              <Bell className="w-5 h-5" />
            </Button>
            <Link href="/events/create">
            <Button className="hidden md:flex rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 px-5 gap-2 transition-all hover:scale-105">
                <Plus className="w-4 h-4" /> Create Event
            </Button>
            </Link>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-inner cursor-pointer ring-2 ring-white ml-2">
              UP
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12 relative z-10">
        
        {/* --- RESTORED PERSONALIZED HERO SECTION --- */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{userName}</span>
          </h1>
          <p className="text-lg text-zinc-500 font-medium max-w-2xl">
            Ready to explore? Discover, register, and manage your next tech meetup all in one place.
          </p>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="w-full flex flex-col items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
               <Compass className="w-12 h-12 text-indigo-300" />
            </motion.div>
            <p className="text-zinc-500 font-medium mt-4 animate-pulse">Finding events near you...</p>
          </div>
        )}

        {/* --- PREMIUM ANIMATED EMPTY STATE (AMAZON/LUMA STYLE) --- */}
        {!isLoading && events.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-3xl mx-auto mt-8 p-10 md:p-16 rounded-[2.5rem] bg-white border border-zinc-100 shadow-2xl shadow-indigo-900/5 relative overflow-hidden text-center"
          >
            {/* Animated Illustration Canvas */}
            <div className="relative w-full h-64 mb-8 flex items-center justify-center">
              {/* Pulsing Background Portal */}
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} 
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl"
              />
              
              {/* Floating Center Icon (The main subject) */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="relative z-10 w-28 h-28 bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-xl shadow-indigo-500/20 border border-white flex items-center justify-center"
              >
                <CalendarX className="w-12 h-12 text-indigo-600" />
              </motion.div>

              {/* Orbiting Element 1: Search/Compass */}
              <motion.div 
                animate={{ y: [0, -20, 0], x: [0, 15, 0], rotate: [-10, 10, -10] }} 
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                className="absolute top-10 left-[20%] md:left-[25%] w-14 h-14 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center"
              >
                <Search className="w-6 h-6 text-rose-500" />
              </motion.div>

              {/* Orbiting Element 2: Sparkles */}
              <motion.div 
                animate={{ y: [0, 25, 0], x: [0, -10, 0], rotate: [0, 15, 0] }} 
                transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-10 right-[20%] md:right-[25%] w-12 h-12 bg-white rounded-full shadow-lg border border-zinc-100 flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 text-amber-500" />
              </motion.div>

               {/* Orbiting Element 3: Tiny Rocket */}
               <motion.div 
                animate={{ y: [10, -15, 10], x: [-10, 10, -10], rotate: [45, 55, 45] }} 
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 2 }}
                className="absolute top-16 right-[15%] md:right-[20%] w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg flex items-center justify-center"
              >
                <Rocket className="w-5 h-5 text-white" />
              </motion.div>
            </div>

            {/* Empty State Text & Actions */}
            <h3 className="text-3xl font-extrabold text-zinc-900 mb-4 tracking-tight">No events found</h3>
            <p className="text-lg text-zinc-500 font-medium mb-10 max-w-md mx-auto">
              It looks like the community calendar is currently clear. Why not be the pioneer and host the very first meetup?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link href="/events/create" className="w-full sm:w-auto">
                <Button className="w-full rounded-full bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-6 text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-600/20">
                    <Plus className="w-5 h-5 mr-2" /> Host an Event
                </Button>
                </Link>
              <Button variant="outline" className="w-full sm:w-auto rounded-full bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200 px-8 py-6 text-lg transition-all">
                Explore Communities
              </Button>
            </div>
          </motion.div>
        )}

        {/* Real Data Grid (Kept the same) */}
        {!isLoading && events.length > 0 && (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4">
            {events.map((event, index) => {
              const gradients = ["from-blue-500 to-cyan-400", "from-indigo-500 to-purple-600", "from-rose-500 to-orange-400", "from-emerald-400 to-teal-500"];
              const randomGradient = gradients[index % gradients.length];

              return (
                <motion.div key={event.id} variants={itemVariants}>
                  <Link href={`/events/${event.id}`}>
                    <div className="group bg-white rounded-3xl p-3 border border-zinc-200 hover:border-indigo-200 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden h-full flex flex-col">
                      <div className={`w-full h-48 rounded-2xl bg-gradient-to-br ${randomGradient} relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 ease-out`}>
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-zinc-900 shadow-sm">
                          {event.category || "Tech Event"}
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-xl font-bold text-zinc-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                        <div className="space-y-3 mt-auto">
                          <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            {new Date(event.date || Date.now()).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            {event.location || "TBA"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
}