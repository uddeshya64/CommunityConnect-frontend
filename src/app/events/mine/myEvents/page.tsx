"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MapPin, Calendar, CalendarPlus, Compass, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eventService } from "@/services/event.service";
import Sidebar from "@/app/home/SideBar";
import AppLayout from "@/components/layout/AppLayout";
import { useMyProfile } from "@/hooks/profileHooks";
import { useAppearance } from "@/components/providers/AppearanceProvider";

interface AppEvent {
  id: string;
  title: string;
  category?: string;
  date: string;
  location: string;
  attendees?: number;
  createdBy?: number | string;
  bannerUrl?: string | null;
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
  const { isDark, activeAccent } = useAppearance();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | undefined>(undefined);

  const { getMyProfile } = useMyProfile();

  useEffect(() => {
    const cachedUserId = localStorage.getItem("cc_user_id");
    if (cachedUserId) {
      setUserId(Number(cachedUserId));
    }

    const fetchProfile = async () => {
      try {
        const profile = await getMyProfile();
        setUserId(profile.id);
        // localStorage.setItem("cc_user_id", String(profile.id));
      } catch (err) {
        // no-op — if profile fails to load, we just won't be able to filter to "mine" yet
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const cachedEvents = localStorage.getItem("cc_my_events");
    if (cachedEvents) {
      try {
        setEvents(JSON.parse(cachedEvents));
        setIsLoading(false);
      } catch (e) {}
    }

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
          bannerUrl: evt.banner_url || evt.bannerUrl || evt.banner || null,
        }));
        setEvents(formattedEvents);
        // localStorage.setItem("cc_my_events", JSON.stringify(formattedEvents));
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
    <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"} transition-colors duration-300`}>
      <AppLayout>
        <div className="flex-1 relative overflow-hidden pb-20 min-w-0">
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
        <div className="fixed top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none" />

        <main className="max-w-7xl mx-auto px-6 pt-12 relative z-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className={`text-4xl md:text-5xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"} tracking-tight mb-4`}>My Events</h1>
              <p className={`text-lg ${isDark ? "text-zinc-300" : "text-zinc-700"} font-medium max-w-2xl`}>
                Everything you&apos;ve hosted, in one place.
              </p>
            </div>
            <Link href="/events/create">
              <Button className={`rounded-full ${activeAccent.bg} text-white hover:opacity-90 px-6 py-6 text-base transition-all hover:scale-105 shadow-lg ${activeAccent.shadow}`}>
                <Plus className="w-4 h-4 mr-2" /> Host an Event
              </Button>
            </Link>
          </motion.div>

          {(isLoading || userId === undefined) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-zinc-100/50 border border-zinc-200 rounded-3xl p-3 flex flex-col animate-pulse h-[340px]"
                >
                  <div className="w-full h-48 bg-zinc-200 rounded-2xl mb-4" />
                  <div className="p-5 flex-1 flex flex-col space-y-4">
                    <div className="h-6 bg-zinc-200 rounded-md w-3/4" />
                    <div className="space-y-3 mt-auto">
                      <div className="h-4 bg-zinc-200/50 rounded-md w-1/2" />
                      <div className="h-4 bg-zinc-200/50 rounded-md w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && userId !== undefined && myEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`w-full max-w-2xl mx-auto mt-8 p-10 md:p-16 rounded-[2.5rem] ${isDark ? "bg-zinc-900/60 border-white/10 text-white" : "bg-white border-zinc-100 text-zinc-900"} shadow-2xl shadow-indigo-900/5 text-center`}
            >
              <div className={`w-20 h-20 mx-auto mb-6 ${activeAccent.badgeBg} ${activeAccent.text} rounded-3xl flex items-center justify-center`}>
                <CalendarPlus className="w-10 h-10" />
              </div>
              <h3 className={`text-3xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"} mb-4 tracking-tight`}>No events yet</h3>
              <p className={`text-lg ${isDark ? "text-zinc-300" : "text-zinc-700"} font-medium mb-10 max-w-md mx-auto`}>
                Events you host will show up here. Ready to create your first one?
              </p>
              <Link href="/events/create">
                <Button className={`rounded-full ${activeAccent.bg} text-white hover:opacity-90 px-8 py-6 text-lg transition-all hover:scale-105 shadow-xl ${activeAccent.shadow}`}>
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
                      <div className={`group ${isDark ? "bg-zinc-900/60 border-white/10 hover:border-white/20" : "bg-white border-zinc-200 hover:border-zinc-300"} rounded-3xl p-3 border transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden h-full flex flex-col`}>
                        <div
                          className={`w-full h-48 rounded-2xl ${
                            event.bannerUrl
                              ? "bg-zinc-100"
                              : `bg-gradient-to-br ${randomGradient}`
                          } relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 ease-out`}
                        >
                          {event.bannerUrl && (
                            <img
                              src={event.bannerUrl}
                              alt={event.title}
                              className="w-full h-full object-cover absolute inset-0"
                            />
                          )}
                          <div className={`absolute top-4 left-4 ${isDark ? "bg-zinc-950/80 text-zinc-100" : "bg-white/90 text-zinc-900"} backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold shadow-sm z-10`}>
                            {event.category || "Tech Event"}
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-zinc-900"} mb-4 group-hover:${activeAccent.text} transition-colors line-clamp-2`}>
                            {event.title}
                          </h3>
                          <div className="space-y-3 mt-auto">
                            <div className={`flex items-center text-sm font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"} gap-3`}>
                              <Calendar className={`w-4 h-4 ${activeAccent.text}`} />
                              {new Date(event.date || Date.now()).toLocaleDateString()}
                            </div>
                            <div className={`flex items-center text-sm font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"} gap-3`}>
                              <MapPin className={`w-4 h-4 ${activeAccent.text}`} />
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
      </AppLayout>
    </div>
  );
}