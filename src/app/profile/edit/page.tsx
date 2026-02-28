"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    Save,
    X,
    Plus,
    User,
    Phone,
    Briefcase,
    MapPin,
    FileText,
    Link as LinkIcon,
    Github,
    Linkedin,
    Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileService } from "@/services/profile.service";
import {
    UpdateProfileSchema,
    UpdateProfileFormValues,
} from "@/validations/profile.schema";
import PageTransition from "@/components/layout/PageTransition";

export default function EditProfilePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [serverError, setServerError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Skills local state
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");

    const form = useForm<UpdateProfileFormValues>({
        resolver: zodResolver(UpdateProfileSchema),
        defaultValues: {
            name: "",
            phone: "",
            profession: "",
            bio: "",
            location: "",
            linkedin: "",
            github: "",
            avatar_url: "",
            skills: [],
        },
    });

    // Fetch current profile to pre-fill
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await profileService.getMyProfile();
                form.reset({
                    name: data.name || "",
                    phone: data.phone || "",
                    profession: data.profession || "",
                    bio: data.bio || "",
                    location: data.location || "",
                    linkedin: data.linkedin || "",
                    github: data.github || "",
                    avatar_url: data.avatar_url || "",
                    skills: data.skills || [],
                });
                setSkills(data.skills || []);
            } catch {
                // Profile might not exist yet for new users, that's OK
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [form]);

    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !skills.includes(trimmed)) {
            const updated = [...skills, trimmed];
            setSkills(updated);
            form.setValue("skills", updated);
            setSkillInput("");
        }
    };

    const handleRemoveSkill = (skill: string) => {
        const updated = skills.filter((s) => s !== skill);
        setSkills(updated);
        form.setValue("skills", updated);
    };

    const handleSkillKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddSkill();
        }
    };

    const onSubmit = async (data: UpdateProfileFormValues) => {
        try {
            setIsSaving(true);
            setServerError("");
            setSuccessMsg("");
            const payload = { ...data, skills };
            console.log("📤 PROFILE UPDATE PAYLOAD:", JSON.stringify(payload, null, 2));
            await profileService.updateMyProfile(payload);
            // Mark profile as completed to dismiss popup
            localStorage.setItem("profile_completed", "true");
            setSuccessMsg("Profile updated successfully!");
            setTimeout(() => router.push("/profile"), 1200);
        } catch (err: any) {
            setServerError(
                err.response?.data?.error || "Failed to update profile."
            );
        } finally {
            setIsSaving(false);
        }
    };

    const bioValue = form.watch("bio") || "";

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                    <Loader2 className="w-10 h-10 text-indigo-400" />
                </motion.div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-zinc-50 relative overflow-hidden pb-20">
                {/* Background Glows */}
                <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none" />

                {/* Top Bar */}
                <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-zinc-200/50">
                    <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Cancel
                        </Link>
                        <h1 className="text-base font-bold text-zinc-900">Edit Profile</h1>
                        <div className="w-16" /> {/* Spacer to center the title */}
                    </div>
                </nav>

                <main className="max-w-3xl mx-auto px-6 pt-10 relative z-10">
                    {/* Status Messages */}
                    {serverError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-medium text-sm"
                        >
                            {serverError}
                        </motion.div>
                    )}
                    {successMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 font-medium text-sm"
                        >
                            {successMsg}
                        </motion.div>
                    )}

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* --- PERSONAL INFO SECTION --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white rounded-2xl border border-zinc-100 shadow-lg shadow-indigo-900/5 p-6 md:p-8 space-y-6"
                        >
                            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-500" /> Personal Info
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="font-semibold text-zinc-700">
                                        Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        {...form.register("name")}
                                        disabled={isSaving}
                                        className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                    />
                                    {form.formState.errors.name && (
                                        <p className="text-sm text-red-500 font-medium">
                                            {form.formState.errors.name.message}
                                        </p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="phone"
                                        className="font-semibold text-zinc-700 flex items-center gap-1"
                                    >
                                        <Phone className="w-3.5 h-3.5" /> Phone
                                    </Label>
                                    <Input
                                        id="phone"
                                        placeholder="+1234567890"
                                        {...form.register("phone")}
                                        disabled={isSaving}
                                        className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                    />
                                    {form.formState.errors.phone && (
                                        <p className="text-sm text-red-500 font-medium">
                                            {form.formState.errors.phone.message}
                                        </p>
                                    )}
                                </div>

                                {/* Profession */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="profession"
                                        className="font-semibold text-zinc-700 flex items-center gap-1"
                                    >
                                        <Briefcase className="w-3.5 h-3.5" /> Profession
                                    </Label>
                                    <Input
                                        id="profession"
                                        placeholder="Software Engineer"
                                        {...form.register("profession")}
                                        disabled={isSaving}
                                        className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                    />
                                    {form.formState.errors.profession && (
                                        <p className="text-sm text-red-500 font-medium">
                                            {form.formState.errors.profession.message}
                                        </p>
                                    )}
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="location"
                                        className="font-semibold text-zinc-700 flex items-center gap-1"
                                    >
                                        <MapPin className="w-3.5 h-3.5" /> Location
                                    </Label>
                                    <Input
                                        id="location"
                                        placeholder="San Francisco, CA"
                                        {...form.register("location")}
                                        disabled={isSaving}
                                        className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="bio"
                                    className="font-semibold text-zinc-700 flex items-center gap-1"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Bio
                                </Label>
                                <textarea
                                    id="bio"
                                    rows={3}
                                    maxLength={200}
                                    placeholder="Tell us a bit about yourself..."
                                    {...form.register("bio")}
                                    disabled={isSaving}
                                    className="w-full rounded-xl px-4 py-3 bg-zinc-50 border border-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all resize-none text-sm outline-none"
                                />
                                <div className="flex justify-between">
                                    {form.formState.errors.bio && (
                                        <p className="text-sm text-red-500 font-medium">
                                            {form.formState.errors.bio.message}
                                        </p>
                                    )}
                                    <span className="text-xs text-zinc-400 ml-auto">
                                        {bioValue.length}/200
                                    </span>
                                </div>
                            </div>

                            {/* Avatar URL */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="avatar_url"
                                    className="font-semibold text-zinc-700 flex items-center gap-1"
                                >
                                    <Image className="w-3.5 h-3.5" /> Profile Image URL
                                </Label>
                                <Input
                                    id="avatar_url"
                                    placeholder="https://example.com/avatar.jpg"
                                    {...form.register("avatar_url")}
                                    disabled={isSaving}
                                    className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                />
                                {form.formState.errors.avatar_url && (
                                    <p className="text-sm text-red-500 font-medium">
                                        {form.formState.errors.avatar_url.message}
                                    </p>
                                )}
                            </div>
                        </motion.div>

                        {/* --- SKILLS SECTION --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-white rounded-2xl border border-zinc-100 shadow-lg shadow-indigo-900/5 p-6 md:p-8 space-y-6"
                        >
                            <h2 className="text-xl font-bold text-zinc-900">Skills</h2>
                            <div className="flex items-center gap-3">
                                <Input
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={handleSkillKeyDown}
                                    placeholder="Type a skill and press Enter"
                                    disabled={isSaving}
                                    className="flex-1 rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                />
                                <Button
                                    type="button"
                                    onClick={handleAddSkill}
                                    disabled={!skillInput.trim()}
                                    className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-5 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            {skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {skills.map((skill, i) => (
                                        <motion.span
                                            key={skill}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 text-sm font-semibold border border-indigo-100"
                                        >
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSkill(skill)}
                                                className="text-indigo-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.span>
                                    ))}
                                </div>
                            )}
                        </motion.div>

                        {/* --- SOCIAL LINKS SECTION --- */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="bg-white rounded-2xl border border-zinc-100 shadow-lg shadow-indigo-900/5 p-6 md:p-8 space-y-6"
                        >
                            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-violet-500" /> Social Links
                            </h2>

                            <div className="space-y-6">
                                {/* LinkedIn */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="linkedin"
                                        className="font-semibold text-zinc-700 flex items-center gap-1"
                                    >
                                        <Linkedin className="w-3.5 h-3.5 text-blue-600" /> LinkedIn
                                    </Label>
                                    <Input
                                        id="linkedin"
                                        placeholder="https://linkedin.com/in/yourprofile"
                                        {...form.register("linkedin")}
                                        disabled={isSaving}
                                        className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                    />
                                    {form.formState.errors.linkedin && (
                                        <p className="text-sm text-red-500 font-medium">
                                            {form.formState.errors.linkedin.message}
                                        </p>
                                    )}
                                </div>

                                {/* GitHub */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="github"
                                        className="font-semibold text-zinc-700 flex items-center gap-1"
                                    >
                                        <Github className="w-3.5 h-3.5" /> GitHub
                                    </Label>
                                    <Input
                                        id="github"
                                        placeholder="https://github.com/yourusername"
                                        {...form.register("github")}
                                        disabled={isSaving}
                                        className="rounded-xl px-4 py-5 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all"
                                    />
                                    {form.formState.errors.github && (
                                        <p className="text-sm text-red-500 font-medium">
                                            {form.formState.errors.github.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Submit Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                        >
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="w-full rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" /> Save Changes
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </form>
                </main>
            </div>
        </PageTransition>
    );
}
