"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, ArrowLeft, Share2,
  Ticket, Laptop, MonitorSmartphone, Building2, UserCircle2,
  LayoutDashboard, Settings, Eye, Pencil, Trash2, AlertTriangle,
  Loader2, CheckCircle2, Shield, UserPlus, List, Send
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

  // --- PBAC & RBAC STATES ---
  const [isStaff, setIsStaff] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<"DASHBOARD" | "PREVIEW">("PREVIEW");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PARTICIPANTS" | "EDIT" | "STAFF" | "SETTINGS">("OVERVIEW");

  // --- MANAGEMENT DATA STATES ---
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isFetchingTab, setIsFetchingTab] = useState(false);

  // --- ACTIONS STATES ---
  const [editData, setEditData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // --- REGISTRATION STATES ---
  const [isRegistered, setIsRegistered] = useState(false);
  const [userDashboardId, setUserDashboardId] = useState<string | null>(null);

  // --- DYNAMIC EVENT TYPES STATES ---
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [customType, setCustomType] = useState("");
  const [customTypeEditMode, setCustomTypeEditMode] = useState(false);

  const MODES = ["online", "offline", "hybrid"];
  const REG_TYPES = ["solo", "team"];

  // Helper for PBAC
  const hasPermission = (perm: string) => isOwner || permissions.includes(perm);

  // --- Date Formatters for Preview UI ---
  const formatFullDate = (isoString?: string) => {
    if (!isoString) return "TBA";
    return new Date(isoString).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "TBA";
    return new Date(isoString).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  };

  // 1. INITIAL EVENT FETCH & EVENT TYPES FETCH
  useEffect(() => {
    const fetchEventAndTypes = async () => {
      try {
        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;

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
          organizerName: rawEvent.organizer?.name || rawEvent.creator?.name
        });

        const formatForInput = (isoString: string) => {
          if (!isoString) return "";
          try {
            const date = new Date(isoString);
            return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          } catch (e) { return ""; }
        };

        const currentType = rawEvent.type || rawEvent.category || "";

        // Fetch dynamic event types
        let typesList: any[] = [];
        try {
          const typesResponse = await eventService.getEventTypes();
          typesList = typesResponse?.data || typesResponse || [];
        } catch (e) {
          console.error("Failed to fetch event types:", e);
        }

        // Check if current type exists in the fetched list (case insensitive)
        const typeExists = typesList.some(
          (t) => t.name.toLowerCase() === currentType.toLowerCase()
        );

        if (currentType && !typeExists) {
          typesList.push({
            id: -1,
            name: currentType,
            is_system: false
          });
        }
        setEventTypes(typesList);

        setEditData({
          title: rawEvent.title || "", description: rawEvent.description || "",
          type: currentType || "meetup", mode: rawEvent.mode || "offline",
          location: rawEvent.location || "", start_date: formatForInput(rawEvent.start_date || rawEvent.date),
          end_date: formatForInput(rawEvent.end_date || rawEvent.start_date), capacity: rawEvent.capacity?.toString() || "0",
          registration_type: rawEvent.registration_type || "solo", registration_fee: rawEvent.registration_fee?.toString() || "0",
          min_team_size: rawEvent.min_team_size?.toString() || "1", max_team_size: rawEvent.max_team_size?.toString() || "1",
        });

        if (rawEvent.user_context) {
          if (rawEvent.user_context.is_registered) {
            setIsRegistered(true);
            setUserDashboardId(rawEvent.user_context.team_id || rawEvent.user_context.registration_id);
          }
          if (rawEvent.user_context.permissions) {
            setPermissions(rawEvent.user_context.permissions);
          }
        }

        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          const currentUserId = payload.id || payload.userId || payload._id;
          const eventOrganizerId = rawEvent.created_by || rawEvent.creator?.id;

          const isUserOwner = String(currentUserId) === String(eventOrganizerId);
          setIsOwner(isUserOwner);

          if (isUserOwner || rawEvent.user_context?.permissions?.length > 0 || payload.role === "admin") {
            setIsStaff(true);
            setViewMode("DASHBOARD");
          }
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) fetchEventAndTypes();
  }, [eventId]);

  // 2. FETCH TAB DATA DYNAMICALLY
  useEffect(() => {
    if (!isStaff || viewMode !== "DASHBOARD") return;

    const loadTabData = async () => {
      setIsFetchingTab(true);
      try {
        if (activeTab === "OVERVIEW") {
          const res = await api.get(`/events/${eventId}/manage/overview`);
          setOverviewStats(res.data.data || res.data);
        } else if (activeTab === "PARTICIPANTS" && hasPermission("MANAGE_ATTENDEES")) {
          const res = await api.get(`/events/${eventId}/manage/participants`);
          setParticipants(res.data.data || res.data || []);
        } else if (activeTab === "STAFF" && hasPermission("MANAGE_STAFF")) {
          const res = await api.get(`/events/${eventId}/staff/roles`);
          setRoles(res.data.data || res.data || []);
        }
      } catch (err) {
        console.error(`Failed to fetch ${activeTab} data`, err);
      } finally {
        setIsFetchingTab(false);
      }
    };

    loadTabData();
  }, [activeTab, isStaff, viewMode, eventId]);

  const handleTypeSelectChange = (val: string) => {
    if (val === "other") {
      setEditData({ ...editData, type: "other" });
      setCustomTypeEditMode(true);
    } else {
      setEditData({ ...editData, type: val });
      setCustomType("");
      setCustomTypeEditMode(false);
    }
  };

  // --- ACTIONS ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      setUpdateMessage({ type: "", text: "" });

      // Resolve custom/dynamic category
      const resolvedType = editData.type === "other" && customType.trim()
        ? customType.trim()
        : editData.type;

      if (editData.type === "other" && !customType.trim()) {
        throw new Error("Please enter a custom event type.");
      }

      // Build payload matching backend Zod Schema
      const payload: any = {
        title: editData.title,
        description: editData.description,
        type: resolvedType,
        mode: editData.mode,
        location: editData.mode === "online" ? "Online" : editData.location,
        start_date: new Date(editData.start_date).toISOString(),
        end_date: new Date(editData.end_date).toISOString(),
        capacity: parseInt(editData.capacity) || 0,
        registration_type: editData.registration_type,
        registration_fee: parseFloat(editData.registration_fee) || 0,
        min_team_size: parseInt(editData.min_team_size) || 1,
        max_team_size: parseInt(editData.max_team_size) || 1,
      };

      await eventService.updateEvent(eventId, payload);
      setUpdateMessage({ type: "success", text: "Event updated successfully!" });

      // Update local preview state
      setEvent((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: payload.title,
          description: payload.description,
          type: resolvedType,
          mode: payload.mode,
          location: payload.location,
          startDate: payload.start_date,
          endDate: payload.end_date,
          capacity: payload.capacity,
          regType: payload.registration_type,
          fee: payload.registration_fee,
          minTeam: payload.min_team_size,
          maxTeam: payload.max_team_size,
        };
      });
    } catch (err: any) {
      const backendError = err.response?.data?.error || err.message;
      if (Array.isArray(backendError)) {
        const errorMessages = backendError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(" | ");
        setUpdateMessage({ type: "error", text: errorMessages });
      } else {
        setUpdateMessage({ type: "error", text: backendError || "Failed to update event." });
      }
    } finally { setIsUpdating(false); }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText("");
  };

  const handleConfirmDelete = async () => {
    if (!event) return;
    if (deleteConfirmText.trim() !== event.title) {
      alert(`Please type "${event.title}" to confirm.`);
      return;
    }
    try {
      setIsDeleting(true);
      await eventService.deleteEvent(eventId);
      router.push("/home");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to delete the event.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) return alert("Select a role and enter an email.");
    try {
      setIsInviting(true);
      await api.post(`/events/${eventId}/staff/invite`, {
        email: inviteEmail,
        roleId: Number(inviteRoleId)
      });
      alert("Invitation sent successfully!");
      setInviteEmail("");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to invite staff.");
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center font-bold">Event not found.</div>;

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
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">{event.title}</h2>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mt-2">Organizer Dashboard</p>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            <button onClick={() => setActiveTab("OVERVIEW")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "OVERVIEW" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
              <LayoutDashboard className="w-5 h-5" /> Overview
            </button>

            {hasPermission("MANAGE_ATTENDEES") && (
              <button onClick={() => setActiveTab("PARTICIPANTS")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "PARTICIPANTS" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
                <List className="w-5 h-5" /> Participants
              </button>
            )}

            <button onClick={() => setActiveTab("EDIT")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "EDIT" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
              <Pencil className="w-5 h-5" /> Edit Details
            </button>

            {hasPermission("MANAGE_STAFF") && (
              <button onClick={() => setActiveTab("STAFF")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "STAFF" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
                <Shield className="w-5 h-5" /> Staff & Roles
              </button>
            )}

            {isOwner && (
              <button onClick={() => setActiveTab("SETTINGS")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "SETTINGS" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
                <Settings className="w-5 h-5" /> Settings
              </button>
            )}
          </nav>

          <div className="p-4 mt-auto">
            <Button onClick={() => setViewMode("PREVIEW")} className="w-full rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 font-bold py-6">
              <Eye className="w-4 h-4 mr-2" /> Preview Event
            </Button>
          </div>
        </div>

        {/* Dashboard Content Area */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto">

            {isFetchingTab ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <>
                {/* 1. OVERVIEW TAB */}
                {activeTab === "OVERVIEW" && (
                  <div className="animate-in fade-in duration-500">
                    <h1 className="text-3xl font-extrabold text-zinc-900 mb-8">Dashboard Overview</h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                        <Users className="w-8 h-8 text-indigo-500 mb-4" />
                        <p className="text-sm font-bold text-zinc-400 uppercase">Registrations</p>
                        <p className="text-4xl font-black text-zinc-900 mt-1">{overviewStats?.total_registrations || 0} <span className="text-lg text-zinc-400">/ {event.capacity || '∞'}</span></p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                        <Ticket className="w-8 h-8 text-emerald-500 mb-4" />
                        <p className="text-sm font-bold text-zinc-400 uppercase">Revenue</p>
                        <p className="text-4xl font-black text-zinc-900 mt-1">₹{overviewStats?.revenue || 0}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                        <UserPlus className="w-8 h-8 text-amber-500 mb-4" />
                        <p className="text-sm font-bold text-zinc-400 uppercase">Teams Created</p>
                        <p className="text-4xl font-black text-zinc-900 mt-1">{overviewStats?.teams_count || 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PARTICIPANTS TAB */}
                {activeTab === "PARTICIPANTS" && hasPermission("MANAGE_ATTENDEES") && (
                  <div className="animate-in fade-in duration-500 bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                    <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">Registered Participants</h1>
                    {participants.length === 0 ? (
                      <p className="text-zinc-500">No participants registered yet.</p>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {participants.map((p, i) => (
                          <div key={i} className="py-4 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-zinc-900">{p.user?.name || "Unknown User"}</p>
                              <p className="text-sm text-zinc-500">{p.user?.email}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${p.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. STAFF MANAGEMENT TAB */}
                {activeTab === "STAFF" && hasPermission("MANAGE_STAFF") && (
                  <div className="animate-in fade-in duration-500 space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                      <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">Invite Staff</h1>
                      <p className="text-zinc-500 mb-6">Send magic links to add co-organizers, judges, or volunteers.</p>

                      <form onSubmit={handleInviteStaff} className="flex flex-col md:flex-row gap-4">
                        <Input
                          type="email" placeholder="staff@example.com" required
                          value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                          className="py-6 rounded-xl bg-zinc-50 flex-1"
                        />
                        <select
                          required value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)}
                          className="py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none w-full md:w-48"
                        >
                          <option value="" disabled>Select Role...</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <Button type="submit" disabled={isInviting} className="py-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                          {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Invite</>}
                        </Button>
                      </form>
                    </div>
                  </div>
                )}

                {/* 4. EDIT DETAILS TAB */}
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
                          <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="py-6 rounded-xl bg-zinc-50" />
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold text-zinc-900">Description</Label>
                          <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="w-full h-32 p-4 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-indigo-600 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">Type</Label>
                            <select value={editData.type || ""} onChange={(e) => handleTypeSelectChange(e.target.value)} className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none capitalize">
                              {eventTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                              <option value="other">Other / Add Custom Type...</option>
                            </select>
                            {editData.type === "other" && (
                              <div className="space-y-2 mt-2">
                                <Label className="text-sm font-semibold text-zinc-700">Custom Category</Label>
                                {customTypeEditMode ? (
                                  <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                    <Input
                                      placeholder="e.g. seminar"
                                      value={customType}
                                      onChange={(e) => setCustomType(e.target.value)}
                                      className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customType.trim()) {
                                          setCustomTypeEditMode(false);
                                        }
                                      }}
                                      disabled={!customType.trim()}
                                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Done
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                                    <span>{customType.trim()}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCustomType("");
                                        setCustomTypeEditMode(true);
                                        setEditData({ ...editData, type: "other" });
                                      }}
                                      className="rounded-full text-indigo-600 transition hover:bg-indigo-100"
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">Mode</Label>
                            <select value={editData.mode} onChange={(e) => setEditData({ ...editData, mode: e.target.value })} className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none capitalize">
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
                            <Input type="datetime-local" value={editData.start_date} onChange={(e) => setEditData({ ...editData, start_date: e.target.value })} className="py-6 rounded-xl bg-zinc-50" />
                          </div>
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">End Date & Time</Label>
                            <Input type="datetime-local" value={editData.end_date} onChange={(e) => setEditData({ ...editData, end_date: e.target.value })} className="py-6 rounded-xl bg-zinc-50" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="font-bold text-zinc-900">Location (or Link)</Label>
                          <Input value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} className="py-6 rounded-xl bg-zinc-50" disabled={editData.mode === "online"} />
                        </div>
                      </div>

                      {/* Registration */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Registration Rules</h3>
                        <div className="grid grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">Reg Type</Label>
                            <select value={editData.registration_type} onChange={(e) => setEditData({ ...editData, registration_type: e.target.value })} className="w-full py-3.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 outline-none capitalize">
                              {REG_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">Fee (₹)</Label>
                            <Input type="number" value={editData.registration_fee} onChange={(e) => setEditData({ ...editData, registration_fee: e.target.value })} className="py-6 rounded-xl bg-zinc-50" />
                          </div>
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">Capacity</Label>
                            <Input type="number" value={editData.capacity} onChange={(e) => setEditData({ ...editData, capacity: e.target.value })} className="py-6 rounded-xl bg-zinc-50" />
                          </div>
                        </div>

                        {editData.registration_type === "team" && (
                          <div className="grid grid-cols-2 gap-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Min Team Size</Label>
                              <Input type="number" min="1" value={editData.min_team_size} onChange={(e) => setEditData({ ...editData, min_team_size: e.target.value })} className="rounded-xl border-indigo-200" />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-bold text-indigo-900">Max Team Size</Label>
                              <Input type="number" min="1" value={editData.max_team_size} onChange={(e) => setEditData({ ...editData, max_team_size: e.target.value })} className="rounded-xl border-indigo-200" />
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

                {/* 5. SETTINGS TAB */}
                {activeTab === "SETTINGS" && isOwner && (
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

                {/* CLOSING THE FRAGMENT */}
              </>
            )}
          </div>
        </div>

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 overflow-hidden z-10"
              >
                {/* Top Red Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
                
                <div className="flex items-center gap-3 text-red-600 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Delete Event?</h3>
                </div>

                <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                  This action is <strong className="text-red-600 font-semibold">irreversible</strong> and will permanently delete the event <strong className="text-zinc-800 font-semibold">{event?.title}</strong>, including all registration lists, team dashboards, and submissions.
                </p>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6">
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    To confirm, type <span className="font-bold underline text-amber-900 select-all">{(event?.title || "the event title")}</span> below:
                  </p>
                </div>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter event title exactly"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-semibold transition-all mb-6 placeholder:text-zinc-400 bg-zinc-50"
                />

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowDeleteModal(false)}
                    variant="outline"
                    className="flex-1 rounded-2xl py-6 border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting || deleteConfirmText !== event?.title}
                    variant="destructive"
                    className="flex-1 rounded-2xl py-6 bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-600/10 disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Confirm Delete"
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-100 overflow-hidden z-10"
            >
              {/* Top Red Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
              
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Delete Event?</h3>
              </div>

              <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                This action is <strong className="text-red-600 font-semibold">irreversible</strong> and will permanently delete the event <strong className="text-zinc-800 font-semibold">{event?.title}</strong>, including all registration lists, team dashboards, and submissions.
              </p>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mb-6">
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  To confirm, type <span className="font-bold underline text-amber-900 select-all">{(event?.title || "the event title")}</span> below:
                </p>
              </div>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Enter event title exactly"
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-semibold transition-all mb-6 placeholder:text-zinc-400 bg-zinc-50"
              />

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowDeleteModal(false)}
                  variant="outline"
                  className="flex-1 rounded-2xl py-6 border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting || deleteConfirmText !== event?.title}
                  variant="destructive"
                  className="flex-1 rounded-2xl py-6 bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-600/10 disabled:opacity-40"
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Confirm Delete"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}