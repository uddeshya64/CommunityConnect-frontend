
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
  ArrowLeft,
  ExternalLink,
  Calendar,
  User,
  Camera,
  Star,
  Trophy,
  Users,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useProfileById, MyProfile } from "@/hooks/profileHooks";
import PageTransition from "@/components/layout/PageTransition";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// ==============================
// CREATED EVENT TYPE
// ==============================

    const params = useParams();

    const searchParams = useSearchParams();

// ==============================
// EXTENDED PROFILE TYPE
// ==============================

    const profileId =
        params.id as string;

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

  // ==============================
  // STATES
  // ==============================

  const [profile, setProfile] =
    useState<ExtendedProfile | null>(null);

    const { getProfileById } = useProfileById();
    // Save OAuth tokens and remove from URL

    useEffect(() => {

  const [isUploading, setIsUploading] =
    useState(false);

        const accessToken =
            searchParams.get(
                "accessToken"
            );

  const fileInputRef =
    useRef<HTMLInputElement>(null);

        const refreshToken =
            searchParams.get(
                "refreshToken"
            );


  // ==============================
  // HANDLE OAUTH TOKENS
  // ==============================

        if (accessToken) {

            localStorage.setItem(
                "accessToken",
                accessToken
            );

        }



        if (refreshToken) {

            localStorage.setItem(
                "refreshToken",
                refreshToken
            );

        }



        // remove tokens from browser URL

        if (accessToken || refreshToken) {

            window.history.replaceState(
                null,
                "",
                window.location.pathname
            );

        }


    }, [
        searchParams
    ]);


    useEffect(() => {

        if (!profileId) return;

  useEffect(() => {
    if (!profileId) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError("");

        const data =
          await getProfileById(profileId);

        setProfile(data);

      } catch (err: any) {

                setProfile(data);


            } catch (err: any) {


      } finally {

        setIsLoading(false);

      }
    };

    fetchProfile();

  }, [profileId]);


  // ==============================
  // PROFILE IMAGE UPLOAD
  // ==============================

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) return;


    // Validate file type
    if (!file.type.startsWith("image/")) {

      setError(
        "Please select a valid image file."
      );

      return;
    }


    // Validate file size
    if (file.size > 5 * 1024 * 1024) {

      setError(
        "Image size must be less than 5MB."
      );

      return;
    }


    try {

      setIsUploading(true);

      setError("");


      const formData =
        new FormData();

      formData.append(
        "image",
        file
      );


      const token =
        localStorage.getItem(
          "accessToken"
        );


      if (!token) {

        throw new Error(
          "Authentication token not found."
        );

      }


      const response =
        await fetch(
          "http://localhost:3000/api/image/upload",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            body: formData,
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          "Failed to upload image."
        );

      }


      // Refresh profile
      const updatedProfile =
        await getProfileById(
          profileId
        );

      setProfile(
        updatedProfile
      );


    } catch (err: any) {

      setError(
        err.message ||
        "Failed to upload profile image."
      );

    } finally {

      setIsUploading(false);


      if (fileInputRef.current) {

        fileInputRef.current.value =
          "";

      }

    }

  };


  // ==============================
  // LOADING SCREEN
  // ==============================

  if (isLoading) {

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">

        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
        >
          <Loader2 className="w-10 h-10 text-indigo-500" />
        </motion.div>

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
            const response =
                await fetch(
                    process.env.NEXT_PUBLIC_API_URL || `${API_BASE_URL}/image/upload`,
                    {

                        method: "POST",

                        headers: {

  // ==============================
  // ERROR SCREEN
  // ==============================

  if (error || !profile) {

                        body: formData

        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">

          <User className="w-10 h-10 text-zinc-500" />

        </div>


        <div className="text-center space-y-2">

          <h2 className="text-xl font-semibold text-zinc-200">
            Oops!
          </h2>

          <p className="text-zinc-400">
            {error ||
              "Profile not found."}
          </p>

        </div>


        <Link href="/home">

          <Button
            variant="outline"
            className="rounded-full border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />

            Back to Home

          </Button>

        </Link>

            if (!response.ok) {

  }


  // ==============================
  // INITIALS
  // ==============================

  const initials =
    (profile.name || "U")
      .split(" ")
      .map(
        (word) => word[0]
      )
      .join("")
      .toUpperCase()
      .slice(0, 2);


  // ==============================
  // PRO STATUS
  // ==============================

  const isPro =
    profile.subscription_status
      ?.toLowerCase() === "pro";


  // ==============================
  // EVENTS
  // ==============================

  const createdEvents =
    profile.events_created || [];


  // Show only 2 events initially
  const visibleEvents =
    showAllEvents
      ? createdEvents
      : createdEvents.slice(0, 2);


  return (

        }
        catch (err: any) {

      <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-indigo-500/30 pb-24">


        {/* ==============================
            AMBIENT BACKGROUND
        ============================== */}

        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-zinc-950 to-zinc-950 pointer-events-none" />


        {/* ==============================
            NAVBAR
        ============================== */}

        }
        finally {

          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">

            <Link
              href="/home"
              className="group flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >

              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />

              Back to Directory

            if (fileInputRef.current) {

                fileInputRef.current.value = "";

        </nav>


        {/* ==============================
            MAIN CONTENT
        ============================== */}

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 relative z-10 space-y-8">


          {/* ==============================
              HERO PROFILE CARD
          ============================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="relative bg-zinc-900/40 border border-white/10 rounded-[2rem] p-8 sm:p-10 backdrop-blur-md overflow-hidden"
          >

            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />


            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">


                    animate={{
                        rotate: 360
                    }}

                    transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear"
                    }}

                <div
                  className={`w-36 h-36 rounded-full p-1 shadow-2xl ${
                    isPro
                      ? "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-orange-500/20"
                      : "bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-900 shadow-indigo-500/20"
                  }`}
                >

                  <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden border-4 border-zinc-950">

                    {profile.avatar_url ? (

                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />

                    ) : (

                      <span className="text-4xl font-bold text-white tracking-wider">
                        {initials}
                      </span>

    if (error || !profile) {

                  </div>

                </div>


                {/* Upload Button */}

                <label
                  htmlFor="profile-image-upload"
                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-950 hover:bg-indigo-600 cursor-pointer flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
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

              </div>


                            <ArrowLeft className="w-4 h-4 mr-2" />

              <div className="flex-1 text-center md:text-left space-y-5 w-full">

                <div>

                  <div className="flex flex-col md:flex-row items-center gap-3 mb-2">

                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">

                      {profile.name ||
                        "Community Member"}

                    </h1>


                    {isPro && (

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 uppercase tracking-wider">

                        <Star className="w-3 h-3 fill-amber-400" />

                        Pro Member

                      </span>

                    )}

                  </div>


                  {/* PROFESSION & LOCATION */}

    const initials =
        (profile.name || "U")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    return (
        <PageTransition>

            <div className="
            min-h-screen
            bg-zinc-950
            relative
            overflow-hidden
        ">


                <div className="
                fixed
                inset-0
                bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
                from-indigo-900/20
                via-zinc-950
                to-zinc-950
                pointer-events-none
            "/>




                {/* Top Navigation */}

                <nav className="
                sticky
                top-0
                z-50
                w-full
                backdrop-blur-xl
                bg-zinc-950/60
                border-b
                border-white/5
            ">


                    <div className="
                    max-w-3xl
                    mx-auto
                    px-6
                    h-14
                    flex
                    items-center
                ">


                        <Link
                            href="/home"
                            className="
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-medium
                            text-zinc-400
                            hover:text-white
                            transition-colors
                        "
                        >

                            <ArrowLeft className="w-4 h-4" />

                            Back

                        </Link>


                    </div>


                </nav>



                      {profile.profession ||
                        "Profession not set"}

                    </span>

                <main className="
                max-w-3xl
                mx-auto
                px-6
                pt-10
                pb-20
                relative
                z-10
            ">

                    <span
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                        profile.location
                          ? "bg-white/5 border-white/5 text-zinc-300"
                          : "bg-transparent border-dashed border-zinc-700 text-zinc-500"
                      }`}
                    >

                      <MapPin
                        className={`w-4 h-4 ${
                          profile.location
                            ? "text-rose-400"
                            : "text-zinc-600"
                        }`}
                      />

                    {/* Hero Section */}

                    <motion.div

                        initial={{
                            opacity: 0,
                            y: 20
                        }}

                        animate={{
                            opacity: 1,
                            y: 0
                        }}

                        transition={{
                            duration: 0.5
                        }}

                        className="
                        flex
                        flex-col
                        items-center
                        text-center
                    "

                    >

                  {profile.bio ||
                    "This user hasn't added a bio yet."}

                </p>

              </div>

                        {/* Avatar + Upload Button */}

                        <div className="
                        relative
                        mb-6
                    ">



                            <div className="
                            w-28
                            h-28
                            rounded-full
                            bg-gradient-to-br
                            from-indigo-500
                            via-violet-500
                            to-rose-500
                            p-[3px]
                            shadow-2xl
                            shadow-indigo-500/20
                        ">

          </motion.div>


                                <div className="
                                w-full
                                h-full
                                rounded-full
                                bg-zinc-900
                                flex
                                items-center
                                justify-center
                                overflow-hidden
                            ">

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.4,
              delay: 0.1,
            }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >

            {/* EVENTS */}

                                    {hasAvatar ? (

              <CalendarDays className="w-6 h-6 text-indigo-400 mb-1" />

                                        <img

                                            src={
                                                profile.avatar_url as string
                                            }

                                            alt={
                                                profile.name ||
                                                "Avatar"
                                            }

                                            className="
                                            w-full
                                            h-full
                                            object-cover
                                        "

                                        />

              </p>

                                    ) : (


                                        <span className="
                                        text-3xl
                                        font-black
                                        text-white
                                    ">

                                            {initials}

                                        </span>

              <p className="text-2xl font-bold text-white">

                                    )}

              </p>

              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">

                                </div>

              </p>

            </div>

                            </div>

            {/* MENTORSHIPS */}

            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 hover:bg-zinc-900/60 transition-colors">

              <ShieldCheck className="w-6 h-6 text-amber-400 mb-1" />

              <p className="text-2xl font-bold text-white">

                            {/* Camera Button */}

              </p>

                            <label

                                htmlFor="profile-image-upload"

                                className="
                                absolute
                                bottom-0
                                right-0
                                w-9
                                h-9
                                rounded-full
                                bg-indigo-600
                                hover:bg-indigo-700
                                cursor-pointer
                                flex
                                items-center
                                justify-center
                                shadow-lg
                                transition
                            "

                            >


            {/* SUBMISSIONS */}

                                {isUploading ? (

              <Trophy className="w-6 h-6 text-rose-400 mb-1" />

                                    <Loader2

                                        className="
                                        w-4
                                        h-4
                                        text-white
                                        animate-spin
                                    "

                                    />

              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">

                                ) : (

              </p>

                                    <Camera

                                        className="
                                        w-4
                                        h-4
                                        text-white
                                    "

                                    />

          {/* ==============================
              CREATED EVENTS
          ============================== */}

                                )}

            {/* EVENTS HEADER */}

            <div className="flex items-center justify-between mb-6">

              <div>

                            </label>

                  Events Created

                </h2>

                <p className="text-sm text-zinc-500 mt-1">

                            <input

                                id="profile-image-upload"

                                ref={fileInputRef}

                                type="file"

                                accept="image/*"

                                hidden

                                onChange={
                                    handleImageUpload
                                }

                            />

            {/* EVENTS EXIST */}

            {createdEvents.length > 0 ? (

              <>

                        </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {visibleEvents.map(
                    (event) => (

                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="group"
                      >

                        <div className="overflow-hidden rounded-2xl bg-zinc-950/50 border border-white/5 hover:border-indigo-500/30 transition-all">


                          {/* EVENT BANNER */}

                        <h1 className="
                        text-3xl
                        md:text-4xl
                        font-extrabold
                        text-white
                        tracking-tight
                    ">

                            {event.banner_url ? (

                            {profile.name ||
                                "Community Member"}

                            ) : (

                        </h1>

                                <CalendarDays className="w-12 h-12 text-indigo-400/50" />

                              </div>

                            )}

                          </div>

                        <div className="
                        flex
                        flex-wrap
                        items-center
                        justify-center
                        gap-3
                        mt-4
                    ">

                          {/* EVENT INFORMATION */}

                          <div className="p-5">

                            {profile.profession && (

                                <span className="
                                inline-flex
                                items-center
                                gap-1.5
                                px-3
                                py-1.5
                                rounded-full
                                bg-white/5
                                border
                                border-white/10
                                text-sm
                                font-medium
                                text-zinc-300
                            ">

                            </h3>

                                    <Briefcase
                                        className="
                                        w-3.5
                                        h-3.5
                                        text-indigo-400
                                    "
                                    />

                            {/* DATE */}

                                    {profile.profession}

                              <Calendar className="w-4 h-4 text-indigo-400" />

                                </span>

                            </div>

                            )}

                            {/* LOCATION */}

                            {event.location && (

                              <div className="flex items-center gap-2 mt-2 text-sm text-zinc-400">

                                <MapPin className="w-4 h-4 text-rose-400" />

                                {event.location}

                            {profile.location && (

                                <span className="
                                inline-flex
                                items-center
                                gap-1.5
                                px-3
                                py-1.5
                                rounded-full
                                bg-white/5
                                border
                                border-white/10
                                text-sm
                                font-medium
                                text-zinc-300
                            ">


                                    <MapPin

                                        className="
                                        w-3.5
                                        h-3.5
                                        text-rose-400
                                    "

                                    />

                              <ExternalLink className="w-4 h-4" />

                                    {profile.location}

                          </div>

                        </div>

                                </span>

                    )
                  )}

                            )}


                {/* VIEW MORE BUTTON */}

                        </div>

                  <div className="flex justify-center mt-8">

                    <Button
                      variant="outline"
                      onClick={() =>
                        setShowAllEvents(
                          !showAllEvents
                        )
                      }
                      className="rounded-full border-white/10 bg-white/5 text-zinc-300 hover:bg-indigo-500/10 hover:text-white hover:border-indigo-500/30 px-6"
                    >

                      {showAllEvents
                        ? "Show Less"
                        : `View More Events (${createdEvents.length - 2} more)`}

                    </Button>

                  </div>

                        {profile.bio && (

              </>

                            <p className="
                            mt-6
                            text-zinc-400
                            font-medium
                            text-base
                            leading-relaxed
                            max-w-lg
                        ">

              /* NO EVENTS */

                                {profile.bio}

                <CalendarDays className="w-10 h-10 text-zinc-600 mb-3" />

                            </p>

                  No events created yet.

                </p>

                        )}

            )}

          </motion.div>


                    </motion.div>
                    {/* Details */}

                    <div className="mt-12 space-y-4">


                        {/* Contact */}

                        <motion.div

                            initial={{
                                opacity: 0,
                                y: 15
                            }}

                            animate={{
                                opacity: 1,
                                y: 0
                            }}

                            transition={{
                                duration: 0.4,
                                delay: 0.1
                            }}

                            className="
            bg-white/[0.03]
            backdrop-blur-sm
            rounded-2xl
            border
            border-white/[0.06]
            p-5
        "

                        >

                </div>

                            <h2 className="
            text-xs
            font-bold
            uppercase
            tracking-wider
            text-zinc-500
            mb-4
        ">

                                Contact

                            </h2>

                    {profile.skills.map(
                      (skill, index) => (

                        <span
                          key={index}
                          className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-sm font-medium hover:bg-indigo-500/20 transition-colors shadow-sm"
                        >

                          {skill}

                            <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            gap-4
        ">

                      )
                    )}

                                {profile.email && (

                                    <div className="
                    flex
                    items-center
                    gap-3
                ">

                  <div className="flex flex-col items-center justify-center py-10 text-zinc-500 border-2 border-dashed border-white/5 rounded-2xl">

                                        <div className="
                        w-9
                        h-9
                        rounded-xl
                        bg-indigo-500/10
                        flex
                        items-center
                        justify-center
                    ">

                                            <Mail className="
                            w-4
                            h-4
                            text-indigo-400
                        "/>

                      No skills listed yet.

                                        </div>

                  </div>

                                        <div>

                                            <p className="
                            text-xs
                            text-zinc-500
                        ">

                                                Email

                                            </p>

            {/* ==============================
                SIDEBAR
            ============================== */}

                                            <p className="
                            text-sm
                            text-zinc-200
                            font-semibold
                        ">

                                                {profile.email}

                                            </p>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.3,
                }}
                className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm"
              >

                                        </div>

                  Contact

                                    </div>

                                )}

                <div className="space-y-5">


                  {/* EMAIL */}

                                {profile.phone && (

                                    <div className="
                    flex
                    items-center
                    gap-3
                ">

                      <Mail
                        className={`w-5 h-5 ${
                          profile.email
                            ? "text-zinc-400 group-hover:text-indigo-400"
                            : "text-zinc-600"
                        }`}
                      />

                                        <div className="
                        w-9
                        h-9
                        rounded-xl
                        bg-emerald-500/10
                        flex
                        items-center
                        justify-center
                    ">


                                            <Phone className="
                            w-4
                            h-4
                            text-emerald-400
                        "/>

                      <p className="text-xs text-zinc-500 mb-1">

                                        </div>

                      </p>

                                        <div>

                      {profile.email ? (

                                            <p className="
                            text-xs
                            text-zinc-500
                        ">

                                                Phone

                                            </p>

                      ) : (

                                            <p className="
                            text-sm
                            text-zinc-200
                            font-semibold
                        ">

                                                {profile.phone}

                                            </p>

                      )}

                                        </div>


                                    </div>

                                )}



                                {!profile.email && !profile.phone && (

                                    <p className="
                    text-sm
                    text-zinc-500
                    col-span-2
                ">

                                        No contact info available.

                                    </p>

                                )}



                            </div>


                        </motion.div>





                        {/* Social */}


                        <motion.div

                            initial={{
                                opacity: 0,
                                y: 15
                            }}

                            animate={{
                                opacity: 1,
                                y: 0
                            }}

                            transition={{
                                duration: 0.4,
                                delay: 0.15
                            }}

                            className="
            bg-white/[0.03]
            backdrop-blur-sm
            rounded-2xl
            border
            border-white/[0.06]
            p-5
        "

                        >


                            <h2 className="
            text-xs
            font-bold
            uppercase
            tracking-wider
            text-zinc-500
            mb-4
        ">

                                Social

                            </h2>



                            <div className="flex flex-wrap gap-3">


                                {profile.linkedin && (

                                    <a

                                        href={profile.linkedin}

                                        target="_blank"

                                        rel="noopener noreferrer"

                                        className="
                        inline-flex
                        items-center
                        gap-2
                        px-4
                        py-2.5
                        rounded-xl
                        bg-[#0077B5]/10
                        border
                        border-[#0077B5]/20
                        text-[#0077B5]
                    "

                                    >


                                        <Linkedin className="w-4 h-4" />

                                        LinkedIn


                                        <ExternalLink className="w-3 h-3" />


                                    </a>


                                )}


                  {/* PHONE */}

                  <div className="flex items-center gap-4 group">

                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">

                      <Phone
                        className={`w-5 h-5 ${
                          profile.phone
                            ? "text-zinc-400 group-hover:text-emerald-400"
                            : "text-zinc-600"
                        }`}
                      />

                                {profile.github && (

                                    <a

                                        href={profile.github}

                                        target="_blank"

                                        rel="noopener noreferrer"

                                        className="
                        inline-flex
                        items-center
                        gap-2
                        px-4
                        py-2.5
                        rounded-xl
                        bg-white/5
                        border
                        border-white/10
                        text-zinc-300
                    "

                                    >

                      </p>

                                        <Github className="w-4 h-4" />

                      {profile.phone ? (

                                        GitHub

                          {profile.phone}

                                        <ExternalLink className="w-3 h-3" />

                      ) : (

                                    </a>

                          Not provided

                                )}

                      )}

                    </div>

                  </div>

                                {!profile.linkedin && !profile.github && (

                                    <p className="
                    text-sm
                    text-zinc-500
                ">

                                        No social links available.

                                    </p>

                                )}

                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6">

                  Social Links

                            </div>


                        </motion.div>


                  {/* LINKEDIN */}

                  {profile.linkedin ? (

                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-[#0077B5]/10 border border-white/5 hover:border-[#0077B5]/20 transition-all"
                    >

                        {/* Skills */}

                        <Linkedin className="w-5 h-5 text-zinc-400 group-hover:text-[#0077B5]" />

                        <motion.div

                            initial={{
                                opacity: 0,
                                y: 15
                            }}

                            animate={{
                                opacity: 1,
                                y: 0
                            }}

                            transition={{
                                duration: 0.4,
                                delay: 0.2
                            }}

                            className="
            bg-white/[0.03]
            backdrop-blur-sm
            rounded-2xl
            border
            border-white/[0.06]
            p-5
        "

                        >

                    </a>

                            <h2 className="
            text-xs
            font-bold
            uppercase
            tracking-wider
            text-zinc-500
            mb-4
        ">

                                Skills

                            </h2>

                        <Linkedin className="w-5 h-5 text-zinc-600" />

                        <span className="text-sm font-medium text-zinc-600">

                          LinkedIn not connected

                            {profile.skills &&
                                profile.skills.length > 0 ? (

                                <div className="
                flex
                flex-wrap
                gap-2
            ">

                    </div>

                                    {profile.skills.map(
                                        (skill, index) => (

                                            <span

                                                key={index}

                                                className="
                            px-3.5
                            py-1.5
                            rounded-full
                            bg-indigo-500/10
                            border
                            border-indigo-500/20
                            text-indigo-300
                            text-sm
                            font-semibold
                        "

                                            >

                                                {skill}

                        <Github className="w-5 h-5 text-zinc-400 group-hover:text-white" />

                                            </span>


                                        ))}

                        </span>


                                </div>


                            ) : (

                                <p className="
                text-sm
                text-zinc-500
            ">

                                    No skills listed.

                                </p>

                            )}

                        <Github className="w-5 h-5 text-zinc-600" />

                        <span className="text-sm font-medium text-zinc-600">

                        </motion.div>

                        </span>

                      </div>

                    </div>

                  )}


                        {/* Member Since */}



                        {profile.created_at && (

                            <motion.div

                                initial={{
                                    opacity: 0
                                }}

                                animate={{
                                    opacity: 1
                                }}

                                transition={{
                                    duration: 0.4,
                                    delay: 0.25
                                }}

                                className="
                flex
                items-center
                justify-center
                gap-2
                pt-6
                text-zinc-600
                text-sm
            "

                            >


                                <Calendar className="w-3.5 h-3.5" />


                                Member since{" "}


                                {new Date(
                                    profile.created_at
                                ).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "long",
                                        year: "numeric"
                                    }
                                )}


                {/* MEMBER SINCE */}

                            </motion.div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">

                        )}


                    Joined{" "}

                    {new Date(
                      profile.created_at
                    ).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        year: "numeric",
                      }
                    )}

                    </div>

                )}

                </main>

            </div>

            </div>

        </main>

        </PageTransition>

    );

  );

}
