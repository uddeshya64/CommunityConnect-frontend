"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search,
  MapPin,
  Calendar,
  CalendarX,
  Sparkles,
  Compass,
  Rocket,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { eventService } from "@/services/event.service";
import ProfilePromptPopup from "@/components/ProfilePromptPopup";
import Sidebar from "@/app/home/SideBar";
import { useMyProfile } from "@/hooks/profileHooks";

// ============================================
// TYPES
// ============================================

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

interface UserProfile {
  id?: number;
  name: string;
  avatarUrl?: string | null;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

// ============================================
// GET USER INITIALS
// ============================================

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

// ============================================
// PROFILE AVATAR
// ============================================

function ProfileAvatar({ profile }: { profile: UserProfile }) {
  const href = profile.id ? `/profile/${profile.id}` : "#";

  return (
    <Link
      href={href}
      className="fixed top-6 right-6 z-50 w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg shadow-zinc-900/10 hover:scale-105 transition-transform bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-white font-bold text-sm">
          {getInitials(profile.name)}
        </span>
      )}
    </Link>
  );
}

// ============================================
// HOME PAGE
// ============================================

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ============================================
  // STATE
  // ============================================

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);
  
  // This tells us that OAuth token has been saved to localStorage
  const [authReady, setAuthReady] = useState(false);

  // Profile hook
  const { getMyProfile } = useMyProfile();

  // ============================================
  // STEP 1: SAVE GOOGLE OAUTH TOKENS
  // ============================================

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const name = searchParams.get("name");
    const email = searchParams.get("email");

    console.log("OAuth Access Token:", accessToken ? "FOUND" : "NOT FOUND");
    console.log("OAuth Refresh Token:", refreshToken ? "FOUND" : "NOT FOUND");

    // Save access token
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }

    // Save refresh token
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    // Optional: Save user information
    if (name) {
      localStorage.setItem("userName", name);
    }

    if (email) {
      localStorage.setItem("userEmail", email);
    }

    // Check if token already exists
    const storedAccessToken = localStorage.getItem("accessToken");
    if (storedAccessToken) {
      console.log("Access token is ready");
      setAuthReady(true);
    } else {
      console.error("Access token is missing");
      setAuthReady(false);
    }

    // Remove tokens from URL
    if (accessToken || refreshToken || name || email) {
      router.replace("/home");
    }
  }, [searchParams, router]);

  // ============================================
  // STEP 2: FETCH LOGGED-IN USER PROFILE
  // ============================================

  useEffect(() => {
    // Don't call profile API until authentication is ready
    if (!authReady) return;

    const fetchProfile = async () => {
      try {
        console.log("Fetching logged-in user profile...");

        // Check token before API request
        const accessToken = localStorage.getItem("accessToken");
        console.log("Token before profile request:", accessToken ? "EXISTS" : "MISSING");

        if (!accessToken) {
          console.error("No access token found");
          setUserName("there");
          return;
        }

        // Get profile from backend
        const profile = await getMyProfile();
        console.log("Logged-in profile:", profile);

        // Set user data
        setUserName(profile.name || "there");
        setUserId(profile.id);
        setAvatarUrl(profile.avatar_url);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setUserName("there");
      }
    };

    fetchProfile();
  }, [authReady, getMyProfile]);

  // ============================================
  // STEP 3: FETCH EVENTS
  // ============================================

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventService.getFeed();
        console.log("🔥 BACKEND FEED DATA:", response);

        let rawEvents: any[] = [];

        // Handle different response formats
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
        } else {
          console.error("🚨 Could not find events array in response");
        }

        // Format events
        const formattedEvents = rawEvents.map((evt: any) => {
          console.log("RAW EVENT:", evt.id, "created_by:", evt.created_by, typeof evt.created_by);
          
          return {
            id: evt.id || evt._id,
            title: evt.title,
            category: evt.type || evt.category || "Meetup",
            date: evt.start_date || evt.date || new Date().toISOString(),
            location: evt.location || evt.mode || "TBA",
            attendees: evt.capacity || 0,
            createdBy: evt.created_by,
            bannerUrl: evt.banner_url || evt.bannerUrl || evt.banner || null,
          };
        });

        setEvents(formattedEvents);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // ============================================
  // STEP 4: HIDE EVENTS CREATED BY CURRENT USER
  // ============================================

  const visibleEvents = useMemo(() => {
    console.log("FILTERING — userId:", userId, typeof userId);

    // Profile not loaded yet
    if (userId === undefined) {
      return events;
    }

    return events.filter((evt) => String(evt.createdBy) !== String(userId));
  }, [events, userId]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-zinc-50 relative flex flex-col md:flex-row">

      {/* SIDEBAR */}
      <Sidebar />

      {/* PROFILE AVATAR */}
      <ProfileAvatar
        profile={{
          id: userId,
          name: userName,
          avatarUrl,
        }}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 relative overflow-hidden pb-20 min-w-0">
        
        {/* BACKGROUND EFFECTS */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
        <div className="fixed top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none" />

        {/* PROFILE PROMPT */}
        <ProfilePromptPopup />

        {/* MAIN */}
        <main className="max-w-7xl mx-auto px-6 pt-12 relative z-10">
          
          {/* WELCOME */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4">
              Welcome back,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                {userName}
              </span>
            </h1>
            <p className="text-lg text-zinc-500 font-medium max-w-2xl">
              Ready to explore? Discover, register, and manage your next tech meetup all in one place.
            </p>
          </motion.div>

          {/* LOADING */}
          {isLoading && (
            <div className="w-full flex flex-col items-center justify-center py-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Compass className="w-12 h-12 text-indigo-300" />
              </motion.div>
              <p className="text-zinc-500 font-medium mt-4 animate-pulse">
                Finding events near you...
              </p>
            </div>
          )}

          {/* NO EVENTS */}
          {!isLoading && visibleEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-3xl mx-auto mt-8 p-10 md:p-16 rounded-[2.5rem] bg-white border border-zinc-100 shadow-2xl shadow-indigo-900/5 relative overflow-hidden text-center"
            >
              {/* ICON AREA */}
              <div className="relative w-full h-64 mb-8 flex items-center justify-center">
                
                {/* GLOW */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="absolute w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl"
                />

                {/* CALENDAR */}
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                  className="relative z-10 w-28 h-28 bg-gradient-to-br from-white to-indigo-50 rounded-3xl shadow-xl shadow-indigo-500/20 border border-white flex items-center justify-center"
                >
                  <CalendarX className="w-12 h-12 text-indigo-600" />
                </motion.div>

                {/* SEARCH */}
                <motion.div
                  animate={{
                    y: [0, -20, 0],
                    x: [0, 15, 0],
                    rotate: [-10, 10, -10],
                  }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
                  className="absolute top-10 left-[20%] md:left-[25%] w-14 h-14 bg-white rounded-2xl shadow-lg border border-zinc-100 flex items-center justify-center"
                >
                  <Search className="w-6 h-6 text-rose-500" />
                </motion.div>

                {/* SPARKLE */}
                <motion.div
                  animate={{
                    y: [0, 25, 0],
                    x: [0, -10, 0],
                    rotate: [0, 15, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-10 right-[20%] md:right-[25%] w-12 h-12 bg-white rounded-full shadow-lg border border-zinc-100 flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </motion.div>

                {/* ROCKET */}
                <motion.div
                  animate={{
                    y: [10, -15, 10],
                    x: [-10, 10, -10],
                    rotate: [45, 55, 45],
                  }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 2 }}
                  className="absolute top-16 right-[15%] md:right-[20%] w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg flex items-center justify-center"
                >
                  <Rocket className="w-5 h-5 text-white" />
                </motion.div>
              </div>

              <h3 className="text-3xl font-extrabold text-zinc-900 mb-4 tracking-tight">
                No events found
              </h3>
              <p className="text-lg text-zinc-500 font-medium mb-10 max-w-md mx-auto">
                It looks like the community calendar is currently clear. Why not be the pioneer and host the very first meetup?
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/events/create" className="w-full sm:w-auto">
                  <Button className="w-full rounded-full bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-6 text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-600/20">
                    <Plus className="w-5 h-5 mr-2" />
                    Host an Event
                  </Button>
                </Link>
                <Button variant="outline" className="w-full sm:w-auto rounded-full bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200 px-8 py-6 text-lg transition-all">
                  Explore Communities
                </Button>
              </div>
            </motion.div>
          )}

          {/* EVENTS */}
          {!isLoading && visibleEvents.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-4"
            >
              {visibleEvents.map((event, index) => {
                const gradients = [
                  "from-blue-500 to-cyan-400",
                  "from-indigo-500 to-purple-600",
                  "from-rose-500 to-orange-400",
                  "from-emerald-400 to-teal-500",
                ];
                const randomGradient = gradients[index % gradients.length];

                return (
                  <motion.div key={event.id} variants={itemVariants}>
                    <Link href={`/events/${event.id}`}>
                      <div className="group bg-white rounded-3xl p-3 border border-zinc-200 hover:border-indigo-200 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer relative overflow-hidden h-full flex flex-col">
                        
                        {/* BANNER */}
                        <div
                          className={`w-full h-48 rounded-2xl ${
                            event.bannerUrl ? "bg-zinc-100" : `bg-gradient-to-br ${randomGradient}`
                          } relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 ease-out`}
                        >
                          {event.bannerUrl && (
                            <img
                              src={event.bannerUrl}
                              alt={event.title}
                              className="w-full h-full object-cover absolute inset-0"
                            />
                          )}
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-zinc-900 shadow-sm z-10">
                            {event.category || "Tech Event"}
                          </div>
                        </div>

                        {/* EVENT DETAILS */}
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="text-xl font-bold text-zinc-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {event.title}
                          </h3>
                          <div className="space-y-3 mt-auto">
                            
                            {/* DATE */}
                            <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                              <Calendar className="w-4 h-4 text-zinc-400" />
                              {new Date(event.date || Date.now()).toLocaleDateString()}
                            </div>

                            {/* LOCATION */}
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

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}