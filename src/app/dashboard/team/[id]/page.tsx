"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Crown, QrCode, Send, Edit3, Check, X,
  Trash2, Loader2, Calendar, Clock,
  Plus, AlertTriangle, MapPin, Share2, ExternalLink,
  Download, Mail, CheckCircle2,
  CalendarPlus, SunMedium, UserPlus, Sparkles,
  ChevronDown, ChevronUp, Copy
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/axios";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import AppLayout from "@/components/layout/AppLayout";
import BackButton from "@/components/ui/BackButton";
import { API_BASE_URL } from "@/config/env";
import PersonalizeAgendaModal from "@/components/agenda/PersonalizeAgendaModal";
import ShareEventModal from "@/components/events/ShareEventModal";

export default function TeamParticipantDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const { isDark, activeAccent } = useAppearance();

  // Data States
  const [teamData, setTeamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Agenda & Calendar States
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [personalAgenda, setPersonalAgenda] = useState<any[]>([]);

  // Announcements State
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [visibleAnnouncementsCount, setVisibleAnnouncementsCount] = useState<number>(3);
  const [isTogglingReaction, setIsTogglingReaction] = useState(false);

  // UI Action States
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameStr, setEditNameStr] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showEntryPassModal, setShowEntryPassModal] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<any>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Project Submission State
  const [projTitle, setProjTitle] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  // Time state for live countdown
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Decode current user ID from JWT token in localStorage
  const currentUserId = useMemo(() => {
    try {
      if (typeof window === "undefined") return null;
      const token = localStorage.getItem("accessToken");
      if (!token) return null;
      const payload = JSON.parse(window.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload.id || payload.userId || payload._id || null;
    } catch (e) {
      return null;
    }
  }, []);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/team-dashboard/${id}`);
      const data = response.data.data;
      setTeamData(data);
      setEditNameStr(data?.name || "");
      if (data?.submissions && data.submissions.length > 0) {
        setProjTitle(data.submissions[0].title || "");
        setProjUrl(data.submissions[0].repo_url || "");
        setIsSubmitted(true);
      }
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to load dashboard data. Please make sure you are registered and belong to this team."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const targetEventId = useMemo(() => {
    return Number(teamData?.event?.id || teamData?.event_id || 0);
  }, [teamData?.event?.id, teamData?.event_id]);

  const fetchAgendaStatus = useCallback(async (overrideEventId?: number) => {
    try {
      const evId = overrideEventId || Number(teamData?.event?.id || teamData?.event_id);
      const url = evId ? `/agenda?eventId=${evId}` : "/agenda";
      const res = await api.get(url);
      if (res.data) {
        if (res.data.isCalendarConnected) {
          setIsCalendarConnected(true);
        }
        const allItems = res.data.data || [];
        setPersonalAgenda(allItems);
      }
    } catch (err) {
      console.warn("Could not fetch agenda status:", err);
    }
  }, [teamData?.event?.id, teamData?.event_id]);

  const fetchAnnouncements = useCallback(async (eventId: number) => {
    try {
      const res = await api.get(`/events/${eventId}/announcements`);
      if (res.data?.data) {
        setAnnouncementsList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load announcements for dashboard", err);
    }
  }, []);

  useEffect(() => {
    if (id) fetchDashboardData();
  }, [id]);

  useEffect(() => {
    fetchAgendaStatus();
  }, [fetchAgendaStatus]);

  useEffect(() => {
    if (teamData?.event?.id) {
      fetchAnnouncements(teamData.event.id);
    }
  }, [teamData?.event?.id, fetchAnnouncements]);

  // Update Team Name
  const handleUpdateName = async () => {
    if (!editNameStr.trim() || editNameStr === teamData?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      setActionLoading("name");
      await api.patch(`/team-dashboard/${id}/name`, { name: editNameStr.trim() });
      setTeamData((prev: any) => ({ ...prev, name: editNameStr.trim() }));
      setIsEditingName(false);
      setToast({ message: "Team name updated successfully!", type: "success" });
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || err.response?.data?.error || "Error updating team name. Must be at least 3 characters.",
        type: "error"
      });
    } finally {
      setActionLoading("");
    }
  };

  // Invite Member
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setActionLoading("invite");
      await api.post(`/team-dashboard/${id}/invite`, { email: inviteEmail.trim() });
      setInviteEmail("");
      setShowInviteModal(false);
      setToast({ message: "Invitation sent successfully!", type: "success" });
      await fetchDashboardData();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || err.response?.data?.error || "Failed to send invitation.",
        type: "error"
      });
    } finally {
      setActionLoading("");
    }
  };

  // Remove Member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    const userIdToRemove = memberToRemove.user_id;
    try {
      setActionLoading(`remove-${userIdToRemove}`);
      await api.delete(`/team-dashboard/${id}/members`, {
        data: { userIdToRemove }
      });
      setShowRemoveModal(false);
      setMemberToRemove(null);
      setToast({ message: "Member removed from team.", type: "success" });
      await fetchDashboardData();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || err.response?.data?.error || "Error removing member.",
        type: "error"
      });
    } finally {
      setActionLoading("");
    }
  };

  // Revoke Invite
  const handleRevokeInvite = async () => {
    if (!inviteToRevoke) return;
    try {
      setActionLoading(`revoke-${inviteToRevoke.id}`);
      await api.delete(`/team-dashboard/${id}/invites`, {
        data: { inviteId: inviteToRevoke.id }
      });
      setShowRevokeModal(false);
      setInviteToRevoke(null);
      setToast({ message: "Invitation revoked successfully.", type: "success" });
      await fetchDashboardData();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || err.response?.data?.error || "Failed to revoke invitation.",
        type: "error"
      });
    } finally {
      setActionLoading("");
    }
  };

  // Submit Project
  const handleProjectSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!projTitle.trim() || !projUrl.trim()) {
      setToast({ message: "Please fill in both project title and repository URL.", type: "error" });
      return;
    }
    try {
      setActionLoading("submit-project");
      await api.post(`/team-dashboard/${id}/submit`, {
        title: projTitle.trim(),
        repoUrl: projUrl.trim()
      });
      setIsSubmitted(true);
      setToast({ message: "Project submitted successfully!", type: "success" });
      await fetchDashboardData();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.message || err.response?.data?.error || "Failed to submit project.",
        type: "error"
      });
    } finally {
      setActionLoading("");
    }
  };

  // Toggle Emoji Reaction on Real Announcement
  const handleToggleEmojiReaction = async (announcementId: number, emoji: string) => {
    const eventId = teamData?.event?.id;
    if (!eventId || isTogglingReaction) return;

    // Optimistic UI update
    setAnnouncementsList(prev => prev.map(ann => {
      if (ann.id !== announcementId) return ann;
      const summary = Array.isArray(ann.reactionSummary) ? [...ann.reactionSummary] : [];
      const existingIdx = summary.findIndex((r: any) => r.emoji === emoji);
      if (existingIdx > -1) {
        const item = summary[existingIdx];
        const nextReacted = !item.hasReacted;
        const nextCount = nextReacted ? item.count + 1 : Math.max(0, item.count - 1);
        summary[existingIdx] = { ...item, count: nextCount, hasReacted: nextReacted };
      } else {
        summary.push({ emoji, count: 1, hasReacted: true });
      }
      return { ...ann, reactionSummary: summary };
    }));

    try {
      setIsTogglingReaction(true);
      const res = await api.post(`/events/${eventId}/announcements/${announcementId}/react`, { emoji });
      if (res.data?.data) {
        setAnnouncementsList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    } finally {
      setIsTogglingReaction(false);
    }
  };

  // Export Agenda .ics
  const handleDownloadICS = async () => {
    try {
      const res = await api.get("/agenda/export/ics", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/calendar" }));
      const link = document.createElement("a");
      link.href = url;
      const cleanTitle = (teamData?.event?.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.setAttribute("download", `${cleanTitle}-agenda.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast({ message: "Agenda exported to calendar file (.ics)", type: "success" });
    } catch (err) {
      const evTitle = teamData?.event?.title || "Community Event";
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Eventrix//Agenda//EN\nBEGIN:VEVENT\nSUMMARY:${evTitle}\nDESCRIPTION:${teamData?.name || "Participant Agenda"}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${evTitle.replace(/\s+/g, "_")}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ message: "Agenda exported to calendar file (.ics)", type: "success" });
    }
  };

  // Connect Google Calendar OAuth
  const handleConnectCalendar = () => {
    if (isCalendarConnected) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : "";
    const returnUrl = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
    window.location.href = `${API_BASE_URL}/auth/google/calendar?token=${token}&returnUrl=${returnUrl}`;
  };

  // Print Pass as PDF
  const handlePrintPass = () => {
    window.print();
  };

  // Real Data Bindings
  const eventDetails = teamData?.event || {};
  const eventTitle = eventDetails.title || "Event Dashboard";
  const eventStartDate = eventDetails.start_date;
  const eventEndDate = eventDetails.end_date;
  const bannerUrl = eventDetails.banner_url || eventDetails.logo_url || "";

  const rawMembers = teamData?.members || [];
  const rawInvites = teamData?.invites || [];
  const isLeader = Boolean(teamData?.is_leader);

  // Solo check
  const isSolo = useMemo(() => {
    const regType = (eventDetails.registration_type || "").toLowerCase();
    return regType === "solo" || regType === "individual" || (eventDetails.max_team_size !== undefined && Number(eventDetails.max_team_size) <= 1);
  }, [eventDetails.registration_type, eventDetails.max_team_size]);

  const maxTeamSize = isSolo ? 1 : (eventDetails.max_team_size || 4);
  const currentTeamName = teamData?.name || (isSolo ? "My Registration" : "Team Space");

  // Current Member Info
  const currentMember = useMemo(() => {
    if (!rawMembers || rawMembers.length === 0) return null;
    if (currentUserId) {
      const found = rawMembers.find((m: any) => Number(m.user_id) === Number(currentUserId));
      if (found) return found;
    }
    return rawMembers[0] || null;
  }, [rawMembers, currentUserId]);

  const currentTicketCode = currentMember?.ticket_code || (teamData?.id ? `CC-TCK-${teamData.id}` : "N/A");
  const currentHolderName = currentMember?.user?.name || (isLeader ? "Team Leader" : "Participant");
  const isCheckedIn = Boolean(currentMember?.checked_in);

  // Gate / Room derived from real location or mode
  const gateLabel = useMemo(() => {
    if (eventDetails.mode === "online") return "Online";
    if (!eventDetails.location) return "TBA";
    const parts = eventDetails.location.split(",");
    return parts[0].trim() || "Main Gate";
  }, [eventDetails.location, eventDetails.mode]);

  // Doors Time formatted from real event start date
  const doorsTime = useMemo(() => {
    if (!eventStartDate) return "TBA";
    const d = new Date(eventStartDate);
    return isNaN(d.getTime()) ? "TBA" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [eventStartDate]);

  // Formatted Event Date
  const formattedDate = useMemo(() => {
    if (!eventStartDate) return "TBA";
    const d = new Date(eventStartDate);
    if (isNaN(d.getTime())) return "TBA";
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  }, [eventStartDate]);

  // Countdown Helper with real timestamps
  const countdown = useMemo(() => {
    if (!eventStartDate) return { short: "TBA", isLive: false, isConcluded: false };
    const startMs = new Date(eventStartDate).getTime();
    if (isNaN(startMs)) return { short: "TBA", isLive: false, isConcluded: false };

    const currentMs = currentTime.getTime();
    const endMs = eventEndDate ? new Date(eventEndDate).getTime() : startMs + 4 * 3600000;

    if (currentMs >= endMs) {
      return { short: "Concluded", isLive: false, isConcluded: true };
    }
    if (currentMs >= startMs) {
      return { short: "Live Now", isLive: true, isConcluded: false };
    }

    const diff = startMs - currentMs;
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);

    return {
      short: `${d}d ${h}h ${m}m`,
      isLive: false,
      isConcluded: false
    };
  }, [eventStartDate, eventEndDate, currentTime]);

  // Real Member Roster
  const displayRoster = useMemo(() => {
    return rawMembers.map((m: any) => {
      const isSelf = currentUserId && Number(m.user_id) === Number(currentUserId);
      const isLeaderMember = m.user_id === teamData?.leader_id;
      let role = "Member";
      if (isLeaderMember && isSelf) role = "Leader (You)";
      else if (isLeaderMember) role = "Leader";
      else if (isSelf) role = "You";

      const name = m.user?.name || "Participant";
      const email = m.user?.email || "";
      const ini = name
        .split(" ")
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "P";

      return {
        id: m.user_id,
        name,
        email,
        role,
        ini,
        isSelf,
        raw: m
      };
    });
  }, [rawMembers, teamData?.leader_id, currentUserId]);

  // Real Agenda Items & Personalized Status
  const { displayAgenda, isPersonalized } = useMemo(() => {
    const evId = targetEventId;
    const eventUserAgendas = (personalAgenda || []).filter((item: any) => {
      if (!evId) return true;
      const itemEvId = Number(item.event_id || item.event?.id || item.timeline?.event_id);
      return !itemEvId || itemEvId === evId;
    });

    // Check if user has explicitly personalized this event
    const hasPersonalized = eventUserAgendas.some(
      (item: any) => item.status === "ACCEPTED" || item.status === "DECLINED"
    );

    if (hasPersonalized) {
      // Filter ONLY ACCEPTED sessions for user's personalized view
      const acceptedSessions = eventUserAgendas.filter(
        (item: any) => item.status === "ACCEPTED"
      );

      // Sort accepted sessions chronologically by start_time
      acceptedSessions.sort((a: any, b: any) => {
        const timeA = new Date(a.timeline?.start_time || a.start_time || 0).getTime();
        const timeB = new Date(b.timeline?.start_time || b.start_time || 0).getTime();
        return timeA - timeB;
      });

      const mapped = acceptedSessions.map((item: any) => {
        const tId = Number(item.timeline_id || item.timeline?.id || item.id);
        const fallbackTl = eventDetails.timelines?.find((tl: any) => Number(tl.id) === tId);
        const t = item.timeline || fallbackTl || {};
        const start = t.start_time ? new Date(t.start_time) : (item.start_time ? new Date(item.start_time) : null);
        const tStr = start && !isNaN(start.getTime())
          ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
          : "TBA";
        return {
          id: item.id || t.id || tId,
          t: tStr,
          title: t.title || item.title || "Agenda Session",
          speaker: t.speaker_name || item.speaker_name || "",
          room: t.location || item.location || eventDetails.location || "Main Hall",
          warn: Boolean(item.conflict),
          warnText: item.conflict_description
        };
      });

      return { displayAgenda: mapped, isPersonalized: true };
    }

    // If not personalized yet, show full original event schedule
    if (eventDetails.timelines && eventDetails.timelines.length > 0) {
      const sortedTimelines = [...eventDetails.timelines].sort((a: any, b: any) => {
        const timeA = new Date(a.start_time || 0).getTime();
        const timeB = new Date(b.start_time || 0).getTime();
        return timeA - timeB;
      });

      const mapped = sortedTimelines.map((t: any) => {
        const start = t.start_time ? new Date(t.start_time) : null;
        const tStr = start && !isNaN(start.getTime())
          ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
          : "TBA";
        return {
          id: t.id,
          t: tStr,
          title: t.title,
          speaker: t.speaker_name || "",
          room: t.location || eventDetails.location || "Session Room",
          warn: false
        };
      });
      return { displayAgenda: mapped, isPersonalized: false };
    }

    return { displayAgenda: [], isPersonalized: false };
  }, [personalAgenda, eventDetails.timelines, eventDetails.location, targetEventId]);

  // Relative Time Formatter
  const getRelativeTime = (iso?: string) => {
    if (!iso) return "Recently";
    const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 0) return "Recently";
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            Loading Dashboard...
          </p>
        </div>
  
      {/* =========================================================
          10. SHARE EVENT MODAL
          ========================================================= */}
      <ShareEventModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={{
          id: targetEventId || (typeof id === "string" ? id : (Array.isArray(id) ? id[0] : 0)),
          title: eventTitle,
          description: teamData?.event?.description || eventDetails?.description || "Join this event on Eventrix!",
          banner_url: bannerUrl,
          start_date: eventStartDate,
          location: eventDetails?.location,
          mode: eventDetails?.mode,
          category: teamData?.event?.category || (isSolo ? "Individual Pass" : "Team Space"),
          url: typeof window !== "undefined" ? (targetEventId ? `${window.location.origin}/events/${targetEventId}` : window.location.href) : undefined,
        }}
      />
    </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 grid place-items-center mb-4 border border-red-500/20">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[var(--text)]">Registration Not Found</h2>
          <p className="text-sm text-[var(--muted)] max-w-md mb-6">{error}</p>
          <button
            onClick={() => router.push("/events/mine")}
            className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            Go to My Events
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div data-screen-label="Ticket and team" className="flex flex-col gap-6 animate-in fade-in duration-300">

          {/* Back Navigation & Breadcrumb */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <BackButton fallbackHref="/events/mine" label="Back to My Events" />
            <div className="text-[12px] font-mono text-[var(--subtle)] hidden sm:block">
              Workspace &gt; Event Dashboard &gt; <span className="text-[var(--text)] font-semibold">{eventTitle}</span>
            </div>
          </div>

          {/* =========================================================
              1. UNIFIED COMMAND HERO BANNER
              ========================================================= */}
          <div
            className="relative overflow-hidden rounded-[24px] p-6 sm:p-7 text-white flex flex-col gap-5"
            style={{
              background: "radial-gradient(90% 140% at 100% 0%, #7c3aed 0%, transparent 60%), linear-gradient(135deg, #1e1b4b, #0b0b1a)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 22px 44px -24px rgba(76,29,149,0.5)"
            }}
          >
            {/* Grid overlay pattern */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
                backgroundSize: "32px 32px"
              }}
            />

            {/* Top Row: Event Category & Public Event Link + Live Status */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="h-6 px-2.5 rounded-full bg-white/10 border border-white/20 text-[11.5px] font-mono font-semibold tracking-wider uppercase text-white/90 inline-flex items-center gap-1.5 backdrop-blur-md">
                  <Sparkles className="w-3 h-3 text-purple-300" />
                  {teamData?.event?.category || (isSolo ? "Individual Pass" : "Team Space")}
                </span>
                {targetEventId > 0 && (
                  <a
                    href={`/events/${targetEventId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-6 px-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11.5px] font-medium text-white/90 inline-flex items-center gap-1.5 transition-colors backdrop-blur-md"
                  >
                    <span>{eventTitle}</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-[28px] px-3 rounded-full bg-white/12 border border-white/20 text-[12px] font-mono font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {countdown.isLive ? "Live Now" : countdown.isConcluded ? "Concluded" : `Starts in ${countdown.short}`}
                </span>
                <span
                  className={`h-[28px] px-3 rounded-full text-[12px] font-semibold inline-flex items-center whitespace-nowrap shadow-xs backdrop-blur-md ${
                    isCheckedIn
                      ? "bg-blue-500/25 border border-blue-500/40 text-blue-200"
                      : "bg-emerald-500/25 border border-emerald-500/40 text-emerald-200"
                  }`}
                >
                  {isCheckedIn ? "Checked In" : "Registered"}
                </span>
              </div>
            </div>

            {/* Middle Row: Space Title & Actions (Fills previous empty right area) */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex-1 min-w-0 w-full">
                <div className="text-[12.5px] text-white/60 font-medium">Participant Workspace</div>
                {isEditingName && !isSolo && isLeader ? (
                  <div className="flex items-center gap-2 mt-1 max-w-md">
                    <input
                      value={editNameStr}
                      onChange={(e) => setEditNameStr(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      autoFocus
                      className="w-full bg-transparent text-white text-[28px] sm:text-[36px] font-bold tracking-tight outline-none border-b border-dashed border-white/50 pb-1"
                      style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={actionLoading === "name"}
                      className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      {actionLoading === "name" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-3 mt-1 group ${!isSolo && isLeader ? "cursor-pointer" : ""}`}
                    onClick={() => !isSolo && isLeader && setIsEditingName(true)}
                  >
                    <h1
                      className="text-white text-[28px] sm:text-[36px] font-bold tracking-tight border-b border-dashed border-white/20 hover:border-white/50 pb-0.5 truncate transition-colors"
                      style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                    >
                      {currentTeamName}
                    </h1>
                    {!isSolo && isLeader && (
                      <Edit3 className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowEntryPassModal(true)}
                  className="h-9 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[13px] font-semibold text-white inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs backdrop-blur-md active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-200" />
                  <span>View Digital Pass</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadICS}
                  className="h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[13px] font-semibold text-white inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs backdrop-blur-md active:scale-95"
                  title="Download .ics Calendar File"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-purple-200" />
                  <span>Add to Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[13px] font-semibold text-white inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs backdrop-blur-md active:scale-95"
                  title="Share Event"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Metadata Strip */}
            <div className="relative z-10 pt-3 border-t border-white/10 flex flex-wrap items-center gap-4 text-[12.5px] text-white/80">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>{formattedDate}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span>Doors open {doorsTime}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-300" />
                <span>{gateLabel}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/30" />
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-300" />
                <span>{isSolo ? "Solo Participant" : `${displayRoster.length} / ${maxTeamSize} Teammates`}</span>
              </div>
            </div>
          </div>

          {/* =========================================================
              2. TWO-COLUMN RESPONSIVE GRID
              ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ----------------- LEFT COLUMN (My Agenda & Announcements) ----------------- */}
            <div className="lg:col-span-7 flex flex-col gap-6">

              {/* My Agenda Card */}
              <div
                className="rounded-[22px] p-5 sm:p-6 flex flex-col gap-4"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)"
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--accent)]" />
                    <h2
                      className="text-[17px] font-bold tracking-tight text-[var(--text)]"
                      style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                    >
                      My agenda · {formattedDate}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAgendaModal(true)}
                      className="h-[32px] px-3 rounded-[10px] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-xs"
                      style={{
                        background: "linear-gradient(135deg, var(--accent), var(--accent2, var(--accent)))",
                        color: "#fff"
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isPersonalized ? "Edit My Agenda" : "Personalize Agenda"}</span>
                    </button>

                    {isCalendarConnected ? (
                      <span
                        className="h-[32px] px-2.5 rounded-[10px] border text-[11.5px] font-semibold inline-flex items-center gap-1.5"
                        style={{
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: "#10b981"
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Google Calendar</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectCalendar}
                        className="h-[32px] px-2.5 rounded-[10px] border text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)",
                          color: "var(--text)"
                        }}
                      >
                        <span>Connect Calendar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadICS}
                      className="h-[32px] px-2.5 rounded-[10px] border text-[12px] font-mono font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      style={{
                        background: "var(--input)",
                        borderColor: "var(--border)",
                        color: "var(--muted)"
                      }}
                      title="Download .ics File"
                    >
                      <Download className="w-3 h-3" />
                      <span>.ics</span>
                    </button>
                  </div>
                </div>

                {/* Agenda Items List */}
                <div className="flex flex-col gap-2.5">
                  {displayAgenda.length > 0 ? (
                    displayAgenda.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3.5 p-3.5 rounded-[14px] transition-colors border"
                        style={{
                          background: "var(--input)",
                          borderColor: "var(--border)"
                        }}
                      >
                        <div
                          className="font-mono text-[12.5px] font-semibold w-[52px] shrink-0 pt-0.5"
                          style={{ color: "var(--muted)" }}
                        >
                          {item.t}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-[var(--text)] leading-snug">
                            {item.title}
                          </div>
                          {(item.speaker || item.room) && (
                            <div
                              className="text-[12.5px] mt-1 flex items-center gap-1.5 flex-wrap"
                              style={{ color: "var(--subtle)" }}
                            >
                              {item.speaker && <span>{item.speaker}</span>}
                              {item.speaker && item.room && <span>·</span>}
                              {item.room && <span>{item.room}</span>}
                            </div>
                          )}

                          {item.warn && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{item.warnText || "Conflicts with personal schedule"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-2" style={{ color: "var(--muted)" }}>
                      <Calendar className="w-8 h-8 opacity-40 mb-1" />
                      <p className="text-[13.5px] font-medium">No agenda sessions scheduled for this event yet.</p>
                      <p className="text-[12px] text-[var(--subtle)] max-w-sm">
                        When the organizer publishes timeline sessions, they will automatically appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Announcements Card */}
              <div
                className="rounded-[22px] p-5 sm:p-6 flex flex-col gap-4"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)"
                }}
              >
                {/* Header */}
                <div
                  className="text-[17px] font-bold tracking-tight text-[var(--text)] flex items-center justify-between"
                  style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                >
                  <div className="flex items-center gap-2">
                    <span>Announcements</span>
                    {announcementsList.length > 0 && (
                      <span
                        className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border"
                        style={{
                          background: "var(--card2)",
                          borderColor: "var(--border)",
                          color: "var(--muted)",
                        }}
                      >
                        {announcementsList.length} {announcementsList.length === 1 ? "update" : "updates"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Announcements Items (Latest 3 by default with Load More) */}
                <div className="flex flex-col">
                  {announcementsList.length > 0 ? (
                    <>
                      {announcementsList.slice(0, visibleAnnouncementsCount).map((a: any, idx: number) => {
                        const isLastInView = idx === Math.min(visibleAnnouncementsCount, announcementsList.length) - 1;
                        return (
                          <div
                            key={a.id}
                            className={`flex flex-col gap-2 py-3.5 ${
                              !isLastInView ? "border-b" : ""
                            }`}
                            style={{ borderColor: "var(--border)" }}
                          >
                            {/* Meta */}
                            <div
                              className="flex justify-between text-[12.5px]"
                              style={{ color: "var(--subtle)" }}
                            >
                              <span className="font-semibold">{a.author?.name || "Organizer"}</span>
                              <span>{getRelativeTime(a.createdAt || a.created_at)}</span>
                            </div>

                            {/* Title */}
                            <div className="text-[14.5px] font-semibold text-[var(--text)]">
                              {a.title}
                            </div>

                            {/* Body */}
                            <div
                              className="text-[13.5px] leading-relaxed whitespace-pre-wrap"
                              style={{ color: "var(--muted)" }}
                            >
                              {a.message || a.body || a.content}
                            </div>

                            {/* Emoji Reactions */}
                            <div className="flex gap-1.5 flex-wrap pt-1">
                              {["👍", "❤️", "🔥", "🎉", "💡", "🚀"].map((emoji) => {
                                const rxData = a.reactions?.[emoji] || { count: 0, users: [] };
                                const count = rxData.count || 0;
                                const hasReacted = currentUserId && Array.isArray(rxData.users) && rxData.users.some(
                                  (u: any) => (typeof u === "object" ? Number(u.id) : Number(u)) === Number(currentUserId)
                                );

                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleToggleEmojiReaction(a.id, emoji)}
                                    className="h-[28px] px-2.5 rounded-full text-[12.5px] inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                                    style={{
                                      background: hasReacted
                                        ? "color-mix(in oklab,var(--accent) 18%,transparent)"
                                        : "var(--input)",
                                      border: hasReacted
                                        ? "1px solid var(--accent)"
                                        : "1px solid var(--border)"
                                    }}
                                  >
                                    <span>{emoji}</span>
                                    {count > 0 && (
                                      <span
                                        className="text-[11.5px] font-semibold"
                                        style={{ color: "var(--muted)" }}
                                      >
                                        {count}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Load More Older Announcements Toggle */}
                      {announcementsList.length > 3 && (
                        <div className="pt-3 border-t mt-1" style={{ borderColor: "var(--border)" }}>
                          {visibleAnnouncementsCount < announcementsList.length ? (
                            <button
                              type="button"
                              onClick={() => setVisibleAnnouncementsCount((prev) => Math.min(prev + 3, announcementsList.length))}
                              className="w-full h-9 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                              style={{
                                background: "var(--input)",
                                borderColor: "var(--border)",
                                color: "var(--text)",
                              }}
                            >
                              <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                              <span>Load more older announcements ({announcementsList.length - visibleAnnouncementsCount} remaining)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setVisibleAnnouncementsCount(3)}
                              className="w-full h-9 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all hover:scale-[1.01] active:scale-95"
                              style={{
                                background: "var(--input)",
                                borderColor: "var(--border)",
                                color: "var(--muted)",
                              }}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Show latest 3 only</span>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center" style={{ color: "var(--muted)" }}>
                      <p className="text-[13px] font-medium">No announcements published yet.</p>
                      <p className="text-[11px] mt-0.5 opacity-70">Important updates from organizers will appear here.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ----------------- RIGHT COLUMN (Pass, Team, Submission & Venue) ----------------- */}
            <div className="lg:col-span-5 flex flex-col gap-6">

              {/* 1. DIGITAL BOARDING PASS CARD (Authentic ticket proportions ~380-420px) */}
              <div
                onClick={() => setShowEntryPassModal(true)}
                className="relative cursor-pointer rounded-[22px] overflow-hidden text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
                style={{
                  background: "#14112b",
                  boxShadow: "0 22px 44px -24px rgba(76,29,149,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                {/* Banner Background */}
                {bannerUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-30 transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${bannerUrl})` }}
                  />
                )}
                {/* Dark Scrim */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(110deg, #14112b 35%, rgba(20,17,43,.6) 100%)" }}
                />
                {/* Diagonal Sheen */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,.14) 45%, transparent 55%)" }}
                />

                {/* Top Section */}
                <div className="relative p-5 pb-4 flex flex-col gap-3 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] text-white/70 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
                      ENTRY PASS · ADMIT 1
                    </div>
                    <span className="text-[11px] font-mono text-white/50 tracking-wider">
                      {isCheckedIn ? "CHECKED IN" : "VALID PASS"}
                    </span>
                  </div>

                  <div
                    className="text-[20px] font-bold tracking-tight leading-tight line-clamp-2"
                    style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                  >
                    {eventTitle}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
                    <div className="min-w-0">
                      <div className="font-mono text-[9.5px] tracking-[0.14em] text-white/55">DATE</div>
                      <div className="font-semibold text-[13px] mt-0.5 truncate">{formattedDate}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[9.5px] tracking-[0.14em] text-white/55">GATE</div>
                      <div className="font-semibold text-[13px] mt-0.5 truncate">{gateLabel}</div>
                    </div>
                    <div className="min-w-0 col-span-2 sm:col-span-1">
                      <div className="font-mono text-[9.5px] tracking-[0.14em] text-white/55">IN</div>
                      <div className="font-semibold text-[13px] mt-0.5 truncate">{countdown.short}</div>
                    </div>
                  </div>
                </div>

                {/* Perforation Line with Semicircular Cutout Notches */}
                <div className="relative flex items-center my-1 z-10">
                  <span
                    className="absolute -left-[11px] w-[22px] h-[22px] rounded-full z-20 pointer-events-none"
                    style={{ background: "var(--bg)" }}
                  />
                  <div className="w-full border-t-2 border-dashed border-white/20 mx-4" />
                  <span
                    className="absolute -right-[11px] w-[22px] h-[22px] rounded-full z-20 pointer-events-none"
                    style={{ background: "var(--bg)" }}
                  />
                </div>

                {/* Bottom Ticket Stub (QR & Code) */}
                <div className="relative p-5 pt-3 flex items-center justify-between gap-4 z-10">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] text-white/55">TICKET HOLDER</div>
                    <div className="font-semibold text-[14px] text-white truncate">{currentHolderName}</div>
                    <div className="font-mono text-[11px] font-bold tracking-wider text-emerald-400 mt-0.5">
                      {currentTicketCode}
                    </div>
                    <div className="text-[11px] text-white/50 mt-1 flex items-center gap-1 group-hover:text-white/80 transition-colors">
                      <QrCode className="w-3 h-3" />
                      <span>Click to view full pass</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div className="w-[84px] h-[84px] p-1.5 rounded-[12px] bg-white flex items-center justify-center shadow-md">
                      <QRCodeSVG
                        value={currentTicketCode}
                        size={72}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#09090b"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. TEAM ROSTER / PARTICIPANT INFO CARD */}
              <div
                className="rounded-[22px] p-5 sm:p-6 flex flex-col gap-3.5"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)"
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div
                    className="text-[17px] font-bold tracking-tight text-[var(--text)]"
                    style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                  >
                    {isSolo ? "Participant Info" : "Team roster"}{" "}
                    {!isSolo && (
                      <span className="text-[var(--subtle)] font-medium text-[15px]">
                        {displayRoster.length} / {maxTeamSize}
                      </span>
                    )}
                  </div>
                  {!isSolo && isLeader && displayRoster.length < maxTeamSize && (
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className="h-[32px] px-3 rounded-[10px] text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      style={{
                        background: "var(--input)",
                        border: "1px solid var(--border)",
                        color: "var(--text)"
                      }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Invite
                    </button>
                  )}
                </div>

                {/* Real Member Rows */}
                <div className="flex flex-col gap-2.5">
                  {displayRoster.length > 0 ? (
                    displayRoster.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 group">
                        {/* Avatar */}
                        <span
                          className="w-[34px] h-[34px] rounded-full grid place-items-center text-[12px] font-bold shrink-0"
                          style={{
                            background: "var(--card2)",
                            color: "var(--muted)"
                          }}
                        >
                          {m.ini}
                        </span>

                        {/* Name & Email */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-[var(--text)] truncate">
                            {m.name}
                          </div>
                          <div className="text-[12px] text-[var(--subtle)] truncate">
                            {m.email}
                          </div>
                        </div>

                        {/* Role Pill */}
                        <span
                          className="h-[22px] px-2 rounded-[6px] text-[11.5px] font-semibold inline-flex items-center shrink-0"
                          style={{
                            background: "var(--card2)",
                            color: "var(--muted)"
                          }}
                        >
                          {m.role}
                        </span>

                        {/* Leader Remove Control (cannot remove themselves) */}
                        {isLeader && !m.isSelf && !isSolo && m.raw && (
                          <button
                            type="button"
                            onClick={() => {
                              setMemberToRemove(m.raw);
                              setShowRemoveModal(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity cursor-pointer"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
                      No members registered.
                    </div>
                  )}
                </div>

                {/* Real Pending Invites (Only if pending invites actually exist) */}
                {rawInvites.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--subtle)]">
                      Pending Invitations
                    </div>
                    {rawInvites.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-[12px] border border-dashed text-[12.5px]"
                        style={{
                          borderColor: "var(--border)",
                          color: "var(--subtle)"
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{inv.email}</span>
                        </div>
                        {isLeader && (
                          <button
                            type="button"
                            onClick={() => {
                              setInviteToRevoke(inv);
                              setShowRevokeModal(true);
                            }}
                            className="text-xs text-red-400 hover:underline shrink-0 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. PROJECT SUBMISSION CARD */}
              <div
                className="rounded-[22px] p-5 sm:p-6 flex flex-col gap-3.5"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)"
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div
                    className="text-[17px] font-bold tracking-tight text-[var(--text)]"
                    style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                  >
                    Project submission
                  </div>
                  {isSubmitted && (
                    <span className="h-[22px] px-2 rounded-[6px] bg-emerald-500/15 text-emerald-400 text-[11.5px] font-semibold inline-flex items-center gap-1 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Submitted
                    </span>
                  )}
                </div>

                {/* Title Input */}
                <input
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="Project title"
                  className="h-[42px] px-3.5 rounded-[12px] text-[14px] outline-none transition-colors border"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)"
                  }}
                />

                {/* Repo / Demo URL Input */}
                <input
                  value={projUrl}
                  onChange={(e) => setProjUrl(e.target.value)}
                  placeholder="Repository URL (e.g. github.com/username/project)"
                  className="h-[42px] px-3.5 rounded-[12px] text-[13px] font-mono outline-none transition-colors border"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border)",
                    color: "var(--text)"
                  }}
                />

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleProjectSubmit}
                  disabled={actionLoading === "project" || !projTitle.trim() || !projUrl.trim()}
                  className="h-[42px] rounded-[12px] font-semibold text-[14px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  style={{
                    background: "var(--text)",
                    color: "var(--bg)"
                  }}
                >
                  {actionLoading === "project" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving submission...</span>
                    </>
                  ) : isSubmitted ? (
                    "Update submission"
                  ) : (
                    "Submit project"
                  )}
                </button>
              </div>

              {/* 4. VENUE & LOCATION QUICK CARD */}
              <div
                className="rounded-[22px] p-5 sm:p-6 flex flex-col gap-3"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)"
                }}
              >
                <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text)]">
                  <MapPin className="w-4 h-4 text-[var(--accent)]" />
                  <span>Venue &amp; Check-In</span>
                </div>
                <div className="text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  {eventDetails.location || "Location to be announced by the organizer."}
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[var(--subtle)] pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Gate {gateLabel} · Doors open {doorsTime}</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

{/* =========================================================
          4. EXPANDED ENTRY PASS MODAL
          ========================================================= */}
      <AnimatePresence>
        {showEntryPassModal && (
          <motion.div
            key="entry-pass-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEntryPassModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] my-auto flex flex-col drop-shadow-[0_40px_60px_rgba(0,0,0,0.55)]"
            >
              {/* TOP CARD */}
              <div className="relative rounded-t-[26px] overflow-hidden text-white bg-[#14112b] p-6 pb-7">
                {/* Photo & Scrim */}
                {bannerUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${bannerUrl})` }}
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(20,17,43,.35), #14112b 92%)" }}
                />
                {/* Top Rainbow Stripe */}
                <div
                  className="absolute left-0 right-0 top-0 h-1"
                  style={{ background: "linear-gradient(90deg, #22d3ee, #a78bfa, #f472b6, #fbbf24)" }}
                />

                {/* Top Header */}
                <div className="relative flex justify-between items-center z-10">
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-white/15 grid place-items-center text-[11px] font-extrabold">
                      CC
                    </span>
                    <span className="font-mono text-[10.5px] tracking-[0.16em] opacity-80 whitespace-nowrap">
                      ENTRY PASS
                    </span>
                  </span>
                  <span className="font-mono text-[10.5px] tracking-[0.12em] px-2.5 py-1 rounded-full bg-white/15 border border-white/20 whitespace-nowrap">
                    ADMIT 1
                  </span>
                </div>

                {/* Event Title */}
                <div
                  className="relative mt-7 text-[26px] font-bold tracking-tight leading-tight line-clamp-2"
                  style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                >
                  {eventTitle}
                </div>

                {/* Real Details Grid */}
                <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] opacity-55">DATE</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] mt-0.5 truncate">{formattedDate}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] opacity-55">DOORS</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] mt-0.5 truncate">{doorsTime}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] opacity-55">GATE</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] mt-0.5 truncate">{gateLabel}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] opacity-55">HOLDER</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] mt-0.5 truncate">{currentHolderName}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] opacity-55">TEAM</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] mt-0.5 truncate">{currentTeamName}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.14em] opacity-55">STATUS</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] mt-0.5 truncate">
                      {isCheckedIn ? "Checked In" : "Confirmed"}
                    </div>
                  </div>
                </div>
              </div>

              {/* PERFORATION DIVIDER & NOTCHES */}
              <div className="relative h-0 bg-white">
                <span
                  className="absolute -left-3.5 -top-3.5 w-7 h-7 rounded-full"
                  style={{ background: "#09090b" }}
                />
                <span
                  className="absolute -right-3.5 -top-3.5 w-7 h-7 rounded-full"
                  style={{ background: "#09090b" }}
                />
                <div className="absolute left-5 right-5 -top-[1px] border-t-2 border-dashed border-slate-300" />
              </div>

              {/* BOTTOM CARD */}
              <div className="rounded-b-[26px] bg-white text-slate-900 p-6 flex flex-col items-center gap-3.5">
                {/* QR Code Container with Scanline Glow */}
                <div className="relative p-3 rounded-[18px] border border-slate-200 shadow-inner">
                  <QRCodeSVG
                    value={currentTicketCode}
                    size={164}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                  <div className="absolute left-3 right-3 h-[2px] top-1/2 bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent shadow-[0_0_12px_#8b5cf6] opacity-80 pointer-events-none" />
                </div>

                {/* Ticket Code: Decreased font size & wrapped in a sleek pill to fit ticket width perfectly */}
                <div
                  className="w-full text-center px-2"
                >
                  <div
                    className="inline-block font-mono text-[11px] sm:text-[11.5px] font-bold tracking-[0.06em] px-3.5 py-1.5 rounded-xl border max-w-full truncate select-all shadow-2xs"
                    style={{
                      background: "#f1f5f9",
                      borderColor: "#e2e8f0",
                      color: "#1e293b"
                    }}
                    title={currentTicketCode}
                  >
                    {currentTicketCode}
                  </div>
                </div>

                {/* Brightness helper */}
                <div
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: "#64748b" }}
                >
                  <SunMedium className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Turn up brightness at the gate</span>
                </div>

                {/* Status Badge */}
                <div
                  className="flex items-center gap-1.5 h-[26px] px-3 rounded-full text-[12px] font-semibold"
                  style={{
                    backgroundColor: isCheckedIn ? "#d1fae5" : "#fef3c7",
                    color: isCheckedIn ? "#065f46" : "#b45309"
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isCheckedIn ? "#10b981" : "#f59e0b" }}
                  />
                  <span>{isCheckedIn ? "Checked in" : "Not checked in"}</span>
                </div>

                {/* Functional Download / Save Pass Button with Guaranteed High-Contrast White Text */}
                <div className="w-full mt-1">
                  <button
                    type="button"
                    onClick={handlePrintPass}
                    className="w-full h-[46px] rounded-[12px] font-semibold text-[14px] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md hover:opacity-95"
                    style={{
                      backgroundColor: "#0f172a",
                      color: "#ffffff"
                    }}
                  >
                    <Download className="w-4 h-4" style={{ color: "#ffffff", stroke: "#ffffff" }} />
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>Download / Save Pass</span>
                  </button>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowEntryPassModal(false)}
                  className="text-[13px] font-semibold cursor-pointer pt-1 transition-colors hover:underline"
                  style={{ color: "#64748b" }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          5. INVITE TEAMMATE MODAL
          ========================================================= */}
      <AnimatePresence>
        {showInviteModal && !isSolo && (
          <motion.div
            key="invite-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInviteModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[22px] p-6 shadow-2xl flex flex-col gap-4"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)"
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}
                >
                  Invite Teammate
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-[var(--subtle)] hover:text-[var(--text)] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[13px] text-[var(--muted)]">
                Send an invite to a colleague or friend to join <strong>{currentTeamName}</strong>.
              </p>

              <form onSubmit={handleInvite} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-[42px] px-3.5 rounded-[12px] text-[14px] outline-none"
                  style={{
                    background: "var(--input)",
                    border: "1px solid var(--border)",
                    color: "var(--text)"
                  }}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="h-[38px] px-4 rounded-[10px] text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === "invite"}
                    className="h-[38px] px-5 rounded-[10px] text-[13px] font-semibold cursor-pointer flex items-center gap-1.5"
                    style={{
                      background: "var(--text)",
                      color: "var(--bg)"
                    }}
                  >
                    {actionLoading === "invite" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Invite"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          6. REMOVE MEMBER MODAL
          ========================================================= */}
      <AnimatePresence>
        {showRemoveModal && memberToRemove && (
          <motion.div
            key="remove-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRemoveModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[22px] p-6 shadow-2xl flex flex-col gap-4 text-center"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)"
              }}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 grid place-items-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Remove Teammate?</h3>
              <p className="text-[13px] text-[var(--muted)]">
                Are you sure you want to remove <strong>{memberToRemove.user?.name || "Participant"}</strong> from the team?
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowRemoveModal(false)}
                  className="flex-1 h-[40px] rounded-[10px] text-[13px] font-semibold border border-[var(--border)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveMember}
                  className="flex-1 h-[40px] rounded-[10px] text-[13px] font-semibold bg-red-500 text-white cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          7. REVOKE INVITE MODAL
          ========================================================= */}
      <AnimatePresence>
        {showRevokeModal && inviteToRevoke && (
          <motion.div
            key="revoke-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRevokeModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[22px] p-6 shadow-2xl flex flex-col gap-4 text-center"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)"
              }}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 grid place-items-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Revoke Invitation?</h3>
              <p className="text-[13px] text-[var(--muted)]">
                Are you sure you want to cancel the invitation sent to <strong>{inviteToRevoke.email}</strong>?
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowRevokeModal(false)}
                  className="flex-1 h-[40px] rounded-[10px] text-[13px] font-semibold border border-[var(--border)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeInvite}
                  className="flex-1 h-[40px] rounded-[10px] text-[13px] font-semibold bg-red-500 text-white cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          8. TOAST NOTIFICATION
          ========================================================= */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className="fixed top-6 right-6 z-[60] max-w-sm w-full p-4 rounded-[16px] border shadow-2xl backdrop-blur-xl flex items-center gap-3"
            style={{
              background: toast.type === "error" ? "rgba(127,29,29,.9)" : "rgba(6,78,59,.9)",
              borderColor: toast.type === "error" ? "rgba(239,68,68,.3)" : "rgba(16,185,129,.3)",
              color: "#fff"
            }}
          >
            {toast.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-red-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            )}
            <div className="text-[13px] font-medium flex-1">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          9. PERSONALIZE AGENDA BUILDER MODAL
          ========================================================= */}
      {showAgendaModal && (
        <PersonalizeAgendaModal
          eventId={targetEventId}
          eventTitle={eventTitle}
          isOpen={showAgendaModal}
          onClose={() => {
            setShowAgendaModal(false);
            fetchAgendaStatus(targetEventId);
          }}
          onSaved={(savedData) => {
            if (savedData && Array.isArray(savedData) && savedData.length > 0) {
              setPersonalAgenda(savedData);
            }
            fetchAgendaStatus(targetEventId);
          }}
          timelinesFallback={eventDetails.timelines}
        />
      )}

    </AppLayout>
  );
}
