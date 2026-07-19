"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Crown, QrCode, Send, Edit3, Check, X,
  Trash2, Loader2, MessageCircle, UploadCloud,
  Activity, Calendar, Clock, Plus, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/axios";
import Navbar from "@/components/NavBar";

export default function TeamParticipantDashboard() {
  const { id } = useParams();
  const router = useRouter();

  // Data States
  const [teamData, setTeamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI Action States
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameStr, setEditNameStr] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  // Invite Slot States
  const [activeInviteSlot, setActiveInviteSlot] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  // Remove member modal state
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Leave team modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Entry Pass ticket modal state
  const [showEntryPassModal, setShowEntryPassModal] = useState(false);

  // Revoke invite modal state
  const [inviteToRevoke, setInviteToRevoke] = useState<any>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Submission project state
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitRepoUrl, setSubmitRepoUrl] = useState("");

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/team-dashboard/${id}`);
      const data = response.data.data;
      setTeamData(data);
      setEditNameStr(data?.name || "");
      if (data?.submissions?.length > 0) {
        setSubmitTitle(data.submissions[0].title || "");
        setSubmitRepoUrl(data.submissions[0].repo_url || "");
      }
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to load dashboard data. Please make sure you are registered and belong to this team.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDashboardData();
  }, [id]);

  // --- API HANDLERS MATCHING YOUR VALIDATION & ROUTES ---

  const handleUpdateName = async () => {
    if (!editNameStr.trim() || editNameStr === teamData?.name) return setIsEditingName(false);
    try {
      setActionLoading("name");
      // Matches PATCH /api/team-dashboard/:id/name & UpdateTeamNameSchema
      await api.patch(`/team-dashboard/${id}/name`, { name: editNameStr });
      setTeamData({ ...teamData, name: editNameStr });
      setIsEditingName(false);
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || err.response?.data?.error || "Error updating team name. Ensure it is at least 3 characters.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      setActionLoading("invite");
      // Matches POST /api/team-dashboard/:id/invite & InviteMemberSchema
      await api.post(`/team-dashboard/${id}/invite`, { email: inviteEmail });

      setInviteEmail("");
      setActiveInviteSlot(null);
      await fetchDashboardData(); // Refresh to show the new pending invite blocking the slot
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || err.response?.data?.error || "Failed to send invitation.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

  const openRemoveModal = (member: any) => {
    setMemberToRemove(member);
    setShowRemoveModal(true);
  };

  const closeRemoveModal = () => {
    setMemberToRemove(null);
    setShowRemoveModal(false);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    const userIdToRemove = memberToRemove.user_id;
    try {
      setActionLoading(`remove-${userIdToRemove}`);
      // Matches DELETE /api/team-dashboard/:id/members & RemoveMemberSchema
      await api.delete(`/team-dashboard/${id}/members`, {
        data: { userIdToRemove: userIdToRemove }
      });
      closeRemoveModal();
      // Re-fetch so slots are properly recalculated by the backend
      await fetchDashboardData();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || err.response?.data?.error || "Error removing member.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

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
      setToast({ message: err.response?.data?.message || err.response?.data?.error || "Failed to revoke invitation.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

  const handleLeaveTeam = async () => {
    try {
      setActionLoading("leave");
      await api.post(`/team-dashboard/${id}/leave`);
      setShowLeaveModal(false);
      setToast({ message: "You have left the team.", type: "success" });
      router.push("/home");
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || err.response?.data?.error || "Failed to leave the team.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTitle.trim() || !submitRepoUrl.trim()) return;
    try {
      setActionLoading("submit-project");
      await api.post(`/team-dashboard/${id}/submit`, {
        title: submitTitle,
        repoUrl: submitRepoUrl
      });
      setShowSubmissionModal(false);
      setToast({ message: "Project submitted successfully!", type: "success" });
      await fetchDashboardData();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || err.response?.data?.error || "Failed to submit project. Verify it is a valid Git URL.", type: "error" });
    } finally {
      setActionLoading("");
    }
  };

  // Safe variables for rendering logic
  const members = teamData?.members || [];
  const invites = teamData?.invites || [];
  const isLeader = teamData?.is_leader || false;

  // Find current user's ticket code from roster
  const getCurrentUserTicketCode = () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) return null;
      const payload = JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const currentUserId = payload.id || payload.userId || payload._id;
      const currentUserMember = members.find((m: any) => Number(m.user_id) === Number(currentUserId));
      return currentUserMember?.ticket_code || null;
    } catch (e) {
      console.error("Error decoding token for check-in QR:", e);
      return null;
    }
  };

  const userTicketCode = getCurrentUserTicketCode();

  // Use the pre-calculated capacity from your new backend logic
  const maxTeamSize = teamData?.event?.max_team_size || 5;
  const emptySlotsCount = teamData?.capacity?.seats_available || 0;
  const isTeamFull = teamData?.capacity?.is_full || false;
  const meetsMinimum = teamData?.capacity?.meets_minimum || false;

  if (isLoading) return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-[100px] rounded-full" />
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-6 relative z-10" />
      <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-sm relative z-10">Initializing Workspace</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <Navbar theme="dark" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900/60 border border-red-500/20 rounded-[2.5rem] p-10 md:p-12 text-center backdrop-blur-xl shadow-2xl relative z-10"
      >
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black mb-4">Access Denied</h1>
        <p className="text-zinc-400 font-medium mb-10 leading-relaxed">{error}</p>
        <Button onClick={() => router.push("/home")} className="w-full h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg transition-all">
          Return to Home
        </Button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 font-sans selection:bg-indigo-500/30">
      <Navbar theme="dark" />

      {/* Main Container - pt-32 prevents Navbar overlap */}
      <main className="max-w-[1400px] mx-auto px-6 md:px-10 pt-32 pb-24 grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* =========================================================
            LEFT COLUMN: TEAM IDENTITY & ROSTER (LUMA / BENTO STYLE)
            ========================================================= */}
        <div className="xl:col-span-8 space-y-8">

          {/* 1. HERO / IDENTITY CARD */}
          <section className="relative overflow-hidden bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-500/20 via-purple-500/5 to-transparent blur-[80px] -translate-y-1/2 translate-x-1/3 rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-6 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-black uppercase tracking-[0.15em] border border-indigo-500/20">
                    Official Registration
                  </span>
                  {isLeader && (
                    <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-black uppercase tracking-[0.15em] border border-amber-500/20 flex items-center gap-1.5 shadow-lg shadow-amber-500/10">
                      <Crown className="w-4 h-4" /> Team Leader
                    </span>
                  )}
                </div>

                {isEditingName && isLeader ? (
                  <div className="flex items-center gap-3 max-w-lg">
                    <Input
                      value={editNameStr}
                      onChange={(e) => setEditNameStr(e.target.value)}
                      className="h-16 px-6 text-2xl font-black bg-black/50 border-white/10 rounded-2xl focus-visible:ring-indigo-500"
                      autoFocus
                    />
                    <Button onClick={handleUpdateName} size="icon" className="h-16 w-16 bg-emerald-600 hover:bg-emerald-500 rounded-2xl shrink-0 transition-all">
                      {actionLoading === "name" ? <Loader2 className="animate-spin" /> : <Check className="w-6 h-6" />}
                    </Button>
                    <Button onClick={() => setIsEditingName(false)} variant="ghost" size="icon" className="h-16 w-16 bg-white/5 hover:bg-white/10 rounded-2xl shrink-0"><X /></Button>
                  </div>
                ) : (
                  <h1 className="text-5xl md:text-6xl font-black tracking-tight flex items-center gap-4 group">
                    {teamData?.name}
                    {isLeader && (
                      <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100 p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer">
                        <Edit3 className="w-6 h-6" />
                      </button>
                    )}
                  </h1>
                )}
              </div>

              <Button onClick={() => setShowEntryPassModal(true)} className="h-16 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold shadow-2xl transition-transform hover:scale-105 shrink-0 text-lg">
                <QrCode className="w-6 h-6 mr-3" /> Entry Pass
              </Button>
            </div>
          </section>

          {/* 2. TEAM ROSTER & SLOTS */}
          <section className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-8">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <Users className="w-6 h-6 text-indigo-400" /> Team Roster
                </h3>
                <p className="text-zinc-500 mt-1 font-medium">Manage your squad for the event.</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="flex items-center gap-4">
                  {!isLeader && (
                    <Button onClick={() => setShowLeaveModal(true)} variant="outline" className="h-9 px-4 rounded-xl border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-all shrink-0">
                      Leave Team
                    </Button>
                  )}
                  <p className="text-3xl font-black leading-none mb-1.5">{members.length} <span className="text-zinc-600">/ {maxTeamSize}</span></p>
                </div>
                {meetsMinimum ? (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                    Ready to Compete
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/20">
                    Below Min. Size
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* --- RENDER ACTIVE MEMBERS --- */}
              {members.map((member: any) => {
                const isThisMemberLeader = member.user_id === teamData?.leader_id;

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    key={`member-${member.user_id}`}
                    className="flex items-center justify-between p-5 bg-black/40 rounded-[1.5rem] border border-white/5 group hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      {/* LEADER BADGE LOGIC */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${isThisMemberLeader ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
                        {isThisMemberLeader ? <Crown className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-lg truncate text-zinc-100">
                          {member.user.name || "Participant"}
                        </p>
                        <p className="text-xs font-bold text-zinc-500 mt-0.5 truncate">
                          {member.user.email}
                        </p>
                      </div>
                    </div>

                    {/* LEADER CONTROLS: Remove Member (cannot remove themselves) */}
                    {isLeader && !isThisMemberLeader && (
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => openRemoveModal(member)}
                        className="opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shrink-0 ml-2"
                      >
                        {actionLoading === `remove-${member.user_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    )}
                  </motion.div>
                );
              })}

              {/* --- RENDER PENDING INVITES (Blocked Slots) --- */}
              {invites.map((invite: any, i: number) => (
                <div key={`invite-${i}`} className="flex items-center justify-between p-5 bg-zinc-900/30 rounded-[1.5rem] border border-dashed border-indigo-500/30 opacity-80 group/invite">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-500/5 text-indigo-400/50 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-lg text-zinc-300 truncate">{invite.email}</p>
                      <p className="text-xs uppercase font-bold text-indigo-400 tracking-wider mt-0.5">Invite Pending...</p>
                    </div>
                  </div>
                  {isLeader && (
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => {
                        setInviteToRevoke(invite);
                        setShowRevokeModal(true);
                      }}
                      className="opacity-0 group-hover/invite:opacity-100 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shrink-0 ml-2"
                    >
                      {actionLoading === `revoke-${invite.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              ))}

              {/* --- RENDER EMPTY SLOTS (Interactive for Leaders) --- */}
              {Array.from({ length: emptySlotsCount }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 relative group">
                  {/* If Leader clicked this slot, show the invite form */}
                  {isLeader && activeInviteSlot === i ? (
                    <motion.form
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      onSubmit={handleInvite}
                      className="absolute inset-0 flex items-center gap-2 p-3 bg-zinc-900 rounded-[1.5rem] border border-indigo-500/50 shadow-xl shadow-indigo-500/10 z-10"
                    >
                      <Input
                        type="email"
                        placeholder="Teammate's email..."
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        className="h-full bg-black/50 border-none rounded-xl px-4 text-base focus-visible:ring-0 flex-1"
                        autoFocus
                        required
                      />
                      <Button type="submit" disabled={actionLoading === "invite"} className="h-full px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all">
                        {actionLoading === "invite" ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-4 h-4" />}
                      </Button>
                      <Button type="button" onClick={() => setActiveInviteSlot(null)} variant="ghost" className="h-full px-4 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </Button>
                    </motion.form>
                  ) : (
                    /* Default Empty Slot View */
                    <button
                      onClick={() => isLeader ? setActiveInviteSlot(i) : null}
                      className={`w-full h-full flex items-center gap-4 p-5 bg-zinc-900/20 rounded-[1.5rem] border-2 border-dashed border-white/10 transition-all text-left ${isLeader ? 'hover:bg-indigo-500/5 hover:border-indigo-500/30 cursor-pointer' : 'opacity-50 cursor-default'}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 transition-colors ${isLeader ? 'group-hover:bg-indigo-500/20 group-hover:text-indigo-400 text-zinc-600' : 'text-zinc-700'}`}>
                        {isLeader ? <Plus className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className={`font-bold text-lg transition-colors ${isLeader ? 'group-hover:text-indigo-300 text-zinc-500' : 'text-zinc-600'}`}>
                          {isLeader ? "Invite Teammate" : "Empty Slot"}
                        </p>
                        <p className="text-xs uppercase font-bold text-zinc-600 tracking-wider mt-0.5">
                          {isLeader ? "Click to add via email" : "Waiting for invite"}
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* --- TEAM FULL SUCCESS MESSAGE --- */}
            {isLeader && isTeamFull && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-3 text-emerald-400 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10"
              >
                <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  <Check className="w-5 h-5" />
                </div>
                <p className="font-bold text-sm tracking-wide">Team Capacity Reached. Your roster is locked and ready!</p>
              </motion.div>
            )}

          </section>
        </div>

        {/* =========================================================
            RIGHT COLUMN: FEATURES & WORKSPACE (BENTO CARDS)
            ========================================================= */}
        <div className="xl:col-span-4 space-y-6">

          {/* SUBMISSION CARD (Hack2Skill Style) */}
          {teamData?.submissions && teamData.submissions.length > 0 ? (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <UploadCloud className="w-24 h-24 text-white/10 absolute -right-4 -top-4 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="inline-flex px-3 py-1 mb-6 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-xs font-black uppercase tracking-widest text-emerald-300 shadow-sm items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Project Submitted
                </div>
                <h3 className="text-3xl font-black mb-3 leading-tight text-white line-clamp-2">{teamData.submissions[0].title}</h3>
                <p className="text-indigo-100 text-sm mb-4 font-semibold leading-relaxed truncate">
                  Repository: <a href={teamData.submissions[0].repo_url} target="_blank" rel="noreferrer" className="underline hover:text-white transition-all">{teamData.submissions[0].repo_url}</a>
                </p>
                <p className="text-xs text-indigo-200/70 mb-8 font-medium">
                  Submitted by {teamData.submissions[0].user?.name || "Member"} on {new Date(teamData.submissions[0].submitted_at).toLocaleDateString()}
                </p>
                <Button onClick={() => setShowSubmissionModal(true)} className="w-full bg-white text-indigo-700 hover:bg-zinc-100 font-black py-7 rounded-2xl text-lg shadow-xl hover:scale-[1.02] transition-all">
                  Edit Submission
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <UploadCloud className="w-24 h-24 text-white/10 absolute -right-4 -top-4 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 mb-6 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                  Phase 2 Active
                </div>
                <h3 className="text-3xl font-black mb-3 leading-tight text-white">Project<br />Submission</h3>
                <p className="text-indigo-100 text-sm mb-8 font-medium leading-relaxed">
                  Ready to showcase your work? The submission portal is currently unlocked for your team.
                </p>
                <Button onClick={() => setShowSubmissionModal(true)} className="w-full bg-white text-indigo-700 hover:bg-zinc-100 font-black py-7 rounded-2xl text-lg shadow-xl hover:scale-[1.02] transition-all">
                  Submit Now
                </Button>
              </div>
            </div>
          )}

          {/* TEAM CHAT CARD */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors">
            <div>
              <h4 className="text-xl font-bold mb-1 text-zinc-100">Team Chat</h4>
              <p className="text-sm font-medium text-zinc-500">Discuss ideas internally.</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
          </div>

          {/* EVENT ACTIVITY/TIMELINE */}
          <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-8">
            <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Event Schedule
            </h4>

            {teamData?.event?.timelines && teamData.event.timelines.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {teamData.event.timelines.map((timeline: any) => {
                  const startTime = new Date(timeline.start_time);
                  const isPast = startTime < new Date();
                  const formattedTime = startTime.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={timeline.id} className="relative flex items-start gap-4 group">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#09090b] ${isPast ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-zinc-800 text-zinc-500'} shrink-0 z-10`}>
                        {isPast ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      </div>
                      <div className={`flex-1 p-4 rounded-2xl border ${isPast ? 'bg-white/5 border-white/10' : 'bg-zinc-900/50 border-white/5'}`}>
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <p className={`font-bold text-sm ${isPast ? 'text-zinc-100' : 'text-zinc-400'}`}>{timeline.title}</p>
                          <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-indigo-400" /> {formattedTime}
                          </span>
                        </div>
                        {timeline.speaker_name && (
                          <p className="text-xs text-indigo-400 mt-1 font-semibold">Speaker: {timeline.speaker_name}</p>
                        )}
                        {timeline.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{timeline.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-500 text-sm font-medium">
                No schedule events listed yet.
              </div>
            )}
          </div>

        </div>
      </main>

      {/* =========================================================
          CUSTOM REMOVE MEMBER CONFIRMATION MODAL
          ========================================================= */}
      <AnimatePresence>
        {showRemoveModal && memberToRemove && (
          <motion.div
            key="remove-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={closeRemoveModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-red-900/10"
            >
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-black mb-2 text-zinc-100">Remove Teammate?</h3>

                {/* Description */}
                <p className="text-zinc-400 font-medium text-sm leading-relaxed mb-2">
                  Are you sure you want to remove
                </p>
                <div className="bg-black/50 border border-white/5 rounded-xl px-4 py-3 mb-8 w-full">
                  <p className="font-bold text-zinc-100 truncate">{memberToRemove.user?.name || "Participant"}</p>
                  <p className="text-xs font-bold text-zinc-500 mt-0.5 truncate">{memberToRemove.user?.email}</p>
                </div>
                <p className="text-zinc-500 text-xs font-medium mb-8">
                  This person will be removed from the team and their slot will be freed up for a new invite.
                </p>

                {/* Action Buttons */}
                <div className="flex w-full gap-3">
                  <Button
                    onClick={closeRemoveModal}
                    variant="ghost"
                    className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-base transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRemoveMember}
                    disabled={actionLoading === `remove-${memberToRemove.user_id}`}
                    className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
                  >
                    {actionLoading === `remove-${memberToRemove.user_id}`
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <><Trash2 className="w-4 h-4 mr-2" /> Remove</>
                    }
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          CUSTOM REVOKE INVITATION MODAL
          ========================================================= */}
      <AnimatePresence>
        {showRevokeModal && inviteToRevoke && (
          <motion.div
            key="revoke-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setInviteToRevoke(null);
              setShowRevokeModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-red-900/10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-black mb-2 text-zinc-100">Revoke Invite?</h3>
                <p className="text-zinc-400 font-medium text-sm leading-relaxed mb-6">
                  Are you sure you want to revoke the invitation sent to:
                </p>
                <div className="bg-black/50 border border-white/5 rounded-xl px-4 py-3 mb-8 w-full">
                  <p className="font-bold text-zinc-100 truncate">{inviteToRevoke.email}</p>
                </div>
                <div className="flex w-full gap-3">
                  <Button
                    onClick={() => {
                      setInviteToRevoke(null);
                      setShowRevokeModal(false);
                    }}
                    variant="ghost"
                    className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-base transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRevokeInvite}
                    disabled={actionLoading === `revoke-${inviteToRevoke.id}`}
                    className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
                  >
                    {actionLoading === `revoke-${inviteToRevoke.id}`
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : "Revoke"
                    }
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          CUSTOM LEAVE TEAM MODAL
          ========================================================= */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            key="leave-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLeaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl shadow-red-900/10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-black mb-2 text-zinc-100">Leave Team?</h3>
                <p className="text-zinc-400 font-medium text-sm leading-relaxed mb-6">
                  Are you sure you want to leave <strong>{teamData?.name}</strong>? You will no longer be registered for this event with this team.
                </p>
                <div className="flex w-full gap-3">
                  <Button
                    onClick={() => setShowLeaveModal(false)}
                    variant="ghost"
                    className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-base transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleLeaveTeam}
                    disabled={actionLoading === "leave"}
                    className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
                  >
                    {actionLoading === "leave"
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : "Leave Team"
                    }
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          CUSTOM PROJECT SUBMISSION MODAL
          ========================================================= */}
      <AnimatePresence>
        {showSubmissionModal && (
          <motion.div
            key="submission-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSubmissionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <h3 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
                  <UploadCloud className="w-6 h-6 text-indigo-400" />
                  {teamData?.submissions?.length > 0 ? "Edit Submission" : "Submit Project"}
                </h3>
                <button onClick={() => setShowSubmissionModal(false)} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProjectSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-300">Project Title</label>
                  <Input
                    value={submitTitle}
                    onChange={(e) => setSubmitTitle(e.target.value)}
                    placeholder="e.g. CommunityConnect Platform"
                    className="h-14 px-4 bg-black/50 border-white/10 rounded-2xl focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-300">Repository Link</label>
                  <Input
                    type="url"
                    value={submitRepoUrl}
                    onChange={(e) => setSubmitRepoUrl(e.target.value)}
                    placeholder="e.g. https://github.com/username/project"
                    className="h-14 px-4 bg-black/50 border-white/10 rounded-2xl focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <Button
                    type="button"
                    onClick={() => setShowSubmissionModal(false)}
                    variant="ghost"
                    className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading === "submit-project"}
                    className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-50 text-white font-bold"
                  >
                    {actionLoading === "submit-project"
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : "Submit Project"
                    }
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          CUSTOM ENTRY PASS TICKET MODAL
          ========================================================= */}
      <AnimatePresence>
        {showEntryPassModal && (
          <motion.div
            key="pass-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowEntryPassModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              {/* Ticket border effect */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-black/90 rounded-full border-r border-white/10 -translate-y-1/2 animate-pulse" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-black/90 rounded-full border-l border-white/10 -translate-y-1/2 animate-pulse" />

              <div className="p-8 border-b border-dashed border-white/10 flex flex-col items-center text-center">
                <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 mb-6">
                  {teamData?.event?.title || "Community Connect Event"}
                </span>

                {/* Simulated QR Code from Server API */}
                <div className="w-48 h-48 bg-white p-3 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${userTicketCode || `TEAM-${teamData?.id}`}`}
                    alt="Entry Pass QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                <h3 className="text-2xl font-black text-white mb-1">{teamData?.name}</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Team Pass</p>
              </div>

              <div className="p-8 bg-black/30 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Event:</span>
                  <span className="text-white font-bold max-w-[180px] truncate text-right">{teamData?.event?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Leader:</span>
                  <span className="text-white font-bold text-right">{members.find((m: any) => m.user_id === teamData?.leader_id)?.user?.name || "Organizer"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-medium">Status:</span>
                  {members.find((m: any) => m.ticket_code === userTicketCode)?.checked_in ? (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold uppercase text-[10px] tracking-wider animate-pulse">Checked In</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase text-[10px] tracking-wider">Confirmed</span>
                  )}
                </div>

                <Button
                  onClick={() => setShowEntryPassModal(false)}
                  className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-sm transition-all mt-4"
                >
                  Close Pass
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed top-6 right-6 z-[60] max-w-md w-full p-5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-4 ${toast.type === "error"
                ? "bg-red-950/80 border-red-500/30 shadow-red-900/20"
                : "bg-emerald-950/80 border-emerald-500/30 shadow-emerald-900/20"
              }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toast.type === "error"
                ? "bg-red-500/20 text-red-400"
                : "bg-emerald-500/20 text-emerald-400"
              }`}>
              {toast.type === "error" ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${toast.type === "error" ? "text-red-300" : "text-emerald-300"
                }`}>
                {toast.type === "error" ? "Something went wrong" : "Success"}
              </p>
              <p className="text-zinc-400 text-xs font-medium mt-1 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}