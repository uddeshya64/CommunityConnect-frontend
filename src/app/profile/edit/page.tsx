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
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useToast } from "@/components/providers/ToastProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

type EditProfileFormValues = UpdateProfileFormValues;

export default function EditProfilePage() {
  const { isDark, activeAccent } = useAppearance();
  const { success: showSuccess, error: showError } = useToast();
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
    const cachedProfile = localStorage.getItem("cc_user_profile");
    if (cachedProfile) {
      try {
        const profileData = JSON.parse(cachedProfile) as any;
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
        setIsLoading(false);
      } catch (e) {}
    }

    const fetchProfile = async () => {
      try {
        if (!cachedProfile) {
          setIsLoading(true);
        }

        const data = await profileService.getMyProfile();
        const profileData = data as any;
        // localStorage.setItem("cc_user_profile", JSON.stringify(profileData));

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
        if (!cachedProfile) {
          setServerError(
            "Unable to load your profile. You can still create your profile."
          );
        }
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
      // localStorage.setItem("profile_completed", "true");
      setSuccessMsg("Profile updated successfully!");
      showSuccess("Profile updated successfully!");

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
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);
    setServerError("Please fix the validation errors in the form before saving.");
    showError("Please fix the validation errors in the form before saving.");
  };

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-zinc-200" : "bg-zinc-50 text-zinc-900"} relative overflow-hidden`}>
        <div className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isDark ? "from-zinc-900/20 via-zinc-950 to-zinc-950" : "from-zinc-200/50 via-zinc-50 to-zinc-50"} pointer-events-none`} />
        <nav className={`sticky top-0 z-50 w-full backdrop-blur-xl ${isDark ? "bg-zinc-950/70 border-white/5" : "bg-white/80 border-zinc-200"} border-b shadow-sm`}>
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between animate-pulse">
            <div className="w-16 h-4 bg-zinc-700/40 rounded" />
            <div className="w-24 h-8 bg-zinc-700/40 rounded-full" />
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-6 pt-10 pb-20 relative z-10 animate-pulse space-y-8">
          <div className="space-y-2">
            <div className="w-48 h-8 bg-zinc-700/40 rounded-xl" />
            <div className="w-72 h-4 bg-zinc-700/20 rounded" />
          </div>
          <div className={`rounded-[2rem] p-6 md:p-8 ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border flex flex-col md:flex-row gap-8`}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-zinc-700/40" />
              <div className="w-28 h-6 bg-zinc-700/30 rounded-full" />
            </div>
            <div className="flex-1 space-y-6">
              <div className="w-36 h-6 bg-zinc-700/40 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="w-16 h-4 bg-zinc-700/30 rounded" />
                  <div className="w-full h-11 bg-zinc-700/20 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-zinc-700/30 rounded" />
                  <div className="w-full h-11 bg-zinc-700/20 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
          <div className={`rounded-[2rem] p-6 md:p-8 ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border space-y-6`}>
            <div className="w-40 h-6 bg-zinc-700/40 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="w-20 h-4 bg-zinc-700/30 rounded" />
                <div className="w-full h-11 bg-zinc-700/20 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="w-16 h-4 bg-zinc-700/30 rounded" />
                <div className="w-full h-11 bg-zinc-700/20 rounded-xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className={`min-h-screen ${isDark ? "bg-zinc-950 text-zinc-200" : "bg-zinc-50 text-zinc-900"} font-sans selection:bg-indigo-500/30 pb-24 relative overflow-hidden transition-colors duration-300`}>
        {/* Ambient Background Glows */}
        <div className={`fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isDark ? "from-zinc-900/20 via-zinc-950 to-zinc-950" : "from-zinc-200/50 via-zinc-50 to-zinc-50"} pointer-events-none`} />

        {/* Navigation */}
        <nav className={`sticky top-0 z-50 w-full backdrop-blur-xl ${isDark ? "bg-zinc-950/70 border-white/5" : "bg-white/80 border-zinc-200"} border-b shadow-sm`}>
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              href="/profile/me"
              className={`group flex items-center gap-2 text-sm font-medium ${isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-950"} transition-colors`}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Cancel
            </Link>

            <h1 className={`text-sm font-bold ${isDark ? "text-zinc-200" : "text-zinc-900"} uppercase tracking-wider`}>
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
                <div className={`p-4 rounded-xl ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-900"} font-medium text-sm flex items-center gap-2`}>
                  <X className="w-4 h-4 shrink-0" />
                  {serverError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
            {/* BASIC INFORMATION & AVATAR */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`rounded-[2rem] p-6 md:p-8 backdrop-blur-md ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border`}
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
                  <h2 className={`text-lg font-bold ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"} flex items-center gap-2 border-b pb-3`}>
                    <User className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-zinc-900"}`} />
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
                        className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
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
                        className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
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
              className={`rounded-[2rem] p-6 md:p-8 backdrop-blur-md ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border space-y-6`}
            >
              <h2 className={`text-lg font-bold ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"} flex items-center gap-2 border-b pb-3`}>
                <Briefcase className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-zinc-900"}`} />
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
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
                  />
                  {form.formState.errors.profession && (
                    <p className="text-xs text-red-400">
                      {form.formState.errors.profession.message}
                    </p>
                  )}
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
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
                  />
                  {form.formState.errors.location && (
                    <p className="text-xs text-red-400">
                      {form.formState.errors.location.message}
                    </p>
                  )}
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
                    className="rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-red-400">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
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
                  className="w-full rounded-xl px-4 py-3 bg-zinc-950/50 border border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:border-zinc-400 transition-all resize-none text-sm outline-none"
                />
                {form.formState.errors.bio && (
                  <p className="text-xs text-red-400">
                    {form.formState.errors.bio.message}
                  </p>
                )}
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
              className={`rounded-[2rem] p-6 md:p-8 backdrop-blur-md ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border space-y-6`}
            >
              <h2 className={`text-lg font-bold ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"} border-b pb-3`}>
                Skills & Expertise
              </h2>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Input
                  value={skillInput}
                  onChange={(event) => setSkillInput(event.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="e.g. React, Python, Project Management"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-zinc-950/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  disabled={!skillInput.trim() || isSaving}
                  className={`w-full sm:w-auto rounded-xl ${isDark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-black"} transition-all font-semibold`}
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${isDark ? "bg-white/10 text-zinc-100 border-white/20" : "bg-zinc-100 text-black border-zinc-300"} text-sm font-medium border group shadow-sm`}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className={`group-hover:text-red-400 transition-colors rounded-full p-0.5 ml-1 ${isDark ? "text-zinc-400 hover:bg-white/10" : "text-black hover:bg-zinc-200"}`}
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
              className={`rounded-[2rem] p-6 md:p-8 backdrop-blur-md ${isDark ? "bg-zinc-900/40 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"} border space-y-6`}
            >
              <h2 className={`text-lg font-bold ${isDark ? "text-white border-white/5" : "text-zinc-900 border-zinc-200"} flex items-center gap-2 border-b pb-3`}>
                <LinkIcon className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-zinc-900"}`} />
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
                className={`w-full md:w-auto md:min-w-[220px] rounded-full py-6 ${activeAccent.bg} hover:opacity-90 text-white font-semibold text-base shadow-lg ${activeAccent.shadow} transition-all hover:-translate-y-1`}
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