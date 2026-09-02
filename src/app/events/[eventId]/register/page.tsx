"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Users,
  User,
  ShieldCheck,
  Ticket,
  Plus,
  Trash2,
  Loader2,
  Mail,
  Phone,
  HelpCircle,
  X
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { useMyProfile } from "@/hooks/profileHooks";
import { useToast } from "@/components/providers/ToastProvider";

// Add Razorpay to the Window object for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

// FormRow defined outside the component to prevent typing focus loss!
const FormRow = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-2.5 first:pt-0 last:pb-0">
    <div className="w-9.5 h-9.5 flex items-center justify-center text-zinc-400 mt-1 shrink-0 bg-zinc-50 rounded-lg border border-zinc-200">
      {icon}
    </div>
    <div className="flex-1 min-w-0 space-y-1.5">
      {children}
    </div>
  </div>
);

export default function EventRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { success: showSuccess, error: showError } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [blockedReason, setBlockedReason] = useState("");

  // Team Form State
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([{ email: "", role: "Leader" }]);

  // Registration Form Responses state (Fixed Profile + Event Host Questions)
  const [formResponses, setFormResponses] = useState<Record<string, string>>({
    name: "",
    phone: "",
    email: "",
  });

  const [profileData, setProfileData] = useState<{ name?: string; phone?: string; email?: string }>({});

  const { getMyProfile } = useMyProfile();

  const updateResponse = (field: string, value: string) => {
    setFormResponses((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    // 1. Fetch Event Details & User Profile
    const fetchEventAndUser = async () => {
      try {
        let userEmail = "";
        try {
          const profile = await getMyProfile();
          if (profile) {
            if (profile.email) userEmail = profile.email;
            setFormResponses((prev) => ({
              ...prev,
              name: profile.name || prev.name,
              phone: profile.phone || prev.phone,
              email: profile.email || prev.email || userEmail,
            }));
            setProfileData({
              name: profile.name || "",
              phone: profile.phone || "",
              email: profile.email || userEmail || "",
            });
          }
        } catch (e) {
          console.error("Failed to fetch user profile for registration pre-fill", e);
        }

        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;
        setEvent(rawEvent);

        const rCount = rawEvent._count?.registrations || rawEvent.registeredCount || 0;
        const now = new Date();
        const start = rawEvent.start_date || rawEvent.startDate ? new Date(rawEvent.start_date || rawEvent.startDate) : null;
        const end = rawEvent.end_date || rawEvent.endDate ? new Date(rawEvent.end_date || rawEvent.endDate) : null;

        if (end && now > end) {
          setBlockedReason("This event has already concluded. Registration is closed.");
        } else if (start && now >= start) {
          setBlockedReason("This event is underway / active now. Registration is closed.");
        } else if (rawEvent.capacity > 0 && rCount >= rawEvent.capacity) {
          setBlockedReason("This event is fully booked / sold out. No spots left.");
        }

        // Pre-fill slots
        if (rawEvent.registration_type === "team") {
          const initialMembers = [{ email: userEmail, role: "Leader" }];
          const minTeam = rawEvent.min_team_size || 1;
          for (let i = 1; i < minTeam; i++) {
            initialMembers.push({ email: "", role: "Member" });
          }
          setMembers(initialMembers);
        } else {
          setMembers([{ email: userEmail, role: "Leader" }]);
        }
      } catch (err) {
        setError("Failed to load registration details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEventAndUser();

    // 2. Dynamically Load Razorpay Script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [eventId]);

  const updateMember = (index: number, email: string) => {
    const newMembers = [...members];
    newMembers[index].email = email;
    setMembers(newMembers);
  };

  const addMember = () => {
    if (event && members.length < event.max_team_size) {
      setMembers([...members, { email: "", role: "Member" }]);
    }
  };

  const removeMember = (index: number) => {
    if (event && members.length > event.min_team_size) {
      const newMembers = [...members];
      newMembers.splice(index, 1);
      setMembers(newMembers);
    }
  };

  const handleCheckout = async () => {
    try {
      setError("");
      setIsProcessing(true);

      // Fixed field validations
      if (!formResponses.name?.trim()) {
        setError("Full name is required.");
        setIsProcessing(false);
        return;
      }
      if (!formResponses.phone?.trim()) {
        setError("Phone number is required.");
        setIsProcessing(false);
        return;
      }
      if (!formResponses.email?.trim()) {
        setError("Email address is required.");
        setIsProcessing(false);
        return;
      }

      // Dynamic Required Custom Questions validation (configured by event host)
      const eventSchema =
        event?.registration_form_schema ||
        event?.custom_fields?.registration_form_schema ||
        event?.custom_form_schema ||
        [];

      if (Array.isArray(eventSchema) && eventSchema.length > 0) {
        const customQuestions = eventSchema.filter((f: any) => !f.is_fixed);
        for (const field of customQuestions) {
          if (field.required) {
            const val = formResponses[field.key || field.id];
            if (!val || !val.toString().trim()) {
              setError(`"${field.label}" is required.`);
              setIsProcessing(false);
              return;
            }
          }
        }
      }

      // Team Validation
      if (event.registration_type === "team") {
        if (!teamName) {
          setError("Team name is required.");
          setIsProcessing(false);
          return;
        }
        if (members.some(m => !m.email)) {
          setError("All team members must have a valid email.");
          setIsProcessing(false);
          return;
        }
        if (members.length < event.min_team_size || members.length > event.max_team_size) {
          setError(`Team must be between ${event.min_team_size} and ${event.max_team_size} members.`);
          setIsProcessing(false);
          return;
        }
      }

      // 1. Prepare Payload for StartRegistrationSchema
      const payload = {
        eventId: Number(eventId),
        ...(event.registration_type === "team" ? { teamName, members } : {})
      };

      // 2. Call Backend to Start Registration
      const response = await eventService.registerForEvent(payload);
      const result = response.data;

      // 3. Submit Attendee Registration Form Responses (POST /api/registrations/:registrationId/form)
      const regId = result.registration_id || result.id;
      if (regId) {
        try {
          await eventService.submitRegistrationForm(regId, formResponses);
        } catch (formErr: any) {
          console.error("Warning submitting form responses:", formErr);
        }
      }

      // 4. Handle Free Registration (isFree: true)
      if (response.isFree) {
        const finalId = result.team_id || result.registration_id;
        showSuccess("Registration successful!");
        router.push(`/dashboard/team/${finalId}`);
        return;
      }

      // 5. Handle Paid Registration (Razorpay)
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY",
        amount: result.amount,
        currency: result.currency,
        name: "Community Connect",
        description: `Registration for ${event.title}`,
        order_id: result.razorpay_order_id,
        handler: async function (paymentResponse: any) {
          try {
            setIsProcessing(true);
            await eventService.verifyPayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              team_id: result.team_id ? Number(result.team_id) : undefined,
              registration_id: result.registration_id ? Number(result.registration_id) : undefined
            });

            // Redirect to Team Dashboard!
            const finalId = result.team_id || result.registration_id;
            showSuccess("Registration and payment successful!");
            router.push(`/dashboard/team/${finalId}`);
          } catch (err) {
            setError("Payment verification failed. Please contact support.");
            showError("Payment verification failed. Please contact support.");
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setError("Payment cancelled. Please try again.");
          },
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failedResponse: any) {
        setError(`Payment Failed: ${failedResponse.error.description}`);
        showError(`Payment Failed: ${failedResponse.error.description}`);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to initialize checkout.";
      setError(errMsg);
      showError(errMsg);
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-bold">Event not found.</div>;

  if (blockedReason) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-zinc-200 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-500">
            <X className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Registration Closed</h2>
            <p className="text-zinc-500 text-sm font-semibold leading-relaxed">
              {blockedReason}
            </p>
          </div>
          <Link href={`/events/${eventId}`} className="block">
            <Button className="w-full rounded-2xl py-6 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm shadow-xl transition-all">
              Back to Event Details
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col relative font-sans select-none">

      {/* Ambient background graphics */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -35, 25, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-[-10%] left-[-10%] w-[42%] h-[42%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -25, 30, 0],
          y: [0, 25, -20, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed bottom-[-10%] right-[-10%] w-[52%] h-[52%] rounded-full bg-purple-500/5 blur-[140px] pointer-events-none"
      />

      {/* Navigation Header */}
      <header className="relative z-20 w-full p-4 border-b border-zinc-200 bg-white flex items-center justify-between shadow-xs shrink-0">
        <Link href={`/events/${eventId}`}>
          <Button variant="ghost" className="rounded-full hover:bg-zinc-150 font-bold text-zinc-500 hover:text-zinc-950 transition-all text-xs h-9 px-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event Details
          </Button>
        </Link>
        <div className="flex items-center gap-2 font-black text-zinc-900 text-xs uppercase tracking-widest bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-100/80 shadow-xs">
          <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" /> Secure Checkout
        </div>
        <div className="w-28 hidden md:block"></div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT COLUMN: Event branding, metadata & total price summary (sticky on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="lg:sticky lg:top-8 space-y-6">
              
              {/* Event card with cover / default preset */}
              <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/40 overflow-hidden">
                {event.banner_url || event.bannerUrl || event.banner ? (
                  <img
                    src={event.banner_url || event.bannerUrl || event.banner}
                    alt={event.title}
                    className="w-full h-48 object-cover border-b border-zinc-200"
                  />
                ) : (
                  <div className={`w-full h-36 ${
                    event.type?.toLowerCase().includes("hack") || event.type?.toLowerCase().includes("code") || event.type?.toLowerCase().includes("tech")
                      ? "bg-gradient-to-br from-indigo-900 via-purple-900 to-zinc-950"
                      : event.type?.toLowerCase().includes("meet") || event.type?.toLowerCase().includes("social") || event.type?.toLowerCase().includes("network")
                      ? "bg-gradient-to-br from-amber-955 via-rose-900 to-zinc-950"
                      : "bg-gradient-to-br from-teal-955 via-emerald-900 to-zinc-950"
                  } flex items-center justify-center relative`} />
                )}
                
                <div className="p-6 space-y-3">
                  <span className="px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-750 text-[10px] font-black uppercase tracking-wider">
                    {event.type || "Event"}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight leading-tight">
                    {event.title}
                  </h1>
                  <p className="text-zinc-500 font-semibold text-sm capitalize">
                    {event.mode} Event • {event.location || "Location TBA"}
                  </p>
                </div>
              </div>

              {/* Order Summary & CTA */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/40 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">
                  Order Summary
                </h3>

                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-500 font-bold text-sm">
                    {event.registration_type === "team" ? "Team Registration" : "Individual Entry"}
                  </span>
                  <span className="text-3xl font-black text-zinc-900">
                    {event.registration_fee === 0 ? "Free" : `₹${event.registration_fee}`}
                  </span>
                </div>

                {error && (
                  <div className="p-4 bg-red-55 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex justify-between items-center animate-in fade-in">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="hover:opacity-70"><X className="w-4 h-4" /></button>
                  </div>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full rounded-2xl py-7 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.01]"
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : event.registration_fee === 0 ? (
                    "Complete Registration"
                  ) : (
                    "Proceed to Payment"
                  )}
                </Button>

                <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-1.5 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /> Checkout powered by Razorpay
                </p>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: The Registration Form block panels */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Form Section 1: Profile Information */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/40 space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">Contact Information</h2>
                <p className="text-zinc-400 text-xs font-medium mt-1">Details will be verified and pre-filled from your profile data.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Full Name *</Label>
                  <Input
                    placeholder="Enter full name"
                    value={formResponses.name || ""}
                    onChange={!profileData.name ? (e) => updateResponse("name", e.target.value) : undefined}
                    readOnly={!!profileData.name}
                    className={`h-12 px-4 rounded-xl border-zinc-200 text-sm font-semibold ${
                      profileData.name
                        ? "bg-zinc-50 border-zinc-150 cursor-not-allowed select-none text-zinc-500"
                        : "bg-white text-zinc-900"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Email Address *</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={formResponses.email || ""}
                      onChange={!profileData.email ? (e) => updateResponse("email", e.target.value) : undefined}
                      readOnly={!!profileData.email}
                      className={`h-12 px-4 rounded-xl border-zinc-200 text-sm font-semibold ${
                        profileData.email
                          ? "bg-zinc-50 border-zinc-150 cursor-not-allowed select-none text-zinc-500"
                          : "bg-white text-zinc-900"
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Phone Number *</Label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={formResponses.phone || ""}
                      onChange={!profileData.phone ? (e) => updateResponse("phone", e.target.value) : undefined}
                      readOnly={!!profileData.phone}
                      className={`h-12 px-4 rounded-xl border-zinc-200 text-sm font-semibold ${
                        profileData.phone
                          ? "bg-zinc-50 border-zinc-150 cursor-not-allowed select-none text-zinc-500"
                          : "bg-white text-zinc-900"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Section 2: Team Setup Details */}
            {event.registration_type === "team" ? (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/40 space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">Team Configuration</h2>
                  <p className="text-zinc-400 text-xs font-medium mt-1">Specify team credentials and direct invitation emails.</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                      Team Name *
                    </Label>
                    <Input
                      placeholder="e.g. Code Masters"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="h-12 px-4 rounded-xl bg-white border-zinc-200 text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                      <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Team Member Emails</Label>
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                        {members.length} / {event.max_team_size} Members
                      </span>
                    </div>

                    <div className="space-y-3">
                      {members.map((member, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 text-xs font-black flex items-center justify-center shrink-0 border border-zinc-200">
                            {index + 1}
                          </span>
                          <Input
                            placeholder={index === 0 ? "Leader's Email (You)" : `Member ${index + 1} Email`}
                            value={member.email}
                            onChange={(e) => updateMember(index, e.target.value)}
                            className="h-11 rounded-xl bg-white border-zinc-200 text-xs font-semibold flex-1 px-4"
                          />
                          {index >= event.min_team_size && (
                            <Button variant="ghost" onClick={() => removeMember(index)} className="w-10 h-10 p-0 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {members.length < event.max_team_size && (
                      <Button variant="outline" onClick={addMember} className="w-full h-11 border-dashed border-zinc-300 text-zinc-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all">
                        <Plus className="w-4 h-4 mr-1.5" /> Add Another Member
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/40 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">Solo Participation</h3>
                  <p className="text-zinc-400 text-xs font-semibold mt-0.5">
                    You are registering as an individual. We will pre-fill details from your profile credentials.
                  </p>
                </div>
              </div>
            )}

            {/* Form Section 3: Custom Questionnaire */}
            {(() => {
              const schemaCandidates = [
                event?.registration_form_schema,
                event?.custom_fields?.registration_form_schema,
                event?.custom_form_schema,
                event?.form_schema,
                event?.form_fields,
                event?.registration_fields,
              ];

              let schema: any[] = [];
              for (const candidate of schemaCandidates) {
                if (Array.isArray(candidate) && candidate.length > 0) {
                  schema = candidate;
                  break;
                }
              }

              const customQuestions = schema.filter(
                (f: any) => !f.is_fixed && f.key !== "name" && f.key !== "email" && f.key !== "phone"
              );

              if (customQuestions.length === 0) return null;

              return (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/40 space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">Additional Questions</h2>
                    <p className="text-zinc-400 text-xs font-medium mt-1">Answer specific questions requested by the event organizers.</p>
                  </div>

                  <div className="space-y-6">
                    {customQuestions.map((field: any) => {
                      const key = field.key || field.id;
                      const value = formResponses[key] || "";

                      if (field.type === "textarea") {
                        return (
                          <div key={key} className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                              {field.label} {field.required && "*"}
                            </Label>
                            <textarea
                              placeholder="Enter your response"
                              value={value}
                              onChange={(e) => updateResponse(key, e.target.value)}
                              className="w-full h-28 text-sm p-4 rounded-xl bg-white border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-zinc-900 placeholder:text-zinc-400 font-semibold"
                            />
                          </div>
                        );
                      }

                      if (field.type === "select") {
                        return (
                          <div key={key} className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                              {field.label} {field.required && "*"}
                            </Label>
                            <select
                              value={value || ""}
                              onChange={(e) => updateResponse(key, e.target.value)}
                              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Choose option...</option>
                              {(field.options || []).map((opt: string) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (field.type === "checkbox" || field.type === "boolean") {
                        return (
                          <div key={key} className="space-y-2.5">
                            <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                              {field.label} {field.required && "*"}
                            </Label>
                            <div className="flex gap-3 max-w-[240px]">
                              <button
                                type="button"
                                onClick={() => updateResponse(key, "true")}
                                className={`h-11 px-6 rounded-xl border font-bold text-sm flex-1 transition-all ${
                                  value === "true"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                                }`}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => updateResponse(key, "false")}
                                className={`h-11 px-6 rounded-xl border font-bold text-sm flex-1 transition-all ${
                                  value === "false"
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                                }`}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-655 uppercase tracking-wider">
                            {field.label} {field.required && "*"}
                          </Label>
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            placeholder="Enter your response"
                            value={value}
                            onChange={(e) => updateResponse(key, e.target.value)}
                            className="h-12 px-4 rounded-xl bg-white border-zinc-200 text-sm font-semibold"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>

        </div>
      </main>

    </div>
  );
}