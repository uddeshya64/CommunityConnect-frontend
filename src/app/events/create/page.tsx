"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, MapPin, Calendar, Users, AlignLeft, CheckCircle2, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";

// Updated to match your Backend Zod Schema
interface EventFormData {
  title: string;
  category: string; // Backend calls this 'type'
  mode: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
  capacity: string;
  registration_type: string;
  registration_fee: string;
  min_team_size: string;
  max_team_size: string;
}

const CATEGORIES = ["meetup", "hackathon", "workshop"];
const MODES = ["online", "offline", "hybrid"];
const REG_TYPES = ["solo", "team"];

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    category: "meetup",
    mode: "offline",
    start_date: "",
    end_date: "",
    location: "",
    description: "",
    capacity: "100",
    registration_type: "solo",
    registration_fee: "0",
    min_team_size: "1",
    max_team_size: "1",
  });

  const updateForm = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setError("");
    if (step === 1 && !formData.title) return setError("Please provide an event title.");
    if (step === 2 && (!formData.start_date || !formData.end_date)) return setError("Start and End dates are required.");
    if (step === 2 && formData.mode !== "online" && !formData.location) return setError("Location is required for offline/hybrid events.");
    if (step === 3 && !formData.description) return setError("Please provide a description.");
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      // Transform our frontend state into the EXACT payload the backend Zod schema wants
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.category, // Map 'category' to 'type'
        mode: formData.mode,
        location: formData.location || "Online",
        start_date: new Date(formData.start_date).toISOString(), // Convert to valid ISO Date
        end_date: new Date(formData.end_date).toISOString(),     // Convert to valid ISO Date
        capacity: parseInt(formData.capacity) || 0,
        registration_type: formData.registration_type,
        registration_fee: parseFloat(formData.registration_fee) || 0,
        min_team_size: parseInt(formData.min_team_size) || 1,
        max_team_size: parseInt(formData.max_team_size) || 1,
      };

      await eventService.createEvent(payload);
      router.push("/home");
      
    } catch (err: any) {
      // Smart Zod Error Parser: If backend returns an array of errors, format them nicely!
      const backendError = err.response?.data?.error;
      if (Array.isArray(backendError)) {
        const errorMessages = backendError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(" | ");
        setError(errorMessages);
      } else {
        setError(backendError?.message || backendError || "Failed to create event. Please check your inputs.");
      }
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-1/4 w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />
      
      <nav className="relative z-10 w-full p-6 flex items-center justify-between">
        <Link href="/home">
          <Button variant="ghost" className="rounded-full hover:bg-zinc-200/50">
            <ArrowLeft className="w-5 h-5 mr-2" /> Cancel
          </Button>
        </Link>
        <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Step {step} of 4</div>
        <div className="w-24"></div>
      </nav>

      <main className="flex-1 flex flex-col items-center pt-10 px-6 relative z-10 pb-20">
        <div className="w-full max-w-2xl mb-12 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= i ? "bg-indigo-600" : "bg-zinc-200"}`} />
          ))}
        </div>

        <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100 p-8 md:p-12 relative overflow-hidden min-h-[550px] flex flex-col">
          
          {error && (
             <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 animate-in fade-in">
                {error}
             </div>
          )}

          <AnimatePresence mode="wait" custom={1}>
            
            {/* --- STEP 1: BASICS --- */}
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8"><Sparkles className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Let's start with the basics</h1>
                <p className="text-zinc-500 font-medium mb-10">What kind of event are you hosting?</p>

                <div className="space-y-8 flex-1">
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Event Title</Label>
                    <Input placeholder="e.g., CodeHack 2026..." value={formData.title} onChange={(e) => updateForm("title", e.target.value)} className="text-lg py-7 px-5 rounded-2xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Type</Label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button key={cat} onClick={() => updateForm("category", cat)} className={`px-4 py-2 rounded-xl font-semibold text-sm capitalize transition-all ${formData.category === cat ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-zinc-50 text-zinc-600 border border-zinc-200"}`}>{cat}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Mode</Label>
                      <div className="flex flex-wrap gap-2">
                        {MODES.map((mode) => (
                          <button key={mode} onClick={() => updateForm("mode", mode)} className={`px-4 py-2 rounded-xl font-semibold text-sm capitalize transition-all ${formData.mode === mode ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-zinc-50 text-zinc-600 border border-zinc-200"}`}>{mode}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- STEP 2: TIME & PLACE --- */}
            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-8"><MapPin className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">When and where?</h1>
                <p className="text-zinc-500 font-medium mb-8">Set the stage for your attendees.</p>

                <div className="space-y-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Start Date & Time</Label>
                      <Input type="datetime-local" value={formData.start_date} onChange={(e) => updateForm("start_date", e.target.value)} className="py-6 px-4 rounded-2xl bg-zinc-50 border-zinc-200" />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">End Date & Time</Label>
                      <Input type="datetime-local" value={formData.end_date} onChange={(e) => updateForm("end_date", e.target.value)} className="py-6 px-4 rounded-2xl bg-zinc-50 border-zinc-200" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Location {formData.mode === 'online' && '(Optional for Online)'}</Label>
                    <Input placeholder="e.g., Tech Hub Jaipur, or Zoom URL" value={formData.location} onChange={(e) => updateForm("location", e.target.value)} className="text-lg py-7 px-5 rounded-2xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- STEP 3: DETAILS & REGISTRATION --- */}
            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col overflow-y-auto pr-2">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shrink-0"><AlignLeft className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2 shrink-0">Registration details</h1>
                <p className="text-zinc-500 font-medium mb-6 shrink-0">Define how people will join.</p>

                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Description</Label>
                    <textarea placeholder="What is the agenda? Who are the speakers?" value={formData.description} onChange={(e) => updateForm("description", e.target.value)} className="w-full h-24 text-base py-4 px-5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Reg. Type</Label>
                      <div className="flex gap-2">
                        {REG_TYPES.map((type) => (
                           <button key={type} onClick={() => updateForm("registration_type", type)} className={`px-4 py-2 rounded-xl font-semibold text-sm capitalize flex-1 transition-all ${formData.registration_type === type ? "bg-indigo-600 text-white" : "bg-zinc-50 text-zinc-600 border border-zinc-200"}`}>{type}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Fee (₹)</Label>
                      <Input type="number" placeholder="0 for Free" value={formData.registration_fee} onChange={(e) => updateForm("registration_fee", e.target.value)} className="py-5 px-4 rounded-2xl bg-zinc-50 border-zinc-200" />
                    </div>
                  </div>
                  
                  {formData.registration_type === "team" && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                       <div className="space-y-2">
                          <Label className="text-sm font-bold text-zinc-900">Min Team Size</Label>
                          <Input type="number" min="1" value={formData.min_team_size} onChange={(e) => updateForm("min_team_size", e.target.value)} className="rounded-xl" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-sm font-bold text-zinc-900">Max Team Size</Label>
                          <Input type="number" min="1" value={formData.max_team_size} onChange={(e) => updateForm("max_team_size", e.target.value)} className="rounded-xl" />
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- STEP 4: REVIEW --- */}
            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-8"><CheckCircle2 className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Ready to publish?</h1>
                <p className="text-zinc-500 font-medium mb-10">Here is a sneak peek of your event card.</p>

                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-sm bg-white rounded-3xl p-3 border border-zinc-200 shadow-xl shadow-zinc-200/50">
                    <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-zinc-900 shadow-sm capitalize">
                        {formData.category} • {formData.mode}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-zinc-900 mb-4 line-clamp-2">{formData.title}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : "Date TBA"}
                        </div>
                        <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                          <MapPin className="w-4 h-4 text-rose-400" />
                          {formData.location || "Online"}
                        </div>
                        <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                          <Ticket className="w-4 h-4 text-amber-400" />
                          {Number(formData.registration_fee) === 0 ? "Free Entry" : `₹${formData.registration_fee}`} • {formData.registration_type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1 || isLoading} className={`rounded-full px-6 font-semibold ${step === 1 ? 'invisible' : 'visible'}`}>
              Back
            </Button>

            {step < 4 ? (
              <Button onClick={nextStep} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-6 text-base shadow-lg transition-all hover:scale-105">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={isLoading} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-base shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Publish Event <Sparkles className="w-4 h-4 ml-2" /></>}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}