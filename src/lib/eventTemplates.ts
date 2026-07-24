// Config describing the 10 event templates and the extra fields each one asks for.
// "type" sent to the backend matches `id` here (or the resolved custom category).

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "boolean";

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[]; // only used when type === "select"
}

export interface EventTemplate {
  id: string;       // sent to backend as `type`
  label: string;    // shown on the card
  imageUrl: string; // The default cover/banner image for this template
  fields: TemplateField[];
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "Technical Conferences",
    label: "Technical Conferences",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "track_theme", label: "Track / Theme", type: "text", placeholder: "e.g. AI, Web, Cloud" },
      { id: "speakers", label: "Speakers (one per line: Name - Topic)", type: "textarea" },
      { id: "agenda", label: "Agenda / Schedule", type: "textarea" },
      { id: "sponsors", label: "Sponsors", type: "text", placeholder: "Comma separated" },
    ],
  },
  {
    id: "Hackathons and Competitions",
    label: "Hackathons and Competitions",
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "prize_breakdown", label: "Prizes (one per line: Rank - Reward)", type: "textarea", placeholder: "1st - ₹50,000" },
      { id: "submission_deadline", label: "Submission Deadline", type: "date" },
      { id: "judging_criteria", label: "Judging Criteria", type: "textarea" },
      { id: "tech_stack", label: "Allowed Tech Stack", type: "text", placeholder: "Comma separated" },
      { id: "rules_url", label: "Rules Document URL", type: "text" },
    ],
  },
  {
    id: "Corporate Events",
    label: "Corporate Events",
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "department", label: "Organizing Department", type: "text" },
      { id: "visibility", label: "Visibility", type: "select", options: ["Internal", "External"] },
      { id: "dress_code", label: "Dress Code", type: "text" },
      { id: "rsvp_deadline", label: "RSVP Deadline", type: "date" },
      { id: "catering", label: "Catering Provided", type: "checkbox" },
    ],
  },
  {
    id: "Exhibitions and Trade Shows",
    label: "Exhibitions and Trade Shows",
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "num_booths", label: "Number of Booths", type: "number" },
      { id: "exhibitor_deadline", label: "Exhibitor Registration Deadline", type: "date" },
      { id: "booth_pricing", label: "Booth Pricing Tiers", type: "textarea" },
      { id: "industry", label: "Industry / Sector", type: "text" },
    ],
  },
  {
    id: "Academic and Training Events",
    label: "Academic and Training Events",
    imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "instructor_name", label: "Instructor / Trainer Name", type: "text" },
      { id: "syllabus", label: "Course Outline", type: "textarea" },
      { id: "certification_provided", label: "Certification Provided", type: "checkbox" },
      { id: "prerequisites", label: "Prerequisites", type: "text" },
      { id: "course_fee", label: "Course Fee", type: "number" },
    ],
  },
  {
    id: "Weddings and Personal Events",
    label: "Weddings and Personal Events",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "host_names", label: "Host / Couple's Names", type: "text" },
      { id: "rsvp_deadline", label: "RSVP Deadline", type: "date" },
      { id: "dress_code_theme", label: "Dress Code / Theme", type: "text" },
      { id: "gift_registry_url", label: "Gift Registry Link", type: "text" },
      { id: "guests_expected", label: "Guests Expected", type: "number" },
    ],
  },
  {
    id: "Community and Nonprofit Events",
    label: "Community and Nonprofit Events",
    imageUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "cause_purpose", label: "Cause / Purpose", type: "textarea" },
      { id: "volunteer_signup", label: "Volunteer Signup Available", type: "checkbox" },
      { id: "donation_link", label: "Donation Link", type: "text" },
      { id: "partner_orgs", label: "Partner Organizations", type: "text" },
      { id: "age_restriction", label: "Age Restrictions", type: "text" },
    ],
  },
  {
    id: "Sports and Recreational Events",
    label: "Sports and Recreational Events",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "sport_type", label: "Sport / Activity Type", type: "text" },
      { id: "team_or_individual", label: "Team or Individual", type: "select", options: ["Team", "Individual"] },
      { id: "equipment_provided", label: "Equipment Provided", type: "checkbox" },
      { id: "skill_level", label: "Skill Level", type: "select", options: ["Beginner", "Intermediate", "Pro"] },
    ],
  },
  {
    id: "Government and Civic Events",
    label: "Government and Civic Events",
    imageUrl: "https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "department_authority", label: "Department / Authority", type: "text" },
      { id: "public_or_invite", label: "Public or Invite-only", type: "select", options: ["Public", "Invite-only"] },
      { id: "permit_number", label: "Permit / Reference Number", type: "text" },
      { id: "accessibility_info", label: "Accessibility Info", type: "textarea" },
    ],
  },
  {
    id: "Hybrid and Virtual Events",
    label: "Hybrid and Virtual Events",
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
    fields: [
      { id: "streaming_platform", label: "Streaming Platform / Link", type: "text" },
      { id: "recording_available", label: "Recording Available", type: "checkbox" },
      { id: "timezone", label: "Timezone", type: "text" },
      { id: "max_virtual_attendees", label: "Max Virtual Attendees", type: "number" },
    ],
  },
];

export const CUSTOM_TEMPLATE_ID = "Custom";

export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.id === id);
}

// Field types the organizer can quick-add in the Custom builder
export const CUSTOM_FIELD_TYPES: { type: FieldType | "boolean"; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "number", label: "Number" },
  { type: "date", label: "Date" },
  { type: "select", label: "Dropdown" },
  { type: "checkbox", label: "Checkbox" },
  { type: "boolean", label: "Yes / No" },
];