"use client";

import { useEffect, useState, useRef } from "react";
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
  ImageIcon,
  Camera,
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

type EditProfileFormValues = UpdateProfileFormValues;

export default function EditProfilePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!trimmedSkill) return;

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
    const updatedSkills = skills.filter((skill) => skill !== skillToRemove);
    setSkills(updatedSkills);

    form.setValue("skills", updatedSkills, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  /**
   * Add skill with Enter
   */
  const handleSkillKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddSkill();
    }
  };

  /**
   * Image Upload Handler
   */
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setServerError("Please select a valid image file.");
      return;
    }

    // Validate file size (e.g., limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setServerError("Image size must be less than 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      setServerError("");
      setSuccessMsg("");

      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("Authentication required to upload image.");

      const response = await fetch(`${API_BASE_URL}/image/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to upload image.");
      }

      // Check if the API returned a URL, or if we need to fetch the profile again to get it
      const newImageUrl = data.url || data.image_url || data.avatar_url;

      if (newImageUrl) {
        // Set the form field to the newly uploaded URL
        form.setValue("avatar_url", newImageUrl, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setSuccessMsg("Image uploaded successfully! Don't forget to save changes.");
      } else {
        // If the endpoint updates the profile but doesn't return the URL directly, refetch profile
        const updatedProfileData = await profileService.getMyProfile();
        if ((updatedProfileData as any).avatar_url) {
          form.setValue("avatar_url", (updatedProfileData as any).avatar_url, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setSuccessMsg("Image uploaded successfully! Don't forget to save changes.");
        }
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      setServerError(error.message || "An error occurred while uploading the image.");
    } finally {
      setIsUploading(false);
      // Reset input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

      await profileService.updateMyProfile(payload);
      localStorage.setItem("profile_completed", "true");
      setSuccessMsg("Profile updated successfully!");

      setTimeout(() => {
        router.push("/profile/me");
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-indigo-500/30 pb-24 relative overflow-hidden">
        {/* Ambient Background Glows */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-zinc-950 to-zinc-950 pointer-events-none" />

        {/* Navigation */}
        <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-zinc-950/70 border-b border-white/5 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              href="/profile"
              className="group flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Cancel
            </Link>

            <h1 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Edit Profile
            </h1>

            <div className="w-16" />
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 relative z-10">
          {/* Alerts */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  {serverError}
                </div>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-sm flex items-center gap-2">
                  <Save className="w-4 h-4 shrink-0" />
                  {successMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* BASIC INFORMATION & AVATAR */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 md:p-8 backdrop-blur-md shadow-2xl"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                
                {/* Avatar Preview & Upload */}
                <div className="flex flex-col items-center gap-4 w-full md:w-auto">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-950 border-4 border-zinc-800 shadow-xl flex items-center justify-center shrink-0 relative group cursor-pointer">
                    
                    {/* The Image */}
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-50"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <User className="w-12 h-12 text-zinc-600 transition-opacity duration-300 group-hover:opacity-20" />
                    )}

                    {/* Upload Overlay */}
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-white mb-1" />
                          <span className="text-[10px] font-semibold text-white uppercase tracking-widest">
                            Upload
                          </span>
                        </>
                      )}
                    </label>

                    {/* Hidden Input */}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      disabled={isUploading || isSaving}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 font-medium bg-zinc-950 px-3 py-1.5 rounded-full border border-white/5">
                    Click image to upload
                  </span>
                </div>

                {/* Basic Info Inputs */}
                <div className="flex-1 w-full space-y-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                    <User className="w-5 h-5 text-indigo-400" />
                    Basic Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold text-zinc-400">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g. John Doe"
                        {...form.register("name")}
                        disabled={isSaving}
                        className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                      />
                      {form.formState.errors.name && (
                        <p className="text-xs text-red-400">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Avatar URL (Optional manual input) */}
                    <div className="space-y-2">
                      <Label htmlFor="avatar_url" className="text-sm font-semibold text-zinc-400 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Image URL (Optional)
                      </Label>
                      <Input
                        id="avatar_url"
                        placeholder="https://example.com/avatar.jpg"
                        {...form.register("avatar_url")}
                        disabled={isSaving || isUploading}
                        className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                      />
                      {form.formState.errors.avatar_url && (
                        <p className="text-xs text-red-400">
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Professional Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profession */}
                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-sm font-semibold text-zinc-400">
                    Current Role / Profession
                  </Label>
                  <Input
                    id="profession"
                    placeholder="e.g. Senior Frontend Developer"
                    {...form.register("profession")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-semibold text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. San Francisco, CA"
                    {...form.register("location")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-zinc-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="e.g. +1 (555) 000-0000"
                    {...form.register("phone")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="bio" className="text-sm font-semibold text-zinc-400 flex items-center gap-1">
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
                  className="w-full rounded-xl px-4 py-3 bg-zinc-950/50 border border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all resize-none text-sm outline-none"
                />
                <div className="flex justify-end">
                  <span
                    className={`text-xs ${
                      bioValue.length >= 300 ? "text-red-400 font-bold" : "text-zinc-500"
                    }`}
                  >
                    {bioValue.length}/300
                  </span>
                </div>
              </div>
            </motion.div>

            {/* SKILLS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6"
            >
              <h2 className="text-lg font-bold text-white border-b border-white/5 pb-3">
                Skills & Expertise
              </h2>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Input
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="e.g. React, Python, Project Management"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!skillInput.trim() || isSaving}
                  className="w-full sm:w-auto rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Skill
                </Button>
              </div>

              <div className="min-h-[60px] bg-zinc-950/30 rounded-xl border border-dashed border-white/10 p-4 flex flex-wrap gap-2 items-center">
                {skills.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic w-full text-center">
                    No skills added yet. Add some above!
                  </p>
                ) : (
                  skills.map((skill) => (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-300 text-sm font-medium border border-indigo-500/20 group"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 group-hover:text-red-400 transition-colors bg-black/20 rounded-full p-0.5 ml-1"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-zinc-900/40 border border-white/10 rounded-[2rem] p-6 md:p-8 backdrop-blur-md shadow-2xl space-y-6"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <LinkIcon className="w-5 h-5 text-indigo-400" />
                Links & Socials
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="text-sm font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    LinkedIn
                  </Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/username"
                    {...form.register("linkedin")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-[#0A66C2] focus-visible:border-[#0A66C2]"
                  />
                  {form.formState.errors.linkedin && (
                    <p className="text-xs text-red-400">
                      {form.formState.errors.linkedin.message}
                    </p>
                  )}
                </div>

                {/* GitHub */}
                <div className="space-y-2">
                  <Label htmlFor="github" className="text-sm font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Github className="w-4 h-4 text-zinc-300" />
                    GitHub
                  </Label>
                  <Input
                    id="github"
                    placeholder="https://github.com/username"
                    {...form.register("github")}
                    disabled={isSaving}
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
                  />
                  {form.formState.errors.github && (
                    <p className="text-xs text-red-400">
                      {form.formState.errors.github.message}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* SUBMIT */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="pt-4 flex justify-end"
            >
              <Button
                type="submit"
                disabled={isSaving || isUploading}
                className="w-full md:w-auto md:min-w-[220px] rounded-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
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