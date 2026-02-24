"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Crown, QrCode, Send, Edit3, Check, X, 
  Trash2, Loader2, MessageCircle, UploadCloud, 
  Activity, Calendar, Clock, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/axios";
import Navbar from "@/components/NavBar";

export default function TeamParticipantDashboard() {
  const { id } = useParams();
  
  // Data States
  const [teamData, setTeamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI Action States
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameStr, setEditNameStr] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  
  // Invite Slot States
  const [activeInviteSlot, setActiveInviteSlot] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  const fetchDashboardData = async () => {
    try {
      const response = await api.get(`/team-dashboard/${id}`);
      const data = response.data.data; 
      setTeamData(data);
      setEditNameStr(data?.name || "");
    } catch (err) {
      console.error("Dashboard error:", err);
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
    } catch (err) {
      alert("Error updating team name. Ensure it is at least 3 characters.");
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
      alert(err.response?.data?.message || err.response?.data?.error || "Failed to send invitation.");
    } finally {
      setActionLoading("");
    }
  };

  const handleRemoveMember = async (userIdToRemove: number) => {
    if (!confirm("Remove this member from the team?")) return;
    try {
      setActionLoading(`remove-${userIdToRemove}`);
      // Matches DELETE /api/team-dashboard/:id/members & RemoveMemberSchema
      await api.delete(`/team-dashboard/${id}/members`, { 
        data: { userIdToRemove: userIdToRemove } 
      });
      // Update UI instantly
      setTeamData({ 
        ...teamData, 
        members: teamData.members.filter((m: any) => m.user_id !== userIdToRemove) 
      });
    } catch (err) {
      alert("Error removing member");
    } finally {
      setActionLoading("");
    }
  };

  // Safe variables for rendering logic
  const members = teamData?.members || [];
  const invites = teamData?.invites || [];
  const isLeader = teamData?.is_leader || false;
  
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

              <Button className="h-16 px-8 rounded-2xl bg-white text-black hover:bg-zinc-200 font-bold shadow-2xl transition-transform hover:scale-105 shrink-0 text-lg">
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
              <div className="text-right flex flex-col items-end">
              <p className="text-3xl font-black leading-none mb-1.5">{members.length} <span className="text-zinc-600">/ {maxTeamSize}</span></p>
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
                        onClick={() => handleRemoveMember(member.user_id)}
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
                <div key={`invite-${i}`} className="flex items-center gap-4 p-5 bg-zinc-900/30 rounded-[1.5rem] border border-dashed border-indigo-500/30 opacity-80">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-500/5 text-indigo-400/50">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-lg text-zinc-300 truncate">{invite.email}</p>
                    <p className="text-xs uppercase font-bold text-indigo-400 tracking-wider mt-0.5">Invite Pending...</p>
                  </div>
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
           <div className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <UploadCloud className="w-24 h-24 text-white/10 absolute -right-4 -top-4 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 mb-6 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest text-white shadow-sm">
                  Phase 2 Active
                </div>
                <h3 className="text-3xl font-black mb-3 leading-tight text-white">Project<br/>Submission</h3>
                <p className="text-indigo-100 text-sm mb-8 font-medium leading-relaxed">
                  Ready to showcase your work? The submission portal is currently unlocked for your team.
                </p>
                <Button className="w-full bg-white text-indigo-700 hover:bg-zinc-100 font-black py-7 rounded-2xl text-lg shadow-xl hover:scale-[1.02] transition-all">
                  Submit Now
                </Button>
              </div>
           </div>

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
                <Activity className="w-4 h-4" /> Live Activities
              </h4>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#09090b] bg-indigo-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(99,102,241,0.4)] z-10">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="font-bold text-sm text-zinc-100">Registration Complete</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#09090b] bg-zinc-800 text-zinc-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
                    <p className="font-bold text-sm text-zinc-400">Opening Ceremony</p>
                  </div>
                </div>

              </div>
           </div>

        </div>
      </main>
    </div>
  );
}