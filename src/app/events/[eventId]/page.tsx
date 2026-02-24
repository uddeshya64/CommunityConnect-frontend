"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, MapPin, Users, ArrowLeft, Share2, 
  Ticket, Laptop, MonitorSmartphone, Building2, UserCircle2,
  LayoutDashboard, Settings, Eye, Pencil, Trash2, AlertTriangle, Loader2, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { api } from "@/lib/axios"; 

interface EventDetails {
  id: string;
  title: string;
  type: string;
  mode: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  regType: string;
  fee: number;
  minTeam: number;
  maxTeam: number;
  organizerId?: string; 
  organizerName?: string;
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- NEW RBAC STATES ---
  const [isStaff, setIsStaff] = useState(false);
  const [viewMode, setViewMode] = useState<"DASHBOARD" | "PREVIEW">("PREVIEW");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "EDIT" | "SETTINGS">("OVERVIEW");
  const [isDeleting, setIsDeleting] = useState(false);

  // --- EDIT FORM STATES ---
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });

  // --- NEW REGISTRATION STATES ---
  const [isRegistered, setIsRegistered] = useState(false);
  const [userDashboardId, setUserDashboardId] = useState<string | null>(null);

  const CATEGORIES = ["meetup", "hackathon", "workshop"];
  const MODES = ["online", "offline", "hybrid"];
  const REG_TYPES = ["solo", "team"];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      setUpdateMessage({ type: "", text: "" });

      const payload = {
        title: editData.title,
        description: editData.description,
        type: editData.category,
        mode: editData.mode,
        location: editData.location || "Online",
        start_date: new Date(editData.start_date).toISOString(),
        end_date: new Date(editData.end_date).toISOString(),
        capacity: parseInt(editData.capacity) || 0,
        registration_type: editData.registration_type,
        registration_fee: parseFloat(editData.registration_fee) || 0,
        min_team_size: parseInt(editData.min_team_size) || 1,
        max_team_size: parseInt(editData.max_team_size) || 1,
      };

      await eventService.updateEvent(eventId, payload);
      
      // Update the main event state so Preview Mode updates instantly
      setEvent((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          // Update fields from the payload
          title: payload.title,
          description: payload.description,
          type: payload.type,
          mode: payload.mode,
          location: payload.location,
          startDate: payload.start_date,
          endDate: payload.end_date,
          capacity: payload.capacity,
          regType: payload.registration_type,
          fee: payload.registration_fee,
          minTeam: payload.min_team_size,
          maxTeam: payload.max_team_size,
          // Keep the existing organizer data since it hasn't changed
          organizerId: prev.organizerId,
          organizerName: prev.organizerName, 
        };
      });

      setUpdateMessage({ type: "success", text: "Event updated successfully!" });
    } catch (err: any) {
      const backendError = err.response?.data?.error;
      if (Array.isArray(backendError)) {
        setUpdateMessage({ type: "error", text: backendError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(" | ") });
      } else {
        setUpdateMessage({ type: "error", text: backendError?.message || backendError || "Failed to update event." });
      }
    } finally {
      setIsUpdating(false);
    }
  };

useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;

        // 1. Populate the Preview State
        setEvent({
          id: rawEvent.id || rawEvent._id,
          title: rawEvent.title || "Untitled Event",
          type: rawEvent.type || rawEvent.category || "Event",
          mode: rawEvent.mode || "offline",
          location: rawEvent.location || "Location TBA",
          description: rawEvent.description || "No description provided.",
          startDate: rawEvent.start_date || rawEvent.date || new Date().toISOString(),
          endDate: rawEvent.end_date || rawEvent.start_date || new Date().toISOString(),
          capacity: rawEvent.capacity || 0,
          regType: rawEvent.registration_type || "solo",
          fee: rawEvent.registration_fee || 0,
          minTeam: rawEvent.min_team_size || 1,
          maxTeam: rawEvent.max_team_size || 1,
          organizerId: rawEvent.organizerId || rawEvent.hostId || rawEvent.userId, 
        });

        // 2. Format Dates for HTML input
        const formatForInput = (isoString: string) => {
          if (!isoString) return "";
          try {
            const date = new Date(isoString);
            return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          } catch (e) {
            return "";
          }
        };

        // 3. Pre-fill the Edit Form State
        setEditData({
          title: rawEvent.title || "",
          description: rawEvent.description || "",
          category: rawEvent.type || rawEvent.category || "meetup",
          mode: rawEvent.mode || "offline",
          location: rawEvent.location || "",
          start_date: formatForInput(rawEvent.start_date || rawEvent.date),
          end_date: formatForInput(rawEvent.end_date || rawEvent.start_date),
          capacity: rawEvent.capacity?.toString() || "0",
          registration_type: rawEvent.registration_type || "solo",
          registration_fee: rawEvent.registration_fee?.toString() || "0",
          min_team_size: rawEvent.min_team_size?.toString() || "1",
          max_team_size: rawEvent.max_team_size?.toString() || "1",
        });

        // 🚨 THE "PRO" OPTIMIZATION: Instantly check registration status without a 2nd API call
        if (rawEvent.user_context) {
          if (rawEvent.user_context.is_registered) {
            setIsRegistered(true);
            // Link them to their team dashboard (fallback to solo registration id if no team)
            setUserDashboardId(rawEvent.user_context.team_id || rawEvent.user_context.registration_id);
          }
        }

        // 4. THE REAL RBAC CHECK
        try {
          const token = localStorage.getItem("token");
          if (token) {
            // Crack open the JWT token
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            
            // Get the current logged-in user's ID
            const currentUserId = payload.id || payload.userId || payload._id; 
            const eventOrganizerId = rawEvent.created_by || rawEvent.creator?.id;

            const isOwner = String(currentUserId) === String(eventOrganizerId);

            if (isOwner || payload.role === "admin" || payload.role === "staff") {
              setIsStaff(true);
              setViewMode("DASHBOARD");
            } else {
              // User is logged in, but is NOT the organizer. 
              setIsStaff(false);
              setViewMode("PREVIEW");
              // Note: No extra API call here anymore! It's handled by step 3 above.
            }
          } else {
            // User is NOT logged in. They see the preview and the "Secure Spot" button.
            setIsStaff(false);
            setViewMode("PREVIEW");
          }
        } catch (e) {
          console.error("Could not verify user role:", e);
          setIsStaff(false);
          setViewMode("PREVIEW");
        }

      } catch (error) {
        console.error("Failed to fetch event details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) fetchEvent();
  }, [eventId]);
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
    try {
      setIsDeleting(true);
      await eventService.deleteEvent(eventId);
      router.push("/home"); // Send them back to feed after deletion
    } catch (error) {
      console.error("Failed to delete", error);
      alert("Failed to delete event.");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="font-semibold text-zinc-500 animate-pulse">Loading Event...</p>
      </div>
    );
  }

  if (!event) return <div className="min-h-screen flex items-center justify-center font-bold">Event not found.</div>;

  const formatFullDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // ==========================================
  // VIEW 1: STAFF DASHBOARD
  // ==========================================
  if (isStaff && viewMode === "DASHBOARD") {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-zinc-950 text-zinc-400 flex flex-col p-4 md:min-h-screen shrink-0">
          <div className="mb-8 p-4">
             <Link href="/home" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-semibold mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Home
             </Link>
             <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">{event.title}</h2>
             <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mt-2">Organizer Dashboard</p>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            <button onClick={() => setActiveTab("OVERVIEW")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "OVERVIEW" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
              <LayoutDashboard className="w-5 h-5" /> Overview
            </button>
            <button onClick={() => setActiveTab("EDIT")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "EDIT" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
              <Pencil className="w-5 h-5" /> Edit Details
            </button>
            <button onClick={() => setActiveTab("SETTINGS")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "SETTINGS" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
              <Settings className="w-5 h-5" /> Settings
            </button>
          </nav>

          {/* Action Button */}
          <div className="p-4 mt-auto">
            <Button onClick={() => setViewMode("PREVIEW")} className="w-full rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-bold flex items-center justify-center gap-2 py-6">
              <Eye className="w-4 h-4" /> Preview Event
            </Button>
          </div>
        </div>

        {/* Dashboard Content Area */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            {activeTab === "OVERVIEW" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-8">Dashboard Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                    <Users className="w-8 h-8 text-indigo-500 mb-4" />
                    <p className="text-sm font-bold text-zinc-400 uppercase">Total Registrations</p>
                    <p className="text-4xl font-black text-zinc-900 mt-1">0 <span className="text-lg text-zinc-400 font-medium">/ {event.capacity || '∞'}</span></p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                    <Ticket className="w-8 h-8 text-emerald-500 mb-4" />
                    <p className="text-sm font-bold text-zinc-400 uppercase">Revenue</p>
                    <p className="text-4xl font-black text-zinc-900 mt-1">₹0</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                    <Eye className="w-8 h-8 text-amber-500 mb-4" />
                    <p className="text-sm font-bold text-zinc-400 uppercase">Page Views</p>
                    <p className="text-4xl font-black text-zinc-900 mt-1">124</p>
                  </div>
                </div>
                {/* We will add Participant List here later! */}
                <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center text-center h-64">
                   <Users className="w-12 h-12 text-zinc-300 mb-4" />
                   <h3 className="text-xl font-bold text-zinc-900">No participants yet</h3>
                   <p className="text-zinc-500 font-medium mt-2">Share your event to start getting registrations.</p>
                </div>
              </div>
            )}

           {activeTab === "EDIT" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Edit Event Details</h1>
                <p className="text-zinc-500 font-medium mb-8">Update your event's core information here.</p>
                
                {updateMessage.text && (
                  <div className={`mb-8 p-4 rounded-xl text-sm font-bold border ${updateMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                    {updateMessage.text}
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-10">
                  
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Basic Info</h3>
                    <div className="space-y-3">
                      <Label className="font-bold text-zinc-900">Event Title</Label>
                      <Input value={editData.title} onChange={(e) => setEditData({...editData, title: e.target.value})} className="py-6 rounded-xl bg-zinc-50" />
                    </div>
                    <div className="space-y-3">
                      <Label className="font-bold text-zinc-900">Description</Label>
                      <textarea value={editData.description} onChange={(e) => setEditData({...editData, description: e.target.value})} className="w-full h-32 p-4 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">Type</Label>
                        <select value={editData.category} onChange={(e) => setEditData({...editData, category: e.target.value})} className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none capitalize">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">Mode</Label>
                        <select value={editData.mode} onChange={(e) => setEditData({...editData, mode: e.target.value})} className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none capitalize">
                          {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Time & Place */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Time & Place</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">Start Date & Time</Label>
                        <Input type="datetime-local" value={editData.start_date} onChange={(e) => setEditData({...editData, start_date: e.target.value})} className="py-6 rounded-xl bg-zinc-50" />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">End Date & Time</Label>
                        <Input type="datetime-local" value={editData.end_date} onChange={(e) => setEditData({...editData, end_date: e.target.value})} className="py-6 rounded-xl bg-zinc-50" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="font-bold text-zinc-900">Location (or Link)</Label>
                      <Input value={editData.location} onChange={(e) => setEditData({...editData, location: e.target.value})} className="py-6 rounded-xl bg-zinc-50" disabled={editData.mode === "online"} />
                    </div>
                  </div>

                  {/* Registration */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Registration Rules</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">Reg Type</Label>
                        <select value={editData.registration_type} onChange={(e) => setEditData({...editData, registration_type: e.target.value})} className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none capitalize">
                          {REG_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">Fee (₹)</Label>
                        <Input type="number" value={editData.registration_fee} onChange={(e) => setEditData({...editData, registration_fee: e.target.value})} className="py-6 rounded-xl bg-zinc-50" />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-bold text-zinc-900">Capacity</Label>
                        <Input type="number" value={editData.capacity} onChange={(e) => setEditData({...editData, capacity: e.target.value})} className="py-6 rounded-xl bg-zinc-50" />
                      </div>
                    </div>
                    
                    {editData.registration_type === "team" && (
                      <div className="grid grid-cols-2 gap-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                         <div className="space-y-2">
                            <Label className="font-bold text-indigo-900">Min Team Size</Label>
                            <Input type="number" min="1" value={editData.min_team_size} onChange={(e) => setEditData({...editData, min_team_size: e.target.value})} className="rounded-xl border-indigo-200" />
                         </div>
                         <div className="space-y-2">
                            <Label className="font-bold text-indigo-900">Max Team Size</Label>
                            <Input type="number" min="1" value={editData.max_team_size} onChange={(e) => setEditData({...editData, max_team_size: e.target.value})} className="rounded-xl border-indigo-200" />
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <Button type="submit" disabled={isUpdating} className="w-full md:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                      {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save All Changes"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "SETTINGS" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-8">Event Settings</h1>
                
                <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-900">Danger Zone</h3>
                      <p className="text-red-700 font-medium mt-2 mb-6 max-w-lg">
                        Deleting this event will permanently remove all data, including the participant list. This action cannot be undone.
                      </p>
                      <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" className="rounded-xl px-6 py-6 font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20">
                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <> <Trash2 className="w-4 h-4 mr-2" /> Delete Event Permanently</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

// ==========================================
  // VIEW 2: PUBLIC / PREVIEW MODE
  // ==========================================
  return (
    <div className="min-h-screen bg-zinc-50 pb-32 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      
      {/* STAFF PREVIEW FLOATING BUTTON */}
      {isStaff && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-zinc-900/90 backdrop-blur-md p-2 pl-6 rounded-full shadow-2xl flex items-center gap-4 border border-zinc-700">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Preview Mode
            </span>
            <Button onClick={() => setViewMode("DASHBOARD")} className="rounded-full bg-white text-zinc-900 hover:bg-zinc-200 font-bold px-6">
              Exit to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* HERO BANNER */}
      <div className="w-full h-[45vh] bg-gradient-to-br from-indigo-950 via-violet-900 to-zinc-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-500/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
          <Link href="/home">
            <Button variant="ghost" className="text-white hover:bg-white/20 rounded-full backdrop-blur-md transition-all">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back to Feed
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full backdrop-blur-md transition-all">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Floating Title Card */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-white/95 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/60 z-40 flex flex-col justify-end items-center text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-widest shadow-sm">
              {event.type}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5">
              {event.mode === 'online' ? <Laptop className="w-3.5 h-3.5" /> : event.mode === 'hybrid' ? <MonitorSmartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              {event.mode}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 tracking-tight leading-[1.1] md:leading-[1.2] text-center">
            {event.title}
          </h1>
        </motion.div>
      </div>

      {/* MAIN CONTENT LAYOUT */}
      <div className="max-w-5xl mx-auto px-6 mt-32 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        
        {/* LEFT COLUMN: Deep Details */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Event Highlights (Hack2Skill Style) */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                <Users className="w-6 h-6 text-indigo-500" />
                <div>
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Format</p>
                   <p className="font-bold text-zinc-900 capitalize">{event.regType} Participation</p>
                </div>
             </div>
             {event.regType === 'team' && (
               <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                  <Users className="w-6 h-6 text-rose-500" />
                  <div>
                     <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Team Size</p>
                     <p className="font-bold text-zinc-900">{event.minTeam} - {event.maxTeam} Members</p>
                  </div>
               </div>
             )}
             <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col gap-2">
                <Ticket className="w-6 h-6 text-amber-500" />
                <div>
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Capacity</p>
                   <p className="font-bold text-zinc-900">{event.capacity === 0 ? "Unlimited Seats" : `${event.capacity} Max Capacity`}</p>
                </div>
             </div>
          </motion.section>

          {/* Description */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-2">About this event</h2>
            <div className="prose prose-zinc prose-lg leading-relaxed text-zinc-600 font-medium whitespace-pre-wrap">
              {event.description}
            </div>
          </motion.section>

          {/* Organizer UI */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-5 p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-100 to-rose-100 border-2 border-white shadow-md flex items-center justify-center overflow-hidden shrink-0">
              <UserCircle2 className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Hosted by</p>
              <p className="text-xl font-bold text-zinc-900">{event.organizerName || "Community Connect Admin"}</p> 
            </div>
          </motion.section>
        </div>

        {/* RIGHT COLUMN: Sticky Registration Ticket (Luma Style) */}
        <div className="lg:col-span-5 relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="sticky top-28 bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-zinc-200/60 border border-zinc-100"
          >
            {/* Price Header */}
            <div className="mb-8 pb-8 border-b border-zinc-100 text-center">
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">Registration</p>
              <h2 className="text-5xl font-black text-zinc-900 tracking-tight">
                {event.fee === 0 ? "Free" : `₹${event.fee}`}
              </h2>
            </div>

            {/* Time & Place Stack */}
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 text-lg leading-tight mb-1">{formatFullDate(event.startDate)}</h4>
                  <p className="text-zinc-500 font-medium text-sm">
                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                  <MapPin className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 text-lg leading-tight mb-1">{event.location}</h4>
                  <p className="text-zinc-500 font-medium text-sm capitalize">{event.mode} Event</p>
                </div>
              </div>
            </div>

            {/* DYNAMIC CTA BUTTON */}
            {isRegistered ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                   <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 shrink-0">
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="font-bold text-emerald-900 text-sm">You're already registered!</p>
                      <p className="text-emerald-700 text-xs font-medium">Your spot is secured.</p>
                   </div>
                </div>
                <Link href={`/dashboard/team/${userDashboardId}`} className="block w-full">
                  <Button className="w-full rounded-2xl py-7 bg-zinc-900 hover:bg-zinc-800 text-white text-lg font-bold shadow-xl transition-all hover:scale-[1.02]">
                    Go to Participant Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href={`/events/${eventId}/register`} className="block w-full">
                <Button className="w-full rounded-2xl py-7 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                  Secure Your Spot
                </Button>
              </Link>
            )}
            
          </motion.div>
        </div> {/* End of Right Column Div */}
      </div> {/* End of Main Content Layout Div */}
    </div> // End of min-h-screen Div
  );
} 