import { Layers, PlayCircle, ShieldCheck, Users } from "lucide-react";

export interface PortalItem {
  name: string;
  kind: string;
  format: string;
  month: string;
  day: string;
  title: string;
  location: string;
  fee: string;
  reg: number;
  cap: number;
  mark: string;
  hue: number;
  lightness: number;
}

export interface DemoVideoItem {
  id: string;
  num: string;
  part: string;
  title: string;
  subtitle: string;
  description: string;
  src: string;
  badge: string;
  role: string;
  desc: string;
  icon: typeof PlayCircle;
}

export const QR7: number[] = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 1, 1, 0, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
  0, 1, 0, 1, 0, 1, 0,
  1, 1, 0, 1, 1, 0, 1,
  1, 0, 1, 0, 1, 1, 0,
  1, 1, 1, 0, 1, 0, 1,
];

export const PORTALS: PortalItem[] = [
  { name: "Hackathon", kind: "HACKATHON", format: "HYBRID", month: "NOV", day: "15", title: "BuildCon AI Hackathon", location: "Bengaluru", fee: "₹500", reg: 142, cap: 200, mark: "</>", hue: 275, lightness: 0.8 },
  { name: "Cloud Summit", kind: "SUMMIT", format: "IN-PERSON", month: "DEC", day: "04", title: "Cloud Native Summit", location: "Hyderabad", fee: "₹1,499", reg: 610, cap: 800, mark: "K8s", hue: 230, lightness: 0.78 },
  { name: "JS Meetup", kind: "MEETUP", format: "EVENING", month: "NOV", day: "22", title: "JS Bangalore #48", location: "Indiranagar", fee: "Free", reg: 88, cap: 120, mark: "JS", hue: 95, lightness: 0.88 },
  { name: "Sports Run", kind: "RUN", format: "OUTDOOR", month: "JAN", day: "12", title: "Devs Who Run 10K", location: "Cubbon Park", fee: "₹299", reg: 340, cap: 500, mark: "10K", hue: 30, lightness: 0.75 },
  { name: "Symposium", kind: "SYMPOSIUM", format: "ACADEMIC", month: "FEB", day: "08", title: "Systems Research Symposium", location: "IISc", fee: "Student free", reg: 150, cap: 250, mark: "∑", hue: 300, lightness: 0.75 },
  { name: "Founders Gala", kind: "GALA", format: "INVITE-ONLY", month: "MAR", day: "01", title: "Founders Night Gala", location: "The Leela", fee: "By invite", reg: 96, cap: 120, mark: "✦", hue: 350, lightness: 0.78 },
];

export const ROLES: ReadonlyArray<{ n: string; role: string; title: string }> = [
  { n: "01", role: "Organizer", title: "Command center" },
  { n: "02", role: "Volunteer", title: "On-ground desk" },
  { n: "03", role: "Participant", title: "Attendee experience" },
];

export const CHECKIN_NAMES: readonly string[] = [
  "Priya N.",
  "Kabir S.",
  "Meera R.",
  "Arjun T.",
  "Zoya F.",
  "Vikram P.",
  "Ishaan G.",
  "Tara L.",
];

export const FEATURES: ReadonlyArray<{ title: string; tag: string; body: string }> = [
  {
    title: "AI teammate matching",
    tag: "94% ACCURACY",
    body: "Pairs solo engineers, designers and domain experts using GitHub stack analysis and complementary-skill scoring.",
  },
  {
    title: "Offline-first QR passes",
    tag: "SUB-SECOND",
    body: "Encrypted tickets with emergency backup codes, verified on-device and synced when connectivity returns.",
  },
  {
    title: "Live quiz & engagement arena",
    tag: "REAL-TIME",
    body: "Trivia, lightning rounds and polls with WebSocket leaderboards and reward points.",
  },
  {
    title: "Interactive agendas",
    tag: "CALENDAR SYNC",
    body: "Skill-tagged sessions, speaker bios and one-click Google & iCal sync for every attendee.",
  },
  {
    title: "Staff command center",
    tag: "ROLE-BASED",
    body: "Granular permissions for organizers, desks, mentors and judges — with audit logs and 2FA.",
  },
  {
    title: "Real-time analytics",
    tag: "EXPORTABLE",
    body: "Capacity, conversion, check-in velocity and demographics. Export CSVs and post-event digests.",
  },
];

export const BARS: readonly number[] = [18, 22, 20, 30, 28, 36, 34, 45, 42, 55, 60, 58, 72, 88];

export const MARQUEE_WORDS: readonly string[] = [
  "Hackathons",
  "Summits",
  "Meetups",
  "Symposiums",
  "Fun runs",
  "Founder galas",
];

export const PLATFORM_STATS: ReadonlyArray<{ value: string; label: string; sub: string }> = [
  { value: "240+", label: "Events hosted", sub: "Across 18 global hubs" },
  { value: "45k+", label: "Active attendees", sub: "Engineers, creators, founders" },
  { value: "99.4%", label: "Check-in success", sub: "Sub-second offline verify" },
  { value: "6", label: "Visual engines", sub: "One per kind of gathering" },
];

export const DEMO_VIDEOS: readonly DemoVideoItem[] = [
  {
    id: "full",
    num: "00",
    part: "Full Overview",
    title: "Eventrix Full Platform Overview",
    subtitle: "Complete Product Walkthrough",
    description:
      "Discover the next-generation event operating system: intelligent planning, offline-first check-ins, dynamic portals, and gamified engagement.",
    src: "/demo-videos/Full_Overview_Demo.mp4",
    badge: "Full Overview",
    role: "Complete Walkthrough",
    desc: "End-to-end walkthrough across organizer, staff, and attendee modules",
    icon: PlayCircle,
  },
  {
    id: "part1",
    num: "01",
    part: "Part 1",
    title: "Part 1: Organizer",
    subtitle: "Organizer Command Center",
    description:
      "Explore the organizer workspace: dynamic ticket tiers, attendee approval pipelines, AI-powered quiz builders, and real-time revenue analytics.",
    src: "/demo-videos/Part_1_Organizer_demo.mp4",
    badge: "Part 1 • Organizer",
    role: "Organizer Command Center",
    desc: "AI event builder, dynamic tickets, and financial analytics",
    icon: Layers,
  },
  {
    id: "part2",
    num: "02",
    part: "Part 2",
    title: "Part 2: Volunteer",
    subtitle: "Staff & Volunteer Operations",
    description:
      "Tour the volunteer and staff interface: sub-second QR ticket scanning, offline verification engine, attendee check-ins, and shift checklists.",
    src: "/demo-videos/Part_2_Volunteer_view_demo.mp4",
    badge: "Part 2 • Volunteer",
    role: "On-Ground Staff Desk",
    desc: "Sub-second QR pass scanning and offline check-in logs",
    icon: ShieldCheck,
  },
  {
    id: "part3",
    num: "03",
    part: "Part 3",
    title: "Part 3: Participant",
    subtitle: "Participant & Attendee Experience",
    description:
      "See the event from the attendee perspective: personalized digital tickets, live trivia battles, speaker schedules, and community hub.",
    src: "/demo-videos/Part_3_Participants_demo.mp4",
    badge: "Part 3 • Attendee",
    role: "Attendee Experience",
    desc: "Interactive event portals, live trivia quizzes, and passes",
    icon: Users,
  },
];

