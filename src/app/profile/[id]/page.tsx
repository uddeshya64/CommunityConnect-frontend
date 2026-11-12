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

interface CreatedEvent {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  banner_url?: string;
}

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

export default function PublicProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const profileId = params.id as string;
  const { profile: userProfile } = useUser();

  const [profile, setProfile] = useState<ExtendedProfile | null>(() => {
    if (profileId === "me" && userProfile) {
      return userProfile as unknown as ExtendedProfile;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(profileId === "me" ? !userProfile : true);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getProfileById } = useProfileById();

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
      } catch (err: unknown) {
        if (!profile) {
          const message = err instanceof Error ? err.message : "Profile not found.";
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, userProfile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

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

      const updatedProfile = await getProfileById(profileId);
      setProfile(updatedProfile);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload profile image.";
      setError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
              </div>
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
          </AppLayout>
        </div >
      </PageTransition >
    );
  }

  // ==============================
  // ERROR SCREEN
  // ==============================

  if (error || !profile) {
    return (
      <PageTransition>
        <div
          className="min-h-screen transition-colors"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        >
          <AppLayout>
            <div className="flex flex-1 min-w-0 items-center justify-center px-4 py-16">
              <div
                className="w-full max-w-md rounded-[28px] border p-8 text-center space-y-6 shadow-sm"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border"
                  style={{
                    background: "var(--card2)",
                    borderColor: "var(--border)",
                  }}
                >
                  <User className="w-9 h-9" style={{ color: "var(--muted)" }} />
                </div>

                <div className="space-y-2">
                  <h2
                    className="font-bricolage text-2xl font-extrabold tracking-tight"
                    style={{ color: "var(--text)" }}
                  >
                    Profile Unavailable
                  </h2>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    {error || "Profile not found."}
                  </p>
                </div>

                <div className="flex justify-center">
                  <BackButton />
                </div>
              </div>
            </div>
          </AppLayout>
        </div>
      </PageTransition>
    );
  }

  // ==============================
  // INITIALS & DERIVED STATE
  // ==============================

  const initials = (profile.name || "U")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const createdEvents = profile.events_created || [];
  const visibleEvents = showAllEvents
    ? createdEvents
    : createdEvents.slice(0, 4);

  const isOwnProfile = Boolean(
    userProfile && String(userProfile.id) === String(profile.id)
  );

  const activityStats = [
    {
      label: "Events Created",
      value: profile._count?.events_created ?? createdEvents.length ?? 0,
      icon: CalendarDays,
      tint: "color-mix(in oklab, var(--accent) 14%, transparent)",
      color: "var(--accent)",
    },
    {
      label: "Teams Led",
      value: profile._count?.teams_led ?? 0,
      icon: Users,
      tint: "rgba(16, 185, 129, 0.14)",
      color: "#10b981",
    },
    {
      label: "Mentorships",
      value: profile._count?.mentor_assignments ?? 0,
      icon: ShieldCheck,
      tint: "rgba(245, 158, 11, 0.14)",
      color: "#f59e0b",
    },
    {
      label: "Submissions",
      value: profile._count?.submissions ?? 0,
      icon: Trophy,
      tint: "color-mix(in oklab, var(--accent2) 14%, transparent)",
      color: "var(--accent2)",
    },
  ];

  // ==============================
  // MAIN UI
  // ==============================

  return (
    <PageTransition>
      <div
        className="min-h-screen transition-colors"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <AppLayout>
          <div className="flex flex-1 min-w-0">
            <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
              {/* TOP ACTION BAR */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <BackButton />

                {isOwnProfile && (
                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all hover:opacity-90"
                      style={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      <Settings
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--muted)" }}
                      />
                      <span>Settings</span>
                    </Link>

                    <Link
                      href="/profile/edit"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-sm transition-all hover:opacity-95"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--accent), var(--accent2))",
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </Link>
                  </div>
                )}
              </div>

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
                        background:
                          "linear-gradient(135deg, var(--accent), var(--accent2))",
                        boxShadow:
                          "0 20px 40px -14px color-mix(in oklab, var(--accent) 45%, transparent)",
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
                            alt={profile.name || "Member avatar"}
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
                        <input
                          id="profile-image-upload"
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </>
                    )}
                  </div>

                  {/* IDENTITY & BIO */}
                  <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                    <div>
                      <span
                        className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: "var(--accent)" }}
                      >
                        Member Profile
                      </span>
                      <h1
                        className="font-bricolage text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mt-0.5 truncate"
                        style={{ color: "var(--text)" }}
                      >
                        {profile.name || "Community Member"}
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
                        style={{
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: profile.profession
                            ? "var(--text)"
                            : "var(--muted)",
                        }}
                      >
                        <Briefcase
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: "var(--accent)" }}
                        />
                        <span>{profile.profession || "Profession not set"}</span>
                      </span>

                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
                        style={{
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: profile.location
                            ? "var(--text)"
                            : "var(--muted)",
                        }}
                      >
                        <MapPin
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: "var(--accent)" }}
                        />
                        <span>{profile.location || "Location not set"}</span>
                      </span>

                      {profile.created_at && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[11px]"
                          style={{
                            background: "var(--card2)",
                            borderColor: "var(--border)",
                            color: "var(--muted)",
                          }}
                        >
                          <Calendar
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: "var(--accent)" }}
                          />
                          <span>
                            Joined{" "}
                            {new Date(profile.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-sm sm:text-[15px] leading-relaxed max-w-3xl mx-auto md:mx-0 ${profile.bio ? "" : "italic"
                        }`}
                      style={{
                        color: profile.bio ? "var(--muted)" : "var(--subtle)",
                      }}
                    >
                      {profile.bio || "This user hasn't added a bio yet."}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* PLATFORM ACTIVITY STATS */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
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
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: stat.tint, color: stat.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* WORKSPACE 2-COLUMN GRID */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* LEFT PRIMARY COLUMN */}
                <div className="xl:col-span-8 space-y-6">
                  {/* EVENTS CREATED */}
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
                    <div className="flex items-center justify-between gap-3 mb-6">
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
                        <p
                          className="text-xs sm:text-sm mt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          Events organized by {profile.name || "this member"}
                        </p>
                      </div>

                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{
                          background:
                            "color-mix(in oklab, var(--accent) 14%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        <CalendarDays className="w-5 h-5" />
                      </div>
                    </div>

                    {createdEvents.length > 0 ? (
                      <>
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

                        {createdEvents.length > 4 && (
                          <div className="flex justify-center mt-7">
                            <Button
                              variant="outline"
                              onClick={() => setShowAllEvents(!showAllEvents)}
                              className="rounded-full px-6 font-semibold"
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
                        <CalendarDays
                          className="w-9 h-9 mb-2.5"
                          style={{ color: "var(--subtle)" }}
                        />
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          No events created yet.
                        </p>
                      </div>
                    )}
                  </motion.div>

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
                        <Briefcase
                          className="w-8 h-8 mb-2.5"
                          style={{ color: "var(--subtle)" }}
                        />
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--muted)" }}
                        >
                          No skills listed yet.
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>

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
                            background:
                              "color-mix(in oklab, var(--accent) 14%, transparent)",
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
                            className={`text-sm font-semibold truncate mt-0.5 ${profile.email ? "" : "italic"
                              }`}
                            style={{
                              color: profile.email
                                ? "var(--text)"
                                : "var(--muted)",
                            }}
                          >
                            {profile.email || "Not provided"}
                          </p>
                        </div>
                      </div>

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
                            Phone Number
                          </p>
                          <p
                            className={`text-sm font-semibold truncate mt-0.5 ${profile.phone ? "" : "italic"
                              }`}
                            style={{
                              color: profile.phone
                                ? "var(--text)"
                                : "var(--muted)",
                            }}
                          >
                            {profile.phone || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* SOCIAL LINKS CARD */}
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
                        Connect
                      </span>
                      <h2
                        className="font-bricolage text-lg font-extrabold tracking-tight"
                        style={{ color: "var(--text)" }}
                      >
                        Social Links
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3">
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
                            <span className="text-sm font-semibold truncate">
                              LinkedIn
                            </span>
                          </div>
                          <ExternalLink
                            className="w-4 h-4 shrink-0"
                            style={{ color: "var(--subtle)" }}
                          />
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
                            <span className="text-sm font-medium">
                              LinkedIn not connected
                            </span>
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
                            <Github
                              className="w-4 h-4 shrink-0"
                              style={{ color: "var(--text)" }}
                            />
                            <span className="text-sm font-semibold truncate">
                              GitHub
                            </span>
                          </div>
                          <ExternalLink
                            className="w-4 h-4 shrink-0"
                            style={{ color: "var(--subtle)" }}
                          />
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
                            <span className="text-sm font-medium">
                              GitHub not connected
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </main>
          </div>
        </AppLayout>
      </div>
    </PageTransition>
  );
}
