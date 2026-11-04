"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Download,
  Users, ArrowLeft, ArrowRight, Share2,
  Ticket, Building2, UserCircle2,
  LayoutDashboard, Settings, Eye, Pencil, Trash2, AlertTriangle,
  Loader2, CheckCircle2, Shield, UserPlus, List, QrCode, XCircle,
  UploadCloud, ImageIcon, X, Laptop, MonitorSmartphone, Clock, Plus,
  HelpCircle, Copy, Tag, Sparkles, Bookmark, Mail, CheckSquare, Megaphone, Send, Smile, MessageSquare, Gamepad2,
  ChevronDown, ShieldAlert, Camera, Check
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { profileService } from "@/services/profile.service";
import { api } from "@/lib/axios";
import { Html5Qrcode } from "html5-qrcode";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useToast } from "@/components/providers/ToastProvider";
import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import ActivityManagerTab from "@/components/gamification/ActivityManagerTab";
import AiAgendaBuilderModal from "@/components/events/AiAgendaBuilderModal";

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
  tags?: string[];
  registeredCount: number;
  is_saved?: boolean;
}

interface EventTheme {
  bg: string;
  cardBg: string;
  accent: string;
  accentBg: string;
  button: string;
  textMuted: string;
  textHeading: string;
  badge: string;
  pill: string;
  divider: string;
  agendaDefault: string;
  isDark: boolean;
  gradOverlay: string;
  gimmicks?: React.ReactNode;
}

