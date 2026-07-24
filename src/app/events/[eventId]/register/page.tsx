"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Users, User, ShieldCheck, Ticket, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { useMyProfile } from "@/hooks/profileHooks";

// Add Razorpay to the Window object for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function EventRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Team Form State
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([{ email: "", role: "Leader" }]);

  // Registration Form Responses state (Fixed Profile + Event Host Questions)
  const [formResponses, setFormResponses] = useState<Record<string, string>>({
    name: "",
    phone: "",
    email: "",
  });

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
          }
        } catch (e) {
          console.error("Failed to fetch user profile for registration pre-fill", e);
        }

        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;
        setEvent(rawEvent);

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
            router.push(`/dashboard/team/${finalId}`);
          } catch (err) {
            setError("Payment verification failed. Please contact support.");
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
         setIsProcessing(false);
      });
      rzp.open();

    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to initialize checkout.");
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-bold">Event not found.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Navbar */}
      <nav className="w-full p-6 flex items-center justify-between bg-white border-b border-zinc-100 sticky top-0 z-50">
        <Link href={`/events/${eventId}`}>
          <Button variant="ghost" className="rounded-full hover:bg-zinc-100 font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event
          </Button>
        </Link>
        <div className="flex items-center gap-2 font-black text-zinc-900 text-lg tracking-tight">
           <ShieldCheck className="w-5 h-5 text-emerald-500" /> Secure Checkout
        </div>
        <div className="w-24"></div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
        
        {/* LEFT COLUMN: Registration Form */}
        <div className="lg:col-span-7 space-y-8">
          
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-2">Complete your registration</h1>
            <p className="text-zinc-500 font-medium text-lg">You are registering for <span className="text-zinc-900 font-bold">{event.title}</span>.</p>
          </div>

          {error && (
             <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm animate-in fade-in">
               {error}
             </div>
          )}

          {event.registration_type === "team" ? (
             <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm space-y-8">
                <div className="space-y-3">
                  <Label className="text-base font-bold text-zinc-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> Team Name
                  </Label>
                  <Input 
                    placeholder="e.g., The Bug Smashers" 
                    value={teamName} 
                    onChange={(e) => setTeamName(e.target.value)} 
                    className="py-6 px-5 rounded-2xl bg-zinc-50 border-zinc-200 text-lg font-semibold focus-visible:ring-indigo-600" 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                     <Label className="text-base font-bold text-zinc-900">Team Members</Label>
                     <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full">
                        {members.length} / {event.max_team_size} Allowed
                     </span>
                  </div>
                  
                  {members.map((member, index) => (
                    <div key={index} className="flex items-center gap-3 animate-in slide-in-from-top-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${index === 0 ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-zinc-50 border-zinc-200 text-zinc-400"}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <Input 
                          placeholder={index === 0 ? "Leader's Email (You)" : `Member ${index + 1} Email`}
                          value={member.email}
                          onChange={(e) => updateMember(index, e.target.value)}
                          className="py-6 rounded-xl bg-zinc-50 border-zinc-200"
                        />
                      </div>
                      {index >= event.min_team_size && (
                        <Button variant="ghost" onClick={() => removeMember(index)} className="w-12 h-12 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {members.length < event.max_team_size && (
                    <Button variant="outline" onClick={addMember} className="w-full py-6 border-dashed border-2 border-zinc-200 text-zinc-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl font-bold transition-colors">
                      <Plus className="w-5 h-5 mr-2" /> Add Another Member
                    </Button>
                  )}
                </div>
             </div>
          ) : (
             <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center py-16">
               <User className="w-16 h-16 text-indigo-500 mb-4 bg-indigo-50 p-3 rounded-full" />
               <h3 className="text-2xl font-bold text-zinc-900 mb-2">Solo Participation</h3>
               <p className="text-zinc-500 font-medium max-w-sm">You are registering as an individual. We will use your account details to reserve your spot.</p>
             </div>
          )}

          {/* ATTENDEE REGISTRATION DETAILS FORM */}
          <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm space-y-6">
            <div className="border-b border-zinc-100 pb-4">
              <h2 className="text-xl font-extrabold text-zinc-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> Attendee Registration Details
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-1">
                Your profile information and answers will be saved for this event registration.
              </p>
            </div>

            {/* Fixed Profile Required Fields */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Fixed Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-700">Full Name *</Label>
                  <Input
                    placeholder="Anjali Sharma"
                    value={formResponses.name || ""}
                    onChange={(e) => updateResponse("name", e.target.value)}
                    className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-700">Phone Number *</Label>
                  <Input
                    placeholder="9876543210"
                    value={formResponses.phone || ""}
                    onChange={(e) => updateResponse("phone", e.target.value)}
                    className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-zinc-700">Email Address *</Label>
                  <Input
                    type="email"
                    placeholder="anjali@example.com"
                    value={formResponses.email || ""}
                    onChange={(e) => updateResponse("email", e.target.value)}
                    className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                  />
                </div>
              </div>
            </div>

            {/* Event Specific Dynamic Questions Created By Host */}
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

              if (customQuestions.length === 0) {
                return null;
              }

              return (
                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Event Registration Questions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customQuestions.map((field: any) => {
                      const key = field.key || field.id;
                      const value = formResponses[key] || "";

                      if (field.type === "textarea") {
                        return (
                          <div key={key} className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-bold text-zinc-700">
                              {field.label} {field.required && "*"}
                            </Label>
                            <textarea
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              value={value}
                              onChange={(e) => updateResponse(key, e.target.value)}
                              className="w-full h-24 py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                            />
                          </div>
                        );
                      }

                      if (field.type === "select") {
                        return (
                          <div key={key} className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-700">
                              {field.label} {field.required && "*"}
                            </Label>
                            <select
                              value={value || field.options?.[0] || ""}
                              onChange={(e) => updateResponse(key, e.target.value)}
                              className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-semibold text-zinc-800"
                            >
                              <option value="">-- Select {field.label} --</option>
                              {(field.options || []).map((opt: string) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (field.type === "checkbox") {
                        return (
                          <div key={key} className="space-y-2 flex items-center gap-3 pt-4">
                            <input
                              type="checkbox"
                              id={key}
                              checked={value === "true"}
                              onChange={(e) => updateResponse(key, e.target.checked ? "true" : "false")}
                              className="w-4 h-4 rounded accent-indigo-600"
                            />
                            <Label htmlFor={key} className="text-xs font-bold text-zinc-700 cursor-pointer">
                              {field.label} {field.required && "*"}
                            </Label>
                          </div>
                        );
                      }

                      return (
                        <div key={key} className="space-y-2">
                          <Label className="text-xs font-bold text-zinc-700">
                            {field.label} {field.required && "*"}
                          </Label>
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            value={value}
                            onChange={(e) => updateResponse(key, e.target.value)}
                            className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
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

        {/* RIGHT COLUMN: Order Summary (Sticky) */}
        <div className="lg:col-span-5 relative">
          <div className="sticky top-28 bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100">
             <h3 className="text-xl font-black text-zinc-900 mb-6 border-b border-zinc-100 pb-4">Order Summary</h3>
             
             <div className="space-y-4 mb-8">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-zinc-900">{event.title}</p>
                    <p className="text-sm font-medium text-zinc-500 capitalize">{event.registration_type} Entry Ticket</p>
                  </div>
                  <p className="font-bold text-zinc-900">₹{event.registration_fee || 0}</p>
               </div>
               {/* Add taxes or platform fees here if needed */}
             </div>

             <div className="flex justify-between items-center border-t border-zinc-100 pt-6 mb-8">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Total Due</p>
                <p className="text-4xl font-black text-zinc-900 tracking-tight">₹{event.registration_fee || 0}</p>
             </div>

             <Button 
                onClick={handleCheckout} 
                disabled={isProcessing}
                className="w-full rounded-2xl py-7 bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-bold shadow-xl transition-all hover:scale-[1.02]"
              >
               {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : event.registration_fee === 0 ? "Complete Registration" : "Proceed to Payment"}
             </Button>

             <p className="text-center text-xs font-semibold text-zinc-400 mt-6 flex items-center justify-center gap-1.5">
               <ShieldCheck className="w-4 h-4" /> Payments are securely processed via Razorpay.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}