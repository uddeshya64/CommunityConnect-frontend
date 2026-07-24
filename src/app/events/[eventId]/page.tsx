"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, ArrowLeft, Share2,
  Ticket, Building2, UserCircle2,
  LayoutDashboard, Settings, Eye, Pencil, Trash2, AlertTriangle,
  Loader2, CheckCircle2, Shield, UserPlus, List, QrCode, XCircle,
  UploadCloud, ImageIcon, X, Laptop, MonitorSmartphone, Clock, Plus, ClipboardList
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { api } from "@/lib/axios";
import { Html5Qrcode } from "html5-qrcode";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import RegistrationFormBuilder from "@/components/organizer/RegistrationFormBuilder";

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
  timelines?: any[];
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
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PARTICIPANTS" | "EDIT" | "AGENDA" | "REGISTRATION_FORM" | "STAFF" | "SETTINGS" | "ORGANIZER_SETTINGS">("OVERVIEW");

  // --- AGENDA / TIMELINE STATES ---
  const [expandedTimelineId, setExpandedTimelineId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const [timelinesList, setTimelinesList] = useState<any[]>([]);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [editingTimelineItem, setEditingTimelineItem] = useState<any | null>(null);
  const [agendaFormData, setAgendaFormData] = useState({
    title: "",
    speaker_name: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    should_notify: true
  });
  const [isSavingAgenda, setIsSavingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState("");

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
          organizerName: rawEvent.organizer?.name || rawEvent.creator?.name,
          timelines: rawEvent.timelines || []
        });

        setTimelinesList(rawEvent.timelines || []);

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
        } else if (activeTab === "AGENDA") {
          const res = await api.get(`/events/${eventId}/timelines`);
          setTimelinesList(res.data.data || res.data || []);
        }
        // Note: REGISTRATION_FORM tab is intentionally not handled here —
        // RegistrationFormBuilder fetches and manages its own schema state.
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

      const fee = parseFloat(editData.registration_fee);
      if (isNaN(fee) || fee < 0) {
        throw new Error("Registration fee must be at least ₹0.");
      }
      if (fee > 100000) {
        throw new Error("Registration fee cannot exceed ₹100,000.");
      }

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

  // --- AGENDA MANAGEMENT HANDLERS ---
  const formatForDateTimeLocal = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    } catch (e) { return ""; }
  };

  const handleOpenAddAgenda = () => {
    setEditingTimelineItem(null);
    setAgendaFormData({
      title: "",
      speaker_name: "",
      description: "",
      start_time: "",
      end_time: "",
      location: "",
      should_notify: true
    });
    setAgendaError("");
    setIsAgendaModalOpen(true);
  };

  const handleOpenEditAgenda = (item: any) => {
    setEditingTimelineItem(item);
    setAgendaFormData({
      title: item.title || "",
      speaker_name: item.speaker_name || "",
      description: item.description || "",
      start_time: formatForDateTimeLocal(item.start_time),
      end_time: formatForDateTimeLocal(item.end_time),
      location: item.location || "",
      should_notify: item.should_notify ?? true
    });
    setAgendaError("");
    setIsAgendaModalOpen(true);
  };

  const handleSaveAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaFormData.title.trim()) {
      setAgendaError("Title is required.");
      return;
    }
    if (!agendaFormData.start_time) {
      setAgendaError("Start time is required.");
      return;
    }
    if (agendaFormData.end_time && agendaFormData.start_time >= agendaFormData.end_time) {
      setAgendaError("End time must be after start time.");
      return;
    }

    try {
      setIsSavingAgenda(true);
      setAgendaError("");

      const payload = {
        ...agendaFormData,
        speaker_name: agendaFormData.speaker_name || null,
        description: agendaFormData.description || null,
        location: agendaFormData.location || null,
        end_time: agendaFormData.end_time || null,
      };

      if (editingTimelineItem) {
        const res = await eventService.updateTimeline(eventId, editingTimelineItem.id, payload);
        const updatedItem = res.data?.data || res.data || res;
        setTimelinesList(prev => prev.map(item => item.id === editingTimelineItem.id ? updatedItem : item));
        setEvent(prev => {
          if (!prev) return null;
          const updatedTimelines = (prev.timelines || []).map(item => item.id === editingTimelineItem.id ? updatedItem : item);
          return { ...prev, timelines: updatedTimelines };
        });
      } else {
        const res = await eventService.createTimeline(eventId, payload);
        const newItem = res.data?.data || res.data || res;
        const sortList = (list: any[]) => [...list].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setTimelinesList(prev => sortList([...prev, newItem]));
        setEvent(prev => {
          if (!prev) return null;
          return { ...prev, timelines: sortList([...(prev.timelines || []), newItem]) };
        });
      }

      setIsAgendaModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setAgendaError(err.response?.data?.error || err.message || "Failed to save agenda item.");
    } finally {
      setIsSavingAgenda(false);
    }
  };

  const handleDeleteAgenda = async (timelineId: number) => {
    if (!confirm("Are you sure you want to delete this agenda session?")) return;
    try {
      await eventService.deleteTimeline(eventId, timelineId);
      setTimelinesList(prev => prev.filter(item => item.id !== timelineId));
      setEvent(prev => {
        if (!prev) return null;
        return { ...prev, timelines: (prev.timelines || []).filter(item => item.id !== timelineId) };
      });
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to delete agenda item.");
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

            {hasPermission("MANAGE_EVENT") && (
              <button onClick={() => setActiveTab("AGENDA")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "AGENDA" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
                <Calendar className="w-5 h-5" /> Event Agenda
              </button>
            )}

            {hasPermission("MANAGE_EVENT") && (
              <button onClick={() => setActiveTab("REGISTRATION_FORM")} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "REGISTRATION_FORM" ? "bg-indigo-600/10 text-indigo-400" : "hover:bg-zinc-900 hover:text-white"}`}>
                <ClipboardList className="w-5 h-5" /> Registration Form
              </button>
            )}

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

                {/* 3.5. AGENDA TAB */}
                {activeTab === "AGENDA" && hasPermission("MANAGE_EVENT") && (
                  <div className="animate-in fade-in duration-500 bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
                      <div>
                        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Event Agenda</h1>
                        <p className="text-zinc-500 font-medium mt-1">Design a creative schedule and session timeline for your event.</p>
                      </div>
                      <Button
                        onClick={handleOpenAddAgenda}
                        className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-6 shadow-lg shadow-indigo-600/25 flex items-center gap-2 self-start md:self-auto transition-transform hover:scale-[1.02]"
                      >
                        <Plus className="w-5 h-5" /> Add Session
                      </Button>
                    </div>

                    {timelinesList.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50">
                        <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                        <h3 className="font-extrabold text-zinc-800 text-lg">No sessions added yet</h3>
                        <p className="text-zinc-500 text-sm font-medium mt-1">Add sessions to build a stunning timeline for your attendees.</p>
                        <Button
                          onClick={handleOpenAddAgenda}
                          className="mt-6 rounded-xl bg-white border border-zinc-200 text-zinc-800 font-bold px-5 py-2.5 hover:bg-zinc-50 shadow-sm"
                        >
                          Create First Session
                        </Button>
                      </div>
                    ) : (
                      <div className="relative border-l border-zinc-200 ml-4 pl-8 space-y-8 py-4">
                        {timelinesList.map((timeline) => {
                          const start = new Date(timeline.start_time);
                          const end = timeline.end_time ? new Date(timeline.end_time) : null;
                          return (
                            <div key={timeline.id} className="relative group">
                              {/* Timeline Point */}
                              <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-white border-4 border-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform" />
                              
                              <div className="bg-zinc-50 border border-zinc-200/60 p-6 rounded-3xl hover:border-zinc-300 hover:bg-white hover:shadow-md transition-all duration-300 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl w-fit">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>
                                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {end && ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                      </span>
                                      <span className="text-zinc-300">|</span>
                                      <span>
                                        {start.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-zinc-950 leading-snug">{timeline.title}</h3>
                                  </div>

                                  <div className="flex items-center gap-2 self-end md:self-start">
                                    <Button
                                      onClick={() => handleOpenEditAgenda(timeline)}
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-xl hover:bg-zinc-200/70 text-zinc-600 w-9 h-9"
                                      title="Edit"
                                      type="button"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteAgenda(timeline.id)}
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-xl hover:bg-red-50 text-red-600 w-9 h-9"
                                      title="Delete"
                                      type="button"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-500">
                                  {timeline.speaker_name && (
                                    <span className="flex items-center gap-1.5 bg-zinc-200/50 px-2.5 py-1 rounded-lg">
                                      <UserCircle2 className="w-3.5 h-3.5 text-zinc-600" />
                                      Speaker: <strong className="text-zinc-700">{timeline.speaker_name}</strong>
                                    </span>
                                  )}
                                  {timeline.location && (
                                    <span className="flex items-center gap-1.5 bg-zinc-200/50 px-2.5 py-1 rounded-lg">
                                      <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                                      Room/Location: <strong className="text-zinc-700">{timeline.location}</strong>
                                    </span>
                                  )}
                                </div>

                                {timeline.description && (
                                  <div 
                                    className="text-zinc-600 text-sm font-medium leading-relaxed border-t border-zinc-150 pt-3 prose prose-zinc prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: timeline.description }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3.6. REGISTRATION FORM TAB */}
                {activeTab === "REGISTRATION_FORM" && hasPermission("MANAGE_EVENT") && (
                  <RegistrationFormBuilder eventId={eventId} />
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

        {/* AGENDA SESSION MODAL */}
        <AnimatePresence>
          {isAgendaModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setIsAgendaModalOpen(false)}
                  type="button"
                  className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 p-2 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5"/>
                </button>

                <div className="mb-6">
                  <h3 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                    {editingTimelineItem ? "Edit Agenda Session" : "Add Agenda Session"}
                  </h3>
                  <p className="text-xs font-semibold text-zinc-500 mt-1">Configure session timing, details, and description styling.</p>
                </div>

                {agendaError && (
                  <div className="mb-4 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{agendaError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveAgenda} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-zinc-700 text-sm">Session Title *</Label>
                    <Input 
                      value={agendaFormData.title} 
                      onChange={(e) => setAgendaFormData({ ...agendaFormData, title: e.target.value })}
                      required
                      placeholder="e.g. Opening Keynote, Technical Session 1"
                      className="py-5 rounded-xl bg-zinc-50 border-zinc-200 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-zinc-700 text-sm">Start Time *</Label>
                      <Input 
                        type="datetime-local" 
                        value={agendaFormData.start_time} 
                        onChange={(e) => setAgendaFormData({ ...agendaFormData, start_time: e.target.value })}
                        required
                        className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-zinc-700 text-sm">End Time (Optional)</Label>
                      <Input 
                        type="datetime-local" 
                        value={agendaFormData.end_time} 
                        onChange={(e) => setAgendaFormData({ ...agendaFormData, end_time: e.target.value })}
                        className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-bold text-zinc-700 text-sm">Speaker Name</Label>
                      <Input 
                        value={agendaFormData.speaker_name} 
                        onChange={(e) => setAgendaFormData({ ...agendaFormData, speaker_name: e.target.value })}
                        placeholder="e.g. Dr. Jane Doe"
                        className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-bold text-zinc-700 text-sm">Location / Room</Label>
                      <Input 
                        value={agendaFormData.location} 
                        onChange={(e) => setAgendaFormData({ ...agendaFormData, location: e.target.value })}
                        placeholder="e.g. Auditorium A, Room 402"
                        className="py-5 rounded-xl bg-zinc-50 border-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-zinc-700 text-sm">Creative Description (Rich Text)</Label>
                    <RichTextEditor 
                      value={agendaFormData.description}
                      onChange={(val) => setAgendaFormData({ ...agendaFormData, description: val })}
                      placeholder="Add interactive instructions, links, key speakers, or notes with custom colors & formatting..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-zinc-150">
                    <Button 
                      onClick={() => setIsAgendaModalOpen(false)}
                      type="button"
                      className="flex-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-5"
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 shadow-md shadow-indigo-600/20" 
                      disabled={isSavingAgenda} 
                      type="submit"
                    >
                      {isSavingAgenda ? <Loader2 className="w-4 h-4 animate-spin"/> : "Save Session"}
                    </Button>
                  </div>
                </form>
              </motion.div>
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

          {/* Timeline / Agenda */}
          {event?.timelines && event.timelines.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-6">
              <style>{`
                @keyframes sway {
                  0%, 100% { transform: translateY(0) rotate(0deg); }
                  50% { transform: translateY(-4px) rotate(4deg); }
                }
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-6px); }
                }
                .animate-sway {
                  animation: sway 5s ease-in-out infinite;
                }
                .animate-float {
                  animation: float 6s ease-in-out infinite;
                }
              `}</style>

              <h2 className="text-2xl font-bold text-zinc-900 mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-indigo-500" /> Event Agenda & Schedule
              </h2>

              <motion.div 
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="space-y-8 pl-2"
              >
                {(() => {
                  // Group timelines by date
                  const groups: { [key: string]: any[] } = {};
                  event.timelines.forEach((item: any) => {
                    const dateStr = new Date(item.start_time).toDateString();
                    if (!groups[dateStr]) {
                      groups[dateStr] = [];
                    }
                    groups[dateStr].push(item);
                  });
                  const sortedGroups = Object.entries(groups).sort(
                    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
                  );

                  return sortedGroups.map(([dateStr, items]) => {
                    const d = new Date(dateStr);
                    const month = d.toLocaleDateString("en-US", { month: "short" });
                    const day = d.getDate();

                    return (
                      <motion.div 
                        key={dateStr} 
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                        }}
                        className="flex gap-4 items-start"
                      >
                        {/* Date Header (Light Theme) */}
                        <div className="w-12 flex flex-col items-center shrink-0 py-2">
                          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{month}</span>
                          <span className="text-2xl font-black text-zinc-900 mt-0.5">{day}</span>
                        </div>

                        {/* Session Cards Stack */}
                        <div className="flex-1 space-y-4">
                          {items.map((timeline: any) => {
                            // Get theme styling
                            const tTitle = timeline.title.toLowerCase();
                            let theme = {
                              bgClass: "bg-[#4285F4] border-[#4285F4]/30 text-white hover:shadow-[0_15px_30px_rgba(66,133,244,0.35)]",
                              timeClass: "text-blue-105",
                              locationClass: "text-blue-150",
                              type: "default"
                            };

                            if (tTitle.includes("tea") || tTitle.includes("coffee") || tTitle.includes("networking") || tTitle.includes("break") || tTitle.includes("snack")) {
                              theme = {
                                bgClass: "bg-gradient-to-br from-amber-100 to-orange-100 border-amber-250/20 text-amber-950 hover:shadow-[0_15px_30px_rgba(245,158,11,0.25)]",
                                timeClass: "text-amber-800",
                                locationClass: "text-amber-700",
                                type: "coffee"
                              };
                            } else if (tTitle.includes("lunch") || tTitle.includes("dinner") || tTitle.includes("food") || tTitle.includes("meal") || tTitle.includes("brunch")) {
                              theme = {
                                bgClass: "bg-gradient-to-br from-rose-50 to-orange-50 border-orange-250/20 text-orange-950 hover:shadow-[0_15px_30px_rgba(239,68,68,0.2)]",
                                timeClass: "text-orange-855",
                                locationClass: "text-orange-755",
                                type: "lunch"
                              };
                            } else if (tTitle.includes("party") || tTitle.includes("celebration") || tTitle.includes("social") || tTitle.includes("afterparty") || tTitle.includes("dj")) {
                              theme = {
                                bgClass: "bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-950 border-indigo-800/40 text-indigo-50 hover:shadow-[0_15px_30px_rgba(168,85,247,0.4)]",
                                timeClass: "text-indigo-355",
                                locationClass: "text-indigo-400",
                                type: "party"
                              };
                            } else if (tTitle.includes("register") || tTitle.includes("registration") || tTitle.includes("welcome") || tTitle.includes("check-in") || tTitle.includes("checkin")) {
                              theme = {
                                bgClass: "bg-gradient-to-br from-emerald-950 to-zinc-900 border-emerald-800/40 text-emerald-50 hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)]",
                                timeClass: "text-emerald-300",
                                locationClass: "text-emerald-400",
                                type: "welcome"
                              };
                            }

                            const start = new Date(timeline.start_time);
                            const end = timeline.end_time ? new Date(timeline.end_time) : null;
                            const formattedTime = `${start.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}${end ? ` - ${end.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}` : ''}`;
                            const isLive = start <= currentTime && (end === null || currentTime <= end);
                            const isExpanded = expandedTimelineId === timeline.id;

                            return (
                              <div
                                key={timeline.id}
                                onClick={() => setExpandedTimelineId(isExpanded ? null : timeline.id)}
                                className={`relative overflow-hidden p-5 rounded-[1.25rem] border shadow-sm cursor-pointer transition-all duration-500 hover:-translate-y-1.5 hover:scale-[1.01] ${theme.bgClass}`}
                              >
                                {/* Live pulsing indicator */}
                                {isLive && (
                                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500 text-red-500 text-[8px] font-black tracking-widest uppercase animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                    <span>Live</span>
                                  </div>
                                )}

                                {/* Background Illustrations with dynamic float/sway animations */}
                                {theme.type === "coffee" && (
                                  <svg className="absolute right-0 bottom-0 w-24 h-24 opacity-[0.12] pointer-events-none text-amber-900 animate-sway" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M30 40h40v30C70 78.3 63.3 85 55 85h-10C36.7 85 30 78.3 30 70V40z" fill="currentColor" />
                                    <path d="M70 45h8c4.4 0 8 3.6 8 8v4c0 4.4-3.6 8-8 8h-8V45z" stroke="currentColor" strokeWidth="4" />
                                    <path d="M40 25c0-5 5-5 5-10M50 25c0-5 5-5 5-10M60 25c0-5 5-5 5-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                  </svg>
                                )}
                                {theme.type === "lunch" && (
                                  <svg className="absolute right-0 bottom-0 w-24 h-24 opacity-[0.12] pointer-events-none text-orange-900 animate-float" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="4" />
                                    <path d="M50 20v60M20 50h60" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                                    <path d="M35 45c2 0 5 2 5 5s-3 5-5 5" stroke="currentColor" strokeWidth="3" />
                                    <path d="M65 45c-2 0-5 2-5 5s3 5 5 5" stroke="currentColor" strokeWidth="3" />
                                  </svg>
                                )}
                                {theme.type === "party" && (
                                  <svg className="absolute right-0 bottom-0 w-24 h-24 opacity-20 pointer-events-none text-indigo-400 animate-float" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="35" cy="40" r="12" fill="currentColor" />
                                    <path d="M35 52v20M35 72l-5 5M35 72l5 5" stroke="currentColor" strokeWidth="2" />
                                    <circle cx="65" cy="30" r="10" fill="currentColor" />
                                    <path d="M65 40v25" stroke="currentColor" strokeWidth="2" />
                                    <path d="M15 15l10 5M85 15l-10 5M50 15l2 10" stroke="currentColor" strokeWidth="2" />
                                  </svg>
                                )}
                                {theme.type === "welcome" && (
                                  <svg className="absolute right-0 bottom-0 w-24 h-24 opacity-[0.12] pointer-events-none text-emerald-400 animate-float" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 80V40l30-20 30 20v80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="3" />
                                  </svg>
                                )}

                                <div className="relative z-10 space-y-1">
                                  <h4 className="font-extrabold text-sm leading-tight pr-12">{timeline.title}</h4>
                                  <p className={`text-[11px] font-black opacity-80`}>
                                    {formattedTime}
                                  </p>
                                  {(timeline.speaker_name || timeline.location) && (
                                    <p className={`text-[10px] font-bold mt-1 flex flex-wrap gap-2 opacity-85`}>
                                      {timeline.speaker_name && <span>Speaker: {timeline.speaker_name}</span>}
                                      {timeline.location && <span>At: {timeline.location}</span>}
                                    </p>
                                  )}
                                  
                                  {/* Click expansion indicator */}
                                  {!isExpanded && timeline.description && (
                                    <p className="text-[10px] font-bold opacity-60 mt-1.5 flex items-center gap-1">
                                      Click to view details <span className="text-[8px]">▼</span>
                                    </p>
                                  )}

                                  {/* Expandable creative details accordion */}
                                  <AnimatePresence initial={false}>
                                    {isExpanded && timeline.description && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                      >
                                        <div
                                          className="text-[11px] font-medium opacity-95 pt-2 mt-2 border-t border-current/10 prose prose-sm max-w-none prose-current leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: timeline.description }}
                                        />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </motion.div>
            </motion.section>
          )}

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

      {isStaff && viewMode === "PREVIEW" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-zinc-950/95 text-white px-6 py-4 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-md flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-xs font-extrabold text-zinc-300">Preview Mode: Organizer view</p>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <button
            onClick={() => setViewMode("DASHBOARD")}
            className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest cursor-pointer"
            type="button"
          >
            Exit Preview
          </button>
        </div>
      )}
    </>
  );
}