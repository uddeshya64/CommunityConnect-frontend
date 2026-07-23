"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, ArrowLeft, Share2,
  Ticket, Building2, UserCircle2,
  LayoutDashboard, Settings, Eye, Pencil, Trash2, AlertTriangle,
  Loader2, CheckCircle2, Shield, UserPlus, List, QrCode, XCircle,
  UploadCloud, ImageIcon, X, Laptop, MonitorSmartphone
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
  bannerUrl?: string;
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

  // --- ACTIONS & FILE UPLOAD STATES ---
  const [editData, setEditData] = useState<any>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
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

  const hasPermission = (perm: string) => 
    isOwner || 
    permissions.includes(perm) || 
    (perm === "MANAGE_ATTENDEES" && permissions.includes("MANAGE_CHECK_IN"));

  const formatFullDate = (isoString?: string) => {
    if (!isoString) return "TBA";
    return new Date(isoString).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "TBA";
    return new Date(isoString).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  };

  // File Upload Handlers
  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
      }
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview("");
  };

  // 1. INITIAL EVENT FETCH
  useEffect(() => {
    const fetchEventAndTypes = async () => {
      try {
        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;

        const currentBanner = rawEvent.banner_url || rawEvent.bannerUrl || rawEvent.banner || "";

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
          bannerUrl: currentBanner,
          organizerId: rawEvent.organizerId || rawEvent.hostId || rawEvent.userId,
          organizerName: rawEvent.organizer?.name || rawEvent.creator?.name
        });

        if (currentBanner) {
          setBannerPreview(currentBanner);
        }

        const formatForInput = (isoString: string) => {
          if (!isoString) return "";
          try {
            const date = new Date(isoString);
            return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          } catch (e) { return ""; }
        };

        const currentType = rawEvent.type || rawEvent.category || "";

        let typesList: any[] = [];
        try {
          const typesResponse = await eventService.getEventTypes();
          typesList = typesResponse?.data || typesResponse || [];
        } catch (e) {
          console.error("Failed to fetch event types:", e);
        }

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
          title: rawEvent.title || "",
          description: rawEvent.description || "",
          type: currentType || "meetup",
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

  // --- UPDATE EVENT ACTION ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdating(true);
      setUpdateMessage({ type: "", text: "" });

      const resolvedType = editData.type === "other" && customType.trim()
        ? customType.trim()
        : editData.type;

      if (editData.type === "other" && !customType.trim()) {
        throw new Error("Please enter a custom event type.");
      }

      // 1. Upload the banner using the dedicated API if a new file is selected
      let updatedBannerUrl = bannerPreview;
      if (bannerFile) {
        const bannerFormData = new FormData();
        bannerFormData.append("banner", bannerFile);

        const bannerRes = await api.post(`/events/${eventId}/banner`, bannerFormData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        
        // Update the banner URL based on the response from your new API
        updatedBannerUrl = bannerRes.data?.data?.banner_url || bannerRes.data?.banner_url || bannerPreview;
      }

      // 2. Update the rest of the event details
      const formData = new FormData();
      formData.append("title", editData.title);
      formData.append("description", editData.description);
      formData.append("type", resolvedType);
      formData.append("mode", editData.mode);
      formData.append("location", editData.mode === "online" ? "Online" : editData.location);
      formData.append("start_date", new Date(editData.start_date).toISOString());
      formData.append("end_date", new Date(editData.end_date).toISOString());
      formData.append("capacity", (parseInt(editData.capacity) || 0).toString());
      formData.append("registration_type", editData.registration_type);
      formData.append("registration_fee", (parseFloat(editData.registration_fee) || 0).toString());
      formData.append("min_team_size", (parseInt(editData.min_team_size) || 1).toString());
      formData.append("max_team_size", (parseInt(editData.max_team_size) || 1).toString());

      // If the user removed the banner and didn't upload a new one, signal the backend to delete it
      if (!bannerFile && !bannerPreview) {
        formData.append("remove_banner", "true");
      }

      await api.patch(`/events/${eventId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setUpdateMessage({ type: "success", text: "Event updated successfully!" });

      setEvent((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: editData.title,
          description: editData.description,
          type: resolvedType,
          mode: editData.mode,
          location: editData.mode === "online" ? "Online" : editData.location,
          startDate: new Date(editData.start_date).toISOString(),
          endDate: new Date(editData.end_date).toISOString(),
          capacity: parseInt(editData.capacity) || 0,
          regType: editData.registration_type,
          fee: parseFloat(editData.registration_fee) || 0,
          minTeam: parseInt(editData.min_team_size) || 1,
          maxTeam: parseInt(editData.max_team_size) || 1,
          bannerUrl: updatedBannerUrl
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
    } finally { 
      setIsUpdating(false); 
    }
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
          () => {}
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
                            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${checkInFilter === filter ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    {participants.length === 0 ? (
                      <p className="text-zinc-500 font-medium py-10 text-center">No participants registered yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {participants
                          .filter((p) => {
                            const query = searchQuery.toLowerCase().trim();
                            const pName = p.name || p.user?.name || "";
                            const pEmail = p.email || p.user?.email || "";
                            const pTicket = p.ticketCode || "";
                            const matchesSearch =
                              pName.toLowerCase().includes(query) ||
                              pEmail.toLowerCase().includes(query) ||
                              pTicket.toLowerCase().includes(query);

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
                                      onClick={() => handleManualCheckIn(p)}
                                      disabled={isChecking}
                                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 text-xs flex items-center gap-1.5 shadow-sm"
                                    >
                                      {isChecking ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5"/>
                                      )}
                                      Mark Present
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

                {/* 3. EDIT TAB (FULLY STRUCTURED FILE UPLOAD, FILE DETAILS & PREVIEW) */}
                {activeTab === "EDIT" && (
                  <div className="animate-in fade-in duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-6">
                    <div>
                      <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Edit Event Details</h1>
                      <p className="text-zinc-500 font-medium mt-1">Update your event banner, details, schedule, and pricing.</p>
                    </div>

                    {updateMessage.text && (
                      <div className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm ${updateMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                        {updateMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0"/>}
                        <span>{updateMessage.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-6">
                      
                      {/* BANNER / IMAGE UPLOAD FIELD (FILE UPLOAD, FILE DETAILS, AND PREVIEW IMAGE) */}
                      <div className="space-y-4">
                        <Label className="font-bold text-zinc-700">Event Cover Banner</Label>

                        {/* STEP A: FILE UPLOAD DROPZONE */}
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-300 hover:border-indigo-500 rounded-2xl cursor-pointer bg-zinc-50 hover:bg-indigo-50/30 transition-all">
                          <div className="flex flex-col items-center justify-center text-center px-4">
                            <div className="p-2.5 bg-zinc-200/60 rounded-xl text-zinc-600 mb-2">
                              <UploadCloud className="w-5 h-5"/>
                            </div>
                            <p className="text-sm font-bold text-zinc-800">
                              {bannerFile ? "Choose a different banner" : "Click to select or drag event banner"}
                            </p>
                            <p className="text-xs text-zinc-400 font-medium mt-1">Supports PNG, JPG, or WEBP (Max 5MB)</p>
                          </div>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={handleBannerSelect}
                          />
                        </label>

                        {/* STEP B: SHOW SELECTED FILE DETAILS & NAME */}
                        {bannerFile && (
                          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                                <ImageIcon className="w-4 h-4"/>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 truncate">{bannerFile.name}</p>
                                <p className="text-[11px] font-medium text-zinc-500">
                                  {(bannerFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveBanner}
                              className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {/* STEP C: SHOW LIVE IMAGE PREVIEW */}
                        {bannerPreview && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                              Banner Image Preview
                            </span>
                            <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900 group">
                              <img
                                src={bannerPreview}
                                alt="Event Banner Preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <label className="cursor-pointer bg-white text-zinc-900 hover:bg-zinc-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                                  <UploadCloud className="w-4 h-4"/> Swap Image
                                  <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    onChange={handleBannerSelect}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={handleRemoveBanner}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5"
                                >
                                  <X className="w-4 h-4"/> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-zinc-700">Event Title</Label>
                        <Input 
                          value={editData.title || ""} 
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          required
                          className="py-6 rounded-xl bg-zinc-50 border-zinc-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">Event Type</Label>
                          <select
                            value={customTypeEditMode ? "other" : editData.type}
                            onChange={(e) => handleTypeSelectChange(e.target.value)}
                            className="w-full h-12 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {eventTypes.map((t) => (
                              <option key={t.id} value={t.name.toLowerCase()}>
                                {t.name}
                              </option>
                            ))}
                            <option value="other">Other (Specify dynamic type)</option>
                          </select>
                          {customTypeEditMode && (
                            <Input 
                              placeholder="Enter custom type..." 
                              value={customType}
                              onChange={(e) => setCustomType(e.target.value)}
                              className="mt-2 py-5 rounded-xl bg-zinc-50 border-zinc-200"
                              required
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">Mode</Label>
                          <select
                            value={editData.mode || "offline"}
                            onChange={(e) => setEditData({ ...editData, mode: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {MODES.map((m) => (
                              <option key={m} value={m}>{m.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-zinc-700">Location</Label>
                        <Input 
                          value={editData.mode === "online" ? "Online" : editData.location || ""} 
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                          disabled={editData.mode === "online"}
                          className="py-6 rounded-xl bg-zinc-50 border-zinc-200 disabled:opacity-50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">Start Date & Time</Label>
                          <Input 
                            type="datetime-local" 
                            value={editData.start_date || ""} 
                            onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                            required
                            className="py-6 rounded-xl bg-zinc-50 border-zinc-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">End Date & Time</Label>
                          <Input 
                            type="datetime-local" 
                            value={editData.end_date || ""} 
                            onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                            required
                            className="py-6 rounded-xl bg-zinc-50 border-zinc-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">Capacity</Label>
                          <Input 
                            type="number" 
                            value={editData.capacity || "0"} 
                            onChange={(e) => setEditData({ ...editData, capacity: e.target.value })}
                            className="py-6 rounded-xl bg-zinc-50 border-zinc-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">Registration Fee (₹)</Label>
                          <Input 
                            type="number" 
                            value={editData.registration_fee || "0"} 
                            onChange={(e) => setEditData({ ...editData, registration_fee: e.target.value })}
                            className="py-6 rounded-xl bg-zinc-50 border-zinc-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-zinc-700">Registration Type</Label>
                          <select
                            value={editData.registration_type || "solo"}
                            onChange={(e) => setEditData({ ...editData, registration_type: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {REG_TYPES.map((rt) => (
                              <option key={rt} value={rt}>{rt.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {editData.registration_type === "team" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50 p-6 rounded-2xl border border-zinc-200">
                          <div className="space-y-2">
                            <Label className="font-bold text-zinc-700">Min Team Size</Label>
                            <Input 
                              type="number" 
                              value={editData.min_team_size || "1"} 
                              onChange={(e) => setEditData({ ...editData, min_team_size: e.target.value })}
                              className="py-6 rounded-xl bg-white border-zinc-200"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-zinc-700">Max Team Size</Label>
                            <Input 
                              type="number" 
                              value={editData.max_team_size || "1"} 
                              onChange={(e) => setEditData({ ...editData, max_team_size: e.target.value })}
                              className="py-6 rounded-xl bg-white border-zinc-200"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="font-bold text-zinc-700">Description</Label>
                        <textarea
                          rows={5}
                          value={editData.description || ""}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          className="w-full p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <Button className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 shadow-lg shadow-indigo-600/25" disabled={isUpdating} type="submit">
                        {isUpdating ? <Loader2 className="w-5 h-5 animate-spin"/> : "Save Event Changes"}
                      </Button>
                    </form>
                  </div>
                )}

                {/* 4. STAFF & ROLES TAB */}
                {activeTab === "STAFF" && hasPermission("MANAGE_STAFF") && (
                  <div className="animate-in fade-in duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-8">
                    <div>
                      <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Staff & Roles Management</h1>
                      <p className="text-zinc-500 font-medium mt-1">Assign custom RBAC roles and staff permissions to manage the event.</p>
                    </div>

                    <form onSubmit={handleInviteStaff} className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 space-y-4">
                      <h3 className="font-bold text-zinc-900 text-base">Invite Staff Member</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input 
                          placeholder="Staff email address..." 
                          type="email" 
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="py-6 bg-white border-zinc-200 rounded-xl md:col-span-2"
                        />
                        <select
                          value={inviteRoleId}
                          onChange={(e) => setInviteRoleId(e.target.value)}
                          className="h-12 px-3 rounded-xl bg-white border border-zinc-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Role...</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-5 shadow-sm" disabled={isInviting} type="submit">
                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Send Role Invitation"}
                      </Button>
                    </form>

                    <div className="space-y-4">
                      <h3 className="font-bold text-zinc-900 text-base">Assigned Event Staff</h3>
                      {staffList.length === 0 ? (
                        <p className="text-zinc-500 text-sm font-medium">No assigned staff members found.</p>
                      ) : (
                        <div className="space-y-3">
                          {staffList.map((st, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200/60">
                              <div>
                                <p className="font-extrabold text-zinc-900 text-sm">{st.user?.name || "Staff Member"}</p>
                                <p className="text-xs text-zinc-500 font-medium">{st.user?.email}</p>
                              </div>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                {st.role?.name || "Role Assigned"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. ORGANIZER SETTINGS TAB */}
                {activeTab === "ORGANIZER_SETTINGS" && isOwner && (
                  <div className="animate-in fade-in duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-8">
                    <div>
                      <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Organization & Tenant Settings</h1>
                      <p className="text-zinc-500 font-medium mt-1">Configure tenant policies, multi-tenant branding, and subscription tier.</p>
                    </div>

                    {configMessage.text && (
                      <div className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm ${configMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                        {configMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0"/>}
                        <span>{configMessage.text}</span>
                      </div>
                    )}

                    {organizerConfig && (
                      <form onSubmit={handleSaveConfig} className="space-y-6">
                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-extrabold text-zinc-900 text-base">Subscription Plan</h3>
                              <p className="text-xs text-zinc-500 mt-0.5">Your active multi-tenant feature tier.</p>
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider bg-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
                              {organizerConfig.subscription_status || "FREE"}
                            </span>
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button 
                              onClick={() => handleUpgradeSubscription("PRO")} 
                              type="button"
                              className="rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 text-xs font-bold px-4 py-2"
                            >
                              Upgrade to PRO
                            </Button>
                            <Button 
                              onClick={() => handleUpgradeSubscription("ENTERPRISE")} 
                              type="button"
                              className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2"
                            >
                              Upgrade to Enterprise
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-bold text-zinc-900 text-base border-b border-zinc-100 pb-2">Branding Configurations</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-zinc-600">Primary Brand Color</Label>
                              <Input 
                                value={organizerConfig.branding_config?.primary_color || "#4F46E5"} 
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  branding_config: { ...organizerConfig.branding_config, primary_color: e.target.value }
                                })}
                                className="py-5 bg-zinc-50 border-zinc-200 rounded-xl font-mono text-xs"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-bold text-zinc-600">Organization Logo URL</Label>
                              <Input 
                                value={organizerConfig.branding_config?.logo_url || ""} 
                                onChange={(e) => setOrganizerConfig({
                                  ...organizerConfig,
                                  branding_config: { ...organizerConfig.branding_config, logo_url: e.target.value }
                                })}
                                placeholder="https://..."
                                className="py-5 bg-zinc-50 border-zinc-200 rounded-xl text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-bold text-zinc-900 text-base border-b border-zinc-100 pb-2">Tenant Access Policies</h3>
                          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200/60">
                            <div>
                              <p className="font-bold text-zinc-900 text-sm">Require Email Verification</p>
                              <p className="text-xs text-zinc-500">Attendees must confirm email before ticket issuance.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={!!organizerConfig.tenant_policy?.require_email_verification}
                              onChange={(e) => setOrganizerConfig({
                                ...organizerConfig,
                                tenant_policy: { ...organizerConfig.tenant_policy, require_email_verification: e.target.checked }
                              })}
                              className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <Button className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 shadow-lg shadow-indigo-600/25" disabled={isSavingConfig} type="submit">
                          {isSavingConfig ? <Loader2 className="w-5 h-5 animate-spin"/> : "Save Organization Configurations"}
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {/* 6. SETTINGS (DANGER ZONE) TAB */}
                {activeTab === "SETTINGS" && isOwner && (
                  <div className="animate-in fade-in duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-6">
                    <div>
                      <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Event Settings</h1>
                      <p className="text-zinc-500 font-medium mt-1">Manage destructive actions and administrative settings.</p>
                    </div>

                    <div className="p-6 bg-red-50/50 rounded-3xl border border-red-200/60 space-y-4">
                      <div className="flex items-center gap-3 text-red-700 font-extrabold text-lg">
                        <AlertTriangle className="w-6 h-6"/> Danger Zone
                      </div>
                      <p className="text-sm font-medium text-zinc-600">
                        Deleting this event will permanently purge all registrations, ticket data, check-in history, and staff permissions associated with it. This action cannot be undone.
                      </p>
                      <Button className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-6 shadow-lg shadow-red-600/20" onClick={handleDelete}>
                        <Trash2 className="w-5 h-5 mr-2"/> Delete Event
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* QR SCANNER MODAL */}
        <AnimatePresence>
          {isQrScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            >
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
                <button
                  onClick={() => setIsQrScanning(false)}
                  type="button"
                  className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 p-2"
                >
                  <XCircle className="w-6 h-6"/>
                </button>

                <div className="text-center mb-4">
                  <h3 className="text-xl font-extrabold text-zinc-900">Scan Ticket QR</h3>
                  <p className="text-xs font-semibold text-zinc-500 mt-1">Position attendee&apos;s ticket QR code inside the camera frame.</p>
                </div>

                <div className="overflow-hidden rounded-2xl border-2 border-zinc-200 bg-black aspect-square flex items-center justify-center relative">
                  <div id="qr-scanner-element" className="w-full h-full"></div>
                </div>

                {scanResult && (
                  <div className={`mt-4 p-3 rounded-xl text-xs font-bold text-center ${scanResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {scanResult.message}
                  </div>
                )}

                <Button 
                  onClick={() => setIsQrScanning(false)}
                  type="button"
                  className="w-full mt-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold py-3"
                >
                  Close Scanner
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WELCOME BANNER MODAL */}
        <AnimatePresence>
          {welcomeAttendee && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 right-8 z-50 bg-zinc-950 text-white p-6 rounded-3xl shadow-2xl border border-zinc-800 flex items-center gap-4 max-w-md"
            >
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6"/>
              </div>
              <div>
                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Check-In Successful</p>
                <h4 className="text-lg font-black text-white mt-0.5">Welcome, {welcomeAttendee}! 👋</h4>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">Attendance status updated seamlessly.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
                <h3 className="text-xl font-extrabold text-zinc-900">Confirm Deletion</h3>
                <p className="text-sm font-medium text-zinc-600">
                  Type <span className="font-mono font-bold text-zinc-900">&quot;{event.title}&quot;</span> to confirm permanent deletion.
                </p>
                <Input 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter event title..."
                  className="py-5 bg-zinc-50 border-zinc-200 rounded-xl font-semibold"
                />
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-5"
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-5 shadow-md shadow-red-600/20" disabled={isDeleting} onClick={handleConfirmDelete}>
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Delete"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ==========================================
  // VIEW 2: PUBLIC / ATTENDEE PREVIEW VIEW
  // ==========================================
  return (
    <>
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
                    <p className="font-bold text-emerald-900 text-sm">You&apos;re already registered!</p>
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
    </>
  );
}