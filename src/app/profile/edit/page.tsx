
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
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
  Image as ImageIcon,
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

type EditProfileFormValues = UpdateProfileFormValues;

export default function EditProfilePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Skills state
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Form
  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(UpdateProfileSchema) as any,

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

  // Watch fields
  const avatarUrl = form.watch("avatar_url");
  const bioValue = form.watch("bio") || "";

  /**
   * Fetch existing profile
   */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);

        const data = await profileService.getMyProfile();

        const profileData = data as any;

        const existingSkills = Array.isArray(profileData.skills)
          ? profileData.skills
          : [];

        form.reset({
          name: profileData.name || "",
          phone: profileData.phone || "",
          profession: profileData.profession || "",
          bio: profileData.bio || "",
          location: profileData.location || "",
          linkedin: profileData.linkedin || "",
          github: profileData.github || "",
          avatar_url: profileData.avatar_url || "",
          skills: existingSkills,
        });

        setSkills(existingSkills);
      } catch (error) {
        console.error("Failed to fetch profile:", error);

        setServerError(
          "Unable to load your profile. You can still create your profile."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [form]);

  /**
   * Add skill
   */
  const handleAddSkill = () => {
    const trimmedSkill = skillInput.trim();

    if (!trimmedSkill) {
      return;
    }

    // Prevent duplicate skills
    const alreadyExists = skills.some(
      (skill) => skill.toLowerCase() === trimmedSkill.toLowerCase()
    );

    if (alreadyExists) {
      setSkillInput("");
      return;
    }

    const updatedSkills = [...skills, trimmedSkill];

    setSkills(updatedSkills);

    form.setValue("skills", updatedSkills, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setSkillInput("");
  };

  /**
   * Remove skill
   */
  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = skills.filter(
      (skill) => skill !== skillToRemove
    );

    setSkills(updatedSkills);

    form.setValue("skills", updatedSkills, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  /**
   * Add skill with Enter
   */
  const handleSkillKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddSkill();
    }
  };

  /**
   * Submit form
   */
  const onSubmit = async (data: UpdateProfileFormValues) => {
    try {
      setIsSaving(true);
      setServerError("");
      setSuccessMsg("");

      const payload = {
        ...data,
        skills,
      };

      console.log("Updating profile:", payload);

      await profileService.updateMyProfile(payload);

      localStorage.setItem("profile_completed", "true");

      setSuccessMsg("Profile updated successfully!");

      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1200);
    } catch (error: any) {
      console.error("Profile update error:", error);

      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update profile. Please try again.";

      setServerError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
        >
          <Loader2 className="w-10 h-10 text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-zinc-50/30 relative overflow-hidden pb-24">

        {/* Background Glows */}
        <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

        {/* Navigation */}
        <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-zinc-200/50 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">

            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Cancel
            </Link>

            <h1 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Edit Profile
            </h1>

            <div className="w-16" />
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 relative z-10">

          {/* Alerts */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  marginBottom: 24,
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-medium text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {serverError}
                </div>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  marginBottom: 24,
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginBottom: 0,
                }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 font-medium text-sm flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {successMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
          >

            {/* BASIC INFORMATION */}
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
                duration: 0.4,
              }}
              className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">

                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-4 w-full md:w-auto">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-100 border-4 border-white shadow-lg flex items-center justify-center shrink-0">

                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <User className="w-12 h-12 text-zinc-300" />
                    )}

                  </div>

                  <span className="text-xs text-zinc-400 font-medium bg-zinc-100 px-3 py-1 rounded-full">
                    Preview
                  </span>
                </div>

                {/* Basic Info */}
                <div className="flex-1 w-full space-y-6">

                  <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
                    <User className="w-5 h-5 text-indigo-500" />
                    Basic Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Name */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold text-zinc-700"
                      >
                        Full Name
                      </Label>

                      <Input
                        id="name"
                        placeholder="John Doe"
                        {...form.register("name")}
                        disabled={isSaving}
                        className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500"
                      />

                      {form.formState.errors.name && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Avatar URL */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="avatar_url"
                        className="text-sm font-semibold text-zinc-700 flex items-center gap-1"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Profile Image URL
                      </Label>

                      <Input
                        id="avatar_url"
                        placeholder="https://example.com/avatar.jpg"
                        {...form.register("avatar_url")}
                        disabled={isSaving}
                        className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500"
                      />

                      {form.formState.errors.avatar_url && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.avatar_url.message}
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>

            {/* PROFESSIONAL DETAILS */}
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
                duration: 0.4,
                delay: 0.1,
              }}
              className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6"
            >

              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                Professional Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Profession */}
                <div className="space-y-2">
                  <Label
                    htmlFor="profession"
                    className="text-sm font-semibold text-zinc-700"
                  >
                    Current Role / Profession
                  </Label>

                  <Input
                    id="profession"
                    placeholder="e.g. Senior Frontend Developer"
                    {...form.register("profession")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label
                    htmlFor="location"
                    className="text-sm font-semibold text-zinc-700 flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Location
                  </Label>

                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    {...form.register("location")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm font-semibold text-zinc-700 flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Phone Number
                  </Label>

                  <Input
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    {...form.register("phone")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500"
                  />
                </div>

              </div>

              {/* Bio */}
              <div className="space-y-2 pt-2">

                <Label
                  htmlFor="bio"
                  className="text-sm font-semibold text-zinc-700 flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Professional Bio
                </Label>

                <textarea
                  id="bio"
                  rows={4}
                  maxLength={300}
                  placeholder="Summarize your expertise and goals..."
                  {...form.register("bio")}
                  disabled={isSaving}
                  className="w-full rounded-xl px-4 py-3 bg-zinc-50 border border-zinc-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent transition-all resize-none text-sm outline-none"
                />

                <div className="flex justify-end">
                  <span
                    className={`text-xs ${
                      bioValue.length >= 300
                        ? "text-red-500 font-bold"
                        : "text-zinc-400"
                    }`}
                  >
                    {bioValue.length}/300
                  </span>
                </div>

              </div>
            </motion.div>

            {/* SKILLS */}
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
                duration: 0.4,
                delay: 0.2,
              }}
              className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6"
            >

              <h2 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                Skills & Expertise
              </h2>

              <div className="flex items-center gap-3">

                <Input
                  value={skillInput}
                  onChange={(event) =>
                    setSkillInput(event.target.value)
                  }
                  onKeyDown={handleSkillKeyDown}
                  placeholder="e.g. React, Python, Project Management"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500"
                />

                <Button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!skillInput.trim() || isSaving}
                  className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>

              </div>

              <div className="min-h-[60px] bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 p-4 flex flex-wrap gap-2 items-center">

                {skills.length === 0 ? (
                  <p className="text-sm text-zinc-400 italic w-full text-center">
                    No skills added yet. Add some above!
                  </p>
                ) : (
                  skills.map((skill) => (
                    <motion.span
                      key={skill}
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100/50 group"
                    >
                      {skill}

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 group-hover:text-red-500 transition-colors bg-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))
                )}

              </div>
            </motion.div>

            {/* SOCIAL LINKS */}
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
                duration: 0.4,
                delay: 0.3,
              }}
              className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 md:p-8 space-y-6"
            >

              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-100 pb-2">
                <LinkIcon className="w-5 h-5 text-indigo-500" />
                Links & Socials
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* LinkedIn */}
                <div className="space-y-2">

                  <Label
                    htmlFor="linkedin"
                    className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5"
                  >
                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    LinkedIn
                  </Label>

                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/username"
                    {...form.register("linkedin")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-[#0A66C2]"
                  />

                  {form.formState.errors.linkedin && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.linkedin.message}
                    </p>
                  )}

                </div>

                {/* GitHub */}
                <div className="space-y-2">

                  <Label
                    htmlFor="github"
                    className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5"
                  >
                    <Github className="w-4 h-4 text-zinc-900" />
                    GitHub
                  </Label>

                  <Input
                    id="github"
                    placeholder="https://github.com/username"
                    {...form.register("github")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-900"
                  />

                  {form.formState.errors.github && (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.github.message}
                    </p>
                  )}

                </div>

              </div>
            </motion.div>

            {/* SUBMIT */}
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
                duration: 0.4,
                delay: 0.4,
              }}
              className="pt-4"
            >

              <Button
                type="submit"
                disabled={isSaving}
                className="w-full md:w-auto md:min-w-[200px] float-right rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
              >

                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Profile
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

