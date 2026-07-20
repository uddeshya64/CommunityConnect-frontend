"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, ArrowLeft, Share2,
  Ticket, Laptop, MonitorSmartphone, Building2, UserCircle2,
  LayoutDashboard, Settings, Eye, Pencil, Trash2, AlertTriangle,
  Loader2, CheckCircle2, Shield, UserPlus, List, Send, QrCode, Camera, XCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { api } from "@/lib/axios";
import { Html5Qrcode } from "html5-qrcode";

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
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PARTICIPANTS" | "EDIT" | "STAFF" | "SETTINGS" | "ORGANIZER_SETTINGS">("OVERVIEW");

  // --- MANAGEMENT DATA STATES ---
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [organizerConfig, setOrganizerConfig] = useState<any>(null);
  const [isFetchingTab, setIsFetchingTab] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState({ type: "", text: "" });

  // --- CHECK-IN & QR SCANNING STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInFilter, setCheckInFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; participantName?: string } | null>(null);
  const [isPerformingCheckIn, setIsPerformingCheckIn] = useState<number | null>(null);
  const [welcomeAttendee, setWelcomeAttendee] = useState<string | null>(null);

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
  const hasPermission = (perm: string) => 
    isOwner || 
    permissions.includes(perm) || 
    (perm === "MANAGE_ATTENDEES" && permissions.includes("MANAGE_CHECK_IN"));

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

        setStaffList(rawEvent.user_roles || []);

        const token = localStorage.getItem("accessToken");
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
        } else if (activeTab === "ORGANIZER_SETTINGS" && isOwner && event?.organizerId) {
          const res = await api.get(`/organizers/${event.organizerId}/config`);
          setOrganizerConfig(res.data.data || res.data);
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

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event?.organizerId || !organizerConfig) return;
    try {
      setIsSavingConfig(true);
      setConfigMessage({ type: "", text: "" });
      await api.patch(`/organizers/${event.organizerId}/config`, {
        branding_config: organizerConfig.branding_config,
        tenant_policy: organizerConfig.tenant_policy,
        security_config: organizerConfig.security_config,
        billing_info: organizerConfig.billing_info,
        subscription_status: organizerConfig.subscription_status
      });
      setConfigMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err: any) {
      console.error(err);
      setConfigMessage({ type: "error", text: err.response?.data?.error || "Failed to update configurations." });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUpgradeSubscription = async (newPlan: string) => {
    if (!event?.organizerId || !organizerConfig) return;
    try {
      setIsSavingConfig(true);
      setConfigMessage({ type: "", text: "" });
      
      await api.patch(`/organizers/${event.organizerId}/config`, {
        ...organizerConfig,
        subscription_status: newPlan
      });
      
      setOrganizerConfig({ ...organizerConfig, subscription_status: newPlan });
      setConfigMessage({ type: "success", text: `Successfully upgraded to ${newPlan} plan!` });
    } catch (err: any) {
      console.error(err);
      setConfigMessage({ type: "error", text: err.response?.data?.error || "Failed to upgrade subscription." });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleManualCheckIn = async (participant: any) => {
    if (!participant.ticketCode) {
      alert("No ticket code found for this participant.");
      return;
    }
    try {
      setIsPerformingCheckIn(participant.registrationId);
      await api.post(`/events/${eventId}/manage/check-in`, {
        ticketCode: participant.ticketCode
      });
      
      const displayName = participant.name || participant.user?.name || "Participant";
      setWelcomeAttendee(displayName);
      setTimeout(() => {
        setWelcomeAttendee(null);
      }, 4000);
      
      // Update participants list locally
      setParticipants(prev =>
        prev.map(p =>
          p.registrationId === participant.registrationId
            ? { ...p, checkedIn: true, checkedInAt: new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to check in participant.");
    } finally {
      setIsPerformingCheckIn(null);
    }
  };

  const handleQrCheckIn = async (scannedCode: string) => {
    try {
      setScanResult({ success: true, message: "Ticket scanned! Verifying..." });
      const res = await api.post(`/events/${eventId}/manage/check-in`, {
        ticketCode: scannedCode
      });

      const attendeeName = res.data.data?.user?.name || "Participant";
      
      setIsQrScanning(false);
      setScanResult(null);
      setWelcomeAttendee(attendeeName);

      setTimeout(() => {
        setWelcomeAttendee(null);
        setIsQrScanning(true);
      }, 4000);

      // Update participants list locally
      setParticipants(prev =>
        prev.map(p =>
          p.ticketCode === scannedCode
            ? { ...p, checkedIn: true, checkedInAt: new Date().toISOString() }
            : p
        )
      );
      
    } catch (err: any) {
      console.error("QR check in error:", err);
      setScanResult({
        success: false,
        message: err.response?.data?.error || "Invalid ticket code or check-in failed."
      });
    }
  };

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    if (isQrScanning) {
      const timer = setTimeout(() => {
        html5Qrcode = new Html5Qrcode("qr-scanner-element");
        html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (qrCodeMessage) => {
            if (html5Qrcode) {
              html5Qrcode.stop().catch(console.error);
            }
            handleQrCheckIn(qrCodeMessage);
          },
          (errorMessage) => {
            // Ignore normal scanning errors
          }
        ).catch(err => {
          console.error("Failed to start QR scanner:", err);
          alert("Could not open camera. Please check camera permissions.");
          setIsQrScanning(false);
        });
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5Qrcode && html5Qrcode.isScanning) {
          html5Qrcode.stop().catch(console.error);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQrScanning]);

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

            {hasPermission("MANAGE_ATTENDEES") && (
              <button
                onClick={() => {
                  setScanResult(null);
                  setIsQrScanning(true);
                }}
                type="button"
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all hover:bg-zinc-900 hover:text-white"
              >
                <QrCode className="w-5 h-5" /> Scan Ticket QR
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
              <button onClick={() => setActiveTab("ORGANIZER_SETTINGS")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "ORGANIZER_SETTINGS" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
                <Building2 className="w-5 h-5" /> Org Settings
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
                  <div className="animate-in fade-in duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
                      <div>
                        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Attendee Check-In</h1>
                        <p className="text-zinc-500 font-medium mt-1">Manage event registrations, track attendance, or scan ticket QRs.</p>
                      </div>
                      <Button
                        onClick={() => {
                          setScanResult(null);
                          setIsQrScanning(true);
                        }}
                        className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-6 shadow-lg shadow-indigo-600/25 flex items-center gap-2 self-start md:self-auto transition-transform hover:scale-[1.02]"
                      >
                        <QrCode className="w-5 h-5" /> Scan Ticket QR
                      </Button>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                      <div className="relative w-full flex-1">
                        <Input
                          placeholder="Search participants by name, email or ticket code..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="py-6 pl-10 rounded-xl bg-zinc-50 border-zinc-200"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">🔍</span>
                      </div>
                      <div className="flex p-1 bg-zinc-100 rounded-xl w-full md:w-auto shrink-0">
                        {(["ALL", "PRESENT", "ABSENT"] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setCheckInFilter(filter)}
                            type="button"
                            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${checkInFilter === filter ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-50 hover:text-zinc-900"}`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Participants List */}
                    {participants.length === 0 ? (
                      <p className="text-zinc-500 font-medium py-10 text-center">No participants registered yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {participants
                          .filter((p) => {
                            // Apply Search Query
                            const query = searchQuery.toLowerCase().trim();
                            const pName = p.name || p.user?.name || "";
                            const pEmail = p.email || p.user?.email || "";
                            const pTicket = p.ticketCode || "";
                            const matchesSearch =
                              pName.toLowerCase().includes(query) ||
                              pEmail.toLowerCase().includes(query) ||
                              pTicket.toLowerCase().includes(query);

                            // Apply Check-In Filter
                            if (checkInFilter === "PRESENT") {
                              return matchesSearch && !!p.checkedIn;
                            }
                            if (checkInFilter === "ABSENT") {
                              return matchesSearch && !p.checkedIn;
                            }
                            return matchesSearch;
                          })
                          .map((p, i) => {
                            const isPresent = !!p.checkedIn;
                            const isChecking = isPerformingCheckIn === p.registrationId;
                            const displayName = p.name || p.user?.name || "Unknown User";
                            const displayEmail = p.email || p.user?.email || "";
                            const displayTicket = p.ticketCode || "N/A";

                            return (
                              <div
                                key={p.registrationId || i}
                                className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-zinc-50 border border-zinc-200/50 gap-4 hover:border-zinc-200/80 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-3 h-3 rounded-full shrink-0 ${isPresent ? "bg-emerald-500" : "bg-zinc-300"}`} />
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-extrabold text-zinc-900 text-base leading-tight">{displayName}</p>
                                      {isPresent && (
                                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                          Present
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-zinc-500 font-medium mt-1">{displayEmail}</p>
                                    <p className="text-xs text-zinc-400 font-medium mt-1">Ticket Code: <code className="font-mono bg-zinc-200/50 px-1 py-0.5 rounded text-[10px] text-zinc-600 font-extrabold">{displayTicket}</code></p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {isPresent ? (
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-zinc-400">Checked In At</span>
                                      <p className="text-xs font-black text-zinc-600 mt-0.5">
                                        {new Date(p.checkedInAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      onClick={() => handleManualCheckIn(p)}
                                      disabled={isChecking}
                                      className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-5 text-xs shadow-md transition-all hover:scale-[1.02]"
                                    >
                                      {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check In"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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

                    {/* Active Staff List Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                      <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">Active Event Staff</h2>
                      <p className="text-zinc-500 mb-6">Currently assigned staff members and their active operational permissions.</p>

                      {staffList.length === 0 ? (
                        <p className="text-zinc-500 font-medium">No active staff members found.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {staffList.map((staff, idx) => {
                            const staffUser = staff.user;
                            const staffRole = staff.role;
                            const overrides = staff.permissions_override || [];
                            const allPerms = Array.from(new Set([...(staffRole?.permissions || []), ...overrides]));

                            return (
                              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-zinc-50 border border-zinc-200/50 gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100 uppercase shrink-0">
                                    {staffUser?.name ? staffUser.name.slice(0, 2) : "ST"}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-900 text-lg leading-tight">{staffUser?.name || "Pending Account"}</h4>
                                    <p className="text-sm text-zinc-500 font-medium mt-0.5">{staffUser?.email}</p>
                                    <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                      {staffRole?.name || "Custom Staff"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-w-md md:justify-end">
                                  {allPerms.map((perm: string) => (
                                    <span key={perm} className="px-2 py-1 rounded-md text-[10px] font-extrabold uppercase bg-zinc-200/60 text-zinc-600 border border-zinc-300/30">
                                      {perm.replace("MANAGE_", "").replace("VIEW_", "").replace("_", " ")}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

                {/* 6. ORGANIZER GLOBAL CONFIGURATION TAB */}
                {activeTab === "ORGANIZER_SETTINGS" && isOwner && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                    <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Organizer Settings</h1>
                    <p className="text-zinc-500 font-medium mb-8">Manage your global organization branding, policies, subscription and billing details.</p>

                    {configMessage.text && (
                      <div className={`mb-8 p-4 rounded-xl text-sm font-bold border ${configMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                        {configMessage.text}
                      </div>
                    )}

                    {!organizerConfig ? (
                      <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : (
                      <form onSubmit={handleSaveConfig} className="space-y-10">
                        {/* A. Subscription */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Subscription & Tier</h3>
                          <div className="p-6 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Current Plan</p>
                              <h4 className="text-2xl font-black text-indigo-950 mt-1 capitalize">{organizerConfig.subscription_status || "Free"} Plan</h4>
                              <p className="text-sm text-indigo-700 mt-1">Upgrade to unlock white-labeling, custom security, and larger events.</p>
                            </div>
                            {organizerConfig.subscription_status !== "enterprise" && (
                              <Button
                                type="button"
                                onClick={() => handleUpgradeSubscription("enterprise")}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold py-5 px-6 shrink-0"
                              >
                                Upgrade to Enterprise
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* B. Branding */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Branding (White-label)</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label className="font-bold text-zinc-900">Organizer Logo URL</Label>
                              <Input
                                value={organizerConfig.branding_config?.logo || ""}
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  branding_config: { ...organizerConfig.branding_config, logo: e.target.value }
                                })}
                                placeholder="https://example.com/logo.png"
                                className="py-6 rounded-xl bg-zinc-50"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="font-bold text-zinc-900">Primary Branding Color</Label>
                              <div className="flex gap-3">
                                <Input
                                  type="color"
                                  value={organizerConfig.branding_config?.primaryColor || "#4F46E5"}
                                  onChange={(e) => setOrganizerConfig({
                                    ...organizerConfig,
                                    branding_config: { ...organizerConfig.branding_config, primaryColor: e.target.value }
                                  })}
                                  className="w-12 h-12 p-1 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer"
                                />
                                <Input
                                  value={organizerConfig.branding_config?.primaryColor || ""}
                                  onChange={(e) => setOrganizerConfig({
                                    ...organizerConfig,
                                    branding_config: { ...organizerConfig.branding_config, primaryColor: e.target.value }
                                  })}
                                  placeholder="#4F46E5"
                                  className="py-6 rounded-xl bg-zinc-50 flex-1"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label className="font-bold text-zinc-900">Branding Tagline</Label>
                            <Input
                              value={organizerConfig.branding_config?.tagline || ""}
                              onChange={(e) => setOrganizerConfig({
                                ...organizerConfig,
                                branding_config: { ...organizerConfig.branding_config, tagline: e.target.value }
                              })}
                              placeholder="Empowering local communities with tech."
                              className="py-6 rounded-xl bg-zinc-50"
                            />
                          </div>
                        </div>

                        {/* C. Policies & Security */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Global Policies & Security</h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                id="enableSSO"
                                checked={!!organizerConfig.security_config?.enableSSO}
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  security_config: { ...organizerConfig.security_config, enableSSO: e.target.checked }
                                })}
                                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                              />
                              <Label htmlFor="enableSSO" className="font-bold text-zinc-900 cursor-pointer">Require SSO authentication for co-hosts/volunteers</Label>
                            </div>
                            <div className="space-y-3">
                              <Label className="font-bold text-zinc-900">Restricted Join Email Domain</Label>
                              <Input
                                value={organizerConfig.tenant_policy?.emailDomain || ""}
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  tenant_policy: { ...organizerConfig.tenant_policy, emailDomain: e.target.value }
                                })}
                                placeholder="e.g. mycompany.com"
                                className="py-6 rounded-xl bg-zinc-50"
                              />
                              <p className="text-xs text-zinc-500">Only users with emails on this domain can be invited as staff members.</p>
                            </div>
                          </div>
                        </div>

                        {/* D. Billing Info */}
                        <div className="space-y-6">
                          <h3 className="text-lg font-black text-zinc-900 border-b border-zinc-100 pb-2">Billing Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <Label className="font-bold text-zinc-900">Billing Email</Label>
                              <Input
                                value={organizerConfig.billing_info?.billingEmail || ""}
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  billing_info: { ...organizerConfig.billing_info, billingEmail: e.target.value }
                                })}
                                placeholder="finance@mycompany.com"
                                className="py-6 rounded-xl bg-zinc-50"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label className="font-bold text-zinc-900">Tax ID / VAT Registration</Label>
                              <Input
                                value={organizerConfig.billing_info?.taxId || ""}
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  billing_info: { ...organizerConfig.billing_info, taxId: e.target.value }
                                })}
                                placeholder="GSTIN / Tax Registration Number"
                                className="py-6 rounded-xl bg-zinc-50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* E. Action Bar */}
                        <div className="pt-4 border-t border-zinc-100">
                          <Button
                            type="submit"
                            disabled={isSavingConfig}
                            className="w-full md:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                          >
                            {isSavingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Settings"}
                          </Button>
                        </div>
                      </form>
                    )}
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

        {/* QR Code Scanner Overlay Modal */}
        <AnimatePresence>
          {isQrScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-md p-6 overflow-hidden relative text-white"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-extrabold text-lg text-white">Ticket Scanner</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQrScanning(false)}
                    className="text-zinc-400 hover:text-white font-bold text-sm p-2 rounded-xl bg-zinc-905 hover:bg-zinc-800 transition-colors"
                  >
                    Close
                  </button>
                </div>

                {/* Scan Viewport Container */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                  {!scanResult && (
                    <div id="qr-scanner-element" className="w-full h-full object-cover" />
                  )}
                  
                  {scanResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/95 animate-in fade-in zoom-in-95 duration-200">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${scanResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
                        {scanResult.success ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                      </div>
                      <h4 className="font-bold text-lg">{scanResult.success ? "Scan Successful!" : "Scan Failed"}</h4>
                      <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{scanResult.message}</p>
                      <Button
                        type="button"
                        onClick={() => setScanResult(null)}
                        className="mt-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
                      >
                        Scan Next Ticket
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-500 text-center mt-6">
                  Point the camera at the attendee's ticket QR code.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULL SCREEN KIOSK WELCOME SPLASH */}
        <AnimatePresence>
          {welcomeAttendee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950 overflow-hidden"
            >
              {/* Animated Background Orbs */}
              <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square bg-indigo-600/20 rounded-full blur-[150px] animate-pulse pointer-events-none" style={{ animationDuration: '6s' }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square bg-violet-600/20 rounded-full blur-[150px] animate-pulse pointer-events-none" style={{ animationDuration: '8s', animationDelay: '2s' }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] aspect-square bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

              {/* Grid Overlay for Tech Vibe */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />

              {/* Welcome Card Container */}
              <motion.div
                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: -40, opacity: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
                className="relative w-[90%] max-w-3xl bg-zinc-900/60 border border-zinc-800/80 p-12 md:p-20 rounded-[3rem] text-center backdrop-blur-3xl shadow-2xl flex flex-col items-center justify-center gap-8 text-white"
              >
                {/* Checkmark animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
                  className="w-28 h-28 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.15)] mx-auto"
                >
                  <CheckCircle2 className="w-16 h-16" />
                </motion.div>

                <div className="space-y-4">
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-indigo-400 text-lg md:text-xl font-bold uppercase tracking-[0.25em]"
                  >
                    Welcome to
                  </motion.p>
                  
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-white text-3xl md:text-5xl font-black tracking-tight leading-tight uppercase max-w-2xl mx-auto"
                  >
                    {event?.title}
                  </motion.h1>

                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="h-[1px] w-24 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto my-6"
                  />

                  <motion.h2
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: "spring" }}
                    className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent px-4 py-2"
                  >
                    {welcomeAttendee}
                  </motion.h2>
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-zinc-500 font-semibold text-base mt-2"
                >
                  Check-in confirmed. Please enter and enjoy!
                </motion.p>

                {/* Autoclose Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-850 rounded-b-[3rem] overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </motion.div>
            </motion.div>
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