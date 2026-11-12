"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

import {
  MapPin,
  Briefcase,
  Github,
  Linkedin,
  Mail,
  Phone,
  Loader2,
  ExternalLink,
  Calendar,
  User,
  Camera,
  Trophy,
  Users,
  CalendarDays,
  ShieldCheck,
  Pencil,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import BackButton from "@/components/ui/BackButton";
import { useProfileById, MyProfile } from "@/hooks/profileHooks";
import { useUser } from "@/components/providers/UserProvider";
import PageTransition from "@/components/layout/PageTransition";
import { API_BASE_URL } from "@/config/env";
import EventCard from "@/components/events/EventCard";

// ==============================
// CREATED EVENT TYPE
// ==============================

interface CreatedEvent {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  banner_url?: string;
}

// ==============================
// EXTENDED PROFILE TYPE
// ==============================

interface ExtendedProfile extends MyProfile {
  subscription_status?: string;

  _count?: {
    events_created?: number;
    teams_led?: number;
    mentor_assignments?: number;
    submissions?: number;
  };

  events_created?: CreatedEvent[];
}

// ==============================
// PUBLIC PROFILE PAGE
// ==============================

export default function PublicProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const profileId = params.id as string;
  const { profile: userProfile } = useUser();

  // ==============================
  // STATES
  // ==============================

  const [profile, setProfile] = useState<ExtendedProfile | null>(() => {
    if (profileId === "me" && userProfile) {
      return userProfile as unknown as ExtendedProfile;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(profileId === "me" ? !userProfile : true);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Controls Events Created section
  // false = show only 2 events
  // true = show all events
  const [showAllEvents, setShowAllEvents] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getProfileById } = useProfileById();

  // ==============================
  // HANDLE OAUTH TOKENS
  // ==============================

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }

    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    if (accessToken || refreshToken) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [searchParams]);

  // ==============================
  // FETCH PROFILE
  // ==============================

  useEffect(() => {
    if (!profileId) return;

    if (profileId === "me" && userProfile) {
      setProfile(userProfile as unknown as ExtendedProfile);
      setIsLoading(false);
    }

    const fetchProfile = async () => {
      try {
        if (profileId !== "me" || !userProfile) {
          setIsLoading(true);
        }
        setError("");

        const data = await getProfileById(profileId);
        setProfile(data);
      } catch (err: any) {
        if (!profile) {
          setError(err.message || "Profile not found.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, userProfile]);

  // ==============================
  // PROFILE IMAGE UPLOAD
  // ==============================

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("accessToken");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(`${API_BASE_URL}/image/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      // Refresh profile
      const updatedProfile = await getProfileById(profileId);
      setProfile(updatedProfile);
    } catch (err: any) {
      setError(err.message || "Failed to upload profile image.");
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==============================
  // LOADING SCREEN
  // ==============================

  if (isLoading) {
    return (
                    <PageTransition>
                      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
                        <AppLayout>
                          <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-6 animate-pulse">
                            <div className="h-9 w-24 rounded-full" style={{ background: "var(--card2)" }} />
                            <div
                              className="rounded-[28px] border p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6"
                              style={{ background: "var(--card)", borderColor: "var(--border)" }}
                            >
                              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full shrink-0" style={{ background: "var(--card2)" }} />
                              <div className="flex-1 w-full space-y-3">
                                <div className="h-3 w-28 rounded" style={{ background: "var(--card2)" }} />
                                <div className="h-8 w-56 rounded-xl" style={{ background: "var(--card2)" }} />
                                <div className="flex gap-2.5">
                                  <div className="h-7 w-32 rounded-full" style={{ background: "var(--card2)" }} />
                                  <div className="h-7 w-32 rounded-full" style={{ background: "var(--card2)" }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-zinc-700/30" />
                                <div className="space-y-1">
                                  <div className="w-12 h-3 bg-zinc-700/20 rounded" />
                                  <div className="w-32 h-4 bg-zinc-700/30 rounded" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className={`rounded-2xl p-5 ${isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-zinc-200 shadow-sm"} space-y-4`}>
                            <div className="w-24 h-4 bg-zinc-700/40 rounded" />
                            <div className="flex flex-wrap gap-2">
                              <div className="w-16 h-8 bg-zinc-700/30 rounded-full" />
                              <div className="w-24 h-8 bg-zinc-700/30 rounded-full" />
                              <div className="w-20 h-8 bg-zinc-700/30 rounded-full" />
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                  <div
                                    key={i}
                                    className="h-24 rounded-[22px] border"
                                    style={{ background: "var(--card)", borderColor: "var(--border)" }}
                                  />
                                ))}
                              </div>
                              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                <div
                                  className="xl:col-span-8 h-72 rounded-[24px] border"
                                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                                />
                                <div
                                  className="xl:col-span-4 h-72 rounded-[24px] border"
                                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                                />
                              </div>
                            </div>
                          </div>
                        </main>
                      </div>
                    </AppLayout>
                  </div>
                </PageTransition>
                );
  }

                // ==============================
                // ERROR SCREEN
                // ==============================

                if (error || !profile) {
    return (
                <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 space-y-6">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                    <User className="w-10 h-10 text-zinc-500" />
                    <div
                      className="min-h-screen flex flex-col items-center justify-center px-4 space-y-6"
                      style={{ background: "var(--bg)", color: "var(--text)" }}
                    >
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center border"
                        style={{ background: "var(--card)", borderColor: "var(--border)" }}
                      >
                        <User className="w-10 h-10" style={{ color: "var(--muted)" }} />
                      </div>

                      <div className="text-center space-y-2">
                        <h2 className="text-xl font-semibold text-zinc-200">Oops!</h2>
                        <p className="text-[var(--muted)]">{error || "Profile not found."}</p>
                        <h2 className="font-bricolage text-xl font-bold" style={{ color: "var(--text)" }}>
                          Profile Unavailable
                        </h2>
                        <p className="text-sm" style={{ color: "var(--muted)" }}>
                          {error || "Profile not found."}
                        </p>
                      </div>

                      <BackButton fallbackHref="/home" label="Back to Home" />
                    </div>
                    );
  }

                    // ==============================
                    // INITIALS
                    // INITIALS & DERIVED DATA
                    // ==============================

                    const initials = (profile.name || "U")
                    .split(" ")
    .map((word) => word[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                    // ==============================
                    // EVENTS
                    // ==============================

                    const createdEvents = profile.events_created || [];
                    const visibleEvents = showAllEvents ? createdEvents : createdEvents.slice(0, 4);
                    const isOwnProfile =
                    !userProfile ||
                    profileId === "me" ||
                    Number(userProfile.id) === Number(profile.id);

                    // Show only 2 events initially
                    const visibleEvents = showAllEvents ? createdEvents : createdEvents.slice(0, 2);
                    const activityStats = [
                    {
                      label: "Events Created",
                    value: profile._count?.events_created || 0,
                    icon: CalendarDays,
                    color: "var(--accent)",
                    tint: "color-mix(in oklab, var(--accent) 14%, transparent)",
    },
                    {
                      label: "Teams Led",
                    value: profile._count?.teams_led || 0,
                    icon: Users,
                    color: "#10b981",
                    tint: "rgba(16, 185, 129, 0.14)",
    },
                    {
                      label: "Mentorships",
                    value: profile._count?.mentor_assignments || 0,
                    icon: ShieldCheck,
                    color: "#f59e0b",
                    tint: "rgba(245, 158, 11, 0.14)",
    },
                    {
                      label: "Submissions",
                    value: profile._count?.submissions || 0,
                    icon: Trophy,
                    color: "#ec4899",
                    tint: "rgba(236, 72, 153, 0.14)",
    },
                    ];

                    return (
                    <PageTransition>
                      <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-zinc-200" : "bg-zinc-50 text-zinc-900"} font-sans selection:bg-indigo-500/30 transition-colors duration-300`}>
                        <div
                          className="min-h-screen font-sans transition-colors duration-300"
                          style={{ background: "var(--bg)", color: "var(--text)" }}
                        >
                          <AppLayout>
                            <div className="flex-1 pb-24 relative overflow-hidden">
                              {/* AMBIENT BACKGROUND */}
                              <div className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isDark ? "from-zinc-900/20 via-zinc-950 to-zinc-950" : "from-zinc-200/50 via-zinc-50 to-zinc-50"} pointer-events-none`} />
                              <div className="flex-1 pb-20 relative">
                                <main className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10 space-y-6">
                                  {/* TOP ACTION BAR */}
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <BackButton fallbackHref="/home" label="Back" />

                                    {/* ==============================
            MAIN CONTENT
        ============================== */}
                                    <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 relative z-10 space-y-6">
                                      {/* Back Button */}
                                      <div>
                                        <BackButton fallbackHref="/home" label="Back" />
                                      </div>
                                      {/* ==============================
              HERO PROFILE CARD
          ============================== */}
                                      <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                        className={`relative rounded-[2rem] p-5 pt-14 sm:p-8 md:p-10 backdrop-blur-md overflow-hidden ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border`}
                                      >
                                        <div className={`absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 ${isDark ? "bg-indigo-500/10" : "bg-zinc-400/10"} blur-[80px] rounded-full pointer-events-none`} />
                                        {isOwnProfile && (
                                          <div className="flex flex-wrap items-center gap-2.5">
                                            <Link href="/settings">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-full font-semibold px-4 gap-2 cursor-pointer"
                                                style={{
                                                  background: "var(--card)",
                                                  borderColor: "var(--border)",
                                                  color: "var(--text)",
                                                }}
                                              >
                                                <Settings className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} />
                                                <span>Settings</span>
                                              </Button>
                                            </Link>

                                            {/* EDIT BUTTON */}
                                            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
                                              <Link href="/profile/edit">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className={`rounded-full ${isDark ? "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white" : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950"} backdrop-blur-md font-semibold`}
                                                >
                                                  <Pencil className="w-4 h-4 mr-2" />
                                                  <span className="hidden sm:inline">Edit Profile</span>
                                                  <span className="sm:hidden">Edit</span>
                                                </Button>
                                              </Link>
                                            </div>

                                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 relative z-10">
                                              {/* AVATAR */}
                                              <div className="relative shrink-0 group mt-2 md:mt-0">
                                                <div
                                                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 shadow-2xl transition-all duration-300"
                                                  style={{
                                                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                                    boxShadow: "0 20px 40px -12px color-mix(in oklab, var(--accent) 40%, transparent)",
                                                  }}
                                                >
                                                  <div
                                                    className="w-full h-full rounded-full flex items-center justify-center overflow-hidden border-[3px]"
                                                    style={{
                                                      background: "var(--card2)",
                                                      borderColor: "var(--card)",
                                                    }}
                                                  >
                                                    {profile.avatar_url ? (
                                                      <img
                                                        src={profile.avatar_url}
                                                        alt={profile.name}
                                                        className="w-full h-full object-cover"
                                                      />
                                                    ) : (
                      <span
                        className="text-4xl font-bold tracking-wider"
                        style={{ color: "var(--text)" }}
                    <Link href="/profile/edit">
                      <Button
                        size="sm"
                        className="rounded-full text-white font-bold px-4 sm:px-5 gap-2 shadow-md transition-transform hover:scale-[1.02] cursor-pointer border-0"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                          boxShadow: "0 10px 24px -8px color-mix(in oklab, var(--accent) 55%, transparent)",
                        }}
                      >
                        {initials}
                      </span>
                    )}
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </Button>
                    </Link>
                                                </div>
                                              </div>

                                              {/* Upload Button */}
                                              <label
                                                htmlFor="profile-image-upload"
                                                className="absolute bottom-2 right-2 w-10 h-10 rounded-full border-2 cursor-pointer flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
                                                style={{
                                                  background: "var(--accent)",
                                                  borderColor: "var(--card)",
                                                }}
                                              >
                                                {isUploading ? (
                                                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                ) : (
                                                  <Camera className="w-4 h-4 text-white" />
                                                )}
                                              </label>

                                              <input
                                                id="profile-image-upload"
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                onChange={handleImageUpload}
                                              />
                )}
                                            </div>

                                            {/* PROFILE INFO */}
                                            <div className="flex-1 text-center md:text-left space-y-5 w-full">
                                              <div>
                                                <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                                  <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text)] tracking-tight">
                                                    {profile.name || "Community Member"}
                                                  </h1>
                                                  {/* HERO PROFILE CARD */}
                                                  <motion.div
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.35 }}
                                                    className="relative rounded-[28px] border p-5 sm:p-7 md:p-8 overflow-hidden shadow-sm"
                                                    style={{
                                                      background:
                                                        "linear-gradient(125deg, color-mix(in oklab, var(--accent) 9%, var(--card)), var(--card) 55%, color-mix(in oklab, var(--accent2) 5%, var(--card)))",
                                                      borderColor: "var(--border)",
                                                    }}
                                                  >
                                                    <div className="flex flex-col md:flex-row items-center md:items-center gap-6 sm:gap-8 relative z-10">
                                                      {/* AVATAR WITH ACCENT RING */}
                                                      <div className="relative shrink-0 group">
                                                        <div
                                                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3.5px] shadow-xl transition-all duration-300"
                                                          style={{
                                                            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                                            boxShadow: "0 20px 40px -14px color-mix(in oklab, var(--accent) 45%, transparent)",
                                                          }}
                                                        >
                                                          <div
                                                            className="w-full h-full rounded-full flex items-center justify-center overflow-hidden border-[3px]"
                                                            style={{
                                                              background: "var(--card2)",
                                                              borderColor: "var(--card)",
                                                            }}
                                                          >
                                                            {profile.avatar_url ? (
                                                              <img
                                                                src={profile.avatar_url}
                                                                alt={profile.name}
                                                                className="w-full h-full object-cover"
                                                              />
                                                            ) : (
                                                              <span
                                                                className="font-bricolage text-3xl sm:text-4xl font-extrabold tracking-tight"
                                                                style={{ color: "var(--text)" }}
                                                              >
                                                                {initials}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>


                                                      </div>
                                                      {isOwnProfile && (
                                                        <>
                                                          <label
                                                            htmlFor="profile-image-upload"
                                                            className="absolute bottom-1 right-1 w-9 h-9 rounded-full border-2 cursor-pointer flex items-center justify-center shadow-md transition-all hover:scale-105 text-white"
                                                            style={{
                                                              background: "var(--accent)",
                                                              borderColor: "var(--card)",
                                                            }}
                                                            title="Change profile photo"
                                                          >
                                                            {isUploading ? (
                                                              <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                              <Camera className="w-4 h-4" />
                                                            )}
                                                          </label>

                                                          {/* PROFESSION & LOCATION */}
                                                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium mt-3">
                                                            <span
                                                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${profile.profession
                                                                  ? "bg-white/5 border-white/5 text-zinc-300"
                                                                  : "bg-transparent border-dashed border-zinc-700 text-zinc-600"
                                                                }`}
                                                            >
                                                              <Briefcase
                                                                className={`w-4 h-4 ${profile.profession ? "text-indigo-400" : "text-zinc-600"
                                                                  }`}
                                                              />
                                                              {profile.profession || "Profession not set"}
                                                            </span>

                                                            <span
                                                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${profile.location
                                                                  ? "bg-white/5 border-white/5 text-zinc-300"
                                                                  : "bg-transparent border-dashed border-zinc-700 text-zinc-600"
                                                                }`}
                                                            >
                                                              <MapPin
                                                                className={`w-4 h-4 ${profile.location ? "text-rose-400" : "text-zinc-600"
                                                                  }`}
                                                              />
                                                              {profile.location || "Location not set"}
                                                            </span>
                                                            <input
                                                              id="profile-image-upload"
                                                              ref={fileInputRef}
                                                              type="file"
                                                              accept="image/*"
                                                              hidden
                                                              onChange={handleImageUpload}
                                                            />
                                                          </>
                    )}
                                                        </div>
                                                    </div>

                                                    {/* BIO */}
                                                    <p
                                                      className={`text-base leading-relaxed max-w-3xl ${profile.bio ? "text-[var(--muted)]" : "text-zinc-600 italic"
                                                        }`}
                                                    >
                                                      {profile.bio || "This user hasn't added a bio yet."}
                                                    </p>
                                                </div>
                                              </div>
                                            </motion.div>
                                            {/* PROFILE IDENTITY & META */}
                                            <div className="flex-1 min-w-0 text-center md:text-left space-y-3 w-full">
                                              <div>
                                                <span
                                                  className="inline-block font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] mb-1"
                                                  style={{ color: "var(--accent)" }}
                                                >
                                                  Member Profile
                                                </span>
                                                <h1
                                                  className="font-bricolage text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight break-words"
                                                  style={{ color: "var(--text)" }}
                                                >
                                                  {profile.name || "Community Member"}
                                                </h1>
                                              </div>

                                              {/* ==============================
              PLATFORM ACTIVITY
          ============================== */}
                                              <motion.div
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: 0.1 }}
                                                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                                              >
                                                {/* EVENTS */}
                                                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-zinc-900/60 transition-colors">
                                                  <CalendarDays className="w-6 h-6 text-indigo-400 mb-1" />
                                                  <p className="text-2xl font-bold text-white">
                                                    {profile._count?.events_created || 0}
                                                  </p>
                                                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">
                                                    Events Created
                                                  </p>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs font-semibold">
                                                  <span
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                                                    style={{
                                                      background: "var(--card2)",
                                                      borderColor: "var(--border)",
                                                      color: profile.profession ? "var(--text)" : "var(--subtle)",
                                                    }}
                                                  >
                                                    <Briefcase
                                                      className="w-3.5 h-3.5 shrink-0"
                                                      style={{ color: profile.profession ? "var(--accent)" : "var(--subtle)" }}
                                                    />
                                                    <span>{profile.profession || "Profession not set"}</span>
                                                  </span>

                                                  {/* TEAMS */}
                                                  <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-zinc-900/60 transition-colors">
                                                    <Users className="w-6 h-6 text-emerald-400 mb-1" />
                                                    <p className="text-2xl font-bold text-white">
                                                      {profile._count?.teams_led || 0}
                                                    </p>
                                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">
                                                      Teams Led
                                                    </p>
                                                  </div>
                                                  <span
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                                                    style={{
                                                      background: "var(--card2)",
                                                      borderColor: "var(--border)",
                                                      color: profile.location ? "var(--text)" : "var(--subtle)",
                                                    }}
                                                  >
                                                    <MapPin
                                                      className="w-3.5 h-3.5 shrink-0"
                                                      style={{ color: profile.location ? "#f43f5e" : "var(--subtle)" }}
                                                    />
                                                    <span>{profile.location || "Location not set"}</span>
                                                  </span>

                                                  {/* MENTORSHIPS */}
                                                  <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-zinc-900/60 transition-colors">
                                                    <ShieldCheck className="w-6 h-6 text-amber-400 mb-1" />
                                                    <p className="text-2xl font-bold text-white">
                                                      {profile._count?.mentor_assignments || 0}
                                                    </p>
                                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">
                                                      Mentorships
                                                    </p>
                                                  </div>
                                                  {profile.created_at && (
                                                    <span
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[11px]"
                                                      style={{
                                                        background: "var(--card2)",
                                                        borderColor: "var(--border)",
                                                        color: "var(--muted)",
                                                      }}
                                                    >
                                                      <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                                                      <span>
                                                        Joined{" "}
                                                        {new Date(profile.created_at).toLocaleDateString("en-US", {
                                                          month: "short",
                                                          year: "numeric",
                                                        })}
                                                      </span>
                                                    </span>
                                                  )}
                                                </div>

                                                {/* SUBMISSIONS */}
                                                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-zinc-900/60 transition-colors">
                                                  <Trophy className="w-6 h-6 text-rose-400 mb-1" />
                                                  <p className="text-2xl font-bold text-white">
                                                    {profile._count?.submissions || 0}
                                                  </p>
                                                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">
                                                    Submissions
                                                  </p>
                                                </div>
                                              </motion.div>

                                              {/* ==============================
              CREATED EVENTS
          ============================== */}
                                              <motion.div
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4, delay: 0.2 }}
                                                className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-sm"
                                              >
                                                {/* EVENTS HEADER */}
                                                <div className="flex items-center justify-between mb-6">
                                                  <div>
                                                    <h2 className="text-xl font-bold text-[var(--text)]">Events Created</h2>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1">
                                                      Events organized by {profile.name}
                                                    </p>
                                                  </div>
                                                  <CalendarDays className="w-6 h-6 text-indigo-400" />
                                                </div>

                                                {/* EVENTS EXIST */}
                                                {createdEvents.length > 0 ? (
                                                  <>
                                                    {/* EVENT GRID */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                      {visibleEvents.map((event) => (
                                                        <EventCard
                                                          key={event.id}
                                                          id={String(event.id)}
                                                          title={event.title}
                                                          date={event.start_date}
                                                          location={event.location}
                                                          bannerUrl={event.banner_url}
                                                          photo={event.banner_url || undefined}
                                                        />
                                                      ))}
                                                    </div>

                                                    {/* VIEW MORE BUTTON */}
                                                    {createdEvents.length > 2 && (
                                                      <div className="flex justify-center mt-8">
                                                        <Button
                                                          variant="outline"
                                                          onClick={() => setShowAllEvents(!showAllEvents)}
                                                          className="rounded-full border-white/10 bg-white/5 text-zinc-300 hover:bg-indigo-500/10 hover:text-white hover:border-indigo-500/30 px-6"
                    <p
                                                          className={`text-sm sm:text-[15px] leading-relaxed max-w-3xl ${profile.bio ? "" : "italic"}`}
                                                          style={{ color: profile.bio ? "var(--muted)" : "var(--subtle)" }}
                                                        >
                                                          {showAllEvents
                                                            ? "Show Less"
                                                            : `View More Events (${createdEvents.length - 2} more)`}
                                                        </Button>
                                                        {profile.bio || "This user hasn't added a bio yet."}
                                                      </p>
                  </div>
                )}
                                              </>
                                              ) : (
                                              /* NO EVENTS */
                                              <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
                                                <CalendarDays className="w-10 h-10 text-zinc-600 mb-3" />
                                                <p className="text-zinc-600 dark:text-zinc-500">No events created yet.</p>
                                              </div>
            )}
                                            </motion.div>
                                          </div>
              </motion.div>

                                      {/* ==============================
              DETAILS GRID
          ============================== */}
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* ==============================
                SKILLS
            ============================== */}
                                        <div className="lg:col-span-2 space-y-6">
                                          {/* PLATFORM ACTIVITY STATS */}
                                          <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: 0.2 }}
                                            className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8 backdrop-blur-sm h-full"
                                            transition={{ duration: 0.35, delay: 0.06 }}
                                            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                                          >
                                            <div className="flex items-center justify-between mb-6">
                                              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                                                Technical Skills
                                              </h2>
                                            </div>
                                            {activityStats.map((stat) => {
                                              const Icon = stat.icon;
                                              return (
                                                <div
                                                  key={stat.label}
                                                  className="rounded-[22px] border p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs transition-transform hover:-translate-y-0.5"
                                                  style={{
                                                    background: "var(--card)",
                                                    borderColor: "var(--border)",
                                                  }}
                                                >
                                                  <div className="min-w-0">
                                                    <p
                                                      className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate"
                                                      style={{ color: "var(--subtle)" }}
                                                    >
                                                      {stat.label}
                                                    </p>
                                                    <p
                                                      className="font-bricolage text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums"
                                                      style={{ color: "var(--text)" }}
                                                    >
                                                      {stat.value}
                                                    </p>
                                                  </div>

                                                  {profile.skills && profile.skills.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2.5">
                                                      {profile.skills.map((skill, index) => (
                      <span
                        key={index}
                        className={`px-4 py-2 rounded-xl ${isDark ? "bg-white/10 border-white/20 text-zinc-100 hover:bg-white/15" : "bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200"} border text-sm font-medium transition-colors shadow-sm`}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: stat.tint, color: stat.color }}
                      >
                        {skill}
                      </span>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 text-zinc-600 dark:text-zinc-500 border-2 border-dashed border-white/5 rounded-2xl">
                                                      <Briefcase className="w-8 h-8 mb-3 opacity-50" />
                                                      <p className="text-sm">No skills listed yet.</p>
                                                    </div>
                                                  )}
                                                  <Icon className="w-5 h-5" />
                                                </div>
                    </div>
                                        );
                })}
                                      </motion.div>
                                  </div>

                                  {/* ==============================
                SIDEBAR
            ============================== */}
                                  <div className="space-y-6 lg:sticky lg:top-24 self-start">
                                    {/* CONTACT CARD */}
                                    <motion.div
                                      initial={{ opacity: 0, y: 15 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.4, delay: 0.3 }}
                                      className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm"
                                    >
                                      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6">
                                        Contact
                                      </h2>
                                      {/* TWO-COLUMN WORKSPACE GRID */}
                                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                                        {/* LEFT MAIN COLUMN: EVENTS & SKILLS */}
                                        <div className="xl:col-span-8 space-y-6">
                                          {/* CREATED EVENTS */}
                                          <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35, delay: 0.12 }}
                                            className="rounded-[24px] border p-5 sm:p-7 shadow-xs"
                                            style={{
                                              background: "var(--card)",
                                              borderColor: "var(--border)",
                                            }}
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                                              <div>
                                                <span
                                                  className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                                                  style={{ color: "var(--accent)" }}
                                                >
                                                  Portfolio
                                                </span>
                                                <h2
                                                  className="font-bricolage text-xl font-extrabold tracking-tight"
                                                  style={{ color: "var(--text)" }}
                                                >
                                                  Events Created
                                                </h2>
                                                <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                                                  Events organized by {profile.name}
                                                </p>
                                              </div>

                                              <div className="space-y-5">
                                                {/* EMAIL */}
                                                <div className="flex items-center gap-4 group">
                                                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                                                    <Mail
                                                      className={`w-5 h-5 ${profile.email
                                                          ? "text-[var(--muted)] group-hover:text-indigo-400"
                                                          : "text-zinc-600"
                                                        }`}
                                                    />
                                                    <span
                                                      className="px-3 py-1 rounded-full border font-mono text-xs font-bold"
                                                      style={{
                                                        background: "var(--card2)",
                                                        borderColor: "var(--border)",
                                                        color: "var(--text)",
                                                      }}
                                                    >
                                                      {createdEvents.length} {createdEvents.length === 1 ? "event" : "events"}
                                                    </span>
                                                  </div>

                                                  <div className="overflow-hidden">
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-500 mb-1">Email Address</p>
                                                    {profile.email ? (
                                                      <p className="text-sm font-medium text-zinc-200 truncate">
                                                        {profile.email}
                                                        {createdEvents.length > 0 ? (
                                                          <>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                                              {visibleEvents.map((event) => (
                                                                <EventCard
                                                                  key={event.id}
                                                                  id={String(event.id)}
                                                                  title={event.title}
                                                                  date={event.start_date}
                                                                  location={event.location}
                                                                  bannerUrl={event.banner_url}
                                                                  photo={event.banner_url || undefined}
                                                                />
                                                              ))}
                                                            </div>

                                                            {createdEvents.length > 4 && (
                                                              <div className="flex justify-center mt-6">
                                                                <Button
                                                                  variant="outline"
                                                                  onClick={() => setShowAllEvents(!showAllEvents)}
                                                                  className="rounded-full px-6 font-semibold cursor-pointer"
                                                                  style={{
                                                                    background: "var(--card2)",
                                                                    borderColor: "var(--border)",
                                                                    color: "var(--text)",
                                                                  }}
                                                                >
                                                                  {showAllEvents
                                                                    ? "Show Less"
                                                                    : `View All Events (${createdEvents.length})`}
                                                                </Button>
                                                              </div>
                                                            )}
                                                          </>
                                                        ) : (
                                                          <div
                                                            className="py-12 px-4 flex flex-col items-center justify-center border border-dashed rounded-2xl text-center"
                                                            style={{
                                                              background: "var(--card2)",
                                                              borderColor: "var(--border)",
                                                            }}
                                                          >
                                                            <CalendarDays className="w-9 h-9 mb-2.5" style={{ color: "var(--subtle)" }} />
                                                            <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                                              No events created yet.
                                                            </p>
                                                            ) : (
                                                            <p className="text-sm font-medium text-zinc-600 italic">
                                                              Not provided
                                                            </p>
                      )}
                                                          </div>
                  </div>
                      </div>
                    )}
                                                </motion.div>

                                                {/* PHONE */}
                                                <div className="flex items-center gap-4 group">
                                                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                                                    <Phone
                                                      className={`w-5 h-5 ${profile.phone
                                                          ? "text-[var(--muted)] group-hover:text-emerald-400"
                                                          : "text-zinc-600"
                                                        }`}
                                                    />
                                                    {/* TECHNICAL SKILLS */}
                                                    <motion.div
                                                      initial={{ opacity: 0, y: 12 }}
                                                      animate={{ opacity: 1, y: 0 }}
                                                      transition={{ duration: 0.35, delay: 0.16 }}
                                                      className="rounded-[24px] border p-5 sm:p-7 shadow-xs"
                                                      style={{
                                                        background: "var(--card)",
                                                        borderColor: "var(--border)",
                                                      }}
                                                    >
                                                      <div className="flex items-center justify-between gap-3 mb-5">
                                                        <div>
                                                          <span
                                                            className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                                                            style={{ color: "var(--accent)" }}
                                                          >
                                                            Expertise
                                                          </span>
                                                          <h2
                                                            className="font-bricolage text-xl font-extrabold tracking-tight"
                                                            style={{ color: "var(--text)" }}
                                                          >
                                                            Technical Skills
                                                          </h2>
                                                        </div>
                                                      </div>

                                                      <div>
                                                        <p className="text-xs text-zinc-600 dark:text-zinc-500 mb-1">Phone Number</p>
                                                        {profile.phone ? (
                                                          <p className="text-sm font-medium text-zinc-200">
                                                            {profile.phone}
                                                            {profile.skills && profile.skills.length > 0 ? (
                                                              <div className="flex flex-wrap gap-2.5">
                                                                {profile.skills.map((skill, index) => (
                                                                  <span
                                                                    key={index}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors"
                                                                    style={{
                                                                      background: "var(--card2)",
                                                                      borderColor: "var(--border)",
                                                                      color: "var(--text)",
                                                                    }}
                                                                  >
                                                                    <span
                                                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                      style={{ background: "var(--accent)" }}
                                                                    />
                                                                    {skill}
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            ) : (
                                                              <div
                                                                className="flex flex-col items-center justify-center py-10 px-4 border border-dashed rounded-2xl text-center"
                                                                style={{
                                                                  background: "var(--card2)",
                                                                  borderColor: "var(--border)",
                                                                }}
                                                              >
                                                                <Briefcase className="w-8 h-8 mb-2.5" style={{ color: "var(--subtle)" }} />
                                                                <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>
                                                                  No skills listed yet.
                                                                </p>
                                                                ) : (
                                                                <p className="text-sm font-medium text-zinc-600 italic">
                                                                  Not provided
                                                                </p>
                      )}
                                                              </div>
                  </div>
                      </div>
                    )}
                                                    </motion.div>
                                                  </div>
                                                </motion.div>

                                                {/* SOCIAL LINKS */}
                                                <motion.div
                                                  initial={{ opacity: 0, y: 15 }}
                                                  animate={{ opacity: 1, y: 0 }}
                                                  transition={{ duration: 0.4, delay: 0.4 }}
                                                  className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm"
                                                >
                                                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6">
                                                    Social Links
                                                  </h2>
                                                  {/* RIGHT SIDEBAR: CONTACT & SOCIAL */}
                                                  <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-24">
                                                    {/* CONTACT CARD */}
                                                    <motion.div
                                                      initial={{ opacity: 0, y: 12 }}
                                                      animate={{ opacity: 1, y: 0 }}
                                                      transition={{ duration: 0.35, delay: 0.18 }}
                                                      className="rounded-[24px] border p-5 sm:p-6 shadow-xs space-y-4"
                                                      style={{
                                                        background: "var(--card)",
                                                        borderColor: "var(--border)",
                                                      }}
                                                    >
                                                      <div>
                                                        <span
                                                          className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                                                          style={{ color: "var(--accent)" }}
                                                        >
                                                          Reach Out
                                                        </span>
                                                        <h2
                                                          className="font-bricolage text-lg font-extrabold tracking-tight"
                                                          style={{ color: "var(--text)" }}
                                                        >
                                                          Contact Details
                                                        </h2>
                                                      </div>

                                                      <div className="flex flex-col gap-3">
                                                        {/* LINKEDIN */}
                                                        {profile.linkedin ? (
                                                          <a
                                                            href={profile.linkedin}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-[#0077B5]/10 border border-white/5 hover:border-[#0077B5]/20 transition-all"
                                                          >
                                                            <div className="flex items-center gap-3">
                                                              <Linkedin className="w-5 h-5 text-[var(--muted)] group-hover:text-[#0077B5]" />
                                                              <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                                                                LinkedIn
                                                              </span>
                                                              <div className="space-y-3">
                                                                <div
                                                                  className="flex items-center gap-3.5 p-3.5 rounded-2xl border"
                                                                  style={{
                                                                    background: "var(--card2)",
                                                                    borderColor: "var(--border)",
                                                                  }}
                                                                >
                                                                  <div
                                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                                    style={{
                                                                      background: "color-mix(in oklab, var(--accent) 14%, transparent)",
                                                                      color: "var(--accent)",
                                                                    }}
                                                                  >
                                                                    <Mail className="w-4 h-4" />
                                                                  </div>
                                                                  <div className="min-w-0 flex-1">
                                                                    <p
                                                                      className="font-mono text-[10px] font-bold uppercase tracking-wider"
                                                                      style={{ color: "var(--subtle)" }}
                                                                    >
                                                                      Email
                                                                    </p>
                                                                    <p
                                                                      className={`text-sm font-semibold truncate mt-0.5 ${profile.email ? "" : "italic"}`}
                                                                      style={{ color: profile.email ? "var(--text)" : "var(--muted)" }}
                                                                    >
                                                                      {profile.email || "Not provided"}
                                                                    </p>
                                                                  </div>
                                                                </div>
                                                                <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-[#0077B5]" />
                                                              </a>
                                                              ) : (
                                                              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-transparent border border-dashed border-zinc-800 opacity-50">
                                                                <div className="flex items-center gap-3">
                                                                  <Linkedin className="w-5 h-5 text-zinc-600" />
                                                                  <span className="text-sm font-medium text-zinc-600">
                                                                    LinkedIn not connected
                                                                  </span>

                                                                  <div
                                                                    className="flex items-center gap-3.5 p-3.5 rounded-2xl border"
                                                                    style={{
                                                                      background: "var(--card2)",
                                                                      borderColor: "var(--border)",
                                                                    }}
                                                                  >
                                                                    <div
                                                                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                                      style={{
                                                                        background: "rgba(16, 185, 129, 0.14)",
                                                                        color: "#10b981",
                                                                      }}
                                                                    >
                                                                      <Phone className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                      <p
                                                                        className="font-mono text-[10px] font-bold uppercase tracking-wider"
                                                                        style={{ color: "var(--subtle)" }}
                                                                      >
                                                                        Phone
                                                                      </p>
                                                                      <p
                                                                        className={`text-sm font-semibold truncate mt-0.5 ${profile.phone ? "" : "italic"}`}
                                                                        style={{ color: profile.phone ? "var(--text)" : "var(--muted)" }}
                                                                      >
                                                                        {profile.phone || "Not provided"}
                                                                      </p>
                                                                    </div>
                                                                  </div>
                                                                </div>
                  )}
                                                              </motion.div>

                                                              {/* GITHUB */}
                                                              {profile.github ? (
                                                                <a
                                                                  href={profile.github}
                                                                  target="_blank"
                                                                  rel="noopener noreferrer"
                                                                  className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                                                                >
                                                                  <div className="flex items-center gap-3">
                                                                    <Github className="w-5 h-5 text-[var(--muted)] group-hover:text-white" />
                                                                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white">
                                                                      GitHub
                                                                    </span>
                                                                  </div>
                                                                  <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white" />
                                                                </a>
                                                              ) : (
                                                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-transparent border border-dashed border-zinc-800 opacity-50">
                                                                  <div className="flex items-center gap-3">
                                                                    <Github className="w-5 h-5 text-zinc-600" />
                                                                    <span className="text-sm font-medium text-zinc-600">
                                                                      GitHub not connected
                                                                    </span>
                                                                  </div>
                                                                  {/* SOCIAL LINKS */}
                                                                  <motion.div
                                                                    initial={{ opacity: 0, y: 12 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ duration: 0.35, delay: 0.22 }}
                                                                    className="rounded-[24px] border p-5 sm:p-6 shadow-xs space-y-4"
                                                                    style={{
                                                                      background: "var(--card)",
                                                                      borderColor: "var(--border)",
                                                                    }}
                                                                  >
                                                                    <div>
                                                                      <span
                                                                        className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
                                                                        style={{ color: "var(--accent)" }}
                                                                      >
                                                                        Profiles
                                                                      </span>
                                                                      <h2
                                                                        className="font-bricolage text-lg font-extrabold tracking-tight"
                                                                        style={{ color: "var(--text)" }}
                                                                      >
                                                                        Social Links
                                                                      </h2>
                                                                    </div>
                  )}

                                                                    <div className="flex flex-col gap-2.5">
                                                                      {profile.linkedin ? (
                                                                        <a
                                                                          href={profile.linkedin}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="group flex items-center justify-between p-3.5 rounded-2xl border transition-all hover:scale-[1.01]"
                                                                          style={{
                                                                            background: "var(--card2)",
                                                                            borderColor: "var(--border)",
                                                                            color: "var(--text)",
                                                                          }}
                                                                        >
                                                                          <div className="flex items-center gap-3 min-w-0">
                                                                            <Linkedin className="w-4 h-4 shrink-0 text-[#0a66c2]" />
                                                                            <span className="text-sm font-semibold truncate">LinkedIn</span>
                                                                          </div>
                                                                          <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "var(--subtle)" }} />
                                                                        </a>
                                                                      ) : (
                                                                        <div
                                                                          className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed"
                                                                          style={{
                                                                            background: "var(--card2)",
                                                                            borderColor: "var(--border)",
                                                                            color: "var(--subtle)",
                                                                          }}
                                                                        >
                                                                          <div className="flex items-center gap-3">
                                                                            <Linkedin className="w-4 h-4 shrink-0" />
                                                                            <span className="text-sm font-medium">LinkedIn not connected</span>
                                                                          </div>
                                                                        </div>
                                                                      )}

                                                                      {profile.github ? (
                                                                        <a
                                                                          href={profile.github}
                                                                          target="_blank"
                                                                          rel="noopener noreferrer"
                                                                          className="group flex items-center justify-between p-3.5 rounded-2xl border transition-all hover:scale-[1.01]"
                                                                          style={{
                                                                            background: "var(--card2)",
                                                                            borderColor: "var(--border)",
                                                                            color: "var(--text)",
                                                                          }}
                                                                        >
                                                                          <div className="flex items-center gap-3 min-w-0">
                                                                            <Github className="w-4 h-4 shrink-0" style={{ color: "var(--text)" }} />
                                                                            <span className="text-sm font-semibold truncate">GitHub</span>
                                                                          </div>
                                                                          <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "var(--subtle)" }} />
                                                                        </a>
                                                                      ) : (
                                                                        <div
                                                                          className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed"
                                                                          style={{
                                                                            background: "var(--card2)",
                                                                            borderColor: "var(--border)",
                                                                            color: "var(--subtle)",
                                                                          }}
                                                                        >
                                                                          <div className="flex items-center gap-3">
                                                                            <Github className="w-4 h-4 shrink-0" />
                                                                            <span className="text-sm font-medium">GitHub not connected</span>
                                                                          </div>
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                  </motion.div>
                                                                </div>

                {/* MEMBER SINCE */}
                                                              {profile.created_at && (
                                                                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider">
                                                                  <Calendar className="w-4 h-4" />
                                                                  Joined{" "}
                                                                  {new Date(profile.created_at).toLocaleDateString("en-US", {
                                                                    month: "short",
                                                                    year: "numeric",
                                                                  })}
                                                                </div>
                                                              )}
                                                            </motion.div>
                                                          </div>
              </div>
                                                    </main>
                                                  </div>
                                                </main>
                                              </div>
                                            </AppLayout>
                                        </div>
                                      </PageTransition>
                                    </AppLayout>
                                  </div>
                                </PageTransition>
                                );
}