"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileById, MyProfile } from "@/hooks/profileHooks";
import PageTransition from "@/components/layout/PageTransition";

export default function PublicProfilePage() {
    const params = useParams();
    const profileId = params.id as string;

    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const { getProfileById } = useProfileById();

    useEffect(() => {
        if (!profileId) return;
        const fetchProfile = async () => {
            try {
                const data = await getProfileById(profileId);
                setProfile(data);
            } catch (err: any) {
                setError(err.message || "Profile not found.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [profileId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                    <Loader2 className="w-10 h-10 text-indigo-400" />
                </motion.div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center">
                        <User className="w-8 h-8 text-zinc-500" />
                    </div>
                    <p className="text-zinc-400 font-semibold">{error || "Profile not found."}</p>
                    <Link href="/home">
                        <Button variant="outline" className="rounded-full border-white/10 text-zinc-300 hover:bg-white/5">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const hasAvatar = profile.avatar_url;
    const initials = (profile.name || "U")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <PageTransition>
            <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

                {/* Top Nav */}
                <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-zinc-950/60 border-b border-white/5">
                    <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
                        <Link
                            href="/home"
                            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Link>
                    </div>
                </nav>

                <main className="max-w-3xl mx-auto px-6 pt-10 pb-20 relative z-10">
                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center text-center"
                    >
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-rose-500 p-[3px] shadow-2xl shadow-indigo-500/20 mb-6">
                            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                                {hasAvatar ? (
                                    <img
                                        src={profile.avatar_url as string}
                                        alt={profile.name || "Avatar"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl font-black text-white">{initials}</span>
                                )}
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            {profile.name || "Community Member"}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                            {profile.profession && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300">
                                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                                    {profile.profession}
                                </span>
                            )}
                            {profile.location && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                    {profile.location}
                                </span>
                            )}
                        </div>

                        {profile.bio && (
                            <p className="mt-6 text-zinc-400 font-medium text-base leading-relaxed max-w-lg">
                                {profile.bio}
                            </p>
                        )}
                    </motion.div>

                    {/* Details */}
                    <div className="mt-12 space-y-4">
                        {/* Contact */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5"
                        >
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                                Contact
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {profile.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500 font-medium">Email</p>
                                            <p className="text-sm text-zinc-200 font-semibold truncate">{profile.email}</p>
                                        </div>
                                    </div>
                                )}
                                {profile.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500 font-medium">Phone</p>
                                            <p className="text-sm text-zinc-200 font-semibold">{profile.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {!profile.email && !profile.phone && (
                                    <p className="text-sm text-zinc-500 font-medium col-span-2">No contact info available.</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Social */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                            className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5"
                        >
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                                Social
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {profile.linkedin && (
                                    
                                        <a href={profile.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0077B5]/10 border border-[#0077B5]/20 text-[#0077B5] hover:bg-[#0077B5]/20 transition-all text-sm font-semibold group"
                                    >
                                        <Linkedin className="w-4 h-4" />
                                        LinkedIn
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {profile.github && (
                                    
                                        <a href={profile.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all text-sm font-semibold group"
                                    >
                                        <Github className="w-4 h-4" />
                                        GitHub
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                )}
                                {!profile.linkedin && !profile.github && (
                                    <p className="text-sm text-zinc-500 font-medium">No social links available.</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Skills */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-5"
                        >
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4">
                                Skills
                            </h2>
                            {profile.skills && profile.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {profile.skills.map((skill, i) => (
                                        <span
                                            key={i}
                                            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 font-medium">No skills listed.</p>
                            )}
                        </motion.div>

                        {/* Member Since */}
                        {profile?.created_at && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.25 }}
                                className="flex items-center justify-center gap-2 pt-6 text-zinc-600 text-sm font-medium"
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                Member since{" "}
                                {new Date(profile.created_at).toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </motion.div>
                        )}
                    </div>
                </main>
            </div>
        </PageTransition>
    );
}