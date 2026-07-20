"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Calendar, CalendarPlus, Compass, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventService } from "@/services/event.service";
import Sidebar from "@/app/home/SideBar";
import { useMyProfile } from "@/hooks/profileHooks";

interface AppEvent {
  id: string;
  title: string;
  category?: string;
  date: string;
  location: string;
  attendees?: number;
  createdBy?: number | string;
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export default function MyEventsPage() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | undefined>(undefined);

  const { getMyProfile } = useMyProfile();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getMyProfile();
        setUserId(profile.id);
      } catch (err) {
        // no-op — if profile fails to load, we just won't be able to filter to "mine" yet
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventService.getFeed();

        let rawEvents: any[] = [];

        if (Array.isArray(response)) {
          rawEvents = response;
        } else if (response && Array.isArray(response.data)) {
          rawEvents = response.data;
        } else if (response && Array.isArray(response.events)) {
          rawEvents = response.events;
        } else if (response?.data && Array.isArray(response.data.data)) {
          rawEvents = response.data.data;
        } else if (response?.data && Array.isArray(response.data.events)) {
          rawEvents = response.data.events;
        }

        const formattedEvents = rawEvents.map((evt: any) => ({
          id: evt.id || evt._id,
          title: evt.title,
          category: evt.type || evt.category || "Meetup",
          date: evt.start_date || evt.date || new Date().toISOString(),
          location: evt.location || evt.mode || "TBA",
          attendees: evt.capacity || 0,
          createdBy: evt.created_by,
        }));
        setEvents(formattedEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Only events the logged-in user created
  const myEvents = useMemo(() => {
    if (userId === undefined) return [];
    return events.filter((evt) => String(evt.createdBy) === String(userId));
  }, [events, userId]);

  return (
    <div className="min-h-screen bg-zinc-50 relative flex">
      <Sidebar />

      <div className="flex-1 relative overflow-hidden pb-20 min-w-0">
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
        <div className="fixed top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none" />

        <main className="max-w-7xl mx-auto px-6 pt-12 relative z-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4">My Events</h1>
              <p className="text-lg text-zinc-500 font-medium max-w-2xl">
                Everything you&apos;ve hosted, in one place.
              </p>
            </div>
            <Link href="/events/create">
              <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-6 text-base transition-all hover:scale-105 shadow-lg shadow-indigo-600/20">
                <Plus className="w-4 h-4 mr-2" /> Host an Event
              </Button>
            </Link>
          </motion.div>

          {(isLoading || userId === undefined) && (
            <div className="w-full flex flex-col items-center justify-center py-32">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Compass className="w-12 h-12 text-indigo-300" />
              </motion.div>
              <p className="text-zinc-500 font-medium mt-4 animate-pulse">Loading your events...</p>
            </div>
          )}

          {!isLoading && userId !== undefined && myEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-2xl mx-auto mt-8 p-10 md:p-16 rounded-[2.5rem] bg-white border border-zinc-100 shadow-2xl shadow-indigo-900/5 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
                <CalendarPlus className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-extrabold text-zinc-900 mb-4 tracking-tight">No events yet</h3>
              <p className="text-lg text-zinc-500 font-medium mb-10 max-w-md mx-auto">
                Events you host will show up here. Ready to create your first one?
              </p>
              <Link href="/events/create">
                <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-6 text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-600/20">
                  <Plus className="w-5 h-5 mr-2" /> Host an Event
                </Button>
              </Link>
            </motion.div>
          )}

          {!isLoading && myEvents.length > 0 && (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4">
              {myEvents.map((event, index) => {
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
    </div>
  );
}