const getEventTheme = (dark: boolean): EventTheme => {
  return {
    bg: dark ? "bg-[#09090b] text-[#f4f4f5]" : "bg-[#f6f7f9] text-[#0f172a]",
    cardBg: dark
      ? "bg-zinc-900/70 backdrop-blur-xl border border-white/10 text-zinc-100 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.55),0_2px_8px_-2px_rgba(0,0,0,0.3)]"
      : "bg-white/95 backdrop-blur-xl border border-slate-200/80 text-slate-900 shadow-[0_14px_34px_-10px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.04)]",
    accent: "text-[var(--accent)]",
    accentBg: dark
      ? "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] text-[var(--accent)]"
      : "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] text-[var(--accent)]",
    button: "text-white shadow-lg",
    textMuted: dark ? "text-zinc-400" : "text-slate-500",
    textHeading: dark ? "text-zinc-100 font-bricolage" : "text-slate-900 font-bricolage",
    badge: dark
      ? "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] border border-[color-mix(in_oklab,var(--accent)_35%,transparent)] text-[var(--accent)]"
      : "bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] text-[var(--accent)]",
    pill: dark ? "bg-white/[0.06] border border-white/10 text-zinc-200" : "bg-slate-100 border border-slate-200 text-slate-700",
    divider: dark ? "border-white/10" : "border-slate-200",
    agendaDefault: dark
      ? "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] text-zinc-100"
      : "bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] border border-[color-mix(in_oklab,var(--accent)_25%,transparent)] text-slate-900",
    isDark: dark,
    gradOverlay: dark
      ? "from-[color-mix(in_oklab,var(--accent2)_22%,transparent)] via-[#09090b] to-[#09090b]"
      : "from-[color-mix(in_oklab,var(--accent2)_14%,transparent)] via-[#f6f7f9] to-[#f6f7f9]",
    gimmicks: (
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5 select-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>
    ),
  };
};

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { success: showSuccess, error: showError } = useToast();
  const { isDark, activeAccent } = useAppearance();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleSave = async () => {
    if (!event) return;
    const currentState = !!event.is_saved;
    setEvent(prev => prev ? { ...prev, is_saved: !currentState } : prev);
    try {
      if (currentState) {
        await eventService.unsaveEvent(event.id);
      } else {
        await eventService.saveEvent(event.id);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
      setEvent(prev => prev ? { ...prev, is_saved: currentState } : prev);
      showError("Failed to update saved status.");
    }
  };

  // --- AGENDA / TIMELINE STATES ---
  const [expandedTimelineId, setExpandedTimelineId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30550);
    return () => clearInterval(timer);
  }, []);

  const theme = getEventTheme(isDark);

  const isStarted = event ? (currentTime >= new Date(event.startDate)) : false;
  const isConcluded = event ? (currentTime > new Date(event.endDate)) : false;
  const isSoldOut = event ? (event.capacity > 0 && registeredCount >= event.capacity) : false;
  const isRegistrationBlocked = isStarted || isConcluded || isSoldOut;

  let ctaText = "Secure Your Spot";
  if (isConcluded) {
    ctaText = "Event Concluded";
  } else if (isStarted) {
    ctaText = "Event Underway";
  } else if (isSoldOut) {
    ctaText = "Sold Out";
  }

  // --- PBAC & RBAC STATES ---
  const [isStaff, setIsStaff] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<"DASHBOARD" | "PREVIEW">("PREVIEW");
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PARTICIPANTS" | "EDIT" | "AGENDA" | "STAFF" | "TASKS" | "ANNOUNCEMENTS" | "ACTIVITIES" | "SETTINGS" | "ORGANIZER_SETTINGS">("OVERVIEW");



  useEffect(() => {
    if (!event?.startDate) return;
    const calculateTimeLeft = () => {
      const now = new Date();
      const start = new Date(event.startDate);
      const diffMs = start.getTime() - now.getTime();

      if (diffMs <= 0) {
        if (event.endDate) {
          const end = new Date(event.endDate);
          const diffEndMs = end.getTime() - now.getTime();
          if (diffEndMs > 0) {
            setTimeLeftStr("Ongoing / Active Now");
            return;
          }
        }
        setTimeLeftStr("Concluded");
        return;
      }

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffDays > 0) {
        setTimeLeftStr(`Starts in ${diffDays}d ${diffHours}h`);
      } else if (diffHours > 0) {
        setTimeLeftStr(`Starts in ${diffHours}h ${diffMins}m`);
      } else {
        setTimeLeftStr(`Starts in ${diffMins}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [event?.startDate, event?.endDate]);

  const [timelinesList, setTimelinesList] = useState<any[]>([]);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [isAiAgendaModalOpen, setIsAiAgendaModalOpen] = useState(false);
  const [editingTimelineItem, setEditingTimelineItem] = useState<any | null>(null);
  const [agendaToDeleteId, setAgendaToDeleteId] = useState<number | null>(null);
  const [isDeletingAgenda, setIsDeletingAgenda] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [agendaFormData, setAgendaFormData] = useState({
    title: "",
    speaker_name: "",
    description: "",
    tags: [] as string[],
    start_time: "",
    end_time: "",
    location: "",
    should_notify: true
  });
  const [isSavingAgenda, setIsSavingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState("");
  const [visibleAgendaCount, setVisibleAgendaCount] = useState(20);
  const [visibleEventAgendaCount, setVisibleEventAgendaCount] = useState(20);

  useEffect(() => {
    profileService.getMyProfile().then((profile: any) => {
      if (profile?.skills && Array.isArray(profile.skills)) {
        setUserSkills(profile.skills);
      }
    }).catch(() => { });
  }, []);

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (!agendaFormData.tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setAgendaFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmed]
      }));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setAgendaFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  // --- MANAGEMENT DATA STATES ---
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [creatorUser, setCreatorUser] = useState<any>(null);
  const [organizerConfig, setOrganizerConfig] = useState<any>(null);
  const [isFetchingTab, setIsFetchingTab] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState({ type: "", text: "" });

  // --- STAFF CATEGORIES & PERMISSIONS MODAL STATES ---
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>("ALL");
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editMemberRoleId, setEditMemberRoleId] = useState<string>("");
  const [editMemberOverrides, setEditMemberOverrides] = useState<string[]>([]);
  const [isUpdatingStaff, setIsUpdatingStaff] = useState(false);
  const [isRemovingStaffId, setIsRemovingStaffId] = useState<number | null>(null);
  const [isCancellingInviteId, setIsCancellingInviteId] = useState<number | null>(null);

  // --- CHECK-IN & QR SCANNING STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [checkInFilter, setCheckInFilter] = useState<"ALL" | "PRESENT" | "ABSENT">("ALL");
  const [quickTicketCode, setQuickTicketCode] = useState("");
  const [isQuickCheckingIn, setIsQuickCheckingIn] = useState(false);
  const [quickCheckInMessage, setQuickCheckInMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(true);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; participantName?: string } | null>(null);
  const [isPerformingCheckIn, setIsPerformingCheckIn] = useState<number | null>(null);
  const [welcomeAttendee, setWelcomeAttendee] = useState<string | null>(null);
  const [alreadyCheckedInModal, setAlreadyCheckedInModal] = useState<{
    message: string;
    name?: string;
    time?: string;
  } | null>(null);

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

  // --- STAFF TASKS STATES ---
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedToId: "",
    dueDate: ""
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<number | null>(null);
  const [isDeletingTaskId, setIsDeletingTaskId] = useState<number | null>(null);

  // --- ANNOUNCEMENTS STATES ---
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    targetGroup: "all"
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isDeletingAnnId, setIsDeletingAnnId] = useState<number | null>(null);
  const [reactingAnnId, setReactingAnnId] = useState<number | null>(null);

  // --- UI CONFIRMATION MODAL STATE ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => { }
  });

  const requestConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      description,
      onConfirm
    });
  };

  // --- REGISTRATION STATES ---
  const [isRegistered, setIsRegistered] = useState(false);
  const [userDashboardId, setUserDashboardId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/events/${eventId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || "Eventrix Event",
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Failed to copy share link:", err);
    }
  };

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
      const token = localStorage.getItem("accessToken");
      if (!token) {
        const returnUrl = `/events/${eventId}`;
        localStorage.setItem("returnUrl", returnUrl);
        router.push("/login");
        return;
      }

      try {
        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;

        const currentBanner = rawEvent.banner_url || rawEvent.bannerUrl || rawEvent.banner || "";
        const rCount = rawEvent._count?.registrations || rawEvent.registeredCount || 0;
        setRegisteredCount(rCount);

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
          timelines: rawEvent.timelines || [],
          registeredCount: rCount,
          is_saved: rawEvent.user_context?.is_saved || false
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

        // Also fetch event announcements for public/participant view
        api.get(`/events/${eventId}/announcements`)
          .then(res => setAnnouncementsList(res.data.data || []))
          .catch(err => console.error("Failed to load initial announcements", err));

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
          const [overviewRes, participantsRes, tasksRes] = await Promise.all([
            api.get(`/events/${eventId}/manage/overview`).catch(() => null),
            api.get(`/events/${eventId}/manage/participants`).catch(() => null),
            api.get(`/events/${eventId}/tasks`).catch(() => null)
          ]);
          if (overviewRes?.data) setOverviewStats(overviewRes.data.data || overviewRes.data);
          if (participantsRes?.data) setParticipants(participantsRes.data.data || participantsRes.data || []);
          if (tasksRes?.data) setTasksList(tasksRes.data.data || []);
        } else if (activeTab === "PARTICIPANTS" && hasPermission("MANAGE_ATTENDEES")) {
          const res = await api.get(`/events/${eventId}/manage/participants`);
          setParticipants(res.data.data || res.data || []);
        } else if (activeTab === "STAFF" && hasPermission("MANAGE_STAFF")) {
          const [rolesRes, staffRes] = await Promise.all([
            api.get(`/events/${eventId}/staff/roles`),
            api.get(`/events/${eventId}/staff/members`).catch(() => ({ data: { data: {} } }))
          ]);
          setRoles(rolesRes.data.data || rolesRes.data || []);
          const staffData = staffRes.data.data || {};
          setStaffList(staffData.staff || []);
          setPendingInvites(staffData.pendingInvites || []);
          if (staffData.creator) setCreatorUser(staffData.creator);
        } else if (activeTab === "ORGANIZER_SETTINGS" && isOwner && event?.organizerId) {
          const res = await api.get(`/organizers/${event.organizerId}/config`);
          setOrganizerConfig(res.data.data || res.data);
        } else if (activeTab === "AGENDA") {
          const res = await api.get(`/events/${eventId}/timelines`);
          setTimelinesList(res.data.data || res.data || []);
        } else if (activeTab === "TASKS") {
          const [tasksRes, staffRes] = await Promise.all([
            api.get(`/events/${eventId}/tasks`).catch(() => ({ data: { data: [] } })),
            staffList.length === 0 ? api.get(`/events/${eventId}/staff/members`).catch(() => ({ data: { data: {} } })) : null
          ]);
          setTasksList(tasksRes.data.data || []);
          if (staffRes?.data?.data?.staff) {
            setStaffList(staffRes.data.data.staff);
          }
        } else if (activeTab === "ANNOUNCEMENTS") {
          const res = await api.get(`/events/${eventId}/announcements`).catch(() => ({ data: { data: [] } }));
          setAnnouncementsList(res.data.data || []);
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
      showSuccess("Event updated successfully!");

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
    const normalizedInput = deleteConfirmText.trim().toLowerCase();
    const normalizedTitle = event.title.trim().toLowerCase();

    if (normalizedInput !== normalizedTitle) {
      showError(`Please type "${event.title.trim()}" to confirm deletion.`);
      return;
    }
    try {
      setIsDeleting(true);
      await eventService.deleteEvent(eventId);
      showSuccess("Event deleted successfully!");
      setShowDeleteModal(false);
      router.push("/home");
    } catch (err: any) {
      console.error("Delete event error:", err);
      showError(err.response?.data?.error || "Failed to delete the event.");
    } finally {
      setIsDeleting(false);
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
      showSuccess("Settings saved successfully!");
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
      showSuccess(`Successfully upgraded to ${newPlan} plan!`);
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
      setAlreadyCheckedInModal(null);
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
      const errMsg = err.response?.data?.error || "Failed to check in participant.";
      const isAlready = Boolean(
        err.response?.data?.isAlreadyCheckedIn ||
        errMsg.toLowerCase().includes("already checked in")
      );
      if (isAlready) {
        setWelcomeAttendee(null);
        setAlreadyCheckedInModal({
          message: errMsg,
          name: err.response?.data?.participantName || participant.name || participant.user?.name,
          time: err.response?.data?.checkedInAt
        });
        setTimeout(() => {
          setAlreadyCheckedInModal(null);
        }, 4500);
      } else {
        alert(errMsg);
      }
    } finally {
      setIsPerformingCheckIn(null);
    }
  };

  const handleQuickCodeCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = quickTicketCode.trim().toUpperCase();
    if (!code) return;
    setIsQuickCheckingIn(true);
    setQuickCheckInMessage(null);
    try {
      const res = await api.post(`/events/${eventId}/manage/check-in`, { ticketCode: code });
      const attendeeName = res.data.data?.user?.name || "Participant";
      setQuickCheckInMessage({ type: "success", text: `Check-in verified for ${attendeeName} (${code})!` });
      setQuickTicketCode("");
      setParticipants(prev =>
        prev.map(p =>
          p.ticketCode === code ? { ...p, checkedIn: true, checkedInAt: new Date().toISOString() } : p
        )
      );
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Invalid ticket code or check-in failed.";
      setQuickCheckInMessage({ type: "error", text: errMsg });
    } finally {
      setIsQuickCheckingIn(false);
    }
  };

  const exportParticipantsCsv = () => {
    if (!participants || participants.length === 0) {
      alert("No attendee records found to export.");
      return;
    }
    const headers = ["Name", "Email", "Ticket Code", "Checked In", "Checked In At"];
    const rows = participants.map((p: any) => [
      `"${(p.name || p.user?.name || "").replace(/"/g, '""')}"`,
      `"${(p.email || p.user?.email || "").replace(/"/g, '""')}"`,
      `"${(p.ticketCode || "").replace(/"/g, '""')}"`,
      p.checkedIn ? "Yes" : "No",
      p.checkedInAt ? new Date(p.checkedInAt).toISOString() : ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendees_${event?.title?.slice(0, 20) || "event"}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      setAlreadyCheckedInModal(null);
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
      const errMsg = err.response?.data?.error || "Invalid ticket code or check-in failed.";
      const isAlready = Boolean(
        err.response?.data?.isAlreadyCheckedIn ||
        errMsg.toLowerCase().includes("already checked in")
      );

      setIsQrScanning(false);
      setScanResult(null);

      if (isAlready) {
        setWelcomeAttendee(null);
        setAlreadyCheckedInModal({
          message: errMsg,
          name: err.response?.data?.participantName,
          time: err.response?.data?.checkedInAt
        });

        setTimeout(() => {
          setAlreadyCheckedInModal(null);
          setIsQrScanning(true);
        }, 4500);
      } else {
        setScanResult({
          success: false,
          message: errMsg
        });
        alert(errMsg);
        setTimeout(() => {
          setIsQrScanning(true);
        }, 1500);
      }
    }
  };

  const stopVideoTracks = () => {
    try {
      const videoElements = document.querySelectorAll("#qr-scanner-element video");
      videoElements.forEach((videoEl: any) => {
        videoEl.onabort = null;
        videoEl.onerror = null;
        if (videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) { }
          });
          videoEl.srcObject = null;
        }
      });
    } catch (e) { }
  };

  const handleCloseScanner = () => {
    setIsQrScanning(false);
    setIsCameraStarting(false);
    stopVideoTracks();
  };

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    let isCancelled = false;

    if (isQrScanning) {
      setIsCameraStarting(true);
      const timer = setTimeout(async () => {
        const scannerElement = document.getElementById("qr-scanner-element");
        if (!scannerElement || isCancelled) return;

        try {
          html5Qrcode = new Html5Qrcode("qr-scanner-element");
          if (isCancelled) {
            try {
              html5Qrcode.clear();
            } catch (e) { }
            return;
          }

          await html5Qrcode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: { width: 250, height: 250 }
            },
            async (qrCodeMessage) => {
              isCancelled = true;
              stopVideoTracks();
              if (html5Qrcode && html5Qrcode.isScanning) {
                await html5Qrcode.stop().catch(() => { });
                try {
                  html5Qrcode.clear();
                } catch (e) { }
              }
              handleCloseScanner();
              handleQrCheckIn(qrCodeMessage);
            },
            () => { }
          );

          // Once started, format video and hide loader smoothly when video actually paints
          const videoEl = document.querySelector("#qr-scanner-element video") as HTMLVideoElement | null;
          if (videoEl) {
            videoEl.style.width = "100%";
            videoEl.style.height = "100%";
            videoEl.style.objectFit = "cover";
            videoEl.style.borderRadius = "1rem";

            videoEl.onabort = (e: any) => {
              if (e && typeof e.preventDefault === "function") e.preventDefault();
              if (e && typeof e.stopPropagation === "function") e.stopPropagation();
            };
            videoEl.onerror = (e: any) => {
              if (e && typeof e.preventDefault === "function") e.preventDefault();
              if (e && typeof e.stopPropagation === "function") e.stopPropagation();
            };

            if (videoEl.readyState >= 2) {
              setIsCameraStarting(false);
            } else {
              videoEl.onloadeddata = () => setIsCameraStarting(false);
              videoEl.onplaying = () => setIsCameraStarting(false);
              setTimeout(() => setIsCameraStarting(false), 600);
            }
          } else {
            setIsCameraStarting(false);
          }

          if (isCancelled && html5Qrcode) {
            stopVideoTracks();
            if (html5Qrcode.isScanning) {
              await html5Qrcode.stop().catch(() => { });
            }
            try {
              html5Qrcode.clear();
            } catch (e) { }
          }
        } catch (err: any) {
          console.error("Failed to start QR scanner:", err);
          setIsCameraStarting(false);
          if (!isCancelled) {
            alert("Could not open camera. Please check camera permissions.");
            handleCloseScanner();
          }
        }
      }, 150);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stopVideoTracks();
        setIsCameraStarting(false);
        if (html5Qrcode) {
          if (html5Qrcode.isScanning) {
            html5Qrcode.stop().then(() => {
              try {
                html5Qrcode?.clear();
              } catch (e) { }
            }).catch(() => { });
          } else {
            try {
              html5Qrcode.clear();
            } catch (e) { }
          }
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQrScanning]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRoleId) return showError("Select a role and enter an email.");
    try {
      setIsInviting(true);
      await api.post(`/events/${eventId}/staff/invite`, {
        email: inviteEmail,
        roleId: Number(inviteRoleId)
      });
      showSuccess("Staff invitation sent successfully!");
      setInviteEmail("");

      // Refresh staff and pending invites
      const staffRes = await api.get(`/events/${eventId}/staff/members`).catch(() => null);
      if (staffRes?.data?.data) {
        setStaffList(staffRes.data.data.staff || []);
        setPendingInvites(staffRes.data.data.pendingInvites || []);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to invite staff.");
    } finally {
      setIsInviting(false);
    }
  };

  const ALL_PERMISSIONS_LIST = [
    { key: "MANAGE_EVENT", label: "Manage Event", desc: "Edit title, dates, settings, & basic info" },
    { key: "MANAGE_STAFF", label: "Manage Staff", desc: "Invite/remove staff members & adjust roles" },
    { key: "VIEW_DASHBOARD", label: "View Dashboard", desc: "Access the backend organizer dashboard" },
    { key: "MANAGE_ATTENDEES", label: "Manage Attendees", desc: "Accept, reject, & view attendee registrations" },
    { key: "MANAGE_FORMS", label: "Manage Forms", desc: "Create & edit custom registration forms" },
    { key: "MANAGE_TICKETS", label: "Manage Tickets", desc: "Manage ticket tiers & pricing" },
    { key: "MANAGE_CHECK_IN", label: "Check-in Gatekeeper", desc: "Perform attendee ticket scanning & check-in" },
    { key: "MANAGE_AGENDA", label: "Manage Agenda", desc: "Create & edit event timelines & tracks" },
    { key: "MANAGE_SPEAKERS", label: "Manage Speakers", desc: "Manage event speakers & schedule" },
    { key: "SCORE_SUBMISSIONS", label: "Grade Submissions", desc: "Evaluate hackathon project submissions" },
    { key: "MANAGE_COMMUNICATIONS", label: "Announcements", desc: "Send event announcements & notifications" },
  ];

  const handleOpenEditStaffModal = (st: any) => {
    setEditingMember(st);
    const roleIdStr = String(st.role_id || st.role?.id || "");
    setEditMemberRoleId(roleIdStr);

    const userOverrides: string[] | null = st.permissions_override;
    const activePerms = Array.isArray(userOverrides)
      ? userOverrides
      : ((st.role?.permissions as string[]) || []);
    setEditMemberOverrides(activePerms);
  };

  const handleRoleSelectChange = (newRoleId: string) => {
    setEditMemberRoleId(newRoleId);
    const selectedRole = roles.find((r) => String(r.id) === newRoleId);
    if (selectedRole?.permissions) {
      setEditMemberOverrides([...selectedRole.permissions]);
    }
  };

  const handleTogglePermissionOverride = (permKey: string) => {
    setEditMemberOverrides(prev =>
      prev.includes(permKey)
        ? prev.filter(k => k !== permKey)
        : [...prev, permKey]
    );
  };

  const handleSelectAllPermissions = () => {
    setEditMemberOverrides(ALL_PERMISSIONS_LIST.map(p => p.key));
  };

  const handleClearAllPermissions = () => {
    setEditMemberOverrides([]);
  };

  const handleSaveStaffPermissions = async () => {
    if (!editingMember) return;
    try {
      setIsUpdatingStaff(true);
      await api.patch(`/events/${eventId}/staff/members/${editingMember.user.id}`, {
        roleId: editMemberRoleId ? Number(editMemberRoleId) : undefined,
        permissionsOverride: editMemberOverrides
      });
      showSuccess("Staff member role and permissions updated!");
      setEditingMember(null);

      const staffRes = await api.get(`/events/${eventId}/staff/members`).catch(() => null);
      if (staffRes?.data?.data) {
        setStaffList(staffRes.data.data.staff || []);
        setPendingInvites(staffRes.data.data.pendingInvites || []);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to update staff permissions.");
    } finally {
      setIsUpdatingStaff(false);
    }
  };

  const handleRemoveStaffMember = async (userId: number, userName: string) => {
    requestConfirm("Remove Staff Member", `Are you sure you want to remove ${userName} from event staff?`, async () => {
      try {
        setIsRemovingStaffId(userId);
        await api.delete(`/events/${eventId}/staff/members/${userId}`);
        showSuccess("Staff member removed successfully.");

        const staffRes = await api.get(`/events/${eventId}/staff/members`).catch(() => null);
        if (staffRes?.data?.data) {
          setStaffList(staffRes.data.data.staff || []);
          setPendingInvites(staffRes.data.data.pendingInvites || []);
        }
      } catch (err: any) {
        showError(err.response?.data?.error || "Failed to remove staff member.");
      } finally {
        setIsRemovingStaffId(null);
      }
    });
  };

  const handleCancelStaffInvite = async (inviteId: number) => {
    requestConfirm("Cancel Invitation", "Are you sure you want to cancel this invitation?", async () => {
      try {
        setIsCancellingInviteId(inviteId);
        await api.delete(`/events/${eventId}/staff/invites/${inviteId}`);
        showSuccess("Invitation cancelled.");

        const staffRes = await api.get(`/events/${eventId}/staff/members`).catch(() => null);
        if (staffRes?.data?.data) {
          setStaffList(staffRes.data.data.staff || []);
          setPendingInvites(staffRes.data.data.pendingInvites || []);
        }
      } catch (err: any) {
        showError(err.response?.data?.error || "Failed to cancel invitation.");
      } finally {
        setIsCancellingInviteId(null);
      }
    });
  };

  // --- TASK HANDLERS ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedToId) {
      showError("Please enter a title and select a staff member to assign.");
      return;
    }
    try {
      setIsCreatingTask(true);
      await api.post(`/events/${eventId}/tasks`, {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assignedToId: Number(taskForm.assignedToId),
        dueDate: taskForm.dueDate || undefined
      });
      showSuccess("Task created and assigned successfully!");
      setTaskForm({ title: "", description: "", priority: "medium", assignedToId: "", dueDate: "" });
      setIsTaskModalOpen(false);

      const tasksRes = await api.get(`/events/${eventId}/tasks`).catch(() => null);
      if (tasksRes?.data?.data) {
        setTasksList(tasksRes.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to create task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleToggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      setIsUpdatingTaskId(task.id);
      await api.patch(`/events/${eventId}/tasks/${task.id}/status`, { status: newStatus });
      setTasksList(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } : t));
      showSuccess(`Task marked as ${newStatus}!`);
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to update task status.");
    } finally {
      setIsUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    requestConfirm("Delete Task", "Are you sure you want to delete this task?", async () => {
      try {
        setIsDeletingTaskId(taskId);
        await api.delete(`/events/${eventId}/tasks/${taskId}`);
        setTasksList(prev => prev.filter(t => t.id !== taskId));
        showSuccess("Task deleted.");
      } catch (err: any) {
        showError(err.response?.data?.error || "Failed to delete task.");
      } finally {
        setIsDeletingTaskId(null);
      }
    });
  };

  // --- ANNOUNCEMENT HANDLERS ---
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.message) {
      showError("Please enter an announcement message.");
      return;
    }
    try {
      setIsBroadcasting(true);
      await api.post(`/events/${eventId}/announcements`, {
        title: announcementForm.title || undefined,
        message: announcementForm.message,
        targetGroup: announcementForm.targetGroup
      });
      showSuccess("Announcement broadcasted successfully to all target participants & staff!");
      setAnnouncementForm({ title: "", message: "", targetGroup: "all" });

      const annRes = await api.get(`/events/${eventId}/announcements`).catch(() => null);
      if (annRes?.data?.data) {
        setAnnouncementsList(annRes.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to broadcast announcement.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleToggleEmojiReaction = async (announcementId: number, emoji: string) => {
    try {
      setReactingAnnId(announcementId);
      const res = await api.post(`/events/${eventId}/announcements/${announcementId}/react`, { emoji });
      if (res.data?.data) {
        setAnnouncementsList(res.data.data);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || "Failed to update reaction.");
    } finally {
      setReactingAnnId(null);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: number) => {
    requestConfirm("Delete Announcement", "Are you sure you want to delete this announcement?", async () => {
      try {
        setIsDeletingAnnId(announcementId);
        await api.delete(`/events/${eventId}/announcements/${announcementId}`);
        setAnnouncementsList(prev => prev.filter(a => a.id !== announcementId));
        showSuccess("Announcement deleted.");
      } catch (err: any) {
        showError(err.response?.data?.error || "Failed to delete announcement.");
      } finally {
        setIsDeletingAnnId(null);
      }
    });
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
      tags: [],
      start_time: "",
      end_time: "",
      location: "",
      should_notify: true
    });
    setTagInput("");
    setAgendaError("");
    setIsAgendaModalOpen(true);
  };

  const handleOpenEditAgenda = (item: any) => {
    setEditingTimelineItem(item);
    setAgendaFormData({
      title: item.title || "",
      speaker_name: item.speaker_name || "",
      description: item.description || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      start_time: formatForDateTimeLocal(item.start_time),
      end_time: formatForDateTimeLocal(item.end_time),
      location: item.location || "",
      should_notify: item.should_notify ?? true
    });
    setTagInput("");
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
        tags: agendaFormData.tags || [],
        speaker_name: agendaFormData.speaker_name || null,
        description: agendaFormData.description || null,
        location: agendaFormData.location || null,
        start_time: agendaFormData.start_time ? new Date(agendaFormData.start_time).toISOString() : null,
        end_time: agendaFormData.end_time ? new Date(agendaFormData.end_time).toISOString() : null,
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
        showSuccess("Timeline item updated successfully!");
      } else {
        const res = await eventService.createTimeline(eventId, payload);
        const newItem = res.data?.data || res.data || res;
        const sortList = (list: any[]) => [...list].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setTimelinesList(prev => sortList([...prev, newItem]));
        setEvent(prev => {
          if (!prev) return null;
          return { ...prev, timelines: sortList([...(prev.timelines || []), newItem]) };
        });
        showSuccess("Timeline item created successfully!");
      }

      setIsAgendaModalOpen(false);
    } catch (err: any) {
      console.error(err);
      const backendError = err.response?.data?.error || err.message;
      if (Array.isArray(backendError)) {
        const errorMessages = backendError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(", ");
        setAgendaError(errorMessages);
      } else {
        setAgendaError(backendError || "Failed to save agenda item.");
      }
    } finally {
      setIsSavingAgenda(false);
    }
  };

  const handleDeleteAgenda = (timelineId: number) => {
    setAgendaToDeleteId(timelineId);
  };

  const handleConfirmDeleteAgenda = async () => {
    if (agendaToDeleteId === null) return;
    try {
      setIsDeletingAgenda(true);
      await eventService.deleteTimeline(eventId, agendaToDeleteId);
      setTimelinesList(prev => prev.filter(item => item.id !== agendaToDeleteId));
      setEvent(prev => {
        if (!prev) return null;
        return { ...prev, timelines: (prev.timelines || []).filter(item => item.id !== agendaToDeleteId) };
      });
      showSuccess("Timeline item deleted successfully!");
      setAgendaToDeleteId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to delete agenda item.");
    } finally {
      setIsDeletingAgenda(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center font-bold">Event not found.</div>;

  // ==========================================
  // VIEW 1: STAFF DASHBOARD
  // ==========================================
  if (isStaff && viewMode === "DASHBOARD") {
    const totalReg = overviewStats?.total_registrations || overviewStats?.totalRegistrations || participants.length || 0;
    const totalCap = event.capacity || 0;
    const capPct = totalCap > 0 ? Math.min(100, Math.round((totalReg / totalCap) * 100)) : 100;
    const checkedCount = overviewStats?.checked_in_count ?? overviewStats?.checkedInCount ?? participants.filter((p: any) => p.checkedIn || p.checked_in).length;
    const checkInPct = totalReg > 0 ? Math.round((checkedCount / totalReg) * 100) : 0;
    const revenueVal = overviewStats?.revenue ?? overviewStats?.totalRevenue ?? 0;
    const pendingTasksCount = overviewStats?.pending_tasks_count ?? overviewStats?.pendingTasksCount ?? tasksList.filter(t => t.status === "pending").length;

    const manageTabs = [
      { id: "OVERVIEW", label: "Overview", icon: LayoutDashboard, show: hasPermission("VIEW_DASHBOARD") || hasPermission("MANAGE_EVENT") || isOwner },
      { id: "PARTICIPANTS", label: "Attendees", icon: Users, badge: totalReg, show: hasPermission("MANAGE_ATTENDEES") || hasPermission("MANAGE_CHECK_IN") || isOwner },
      { id: "EDIT", label: "Edit Details", icon: Pencil, show: hasPermission("MANAGE_EVENT") || isOwner },
      { id: "AGENDA", label: "Event Agenda", icon: Calendar, badge: timelinesList.length, show: hasPermission("MANAGE_AGENDA") || hasPermission("MANAGE_CONTENT") || hasPermission("MANAGE_EVENT") || isOwner },
      { id: "STAFF", label: "Staff & Roles", icon: Shield, badge: staffList.length, show: hasPermission("MANAGE_STAFF") || isOwner },
      { id: "TASKS", label: "Event Tasks", icon: CheckSquare, badge: pendingTasksCount, show: hasPermission("VIEW_DASHBOARD") || hasPermission("MANAGE_STAFF") || isStaff || isOwner },
      { id: "ANNOUNCEMENTS", label: "Announcements", icon: Megaphone, badge: announcementsList.length, show: hasPermission("VIEW_DASHBOARD") || isStaff || isOwner || hasPermission("MANAGE_COMMUNICATIONS") },
      { id: "ACTIVITIES", label: "Activities & Quizzes", icon: Gamepad2, show: hasPermission("MANAGE_AGENDA") || hasPermission("MANAGE_CONTENT") || hasPermission("MANAGE_EVENT") || isStaff || isOwner },
      { id: "ORGANIZER_SETTINGS", label: "Org Settings", icon: Building2, show: isOwner && !!event?.organizerId },
      { id: "SETTINGS", label: "Event Settings", icon: Settings, show: isOwner },
    ];

    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
          {/* Top Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium" style={{ color: "var(--subtle)" }}>
            <Link href="/home" className="hover:underline flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Workspace
            </Link>
            <span>/</span>
            <span className="font-semibold line-clamp-1" style={{ color: "var(--text)" }}>{event.title}</span>
            <span>/</span>
            <span>Organizer Console</span>
          </div>

          {/* Organizer Hero Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 rounded-[24px] border shadow-xs" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              {/* Event Cover Image or Initials Avatar */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 border overflow-hidden shadow-md flex items-center justify-center font-black text-xl text-white relative"
                style={{
                  background: event.bannerUrl || bannerPreview
                    ? `url(${event.bannerUrl || bannerPreview}) center/cover no-repeat`
                    : "linear-gradient(135deg, var(--accent), var(--accent2))",
                  borderColor: "var(--border)"
                }}
              >
                {!event.bannerUrl && !bannerPreview && (
                  <span>{event.title.slice(0, 2).toUpperCase()}</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                    {event.title}
                  </h1>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0" style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)", color: "var(--accent)" }}>
                    <Shield className="w-3.5 h-3.5" />
                    {isOwner ? "Host Organizer" : "Staff Console"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium mt-1.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--muted)" }}>
                  <span>{formatFullDate(event.startDate)}</span>
                  <span>•</span>
                  <span>{event.location || "Online"}</span>
                  <span>•</span>
                  <span className="capitalize">{event.mode || "Hybrid"}</span>
                  <span>•</span>
                  <span>{totalReg} registered</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <Button
                onClick={() => setViewMode("PREVIEW")}
                variant="outline"
                className="rounded-xl text-xs sm:text-sm font-bold px-4 py-2.5 flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02]"
                style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                <Eye className="w-4 h-4" /> Public page
              </Button>
              {(hasPermission("MANAGE_ATTENDEES") || hasPermission("MANAGE_CHECK_IN") || isOwner) && (
                <Button
                  onClick={() => {
                    setScanResult(null);
                    setIsQrScanning(true);
                  }}
                  className="rounded-xl text-xs sm:text-sm font-bold px-4 py-2.5 text-white shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  <QrCode className="w-4 h-4" /> Scan ticket
                </Button>
              )}
            </div>
          </div>

          {/* Horizontal Manage Tabs Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar border-b pb-1" style={{ borderColor: "var(--border)" }}>
            {manageTabs.filter(t => t.show).map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 relative shrink-0"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--muted)",
                    background: isActive ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "transparent",
                    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                  {typeof t.badge === "number" && t.badge > 0 && (
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isActive ? "var(--accent)" : "var(--card2)",
                        color: isActive ? "#fff" : "var(--muted)"
                      }}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Display Area */}
          <div className="w-full min-w-0">
            {isFetchingTab ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <>
                {/* 1. OVERVIEW TAB */}
                {activeTab === "OVERVIEW" && (() => {
                  // Real 7-day registration velocity calculation
                  const now = new Date();
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const velocityDays = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (6 - i));
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateKey = `${year}-${month}-${day}`;

                    const count = (participants || []).filter((p: any) => {
                      const pDateStr = p.registeredAt || p.created_at || p.createdAt;
                      if (!pDateStr) return false;
                      return new Date(pDateStr).toISOString().slice(0, 10) === dateKey;
                    }).length;

                    return {
                      day: dayNames[d.getDay()],
                      dateStr: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      count,
                      isToday: i === 6
                    };
                  });

                  const registeredToday = velocityDays[6]?.count || 0;
                  const maxVelocity = Math.max(...velocityDays.map(v => v.count), 1);
                  const totalWeekReg = velocityDays.reduce((sum, v) => sum + v.count, 0);

                  return (
                    <div className="animate-in fade-in duration-300 space-y-6">
                      {/* 4 STATS CARDS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Registrations */}
                        <div className="p-5 rounded-[20px] border shadow-xs transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono font-bold uppercase" style={{ color: "var(--muted)" }}>Total Registrations</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)" }}>
                              <Users className="w-4 h-4" style={{ color: "var(--accent)" }} />
                            </div>
                          </div>
                          <p className="text-3xl font-black tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                            {totalReg.toLocaleString("en-IN")}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--subtle)" }}>
                            <span>{totalCap ? `${capPct}% of ${totalCap} cap` : "Unlimited capacity"}</span>
                            <span className="font-semibold" style={{ color: "var(--accent)" }}>{capPct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--card2)" }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, capPct)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
                          </div>
                        </div>

                        {/* Gate Check-Ins */}
                        <div className="p-5 rounded-[20px] border shadow-xs transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono font-bold uppercase" style={{ color: "var(--muted)" }}>Gate Check-Ins</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                          </div>
                          <p className="text-3xl font-black tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                            {checkedCount.toLocaleString("en-IN")}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--subtle)" }}>
                            <span>{checkInPct}% verified at gate</span>
                            <span className="font-semibold text-emerald-500">{checkInPct}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--card2)" }}>
                            <div className="h-full rounded-full transition-all duration-500 bg-emerald-500" style={{ width: `${Math.min(100, checkInPct)}%` }} />
                          </div>
                        </div>

                        {/* Ticket Revenue */}
                        <div className="p-5 rounded-[20px] border shadow-xs transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono font-bold uppercase" style={{ color: "var(--muted)" }}>Ticket Revenue</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/10">
                              <Ticket className="w-4 h-4 text-amber-500" />
                            </div>
                          </div>
                          <p className="text-3xl font-black tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                            {revenueVal ? `₹${revenueVal.toLocaleString("en-IN")}` : "Free"}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--subtle)" }}>
                            <span>{revenueVal ? "via Payments" : "Free admission"}</span>
                            <span className="font-semibold" style={{ color: "var(--accent)" }}>{revenueVal ? "Active" : "Standard"}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--card2)" }}>
                            <div className="h-full rounded-full bg-amber-500" style={{ width: revenueVal ? "100%" : "0%" }} />
                          </div>
                        </div>

                        {/* Pending Tasks */}
                        <div className="p-5 rounded-[20px] border shadow-xs transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono font-bold uppercase" style={{ color: "var(--muted)" }}>Pending Tasks</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/10">
                              <CheckSquare className="w-4 h-4 text-cyan-500" />
                            </div>
                          </div>
                          <p className="text-3xl font-black tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                            {pendingTasksCount.toLocaleString("en-IN")}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--subtle)" }}>
                            <span>{pendingTasksCount === 1 ? "1 task pending" : `${pendingTasksCount} tasks pending`}</span>
                            <span className="font-semibold text-cyan-500">{tasksList.length > 0 ? `${tasksList.length - pendingTasksCount}/${tasksList.length} done` : "Open"}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: "var(--card2)" }}>
                            <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: tasksList.length > 0 ? `${Math.round(((tasksList.length - pendingTasksCount) / tasksList.length) * 100)}%` : "0%" }} />
                          </div>
                        </div>
                      </div>

                      {/* 2 COLUMNS: REGISTRATION VELOCITY & QUICK ACTIONS */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Authentic 7-Day Registration Velocity */}
                        <div className="p-6 rounded-[22px] border shadow-xs flex flex-col justify-between" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                          <div>
                            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
                              <div>
                                <h3 className="font-extrabold text-base tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                                  Registrations · last 7 days
                                </h3>
                                <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                                  Verified sign-ups calculated from live attendee registrations
                                </p>
                              </div>
                              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${registeredToday > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : ""}`} style={registeredToday === 0 ? { background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" } : {}}>
                                +{registeredToday} today
                              </span>
                            </div>

                            {/* Velocity Bars */}
                            <div className="mt-6 flex items-end justify-between gap-2.5 h-44 pt-6 pb-2 px-3 rounded-xl border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                              {velocityDays.map((v) => {
                                const isPeak = v.count > 0 && v.count === maxVelocity;
                                const barH = v.count === 0 ? 8 : Math.max(16, Math.round((v.count / maxVelocity) * 100));

                                return (
                                  <div key={v.day + v.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                                    {/* Hover Tooltip */}
                                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-2 py-0.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap shadow-md z-10" style={{ background: "var(--text)", color: "var(--bg)" }}>
                                      {v.count} signup{v.count === 1 ? "" : "s"} on {v.dateStr}
                                    </div>

                                    <div
                                      className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110"
                                      style={{
                                        height: `${barH}%`,
                                        background: isPeak
                                          ? "linear-gradient(180deg, var(--accent), var(--accent2))"
                                          : v.count > 0
                                            ? "color-mix(in oklab, var(--accent) 55%, transparent)"
                                            : "var(--border)",
                                        boxShadow: isPeak ? "0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent)" : "none"
                                      }}
                                    />
                                    <span className="text-[10px] font-mono font-bold uppercase" style={{ color: isPeak ? "var(--accent)" : v.isToday ? "var(--text)" : "var(--subtle)" }}>
                                      {v.day}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-4 mt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                            <span>Peak velocity: <strong style={{ color: "var(--text)" }}>{maxVelocity > 1 || velocityDays.some(d => d.count > 0) ? `${maxVelocity} signups/day` : "0 signups/day"}</strong></span>
                            <span>Total this week: <strong style={{ color: "var(--accent)" }}>{totalWeekReg} sign-ups</strong></span>
                          </div>
                        </div>

                        {/* Right: Quick Actions */}
                        <div className="p-6 rounded-[22px] border shadow-xs flex flex-col justify-between" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                          <div>
                            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
                              <div>
                                <h3 className="font-extrabold text-base tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                                  Quick Actions
                                </h3>
                                <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                                  Shortcuts to core event operations and management desks
                                </p>
                              </div>
                              <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-full border" style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}>
                                Fast Access
                              </span>
                            </div>

                            <div className="flex flex-col gap-2.5 mt-5">
                              {[
                                { label: "Attendee Check-in Desk", tab: "PARTICIPANTS", icon: Users, color: "var(--accent)", desc: "View attendee list and scan gate passes" },
                                { label: "Add Session to Agenda", tab: "AGENDA", icon: Calendar, color: "#10b981", desc: "Design event timeline and session schedule" },
                                { label: "Broadcast Announcement", tab: "ANNOUNCEMENTS", icon: Megaphone, color: "#06b6d4", desc: "Send immediate push notifications to participants" },
                                { label: "Staff Team & Roles", tab: "STAFF", icon: Shield, color: "#8b5cf6", desc: "Assign permissions and invite crew members" },
                                { label: "Live Quizzes & Activities", tab: "ACTIVITIES", icon: Gamepad2, color: "#f59e0b", desc: "Host interactive arena and gamified sessions" },
                              ].map((q) => {
                                const QIcon = q.icon;
                                return (
                                  <button
                                    key={q.tab}
                                    onClick={() => setActiveTab(q.tab as any)}
                                    className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:scale-[1.01]"
                                    style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                                  >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--input)" }}>
                                      <QIcon className="w-4 h-4" style={{ color: q.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>{q.label}</p>
                                      <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{q.desc}</p>
                                    </div>
                                    <span className="text-xs font-bold" style={{ color: "var(--subtle)" }}>→</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Check-in Desk Card */}
                      <div className="p-6 rounded-[22px] border shadow-xs" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)" }}>
                              <QrCode className="w-5 h-5" style={{ color: "var(--accent)" }} />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base tracking-tight" style={{ color: "var(--text)" }}>Check-in Desk & Gate Verification</h3>
                              <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>Instant ticket lookup & QR camera verification</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border self-start sm:self-auto" style={{ background: "color-mix(in oklab, var(--accent) 10%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 25%, transparent)", color: "var(--accent)" }}>
                            Gate Active
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-5 p-4 rounded-xl border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                          <div className="flex items-center justify-between text-xs font-bold mb-2">
                            <span style={{ color: "var(--muted)" }}>Attendance Progress</span>
                            <span style={{ color: "var(--text)" }}>{checkedCount} / {totalReg} checked in ({checkInPct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, checkInPct)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent2))" }} />
                          </div>
                        </div>

                        {/* Fast ticket input form */}
                        <form onSubmit={handleQuickCodeCheckIn} className="mt-5 space-y-3">
                          <label className="text-xs font-mono font-bold uppercase block" style={{ color: "var(--muted)" }}>
                            Fast Ticket Lookup
                          </label>
                          <div className="flex gap-2">
                            <Input
                              value={quickTicketCode}
                              onChange={(e) => setQuickTicketCode(e.target.value)}
                              placeholder="e.g. TCK-8F29A or attendee code..."
                              className="font-mono text-xs rounded-xl py-5"
                              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                            />
                            <Button
                              type="submit"
                              disabled={isQuickCheckingIn || !quickTicketCode.trim()}
                              className="rounded-xl font-bold px-5 text-white shrink-0 shadow-xs"
                              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                            >
                              {isQuickCheckingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check In"}
                            </Button>
                          </div>
                          {quickCheckInMessage && (
                            <p className={`text-xs font-semibold mt-2 ${quickCheckInMessage.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
                              {quickCheckInMessage.text}
                            </p>
                          )}
                        </form>

                        <div className="pt-5 mt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                          <Button
                            onClick={() => {
                              setScanResult(null);
                              setIsQrScanning(true);
                            }}
                            variant="outline"
                            className="w-full sm:w-auto rounded-xl text-xs font-bold py-5 flex items-center justify-center gap-2"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            <QrCode className="w-4 h-4" /> Camera Scan
                          </Button>
                          <button
                            onClick={() => setActiveTab("PARTICIPANTS")}
                            className="text-xs font-bold hover:underline py-2"
                            style={{ color: "var(--accent)" }}
                          >
                            Manage full attendee list ({participants.length}) →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. PARTICIPANTS TAB */}
                {activeTab === "PARTICIPANTS" && hasPermission("MANAGE_ATTENDEES") && (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    {/* Header & Actions */}
                    <div className="p-6 md:p-8 rounded-[24px] border shadow-xs" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--border)" }}>
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>
                            Attendees & Gate Check-In
                          </h1>
                          <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: "var(--muted)" }}>
                            Manage registered participants, verify ticket codes, and record attendance.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            onClick={exportParticipantsCsv}
                            variant="outline"
                            className="rounded-xl text-xs font-bold px-4 py-2.5 flex items-center gap-2"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            <Download className="w-4 h-4" /> Export CSV
                          </Button>
                          <Button
                            onClick={() => {
                              setScanResult(null);
                              setIsQrScanning(true);
                            }}
                            className="rounded-xl text-xs font-bold text-white px-5 py-2.5 shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
                            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                          >
                            <QrCode className="w-4 h-4" /> Scan ticket
                          </Button>
                        </div>
                      </div>

                      {/* Search & Status Filters */}
                      <div className="flex flex-col md:flex-row gap-3 items-center mt-6">
                        <div className="relative w-full flex-1">
                          <Input
                            placeholder="Search attendee by name, email, or ticket code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="py-5 pl-10 rounded-xl text-xs font-medium"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--subtle)" }}>🔍</span>
                        </div>
                        <div className="flex p-1 rounded-xl w-full md:w-auto shrink-0 border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                          {(["ALL", "PRESENT", "ABSENT"] as const).map((filter) => {
                            const count = filter === "ALL"
                              ? participants.length
                              : filter === "PRESENT"
                                ? checkedCount
                                : Math.max(0, participants.length - checkedCount);

                            return (
                              <button
                                key={filter}
                                onClick={() => setCheckInFilter(filter)}
                                type="button"
                                className="flex-1 md:flex-none px-3.5 py-1.5 text-xs font-bold uppercase rounded-lg transition-all"
                                style={{
                                  background: checkInFilter === filter ? "var(--card)" : "transparent",
                                  color: checkInFilter === filter ? "var(--text)" : "var(--muted)",
                                  boxShadow: checkInFilter === filter ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                                }}
                              >
                                {filter} ({count})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fast Manual Check-In Bar */}
                      <form onSubmit={handleQuickCodeCheckIn} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3.5 rounded-2xl border border-dashed mt-4" style={{ background: "var(--input)", borderColor: "var(--border)" }}>
                        <span className="text-xs font-mono font-bold uppercase whitespace-nowrap" style={{ color: "var(--muted)" }}>
                          Manual Check-in:
                        </span>
                        <Input
                          value={quickTicketCode}
                          onChange={(e) => setQuickTicketCode(e.target.value)}
                          placeholder="Enter ticket code, e.g. TCK-8F29A..."
                          className="font-mono text-xs rounded-xl flex-1 h-9"
                          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                        <Button
                          type="submit"
                          disabled={isQuickCheckingIn || !quickTicketCode.trim()}
                          className="rounded-xl font-bold px-4 h-9 text-xs text-white shrink-0 shadow-xs"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                        >
                          {isQuickCheckingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Check in"}
                        </Button>
                      </form>
                      {quickCheckInMessage && (
                        <p className={`text-xs font-semibold mt-2 ${quickCheckInMessage.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
                          {quickCheckInMessage.text}
                        </p>
                      )}

                      {/* Attendees Table */}
                      <div className="mt-6 rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-[minmax(0,2fr)_minmax(140px,1.2fr)_120px_90px_110px] gap-4 px-5 py-3 border-b text-[11px] font-mono font-bold uppercase tracking-wider" style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--subtle)" }}>
                          <span>Attendee</span>
                          <span>Ticket Code</span>
                          <span>Status</span>
                          <span>Registered</span>
                          <span className="text-right">Action</span>
                        </div>

                        {/* Table Rows */}
                        {participants.length === 0 ? (
                          <p className="font-medium py-12 text-center text-sm" style={{ color: "var(--muted)" }}>No participants registered yet.</p>
                        ) : (
                          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
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
                                  return matchesSearch && !!(p.checkedIn || p.checked_in);
                                }
                                if (checkInFilter === "ABSENT") {
                                  return matchesSearch && !(p.checkedIn || p.checked_in);
                                }
                                return matchesSearch;
                              })
                              .map((p, i) => {
                                const isPresent = !!(p.checkedIn || p.checked_in);
                                const isChecking = isPerformingCheckIn === p.registrationId;
                                const displayName = p.name || p.user?.name || "Participant";
                                const displayEmail = p.email || p.user?.email || "";
                                const displayTicket = p.ticketCode || "N/A";
                                const regDate = p.registeredAt || p.created_at || p.createdAt;

                                return (
                                  <div
                                    key={p.registrationId || i}
                                    className="flex flex-col md:grid md:grid-cols-[minmax(0,2fr)_minmax(140px,1.2fr)_120px_90px_110px] gap-3 md:gap-4 items-start md:items-center px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                                    style={{ borderColor: "var(--border)" }}
                                  >
                                    {/* Attendee Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                                        {displayName.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{displayName}</p>
                                        <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{displayEmail}</p>
                                      </div>
                                    </div>

                                    {/* Ticket Code */}
                                    <div className="min-w-0 w-full flex items-center overflow-hidden">
                                      <code
                                        className="font-mono text-xs px-2.5 py-1 rounded-md border truncate max-w-full inline-block select-all cursor-pointer hover:border-[var(--accent)] transition-colors"
                                        style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                                        title={`Ticket Code: ${displayTicket} (click to copy)`}
                                        onClick={() => {
                                          if (displayTicket && displayTicket !== "N/A") {
                                            navigator.clipboard?.writeText(displayTicket);
                                            showSuccess("Ticket code copied!");
                                          }
                                        }}
                                      >
                                        {displayTicket}
                                      </code>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="min-w-0 shrink-0">
                                      {isPresent ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25">
                                          <Clock className="w-3.5 h-3.5" /> Pending
                                        </span>
                                      )}
                                    </div>

                                    {/* Registered Date */}
                                    <div className="text-xs font-mono" style={{ color: "var(--subtle)" }}>
                                      {regDate ? new Date(regDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                    </div>

                                    {/* Action Button */}
                                    <div className="md:text-right w-full md:w-auto">
                                      {isPresent ? (
                                        <span className="text-xs font-semibold text-emerald-500 flex items-center md:justify-end gap-1">
                                          <Check className="w-3.5 h-3.5" /> Verified
                                        </span>
                                      ) : (
                                        <Button
                                          onClick={() => handleManualCheckIn(p)}
                                          disabled={isChecking}
                                          className="rounded-lg text-white font-bold px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-xs w-full md:w-auto justify-center"
                                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                                        >
                                          {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                          Check In
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. EDIT TAB (FULLY STRUCTURED FILE UPLOAD, FILE DETAILS & PREVIEW) */}
                {activeTab === "EDIT" && (
                  <div className="animate-in fade-in duration-500 p-6 md:p-8 rounded-[20px] border shadow-sm space-y-6" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>Edit Event Details</h1>
                      <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: "var(--muted)" }}>Update your event banner, details, schedule, and pricing.</p>
                    </div>

                    {updateMessage.text && (
                      <div className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm ${updateMessage.type === "success" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25" : "bg-red-500/10 text-red-500 border border-red-500/25"}`}>
                        {updateMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                        <span>{updateMessage.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-6">

                      {/* BANNER / IMAGE UPLOAD FIELD (FILE UPLOAD, FILE DETAILS, AND PREVIEW IMAGE) */}
                      <div className="space-y-4">
                        <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Event Cover Banner</Label>

                        {/* STEP A: FILE UPLOAD DROPZONE */}
                        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all hover:border-[var(--accent)]" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                          <div className="flex flex-col items-center justify-center text-center px-4">
                            <div className="p-2.5 rounded-xl mb-2" style={{ background: "var(--input)", color: "var(--accent)" }}>
                              <UploadCloud className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                              {bannerFile ? "Choose a different banner" : "Click to select or drag event banner"}
                            </p>
                            <p className="text-xs font-medium mt-1" style={{ color: "var(--subtle)" }}>Supports PNG, JPG, or WEBP (Max 5MB)</p>
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
                          <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="p-2 rounded-lg shrink-0" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                                <ImageIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{bannerFile.name}</p>
                                <p className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                                  {(bannerFile.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveBanner}
                              className="text-xs font-bold text-red-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {/* STEP C: SHOW LIVE IMAGE PREVIEW */}
                        {bannerPreview && (
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              Banner Image Preview
                            </span>
                            <div className="relative w-full h-56 rounded-2xl overflow-hidden border bg-zinc-900 group" style={{ borderColor: "var(--border)" }}>
                              <img
                                src={bannerPreview}
                                alt="Event Banner Preview"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <label className="cursor-pointer bg-white text-zinc-900 hover:bg-zinc-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                                  <UploadCloud className="w-4 h-4" /> Swap Image
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
                                  <X className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Event Title</Label>
                        <Input
                          value={editData.title || ""}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          required
                          className="py-6 rounded-xl text-xs font-medium"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Event Type</Label>
                          <select
                            value={customTypeEditMode ? "other" : editData.type}
                            onChange={(e) => handleTypeSelectChange(e.target.value)}
                            className="w-full h-12 px-3 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            {eventTypes.map((t) => (
                              <option key={t.id} value={t.name.toLowerCase()} style={{ background: "var(--card)", color: "var(--text)" }}>
                                {t.name}
                              </option>
                            ))}
                            <option value="other" style={{ background: "var(--card)", color: "var(--text)" }}>Other (Specify dynamic type)</option>
                          </select>
                          {customTypeEditMode && (
                            <Input
                              placeholder="Enter custom type..."
                              value={customType}
                              onChange={(e) => setCustomType(e.target.value)}
                              className="mt-2 py-5 rounded-xl text-xs"
                              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                              required
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Mode</Label>
                          <select
                            value={editData.mode || "offline"}
                            onChange={(e) => setEditData({ ...editData, mode: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            {MODES.map((m) => (
                              <option key={m} value={m} style={{ background: "var(--card)", color: "var(--text)" }}>{m.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Location</Label>
                        <Input
                          value={editData.mode === "online" ? "Online" : editData.location || ""}
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                          disabled={editData.mode === "online"}
                          className="py-6 rounded-xl text-xs disabled:opacity-50"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Start Date & Time</Label>
                          <Input
                            type="datetime-local"
                            value={editData.start_date || ""}
                            onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                            required
                            className="py-6 rounded-xl text-xs font-mono"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>End Date & Time</Label>
                          <Input
                            type="datetime-local"
                            value={editData.end_date || ""}
                            onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                            required
                            className="py-6 rounded-xl text-xs font-mono"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Capacity</Label>
                          <Input
                            type="number"
                            value={editData.capacity || "0"}
                            onChange={(e) => setEditData({ ...editData, capacity: e.target.value })}
                            className="py-6 rounded-xl text-xs"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Registration Fee (₹)</Label>
                          <Input
                            type="number"
                            value={editData.registration_fee || "0"}
                            onChange={(e) => setEditData({ ...editData, registration_fee: e.target.value })}
                            className="py-6 rounded-xl text-xs"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Registration Type</Label>
                          <select
                            value={editData.registration_type || "solo"}
                            onChange={(e) => setEditData({ ...editData, registration_type: e.target.value })}
                            className="w-full h-12 px-3 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            {REG_TYPES.map((rt) => (
                              <option key={rt} value={rt} style={{ background: "var(--card)", color: "var(--text)" }}>{rt.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {editData.registration_type === "team" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                          <div className="space-y-2">
                            <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Min Team Size</Label>
                            <Input
                              type="number"
                              value={editData.min_team_size || "1"}
                              onChange={(e) => setEditData({ ...editData, min_team_size: e.target.value })}
                              className="py-6 rounded-xl text-xs"
                              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Max Team Size</Label>
                            <Input
                              type="number"
                              value={editData.max_team_size || "1"}
                              onChange={(e) => setEditData({ ...editData, max_team_size: e.target.value })}
                              className="py-6 rounded-xl text-xs"
                              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="font-bold text-xs" style={{ color: "var(--text)" }}>Description</Label>
                        <textarea
                          rows={5}
                          value={editData.description || ""}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          className="w-full p-4 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                        />
                      </div>

                      <Button
                        className="w-full rounded-2xl font-bold py-6 text-white shadow-lg transition-transform hover:scale-[1.01]"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                        disabled={isUpdating}
                        type="submit"
                      >
                        {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Event Changes"}
                      </Button>
                    </form>
                  </div>
                )}

                {/* 3.5. AGENDA TAB */}
                {activeTab === "AGENDA" && hasPermission("MANAGE_EVENT") && (
                  <div className="animate-in fade-in duration-500 p-6 md:p-8 rounded-[20px] border shadow-sm space-y-6" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--border)" }}>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>Event Agenda</h1>
                        <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: "var(--muted)" }}>Design a creative schedule and session timeline for your event.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={() => setIsAiAgendaModalOpen(true)}
                          className="rounded-2xl text-white font-extrabold px-6 py-6 shadow-lg flex items-center gap-2 self-start md:self-auto transition-transform hover:scale-[1.02]"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                        >
                          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" /> AI Agenda Builder
                        </Button>
                        <Button
                          onClick={handleOpenAddAgenda}
                          variant="outline"
                          className="rounded-2xl font-bold px-6 py-6 shadow-sm flex items-center gap-2 self-start md:self-auto"
                          style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                        >
                          <Plus className="w-5 h-5" /> Manual Session
                        </Button>
                      </div>
                    </div>

                    {timelinesList.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed rounded-3xl" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                        <Clock className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--subtle)" }} />
                        <h3 className="font-extrabold text-lg" style={{ color: "var(--text)" }}>No sessions added yet</h3>
                        <p className="text-sm font-medium mt-1" style={{ color: "var(--muted)" }}>Add sessions manually or let AI structure an agenda from your voice prompt.</p>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                          <Button
                            onClick={() => setIsAiAgendaModalOpen(true)}
                            className="rounded-xl text-white font-bold px-6 py-3 shadow-md flex items-center gap-2"
                            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                          >
                            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> Build with AI
                          </Button>
                          <Button
                            onClick={handleOpenAddAgenda}
                            className="rounded-xl font-bold px-6 py-3 shadow-sm flex items-center gap-2"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            <Plus className="w-4 h-4" /> Manual Session
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative border-l ml-4 pl-8 space-y-8 py-4" style={{ borderColor: "var(--border)" }}>
                          {timelinesList.slice(0, visibleAgendaCount).map((timeline) => {
                            const start = new Date(timeline.start_time);
                            const end = timeline.end_time ? new Date(timeline.end_time) : null;
                            return (
                              <div key={timeline.id} className="relative group">
                                {/* Timeline Point */}
                                <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full border-4 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform" style={{ background: "var(--bg)", borderColor: "var(--accent)" }} />

                                <div className="border p-6 rounded-3xl hover:shadow-md transition-all duration-300 space-y-4" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-xl w-fit border" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)", color: "var(--accent)" }}>
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>
                                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {end && ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </span>
                                        <span style={{ color: "var(--subtle)" }}>|</span>
                                        <span>
                                          {start.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                      <h3 className="text-xl font-extrabold leading-snug" style={{ color: "var(--text)" }}>{timeline.title}</h3>
                                    </div>

                                    <div className="flex items-center gap-2 self-end md:self-start">
                                      <Button
                                        onClick={() => handleOpenEditAgenda(timeline)}
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-xl w-9 h-9"
                                        style={{ color: "var(--muted)" }}
                                        title="Edit"
                                        type="button"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        onClick={() => handleDeleteAgenda(timeline.id)}
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-xl hover:bg-red-500/10 text-red-500 w-9 h-9"
                                        title="Delete"
                                        type="button"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-4 text-xs font-bold" style={{ color: "var(--muted)" }}>
                                    {timeline.speaker_name && (
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}>
                                        <UserCircle2 className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                                        Speaker: <strong style={{ color: "var(--text)" }}>{timeline.speaker_name}</strong>
                                      </span>
                                    )}
                                    {timeline.location && (
                                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}>
                                        <MapPin className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                                        Room/Location: <strong style={{ color: "var(--text)" }}>{timeline.location}</strong>
                                      </span>
                                    )}
                                  </div>

                                  {timeline.tags && Array.isArray(timeline.tags) && timeline.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {timeline.tags.map((tag: string) => (
                                        <span
                                          key={tag}
                                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1"
                                          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
                                        >
                                          <Tag className="w-3 h-3" style={{ color: "var(--accent)" }} />
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {timeline.description && (
                                    <div
                                      className="text-sm font-medium leading-relaxed border-t pt-3 max-w-none"
                                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                                      dangerouslySetInnerHTML={{ __html: timeline.description }}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {timelinesList.length > visibleAgendaCount && (
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              onClick={() => setVisibleAgendaCount((c) => c + 20)}
                              variant="outline"
                              className="rounded-2xl font-bold px-6 py-6 shadow-sm flex items-center gap-2"
                              style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                            >
                              <ChevronDown className="w-5 h-5" style={{ color: "var(--accent)" }} />
                              Show More Sessions
                            </Button>
                            <p className="text-xs font-semibold" style={{ color: "var(--subtle)" }}>
                              Showing {Math.min(visibleAgendaCount, timelinesList.length)} of {timelinesList.length} sessions
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. STAFF & ROLES TAB */}
                {activeTab === "STAFF" && hasPermission("MANAGE_STAFF") && (
                  <div className="animate-in fade-in duration-500 p-6 md:p-8 rounded-[20px] border shadow-sm space-y-8" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>Organization Staff & Roles</h1>
                        <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: "var(--muted)" }}>Categorized organization members, RBAC roles, and granular permission controls.</p>
                      </div>
                      <Button
                        onClick={() => {
                          const el = document.getElementById("invite-form");
                          el?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="rounded-full text-white font-bold px-6 py-2.5 shadow-md flex items-center gap-2 text-sm transition-transform hover:scale-[1.02]"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                      >
                        <UserPlus className="w-4 h-4" /> Add Staff Member
                      </Button>
                    </div>

                    {/* ROLE CATEGORIES SUMMARY CARDS & FILTER TABS */}
                    {(() => {
                      const getRoleCount = (name: string) => staffList.filter(s => (s.role?.name || "") === name).length;

                      const categories = [
                        { id: "ALL", label: "All Members", count: staffList.length },
                        { id: "Admin", label: "Admins", count: getRoleCount("Admin") },
                        { id: "Registration Manager", label: "Registration Managers", count: getRoleCount("Registration Manager") },
                        { id: "Program Manager", label: "Program Managers", count: getRoleCount("Program Manager") },
                        { id: "Volunteer", label: "Volunteers", count: getRoleCount("Volunteer") },
                        { id: "Guest", label: "Guests", count: getRoleCount("Guest") },
                        { id: "PENDING", label: "Pending Invites", count: pendingInvites.length },
                      ];

                      return (
                        <div className="flex flex-wrap items-center gap-2.5 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                          {categories.map((cat) => {
                            const isSelected = selectedRoleCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedRoleCategory(cat.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer"
                                style={{
                                  background: isSelected ? "linear-gradient(135deg, var(--accent), var(--accent2))" : "var(--card2)",
                                  borderColor: isSelected ? "transparent" : "var(--border)",
                                  color: isSelected ? "#ffffff" : "var(--text)",
                                  boxShadow: isSelected ? "0 4px 12px color-mix(in oklab, var(--accent) 30%, transparent)" : "none",
                                  transform: isSelected ? "scale(1.04)" : "none",
                                }}
                              >
                                <span>{cat.label}</span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-black border"
                                  style={{
                                    background: isSelected ? "rgba(255, 255, 255, 0.25)" : "var(--input)",
                                    borderColor: isSelected ? "transparent" : "var(--border)",
                                    color: isSelected ? "#ffffff" : "var(--muted)",
                                  }}
                                >
                                  {cat.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Invite Staff Form */}
                    <form id="invite-form" onSubmit={handleInviteStaff} className="p-6 rounded-3xl border space-y-4 shadow-2xs" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                      <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: "var(--text)" }}>
                        <UserPlus className="w-4 h-4" style={{ color: "var(--accent)" }} /> Invite Organization Member
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          placeholder="Member email address..."
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="py-6 rounded-2xl md:col-span-2 text-xs"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          required
                        />
                        <select
                          value={inviteRoleId}
                          onChange={(e) => setInviteRoleId(e.target.value)}
                          className="h-12 px-4 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border"
                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          required
                        >
                          <option value="" style={{ background: "var(--card)", color: "var(--text)" }}>Assign Role (5 Options)...</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id} style={{ background: "var(--card)", color: "var(--text)" }}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        className="rounded-2xl text-white font-bold px-6 py-5 shadow-sm transition-transform hover:scale-[1.01]"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                        disabled={isInviting}
                        type="submit"
                      >
                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Role Invitation"}
                      </Button>
                    </form>

                    {/* CATEGORIZED MEMBERS LISTING */}
                    {(() => {
                      const rolesOrder = ["Admin", "Registration Manager", "Program Manager", "Volunteer", "Guest"];

                      const filteredStaff = selectedRoleCategory === "ALL"
                        ? staffList
                        : selectedRoleCategory === "PENDING"
                          ? []
                          : staffList.filter(st => (st.role?.name || "") === selectedRoleCategory);

                      const activeRolesToDisplay = selectedRoleCategory === "ALL"
                        ? rolesOrder
                        : selectedRoleCategory === "PENDING"
                          ? []
                          : [selectedRoleCategory];

                      return (
                        <div className="space-y-8">
                          {selectedRoleCategory !== "PENDING" && activeRolesToDisplay.map((roleCategoryName) => {
                            const membersInGroup = filteredStaff.filter(st => (st.role?.name || "Guest") === roleCategoryName);
                            if (membersInGroup.length === 0 && selectedRoleCategory === "ALL") return null;

                            const getRoleBadgeStyle = (name: string) => {
                              switch (name) {
                                case "Admin": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
                                case "Registration Manager": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                                case "Program Manager": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
                                case "Volunteer": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
                                default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
                              }
                            };

                            return (
                              <div key={roleCategoryName} className="space-y-4">
                                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                                  <div className="flex items-center gap-2.5">
                                    <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(roleCategoryName)}`}>
                                      {roleCategoryName}
                                    </span>
                                    <span className="text-xs font-semibold" style={{ color: "var(--subtle)" }}>
                                      ({membersInGroup.length} {membersInGroup.length === 1 ? "member" : "members"})
                                    </span>
                                  </div>
                                </div>

                                {membersInGroup.length === 0 ? (
                                  <p className="text-xs font-medium italic pl-2" style={{ color: "var(--subtle)" }}>No members assigned to {roleCategoryName} role yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 gap-3">
                                    {membersInGroup.map((st, idx) => {
                                      const isCreator = creatorUser && st.user?.id === creatorUser.id;
                                      const userOverrides: string[] | null = st.permissions_override;
                                      const allUserPermissions: string[] = Array.isArray(userOverrides)
                                        ? userOverrides
                                        : (st.role?.permissions || []);

                                      return (
                                        <div key={idx} className="p-5 rounded-3xl border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                                          <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm">
                                              {st.user?.avatar_url ? (
                                                <img src={st.user.avatar_url} alt={st.user.name} className="w-full h-full object-cover rounded-2xl" />
                                              ) : (
                                                st.user?.name ? st.user.name.slice(0, 2).toUpperCase() : "ST"
                                              )}
                                            </div>
                                            <div className="space-y-1.5">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-extrabold text-base" style={{ color: "var(--text)" }}>{st.user?.name || "Organization Member"}</h4>
                                                {isCreator && (
                                                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                                                    Event Creator / Owner
                                                  </span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(roleCategoryName)}`}>
                                                  {roleCategoryName}
                                                </span>
                                              </div>
                                              <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{st.user?.email}</p>

                                              {/* PERMISSIONS PILLS */}
                                              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                                                <span className="text-[10px] font-bold uppercase mr-1" style={{ color: "var(--subtle)" }}>Permissions:</span>
                                                {allUserPermissions.length === 0 ? (
                                                  <span className="text-[10px] italic" style={{ color: "var(--subtle)" }}>None assigned</span>
                                                ) : (
                                                  allUserPermissions.map((permKey) => {
                                                    const isOverride = Array.isArray(userOverrides) && userOverrides.includes(permKey);
                                                    return (
                                                      <span
                                                        key={permKey}
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isOverride
                                                            ? "bg-purple-500/15 text-purple-400 border-purple-500/30 font-extrabold"
                                                            : ""
                                                          }`}
                                                        style={!isOverride ? { background: "var(--input)", borderColor: "var(--border)", color: "var(--muted)" } : {}}
                                                        title={isOverride ? "Custom permission override granted" : "Base role permission"}
                                                      >
                                                        {isOverride ? `+ ${permKey}` : permKey}
                                                      </span>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {/* ADMIN ACTION CONTROLS */}
                                          <div className="flex items-center gap-2 shrink-0 md:self-center border-t md:border-t-0 pt-3 md:pt-0" style={{ borderColor: "var(--border)" }}>
                                            <Button
                                              onClick={() => handleOpenEditStaffModal(st)}
                                              variant="outline"
                                              size="sm"
                                              className="rounded-xl text-xs font-bold flex items-center gap-1.5 py-2 px-3 shadow-2xs"
                                              style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                                            >
                                              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} /> Edit Role & Permissions
                                            </Button>

                                            {!isCreator && (
                                              <Button
                                                onClick={() => handleRemoveStaffMember(st.user.id, st.user.name || "this user")}
                                                disabled={isRemovingStaffId === st.user.id}
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl text-xs font-bold flex items-center gap-1.5 py-2 px-3 shadow-2xs hover:bg-red-500/10 text-red-500"
                                                style={{ borderColor: "color-mix(in oklab, #ef4444 30%, var(--border))" }}
                                              >
                                                {isRemovingStaffId === st.user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                Remove
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* PENDING INVITATIONS LIST */}
                          {(selectedRoleCategory === "ALL" || selectedRoleCategory === "PENDING") && pendingInvites.length > 0 && (
                            <div className="space-y-4 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                              <div className="flex items-center justify-between">
                                <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: "var(--text)" }}>
                                  <Mail className="w-4.5 h-4.5 text-orange-500" /> Pending Invitations ({pendingInvites.length})
                                </h3>
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                {pendingInvites.map((invite) => (
                                  <div key={invite.id} className="p-4 rounded-2xl border flex items-center justify-between gap-4" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                                    <div>
                                      <p className="font-extrabold text-sm" style={{ color: "var(--text)" }}>{invite.email}</p>
                                      <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                                        Invited as <span className="font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/25">{invite.role?.name || "Staff"}</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/25">
                                        Pending Accept
                                      </span>
                                      <Button
                                        onClick={() => handleCancelStaffInvite(invite.id)}
                                        disabled={isCancellingInviteId === invite.id}
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl font-bold"
                                      >
                                        {isCancellingInviteId === invite.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Cancel Invite"}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* EDIT PERMISSIONS & ROLE MODAL */}
                <AnimatePresence>
                  {editingMember && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                      onClick={() => !isUpdatingStaff && setEditingMember(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-2xl w-full rounded-[2.5rem] border shadow-2xl p-6 sm:p-8 my-8 space-y-6"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
                      >
                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border)" }}>
                          <div>
                            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Adjust Role & Permissions</h2>
                            <p className="text-xs font-semibold mt-1" style={{ color: "var(--muted)" }}>
                              Updating settings for <span className="font-extrabold" style={{ color: "var(--accent)" }}>{editingMember.user?.name || editingMember.user?.email}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingMember(null)}
                            className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* SELECT ROLE */}
                        <div className="space-y-2">
                          <label className="text-sm font-extrabold" style={{ color: "var(--text)" }}>Assigned Role</label>
                          <select
                            value={editMemberRoleId}
                            onChange={(e) => handleRoleSelectChange(e.target.value)}
                            className="w-full h-12 px-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border"
                            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id} style={{ background: "var(--card)", color: "var(--text)" }}>{r.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* CONFIGURE PERMISSIONS (FULLY EDITABLE) */}
                        <div className="space-y-4 pt-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-extrabold" style={{ color: "var(--text)" }}>Configure Member Permissions</h3>
                              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Toggle any system permission below to customize access for this member.</p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0 border" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)", color: "var(--accent)" }}>
                              {editMemberOverrides.length} / {ALL_PERMISSIONS_LIST.length} Granted
                            </span>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSelectAllPermissions}
                              className="text-xs font-bold px-3 py-1 rounded-lg border transition-colors cursor-pointer"
                              style={{ background: "color-mix(in oklab, var(--accent) 10%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 25%, transparent)", color: "var(--accent)" }}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAllPermissions}
                              className="text-xs font-bold px-3 py-1 rounded-lg border transition-colors cursor-pointer"
                              style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                            >
                              Clear All
                            </button>
                          </div>

                          {/* Interactive Permissions List */}
                          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 pt-1">
                            {ALL_PERMISSIONS_LIST.map((perm) => {
                              const isChecked = editMemberOverrides.includes(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  onClick={() => handleTogglePermissionOverride(perm.key)}
                                  className="flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all"
                                  style={{
                                    background: isChecked ? "color-mix(in oklab, var(--accent) 8%, var(--card))" : "var(--card2)",
                                    borderColor: isChecked ? "var(--accent)" : "var(--border)",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => { }}
                                    className="mt-1 rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-xs" style={{ color: "var(--text)" }}>{perm.label}</span>
                                        <span className="text-[10px] font-mono font-bold" style={{ color: "var(--subtle)" }}>({perm.key})</span>
                                      </div>
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isChecked ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : ""
                                        }`} style={!isChecked ? { background: "var(--input)", color: "var(--subtle)" } : {}}>
                                        {isChecked ? "Granted" : "Disabled"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--muted)" }}>{perm.desc}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* FOOTER BUTTONS */}
                        <div className="flex items-center justify-end gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                          <Button
                            onClick={() => setEditingMember(null)}
                            variant="outline"
                            className="rounded-xl font-bold px-5"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveStaffPermissions}
                            disabled={isUpdatingStaff}
                            className="rounded-xl text-white font-bold px-6 shadow-sm"
                            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                          >
                            {isUpdatingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Role & Permissions"}
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 5. EVENT TASKS TAB */}
                {activeTab === "TASKS" && (
                  <div className="animate-in fade-in duration-500 space-y-6">
                    {/* TOP HEADER & COUNTERS */}
                    <div className="p-6 sm:p-8 rounded-[20px] border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                      <div>
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", fontFamily: "var(--font-display)" }}>Event Tasks & Assignments</h1>
                          <span className="text-xs font-black uppercase px-3 py-1 rounded-full border" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)", color: "var(--accent)" }}>
                            {tasksList.length} Total
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium mt-1" style={{ color: "var(--muted)" }}>
                          Track assigned tasks, monitor completion progress, and assign responsibilities to staff members.
                        </p>
                      </div>

                      {(isOwner || hasPermission("MANAGE_STAFF") || hasPermission("MANAGE_EVENT")) && (
                        <Button
                          onClick={() => {
                            if (staffList.length === 0) {
                              api.get(`/events/${eventId}/staff/members`).then(res => {
                                if (res.data?.data?.staff) setStaffList(res.data.data.staff);
                              });
                            }
                            setIsTaskModalOpen(true);
                          }}
                          className="rounded-2xl text-white font-bold px-6 h-12 shadow-md hover:scale-105 transition-transform flex items-center gap-2 shrink-0"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                        >
                          <Plus className="w-5 h-5" /> Assign New Task
                        </Button>
                      )}
                    </div>

                    {/* STATUS FILTERS BAR */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-2.5 rounded-2xl border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTaskStatusFilter("ALL")}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer"
                          style={{
                            background: taskStatusFilter === "ALL" ? "var(--card)" : "transparent",
                            borderColor: taskStatusFilter === "ALL" ? "var(--border)" : "transparent",
                            color: taskStatusFilter === "ALL" ? "var(--text)" : "var(--muted)",
                            boxShadow: taskStatusFilter === "ALL" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          All Tasks ({tasksList.length})
                        </button>
                        <button
                          onClick={() => setTaskStatusFilter("PENDING")}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer"
                          style={{
                            background: taskStatusFilter === "PENDING" ? "var(--card)" : "transparent",
                            borderColor: taskStatusFilter === "PENDING" ? "var(--border)" : "transparent",
                            color: taskStatusFilter === "PENDING" ? "#f59e0b" : "var(--muted)",
                            boxShadow: taskStatusFilter === "PENDING" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          Pending ({tasksList.filter(t => t.status === 'pending').length})
                        </button>
                        <button
                          onClick={() => setTaskStatusFilter("COMPLETED")}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer"
                          style={{
                            background: taskStatusFilter === "COMPLETED" ? "var(--card)" : "transparent",
                            borderColor: taskStatusFilter === "COMPLETED" ? "var(--border)" : "transparent",
                            color: taskStatusFilter === "COMPLETED" ? "#10b981" : "var(--muted)",
                            boxShadow: taskStatusFilter === "COMPLETED" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          Completed ({tasksList.filter(t => t.status === 'completed').length})
                        </button>
                      </div>
                    </div>

                    {/* TASK CARDS LIST */}
                    {(() => {
                      const filteredTasks = tasksList.filter(t => {
                        if (taskStatusFilter === "PENDING") return t.status === 'pending';
                        if (taskStatusFilter === "COMPLETED") return t.status === 'completed';
                        return true;
                      });

                      if (isFetchingTab) {
                        return (
                          <div className="p-12 text-center rounded-3xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
                            <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Loading assigned tasks...</p>
                          </div>
                        );
                      }

                      if (filteredTasks.length === 0) {
                        return (
                          <div className="p-12 text-center rounded-3xl border space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                              <CheckSquare className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-extrabold" style={{ color: "var(--text)" }}>No Tasks Found</h3>
                            <p className="text-xs font-medium max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                              {taskStatusFilter === "ALL"
                                ? "No tasks have been assigned for this event yet."
                                : `No ${taskStatusFilter.toLowerCase()} tasks found.`}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 gap-4">
                          {filteredTasks.map((task) => {
                            const isCompleted = task.status === 'completed';
                            const priorityColor =
                              task.priority === 'urgent'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : task.priority === 'high'
                                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                  : task.priority === 'medium'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                    : 'bg-blue-500/15 text-blue-400 border-blue-500/30';

                            return (
                              <div
                                key={task.id}
                                className="p-5 rounded-3xl border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                                style={{
                                  background: isCompleted ? "var(--card2)" : "var(--card)",
                                  borderColor: "var(--border)",
                                  opacity: isCompleted ? 0.8 : 1,
                                }}
                              >
                                <div className="flex items-start gap-4 min-w-0">
                                  {/* TOGGLE CHECKBOX */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTaskStatus(task)}
                                    disabled={isUpdatingTaskId === task.id}
                                    className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${isCompleted
                                        ? "bg-emerald-500 border-emerald-600 text-white"
                                        : "hover:border-[var(--accent)] text-transparent"
                                      }`}
                                    style={!isCompleted ? { background: "var(--input)", borderColor: "var(--border)" } : {}}
                                  >
                                    {isUpdatingTaskId === task.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                                    ) : (
                                      <CheckCircle2 className="w-5 h-5 fill-current text-white" />
                                    )}
                                  </button>

                                  <div className="space-y-1.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4
                                        className={`font-extrabold text-base ${isCompleted ? "line-through" : ""}`}
                                        style={{ color: isCompleted ? "var(--subtle)" : "var(--text)" }}
                                      >
                                        {task.title}
                                      </h4>
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${priorityColor}`}>
                                        {task.priority} Priority
                                      </span>
                                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isCompleted ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                        }`}>
                                        {isCompleted ? "Completed" : "Pending"}
                                      </span>
                                    </div>

                                    {task.description && (
                                      <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--muted)" }}>
                                        {task.description}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-1" style={{ color: "var(--subtle)" }}>
                                      {/* Assigned To Badge */}
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border" style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}>
                                        <div className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                          {task.assigned_to?.name ? task.assigned_to.name[0].toUpperCase() : "U"}
                                        </div>
                                        <span>Assigned to: <strong style={{ color: "var(--text)" }}>{task.assigned_to?.name || task.assigned_to?.email}</strong></span>
                                      </div>

                                      {/* Creator Badge */}
                                      {task.created_by && (
                                        <span>By: <span className="font-bold" style={{ color: "var(--text)" }}>{task.created_by.name}</span></span>
                                      )}

                                      {/* Due Date */}
                                      {task.due_date && (
                                        <span className="flex items-center gap-1 font-bold" style={{ color: "var(--muted)" }}>
                                          <Clock className="w-3.5 h-3.5" /> Due {new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* ACTIONS */}
                                <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                                  <Button
                                    type="button"
                                    onClick={() => handleToggleTaskStatus(task)}
                                    disabled={isUpdatingTaskId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className={`rounded-xl text-xs font-bold px-4 py-2 border ${isCompleted
                                        ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                                        : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                      }`}
                                  >
                                    {isCompleted ? "Mark Pending" : "Mark Completed"}
                                  </Button>

                                  {(isOwner || task.created_by_id === creatorUser?.id || hasPermission("MANAGE_STAFF")) && (
                                    <Button
                                      type="button"
                                      onClick={() => handleDeleteTask(task.id)}
                                      disabled={isDeletingTaskId === task.id}
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-800 font-bold p-2"
                                    >
                                      {isDeletingTaskId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ASSIGN NEW TASK MODAL */}
                <AnimatePresence>
                  {isTaskModalOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                      onClick={() => !isCreatingTask && setIsTaskModalOpen(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 15 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white max-w-lg w-full rounded-[2.5rem] border border-zinc-200 shadow-2xl p-6 sm:p-8 space-y-6"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                          <div>
                            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Assign New Task</h2>
                            <p className="text-xs text-zinc-500 font-semibold mt-1">Assign a task to an organization staff member.</p>
                          </div>
                          <button
                            onClick={() => setIsTaskModalOpen(false)}
                            className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-extrabold text-zinc-900">Task Title *</Label>
                            <Input
                              required
                              placeholder="e.g., Verify attendee check-in desk setup"
                              value={taskForm.title}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                              className="rounded-2xl h-11 border-zinc-200 focus:ring-indigo-500 font-semibold text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-extrabold text-zinc-900">Assign To Staff Member *</Label>
                            <select
                              required
                              value={taskForm.assignedToId}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, assignedToId: e.target.value }))}
                              className="w-full h-11 px-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">-- Select Staff Member --</option>
                              {staffList.map((st) => (
                                <option key={st.user.id} value={st.user.id}>
                                  {st.user.name || st.user.email} ({st.role?.name || "Staff"})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs font-extrabold text-zinc-900">Priority</Label>
                              <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-full h-11 px-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs font-extrabold text-zinc-900">Due Date</Label>
                              <Input
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="rounded-2xl h-11 border-zinc-200 text-xs font-bold"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-extrabold text-zinc-900">Description / Instructions</Label>
                            <textarea
                              rows={3}
                              placeholder="Provide detailed instructions for the assigned member..."
                              value={taskForm.description}
                              onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
                            <Button
                              type="button"
                              onClick={() => setIsTaskModalOpen(false)}
                              variant="outline"
                              className="rounded-xl border-zinc-200 text-zinc-700 font-bold px-5"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={isCreatingTask}
                              className={`rounded-xl ${activeAccent.bg} text-white font-bold px-6 shadow-sm`}
                            >
                              {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign Task"}
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 6. ANNOUNCEMENTS TAB */}
                {activeTab === "ANNOUNCEMENTS" && (
                  <div className="animate-in fade-in duration-500 space-y-6">
                    {/* TOP BROADCAST FORM CARD */}
                    <div className="p-6 sm:p-8 rounded-[20px] border shadow-sm space-y-6" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">Event Announcements</h1>
                            <span className="bg-indigo-50 text-indigo-700 text-xs font-black uppercase px-3 py-1 rounded-full border border-indigo-200">
                              {announcementsList.length} Broadcasted
                            </span>
                          </div>
                          <p className="text-zinc-500 font-medium text-xs sm:text-sm mt-1">
                            Broadcast important updates, alerts, and instructions to event participants and staff members.
                          </p>
                        </div>
                      </div>

                      {(isOwner || hasPermission("MANAGE_COMMUNICATIONS") || hasPermission("MANAGE_EVENT")) && (
                        <form onSubmit={handleBroadcastAnnouncement} className="space-y-4 bg-zinc-50/80 p-5 rounded-3xl border border-zinc-200">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs font-extrabold text-zinc-900">Announcement Title (Optional)</Label>
                              <Input
                                placeholder="e.g., Gate 3 Check-in Desk Relocated to Hall B"
                                value={announcementForm.title}
                                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                                className="rounded-2xl h-11 bg-white border-zinc-200 focus:ring-indigo-500 font-semibold text-sm"
                              />
                            </div>

                            <div className="w-full md:w-64 space-y-1">
                              <Label className="text-xs font-extrabold text-zinc-900">Target Audience *</Label>
                              <select
                                value={announcementForm.targetGroup}
                                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, targetGroup: e.target.value }))}
                                className="w-full h-11 px-4 rounded-2xl bg-white border border-zinc-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="all">🌐 All Participants & Staff</option>
                                <option value="participants">👥 Participants Only</option>
                                <option value="staff">🛡️ Staff & Volunteers Only</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-extrabold text-zinc-900">Broadcast Message *</Label>
                            <textarea
                              required
                              rows={3}
                              placeholder="Write your announcement message here..."
                              value={announcementForm.message}
                              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, message: e.target.value }))}
                              className="w-full p-4 rounded-2xl bg-white border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              disabled={isBroadcasting}
                              className={`rounded-2xl ${activeAccent.bg} text-white font-bold px-8 h-12 shadow-md hover:scale-105 transition-transform flex items-center gap-2`}
                            >
                              {isBroadcasting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Broadcast Announcement</>}
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* PAST ANNOUNCEMENTS BROADCAST FEED */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-extrabold text-zinc-900 px-2 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-indigo-600" /> Past Broadcast History
                      </h3>

                      {isFetchingTab ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-zinc-200">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
                          <p className="text-zinc-500 text-sm font-semibold">Loading broadcast history...</p>
                        </div>
                      ) : announcementsList.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-zinc-200 space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                            <Megaphone className="w-7 h-7" />
                          </div>
                          <h3 className="text-lg font-extrabold text-zinc-900">No Broadcasts Yet</h3>
                          <p className="text-xs text-zinc-500 font-medium max-w-md mx-auto">
                            Broadcast messages to alert attendees, provide venue updates, or send staff instructions.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {announcementsList.map((ann) => (
                            <div key={ann.id} className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                                    {ann.author?.name ? ann.author.name[0].toUpperCase() : "A"}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-sm text-zinc-900">{ann.title}</h4>
                                    <p className="text-[11px] text-zinc-400 font-semibold">
                                      By <span className="text-zinc-700 font-bold">{ann.author?.name || "Organizer"}</span> • {new Date(ann.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                                    {ann.targetGroup === 'all' ? '🌐 All Members' : ann.targetGroup === 'staff' ? '🛡️ Staff Only' : '👥 Participants Only'}
                                  </span>

                                  {(isOwner || ann.author?.id === creatorUser?.id || hasPermission("MANAGE_COMMUNICATIONS")) && (
                                    <Button
                                      type="button"
                                      onClick={() => handleDeleteAnnouncement(ann.id)}
                                      disabled={isDeletingAnnId === ann.id}
                                      variant="ghost"
                                      size="sm"
                                      className="rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-800 font-bold p-2"
                                    >
                                      {isDeletingAnnId === ann.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-zinc-700 font-medium leading-relaxed whitespace-pre-wrap">
                                {ann.message}
                              </p>

                              {/* EMOJI REACTION BAR */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                                {['👍', '❤️', '🔥', '🎉', '🚀', '👏'].map((emoji) => {
                                  const rSummary = ann.reactionSummary?.find((r: any) => r.emoji === emoji);
                                  const count = rSummary?.count || 0;
                                  const hasReacted = rSummary?.hasReacted || false;

                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => handleToggleEmojiReaction(ann.id, emoji)}
                                      disabled={reactingAnnId === ann.id}
                                      className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border ${hasReacted
                                          ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs scale-105"
                                          : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:scale-105"
                                        }`}
                                    >
                                      <span>{emoji}</span>
                                      {count > 0 && <span>{count}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ACTIVITIES & GAMIFICATION TAB */}
                {activeTab === "ACTIVITIES" && (
                  <ActivityManagerTab
                    eventId={eventId as string}
                    eventTitle={event?.title || "Event"}
                    isOwner={isOwner}
                    hasPermission={hasPermission}
                    activeAccent={activeAccent}
                    isDark={isDark}
                  />
                )}

                {/* 7. ORGANIZER SETTINGS TAB */}
                {activeTab === "ORGANIZER_SETTINGS" && isOwner && (
                  <div className="animate-in fade-in duration-500 p-6 md:p-8 rounded-[20px] border shadow-sm space-y-8" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                    <div>
                      <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Organization & Tenant Settings</h1>
                      <p className="text-zinc-500 font-medium mt-1">Configure tenant policies, multi-tenant branding, and subscription tier.</p>
                    </div>

                    {configMessage.text && (
                      <div className={`p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm ${configMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                        {configMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
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
                              className={`rounded-xl ${activeAccent.bg} hover:opacity-90 text-white text-xs font-bold px-4 py-2`}
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
                          {isSavingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Organization Configurations"}
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {/* 6. SETTINGS (DANGER ZONE) TAB */}
                {activeTab === "SETTINGS" && isOwner && (
                  <div className="animate-in fade-in duration-500 p-6 md:p-8 rounded-[20px] border shadow-sm space-y-6" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)" }}>
                    <div>
                      <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Event Settings</h1>
                      <p className="text-zinc-500 font-medium mt-1">Manage destructive actions and administrative settings.</p>
                    </div>

                    <div className="p-6 bg-red-50/50 rounded-3xl border border-red-200/60 space-y-4">
                      <div className="flex items-center gap-3 text-red-700 font-extrabold text-lg">
                        <AlertTriangle className="w-6 h-6" /> Danger Zone
                      </div>
                      <p className="text-sm font-medium text-zinc-600">
                        Deleting this event will permanently purge all registrations, ticket data, check-in history, and staff permissions associated with it. This action cannot be undone.
                      </p>
                      <Button className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-6 shadow-lg shadow-red-600/20" onClick={handleDelete}>
                        <Trash2 className="w-5 h-5 mr-2" /> Delete Event
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
                className={`w-full max-w-md rounded-3xl p-6 shadow-2xl relative border ${isDark ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
                  }`}
              >
                <button
                  onClick={handleCloseScanner}
                  type="button"
                  className={`absolute right-4 top-4 p-2 rounded-full transition-colors ${isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold mb-2 border border-indigo-500/20">
                    <QrCode className="w-3.5 h-3.5" /> Ticket Gatekeeper
                  </div>
                  <h3 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>Scan Ticket QR</h3>
                  <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                    Position attendee&apos;s ticket QR code inside the camera frame.
                  </p>
                </div>

                {/* Camera Viewport with smooth loader overlay */}
                <div className="overflow-hidden rounded-2xl border-2 border-zinc-800 bg-zinc-950 aspect-square flex items-center justify-center relative shadow-inner">
                  <div
                    id="qr-scanner-element"
                    className="w-full h-full relative [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl [&_canvas]:hidden [&_img]:hidden [&_select]:hidden [&_button]:hidden"
                  />

                  {/* Smooth Loader while camera initializes */}
                  {isCameraStarting && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center select-none animate-in fade-in duration-200">
                      <div className="relative mb-5">
                        <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-2 border-violet-500/30 border-b-violet-500 animate-[spin_1.5s_linear_infinite_reverse]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-indigo-400 animate-pulse" />
                        </div>
                      </div>
                      <h4 className="text-sm font-extrabold text-white tracking-wide">Starting Camera Scanner</h4>
                      <p className="text-xs text-zinc-400 mt-1.5 max-w-[220px] leading-relaxed">
                        Initializing video feed... Please allow camera access if prompted.
                      </p>
                      <div className="flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Connecting Video Hardware</span>
                      </div>
                    </div>
                  )}

                  {/* Target Frame Reticle (visible only when camera is active) */}
                  {!isCameraStarting && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                      <div className="w-56 h-56 relative border-2 border-dashed border-indigo-400/40 rounded-2xl">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-indigo-500 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-indigo-500 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-indigo-500 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-indigo-500 rounded-br-lg" />
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>

                {scanResult && (
                  <div className={`mt-4 p-3 rounded-xl text-xs font-bold text-center ${scanResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    {scanResult.message}
                  </div>
                )}

                <Button
                  onClick={handleCloseScanner}
                  type="button"
                  className={`w-full mt-4 rounded-xl font-bold py-3 transition-colors ${isDark ? "bg-zinc-900 hover:bg-zinc-800 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
                    }`}
                >
                  Close Scanner
                </Button>
              </motion.div>
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
                  <X className="w-5 h-5" />
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
                      maxLength={100}
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
                        maxLength={100}
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

                  {/* SESSION TAGS & CATEGORIES */}
                  <div className="space-y-2.5 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-zinc-700 text-sm flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        Session Tags &amp; Categories
                      </Label>
                      <span className="text-[11px] font-semibold text-zinc-400">
                        Used for skills matching &amp; Discover search
                      </span>
                    </div>

                    {/* Active Tags Bubble List */}
                    {agendaFormData.tags && agendaFormData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-zinc-200 min-h-[38px] items-center">
                        {agendaFormData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs group"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="w-3.5 h-3.5 rounded-full hover:bg-indigo-200 flex items-center justify-center text-indigo-500 hover:text-indigo-800 transition-colors"
                              title={`Remove ${tag}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tag Input Field */}
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddTag(tagInput);
                          }
                        }}
                        placeholder="Type tag (e.g. React, Salesforce, Web Dev) & press Enter"
                        className="py-4 rounded-xl bg-white border-zinc-200 text-xs font-semibold"
                      />
                      <Button
                        type="button"
                        onClick={() => handleAddTag(tagInput)}
                        disabled={!tagInput.trim()}
                        className={`rounded-xl ${activeAccent.bg} hover:opacity-90 text-white font-bold text-xs px-4 shrink-0`}
                      >
                        Add Tag
                      </Button>
                    </div>

                    {/* Quick Suggested Category Pills */}
                    <div className="pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Suggested Categories:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Salesforce",
                          "Web Dev",
                          "React",
                          "AI/ML",
                          "Python",
                          "Cloud",
                          "Cybersecurity",
                          "UI/UX",
                          "DevOps",
                          "Mobile",
                          "Blockchain",
                          "Next.js"
                        ].map((suggestion) => {
                          const isSelected = agendaFormData.tags.some(
                            (t) => t.toLowerCase() === suggestion.toLowerCase()
                          );
                          return (
                            <button
                              key={suggestion}
                              type="button"
                              disabled={isSelected}
                              onClick={() => handleAddTag(suggestion)}
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 opacity-40 cursor-not-allowed"
                                  : "bg-white text-zinc-700 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50"
                                }`}
                            >
                              + {suggestion}
                            </button>
                          );
                        })}
                      </div>
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
                      {isSavingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Session"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FULL HIGH-IMPACT WELCOME WINDOW MODAL */}
        <AnimatePresence>
          {welcomeAttendee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.85, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.85, y: 30, opacity: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 120 }}
                className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 p-8 sm:p-12 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center justify-center gap-6 text-white overflow-hidden"
              >
                {/* Background ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/20 rounded-full blur-[90px] pointer-events-none" />

                <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)]">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>

                <div className="space-y-2">
                  <p className="text-emerald-400 text-xs sm:text-sm font-black uppercase tracking-[0.25em]">
                    Check-In Successful
                  </p>
                  <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    {event?.title}
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                    Welcome, <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">{welcomeAttendee}</span>! 👋
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm font-medium mt-1">
                    Ticket verified seamlessly. Please enter and enjoy the event!
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full pt-2">
                  <Button
                    onClick={() => {
                      setWelcomeAttendee(null);
                      setIsQrScanning(true);
                    }}
                    className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-6 shadow-lg shadow-emerald-600/20 text-sm"
                  >
                    Scan Next Ticket
                  </Button>
                </div>

                {/* Autoclose Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-850 rounded-b-[2.5rem] overflow-hidden">
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

        {/* ALREADY CHECKED IN WINDOW MODAL */}
        <AnimatePresence>
          {alreadyCheckedInModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.85, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.85, y: 30, opacity: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 120 }}
                className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/40 p-8 sm:p-12 rounded-[2.5rem] text-center shadow-2xl flex flex-col items-center justify-center gap-6 text-white overflow-hidden"
              >
                {/* Background ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/20 rounded-full blur-[90px] pointer-events-none" />

                <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                  <ShieldAlert className="w-10 h-10 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest inline-block">
                    Already Checked In
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                    Ticket Already Verified ⚠️
                  </h2>
                  <p className="text-amber-200 text-sm font-bold mt-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl leading-relaxed">
                    {alreadyCheckedInModal.message}
                  </p>
                  <p className="text-zinc-400 text-xs font-medium pt-1">
                    This ticket QR code has already been scanned and cannot be used again.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full pt-2">
                  <Button
                    onClick={() => {
                      setAlreadyCheckedInModal(null);
                      setIsQrScanning(true);
                    }}
                    className="w-full rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-6 shadow-lg shadow-amber-600/20 text-sm"
                  >
                    Scan Next Ticket
                  </Button>
                </div>

                {/* Autoclose Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-850 rounded-b-[2.5rem] overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4.5, ease: "linear" }}
                    className="h-full bg-amber-500"
                  />
                </div>
              </motion.div>
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
                  Type <span className="font-mono font-bold text-zinc-900">&quot;{event?.title?.trim()}&quot;</span> to confirm permanent deletion.
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter event title..."
                  className="py-5 bg-zinc-50 border-zinc-200 rounded-xl font-semibold text-zinc-900"
                />
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-5 shadow-md shadow-red-600/20 disabled:opacity-50"
                    disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== (event?.title || "").trim().toLowerCase()}
                    onClick={handleConfirmDelete}
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DELETE AGENDA CONFIRMATION MODAL */}
        <AnimatePresence>
          {agendaToDeleteId !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
                <h3 className="text-xl font-extrabold text-zinc-900">Delete Agenda Session</h3>
                <p className="text-sm font-medium text-zinc-600">
                  Are you sure you want to delete the session <strong className="text-zinc-900">&quot;{timelinesList.find(t => t.id === agendaToDeleteId)?.title}&quot;</strong>? This action is permanent.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setAgendaToDeleteId(null)}
                    className="flex-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-5"
                    disabled={isDeletingAgenda}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-5 shadow-md shadow-red-600/20"
                    disabled={isDeletingAgenda}
                    onClick={handleConfirmDeleteAgenda}
                  >
                    {isDeletingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI AGENDA BUILDER MODAL */}
        <AiAgendaBuilderModal
          isOpen={isAiAgendaModalOpen}
          onClose={() => setIsAiAgendaModalOpen(false)}
          eventId={eventId}
          eventTitle={event.title}
          eventStartDate={event.startDate}
          eventEndDate={event.endDate}
          eventLocation={event.location}
          isDark={isDark}
          onSessionsCreated={(createdList) => {
            const sortList = (list: any[]) =>
              [...list].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
              );
            setTimelinesList((prev) => sortList([...prev, ...createdList]));
            setEvent((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                timelines: sortList([...(prev.timelines || []), ...createdList]),
              };
            });
          }}
        />

        {/* REUSABLE UI CONFIRMATION MODAL */}
        <AnimatePresence>
          {confirmModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white max-w-md w-full rounded-[2.5rem] border border-zinc-200 shadow-2xl p-6 sm:p-8 space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-zinc-900">{confirmModal.title}</h3>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed">{confirmModal.description}</p>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
                  <Button
                    type="button"
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    variant="outline"
                    className="rounded-xl border-zinc-200 text-zinc-700 font-bold px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const fn = confirmModal.onConfirm;
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      fn();
                    }}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 shadow-sm"
                  >
                    Confirm Action
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AppLayout>
    );
  }

  // ==========================================
  // VIEW 2: PUBLIC / ATTENDEE PREVIEW VIEW
  // ==========================================
  return (
    <div className={`min-h-screen transition-colors duration-500 w-full min-w-0 ${theme.bg}`}>
      <AppLayout>
        <div className="flex-1 pb-20 relative select-none min-w-0">

          {/* BACKGROUND EFFECTS */}
          <div className={`absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b ${theme.gradOverlay} pointer-events-none z-0`} />

          {/* CUSTOM THEME GIMMICKS */}
          {theme.gimmicks}

          {/* TOP NAVIGATION BAR */}
          <header className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex justify-between items-center relative z-25">
            <Link href="/home">
              <Button
                variant="ghost"
                className="rounded-full shadow-xs font-bold transition-all text-xs h-9 px-4 border border-border bg-card/80 hover:bg-card text-foreground flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to Feed</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2.5">
              <Button
                onClick={handleToggleSave}
                variant="ghost"
                className={`rounded-full shadow-xs font-bold transition-all text-xs h-9 px-4 border flex items-center gap-2 cursor-pointer ${event?.is_saved
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-card/80 hover:bg-card text-foreground"
                  }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${event?.is_saved ? "fill-current text-emerald-500" : ""}`} />
                <span className="hidden sm:inline">{event?.is_saved ? "Saved" : "Save Event"}</span>
                <span className="sm:hidden">{event?.is_saved ? "Saved" : "Save"}</span>
              </Button>

              <Button
                onClick={() => setIsShareModalOpen(true)}
                variant="ghost"
                className="rounded-full shadow-xs font-bold transition-all text-xs h-9 px-4 border border-border bg-card/80 hover:bg-card text-foreground flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Event</span>
                <span className="sm:hidden">Share</span>
              </Button>
            </div>
          </header>

          {/* MAIN 2-COLUMN WORKSPACE GRID (UNIFIED REDESIGN LAYOUT WITH STICKY SCROLL) */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-20 items-start">

            {/* LEFT COLUMN: Media Banner + Details + Guidelines + Agenda + Location */}
            <div className="lg:col-span-7 space-y-6 lg:space-y-8 min-w-0">

              {/* Cover Media Banner (16:9 responsive) */}
              <div className="rounded-[26px] overflow-hidden border border-border shadow-lg relative w-full aspect-[16/9] min-h-[220px] max-h-[400px] bg-zinc-950">
                {event.bannerUrl ? (
                  <img
                    src={event.bannerUrl}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                  />
                ) : (
                  <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-[#0c2e22] via-[#051c14] to-[#020a07] flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/25 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Card Block 1: About this event */}
              <div className="p-6 sm:p-8 rounded-[24px] border shadow-sm space-y-5 transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)", boxShadow: isDark ? "0 14px 34px -10px rgba(0,0,0,0.5), 0 2px 8px -2px rgba(0,0,0,0.3)" : "0 14px 34px -10px rgba(15,23,42,0.07), 0 2px 8px -2px rgba(15,23,42,0.04)" }}>
                <h2 className="text-xl sm:text-2xl font-bold font-bricolage tracking-tight flex items-center gap-2.5 text-foreground">
                  <Building2 className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }} />
                  <span>About this Event</span>
                </h2>

                <div className="text-muted-foreground font-medium text-sm sm:text-[15px] leading-relaxed break-words [overflow-wrap:anywhere]">
                  {event.description.length > 500 && !isDescExpanded ? (
                    <>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: event.description.slice(0, 480) + "...",
                        }}
                      />
                      <button
                        onClick={() => setIsDescExpanded(true)}
                        className="mt-2.5 text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Read More
                      </button>
                    </>
                  ) : (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: event.description }} />
                      {event.description.length > 500 && (
                        <button
                          onClick={() => setIsDescExpanded(false)}
                          className="mt-2.5 text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Read Less
                        </button>
                      )}
                    </>
                  )}
                </div>

                {event.tags && Array.isArray(event.tags) && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                    {event.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-bold border text-xs font-bold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Block 2: Participation Guidelines */}
              <div className="p-6 sm:p-8 rounded-[24px] border shadow-sm space-y-5 transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)", boxShadow: isDark ? "0 14px 34px -10px rgba(0,0,0,0.5), 0 2px 8px -2px rgba(0,0,0,0.3)" : "0 14px 34px -10px rgba(15,23,42,0.07), 0 2px 8px -2px rgba(15,23,42,0.04)" }}>
                <h2 className="text-xl sm:text-2xl font-bold font-bricolage tracking-tight flex items-center gap-2.5 text-foreground">
                  <Users className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }} />
                  <span>Participation Guidelines</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl border flex flex-col gap-2 transition-all" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                    <Users className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Format</p>
                      <p className="font-extrabold text-sm capitalize text-foreground mt-0.5">{event.regType} Entry</p>
                    </div>
                  </div>

                  {event.regType === 'team' && (
                    <div className="p-4 rounded-2xl border flex flex-col gap-2 transition-all" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                      <Users className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Team Size</p>
                        <p className="font-extrabold text-sm text-foreground mt-0.5">{event.minTeam} - {event.maxTeam} members</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl border flex flex-col gap-2 transition-all" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                    <Ticket className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Capacity Limit</p>
                      <p className="font-extrabold text-sm text-foreground mt-0.5">
                        {event.capacity === 0 ? "Unlimited Seats" : `${event.capacity} Spots Max`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Block 3: Schedule & Agenda */}
              {event?.timelines && event.timelines.length > 0 && (
                <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${theme.cardBg}`}>
                  <h2 className={`text-xl font-extrabold tracking-tight flex items-center gap-2 ${theme.textHeading}`}>
                    <Calendar className={`w-5 h-5 ${theme.accent}`} /> Event Agenda & Schedule
                  </h2>

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

                  <div className="space-y-6 pl-1">
                    {(() => {
                      const groups: { [key: string]: any[] } = {};
                      event.timelines.forEach((item: any) => {
                        const dateStr = new Date(item.start_time).toDateString();
                        if (!groups[dateStr]) groups[dateStr] = [];
                        groups[dateStr].push(item);
                      });
                      const sortedGroups = Object.entries(groups).sort(
                        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
                      );

                      const allItems = sortedGroups.flatMap(([, items]) => items);
                      const visibleIdSet = new Set(
                        allItems.slice(0, visibleEventAgendaCount).map((it: any) => it.id)
                      );

                      return sortedGroups
                        .map(([dateStr, items]) => [dateStr, items.filter((it: any) => visibleIdSet.has(it.id))] as [string, any[]])
                        .filter(([, items]) => items.length > 0)
                        .map(([dateStr, items]) => {
                          const d = new Date(dateStr);
                          const month = d.toLocaleDateString("en-US", { month: "short" });
                          const day = d.getDate();

                          return (
                            <div key={dateStr} className="flex gap-4 items-start">
                              <div className={`w-12 flex flex-col items-center shrink-0 py-2 border-r pr-3 ${theme.divider}`}>
                                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{month}</span>
                                <span className={`text-2xl font-black mt-0.5 ${theme.isDark ? "text-zinc-200" : "text-zinc-900"}`}>{day}</span>
                              </div>

                              <div className="flex-1 space-y-3">
                                {items.map((timeline: any) => {
                                  const tTitle = timeline.title.toLowerCase();
                                  let sessionStyle = {
                                    label: "Keynote / Session",
                                    leftBorder: "var(--accent)",
                                    badgeBg: isDark ? "rgba(99, 102, 241, 0.18)" : "rgba(99, 102, 241, 0.12)",
                                    badgeBorder: isDark ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.28)",
                                    badgeText: isDark ? "#c7d2fe" : "#4338ca",
                                    cardBg: isDark ? "rgba(24, 24, 27, 0.65)" : "#f8fafc",
                                  };

                                  if (tTitle.includes("tea") || tTitle.includes("coffee") || tTitle.includes("networking") || tTitle.includes("break") || tTitle.includes("snack")) {
                                    sessionStyle = {
                                      label: "Break & Networking",
                                      leftBorder: "#f59e0b",
                                      badgeBg: isDark ? "rgba(245, 158, 11, 0.18)" : "rgba(245, 158, 11, 0.14)",
                                      badgeBorder: isDark ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.35)",
                                      badgeText: isDark ? "#fde68a" : "#b45309",
                                      cardBg: isDark ? "rgba(24, 24, 27, 0.65)" : "#fffbeb",
                                    };
                                  } else if (tTitle.includes("lunch") || tTitle.includes("dinner") || tTitle.includes("food") || tTitle.includes("meal") || tTitle.includes("brunch")) {
                                    sessionStyle = {
                                      label: "Meal & Refreshment",
                                      leftBorder: "#f43f5e",
                                      badgeBg: isDark ? "rgba(244, 63, 94, 0.18)" : "rgba(244, 63, 94, 0.14)",
                                      badgeBorder: isDark ? "rgba(244, 63, 94, 0.4)" : "rgba(244, 63, 94, 0.35)",
                                      badgeText: isDark ? "#fecdd3" : "#be123c",
                                      cardBg: isDark ? "rgba(24, 24, 27, 0.65)" : "#fff1f2",
                                    };
                                  } else if (tTitle.includes("party") || tTitle.includes("celebration") || tTitle.includes("social") || tTitle.includes("afterparty") || tTitle.includes("dj")) {
                                    sessionStyle = {
                                      label: "Social / Celebration",
                                      leftBorder: "#a855f7",
                                      badgeBg: isDark ? "rgba(168, 85, 247, 0.18)" : "rgba(168, 85, 247, 0.14)",
                                      badgeBorder: isDark ? "rgba(168, 85, 247, 0.4)" : "rgba(168, 85, 247, 0.35)",
                                      badgeText: isDark ? "#e9d5ff" : "#7e22ce",
                                      cardBg: isDark ? "rgba(24, 24, 27, 0.65)" : "#faf5ff",
                                    };
                                  } else if (tTitle.includes("register") || tTitle.includes("registration") || tTitle.includes("welcome") || tTitle.includes("check-in") || tTitle.includes("checkin")) {
                                    sessionStyle = {
                                      label: "Check-in & Welcome",
                                      leftBorder: "#10b981",
                                      badgeBg: isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(16, 185, 129, 0.14)",
                                      badgeBorder: isDark ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.35)",
                                      badgeText: isDark ? "#a7f3d0" : "#047857",
                                      cardBg: isDark ? "rgba(24, 24, 27, 0.65)" : "#ecfdf5",
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
                                      className="relative overflow-hidden p-4.5 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] shadow-xs border-l-4"
                                      style={{
                                        background: sessionStyle.cardBg,
                                        borderColor: "var(--border)",
                                        borderLeftColor: sessionStyle.leftBorder,
                                      }}
                                    >
                                      {isLive && (
                                        <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500 text-red-500 text-[9px] font-black tracking-widest uppercase animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                          <span>Live</span>
                                        </div>
                                      )}

                                      <div className="relative z-10 space-y-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <span
                                            className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                                            style={{
                                              background: sessionStyle.badgeBg,
                                              borderColor: sessionStyle.badgeBorder,
                                              color: sessionStyle.badgeText,
                                            }}
                                          >
                                            {sessionStyle.label}
                                          </span>
                                          <span className="font-mono text-xs font-semibold" style={{ color: "var(--muted)" }}>
                                            {formattedTime}
                                          </span>
                                        </div>
                                        <h4 className="font-extrabold text-base leading-snug tracking-tight pr-12" style={{ color: "var(--text)" }}>
                                          {timeline.title}
                                        </h4>
                                        {(timeline.speaker_name || timeline.location) && (
                                          <p className="text-xs font-medium mt-1 flex flex-wrap gap-3" style={{ color: "var(--subtle)" }}>
                                            {timeline.speaker_name && <span>Speaker: <strong style={{ color: "var(--text)" }}>{timeline.speaker_name}</strong></span>}
                                            {timeline.location && <span>Room: <strong style={{ color: "var(--text)" }}>{timeline.location}</strong></span>}
                                          </p>
                                        )}

                                        {/* Bubble UI Tags with Profile Skill Match Highlighting */}
                                        {timeline.tags && Array.isArray(timeline.tags) && timeline.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 pt-1.5 pb-0.5">
                                            {timeline.tags.map((tag: string) => {
                                              const isMatch = userSkills.some(
                                                (skill) =>
                                                  skill.toLowerCase() === tag.toLowerCase() ||
                                                  tag.toLowerCase().includes(skill.toLowerCase()) ||
                                                  skill.toLowerCase().includes(tag.toLowerCase())
                                              );
                                              return (
                                                <span
                                                  key={tag}
                                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all duration-300 ${isMatch
                                                      ? "bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-rose-500/25 border border-amber-500/50 text-amber-300 shadow-2xs shadow-amber-500/20 animate-pulse"
                                                      : "bg-black/15 dark:bg-white/10 border border-current/15 text-current/90 backdrop-blur-xs"
                                                    }`}
                                                >
                                                  {isMatch ? (
                                                    <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                                  ) : (
                                                    <Tag className="w-2.5 h-2.5 opacity-70 shrink-0" />
                                                  )}
                                                  <span>#{tag}</span>
                                                  {isMatch && (
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-500/30">
                                                      Match
                                                    </span>
                                                  )}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {isExpanded && timeline.description && (
                                          <div
                                            className="text-[11px] font-semibold opacity-95 pt-2 mt-2 border-t border-current/10 prose prose-sm max-w-none prose-current leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden"
                                            dangerouslySetInnerHTML={{ __html: timeline.description }}
                                          />
                                        )}
                                        {!isExpanded && timeline.description && (
                                          <p className="text-[10px] font-bold opacity-60 mt-1.5 flex items-center gap-1">
                                            Click to view details <span className="text-[8px]">▼</span>
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                    })()}

                    {event.timelines.length > visibleEventAgendaCount && (
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <Button
                          onClick={() => setVisibleEventAgendaCount((c) => c + 20)}
                          variant="outline"
                          className="rounded-2xl border-current/20 bg-transparent text-current font-bold px-6 py-5 hover:opacity-80 shadow-sm flex items-center gap-2"
                        >
                          <ChevronDown className="w-5 h-5" />
                          Show More Sessions
                        </Button>
                        <p className="text-[10px] font-semibold opacity-60">
                          Showing {Math.min(visibleEventAgendaCount, event.timelines.length)} of {event.timelines.length} sessions
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}



              {/* Card Block 4: Map Location Card with iframe embed */}
              <div className="p-6 sm:p-8 rounded-[24px] border shadow-sm space-y-5 transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)", boxShadow: isDark ? "0 14px 34px -10px rgba(0,0,0,0.5), 0 2px 8px -2px rgba(0,0,0,0.3)" : "0 14px 34px -10px rgba(15,23,42,0.07), 0 2px 8px -2px rgba(15,23,42,0.04)" }}>
                <h2 className="text-xl sm:text-2xl font-bold font-bricolage tracking-tight flex items-center gap-2.5 text-foreground">
                  <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
                  <span>Location Details</span>
                </h2>

                <div className="flex flex-col gap-5">
                  <div className="space-y-1.5">
                    <h3 className="font-bricolage font-bold text-base capitalize text-foreground">{event.mode} Venue</h3>
                    <p className="text-muted-foreground font-medium text-sm leading-relaxed">{event.location}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline font-bold text-xs underline-offset-4 mt-1 cursor-pointer"
                    >
                      <span>View on Google Maps</span>
                      <span>→</span>
                    </a>
                  </div>

                  {/* Real Google Maps embed iframe preview */}
                  <div className="w-full h-64 rounded-2xl overflow-hidden border border-border relative shadow-sm shrink-0 bg-muted/20">
                    <iframe
                      title="Event Location Map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: STICKY CARDS (Sticky scroll design matching video & screenshot) */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6 self-start min-w-0">

              {/* Right Card 1: Event Summary & Host Card */}
              <div className="p-6 sm:p-7 rounded-[24px] border shadow-sm space-y-4 transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)", boxShadow: isDark ? "0 14px 34px -10px rgba(0,0,0,0.5), 0 2px 8px -2px rgba(0,0,0,0.3)" : "0 14px 34px -10px rgba(15,23,42,0.07), 0 2px 8px -2px rgba(15,23,42,0.04)" }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    {event.type}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-border bg-input/50 text-muted-foreground">
                    {event.mode === 'online' ? <Laptop className="w-3.5 h-3.5" /> : event.mode === 'hybrid' ? <MonitorSmartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    {event.mode} Event
                  </span>
                </div>

                <h1 className="font-bricolage text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight break-words">
                  {event.title}
                </h1>

                <div className="flex items-center gap-3.5 pt-1">
                  <div className="w-11 h-11 rounded-full border border-border bg-input/50 flex items-center justify-center shrink-0 text-muted-foreground">
                    <UserCircle2 className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black text-muted-foreground uppercase tracking-widest">HOSTED BY</p>
                    <p className="font-bold text-sm sm:text-base text-foreground truncate">
                      {event.organizerName || "Eventrix Organizer"}
                    </p>
                  </div>
                </div>

                {timeLeftStr && (
                  <div className="flex items-center gap-2 text-xs font-bold w-fit px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>{timeLeftStr}</span>
                  </div>
                )}
              </div>

              {/* Right Card 2: Ticket Pricing, Schedule, Venue & Registration CTAs */}
              <div className="p-6 sm:p-7 rounded-[24px] border shadow-xl space-y-6 transition-all" style={{ background: "var(--card)", borderColor: "var(--border)", backdropFilter: "blur(20px)", boxShadow: isDark ? "0 16px 36px -10px rgba(0,0,0,0.55), 0 2px 8px -2px rgba(0,0,0,0.3)" : "0 16px 36px -10px rgba(15,23,42,0.09), 0 2px 8px -2px rgba(15,23,42,0.04)" }}>
                {/* Pricing Tag */}
                <div className="text-center pb-5 border-b border-dashed border-border">
                  <p className="font-mono text-[10.5px] font-black uppercase tracking-widest text-muted-foreground">TICKET PRICING</p>
                  <h2 className="font-bricolage text-4xl sm:text-5xl font-black tracking-tight text-foreground mt-2">
                    {event.fee === 0 ? "₹0" : `₹${event.fee}`}
                  </h2>
                </div>

                {/* Time & location lists */}
                <div className="space-y-4">
                  <div className="flex gap-3.5 items-start">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-snug text-foreground">
                        {formatFullDate(event.startDate)}
                      </h4>
                      <p className="text-muted-foreground text-xs font-medium mt-0.5">
                        {formatTime(event.startDate)} - {formatTime(event.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm leading-snug truncate max-w-[220px] sm:max-w-[280px] text-foreground">
                        {event.location}
                      </h4>
                      <p className="text-muted-foreground text-xs font-medium capitalize mt-0.5">
                        {event.mode} Event
                      </p>
                    </div>
                  </div>
                </div>

                {/* Capacity Status progress card */}
                <div className="p-4.5 rounded-2xl border space-y-3 transition-all" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-center font-mono text-[10.5px] font-black uppercase tracking-wider">
                    <span className="text-muted-foreground">Capacity Status</span>
                    {timeLeftStr && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {timeLeftStr}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {event.capacity > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-muted-foreground">
                          <span>Seats Capacity</span>
                          <span className="text-primary font-black">
                            {event.capacity - registeredCount > 0
                              ? `${event.capacity - registeredCount} spots left`
                              : "Sold Out"}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round((registeredCount / event.capacity) * 100))}%`,
                              background: "linear-gradient(90deg, var(--accent), var(--accent2, #8b5cf6))",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                          Unlimited Spots Available
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs border-t border-border/50 pt-2.5">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{registeredCount} participants registered</span>
                    </div>
                  </div>
                </div>

                {/* Action CTAs */}
                {isStaff || isOwner ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl flex items-start gap-3 border bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
                      <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-xs">Organizer Preview Mode</p>
                        <p className="opacity-85 text-[11px] font-semibold mt-0.5 leading-relaxed">
                          You are previewing this event as an organizer or staff member. Registration is restricted to regular participants.
                        </p>
                      </div>
                    </div>
                    <Button
                      disabled
                      className="w-full rounded-2xl py-6 bg-muted text-muted-foreground font-bold text-sm cursor-not-allowed shadow-none border border-border"
                    >
                      Registration Disabled (Preview Mode)
                    </Button>
                    {viewMode === "PREVIEW" && (
                      <Button
                        onClick={() => setViewMode("DASHBOARD")}
                        className="w-full rounded-2xl py-6 font-bold text-sm flex items-center justify-center gap-2 text-white shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2, #8b5cf6))",
                        }}
                      >
                        <LayoutDashboard className="w-4 h-4" /> Return to Event Dashboard
                      </Button>
                    )}
                  </div>
                ) : isRegistered ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl flex items-start gap-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-xs">You are registered!</p>
                        <p className="opacity-80 text-[11px] font-semibold mt-0.5">Your ticket check details are confirmed.</p>
                      </div>
                    </div>
                    <Link href={`/dashboard/team/${userDashboardId}`} className="block">
                      <Button
                        className="w-full rounded-2xl py-6 text-white font-bold text-sm shadow-xl transition-all hover:-translate-y-0.5 font-bricolage text-[15px] cursor-pointer"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2, #8b5cf6))",
                        }}
                      >
                        Go to Participant Dashboard
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Link href={`/events/${eventId}/register`} className="block">
                    <Button
                      disabled={isRegistrationBlocked}
                      className="w-full rounded-2xl py-6 text-white font-bold text-sm shadow-xl transition-all hover:-translate-y-0.5 font-bricolage text-[15px] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, var(--accent), var(--accent2, #8b5cf6))",
                      }}
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}

                {/* Quick action save and share buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <Button
                    onClick={handleToggleSave}
                    variant="outline"
                    className="rounded-full border border-border text-foreground font-bold text-xs h-10 flex items-center justify-center gap-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Bookmark className={`w-4 h-4 ${event?.is_saved ? "fill-current text-primary" : ""}`} />
                    <span>{event?.is_saved ? "Saved" : "Save Event"}</span>
                  </Button>
                  <Button
                    onClick={() => setIsShareModalOpen(true)}
                    variant="outline"
                    className="rounded-full border border-border text-foreground font-bold text-xs h-10 flex items-center justify-center gap-2 hover:bg-muted/50 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Event</span>
                  </Button>
                </div>
              </div>

              {/* Quick link to Dashboard if host */}
              {(isOwner || isStaff) && viewMode === "PREVIEW" && (
                <div
                  onClick={() => setViewMode("DASHBOARD")}
                  className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-input/50 flex items-center justify-center text-primary shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">Event Dashboard</p>
                    <p className="text-xs text-muted-foreground truncate">You’re managing this event</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

            </div>
          </section>

          {/* SHARE MODAL COMPONENT */}
          <AnimatePresence>
            {isShareModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-4 text-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(false)}
                    className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-900 p-1.5 hover:bg-zinc-100 rounded-full transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black tracking-tight">Share Event</h3>
                    <p className="text-zinc-400 text-xs font-semibold">Copy link below to invite participants.</p>
                  </div>

                  <div className="flex gap-2 items-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                    <input
                      type="text"
                      value={typeof window !== "undefined" ? window.location.href : ""}
                      readOnly
                      className="flex-1 bg-transparent text-xs font-semibold text-zinc-600 focus:outline-none select-all min-w-0"
                    />
                    <Button
                      onClick={handleCopyLink}
                      size="sm"
                      className={`rounded-lg ${activeAccent.bg} hover:opacity-90 text-white font-bold text-[10px] shrink-0`}
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STAFF PREVIEW TOOLBAR */}
          {isStaff && viewMode === "PREVIEW" && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-zinc-950/95 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl border border-zinc-850 shadow-2xl backdrop-blur-md flex items-center gap-2.5 sm:gap-4 animate-in fade-in slide-in-from-bottom-5 max-w-[92vw] w-auto">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="text-[10px] sm:text-xs font-bold text-zinc-200 whitespace-nowrap">
                  <span className="hidden sm:inline">Preview Mode: Organizer view</span>
                  <span className="sm:hidden">Organizer Preview</span>
                </p>
              </div>
              <div className="w-px h-4 bg-zinc-800 shrink-0" />
              <button
                onClick={() => setViewMode("DASHBOARD")}
                className="text-[9px] sm:text-xs font-black bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-sm hover:scale-105 active:scale-95 whitespace-nowrap"
                type="button"
              >
                Exit Preview
              </button>
            </div>
          )}
        </div>
      </AppLayout>
    </div>
  );
}