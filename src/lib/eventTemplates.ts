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

/** The 10 predefined event categories (template ids) shared across the app. */
export const PREDEFINED_EVENT_CATEGORIES: string[] = EVENT_TEMPLATES.map((t) => t.id);

export const CUSTOM_TEMPLATE_ID = "Custom";

export const CUSTOM_TEMPLATE_IMAGE_URL =
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1200&auto=format&fit=crop";

export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.id === id);
}

/** Returns the default cover image URL for a template theme (or the Custom fallback). */
export function getTemplateBannerUrl(templateId?: string | null): string {
  const resolved = resolveTemplateId(templateId);
  return getTemplateById(resolved)?.imageUrl || CUSTOM_TEMPLATE_IMAGE_URL;
}

/**
 * Resolves the effective hero banner image for an event:
 * uses the organizer-provided banner URL when present, otherwise falls back
 * to the template theme's cover image.
 */
export function getEventBannerInfo(
  bannerUrl?: string | null,
  eventType?: string | null
): { url: string; isTemplateFallback: boolean; templateLabel: string } {
  const trimmed = (bannerUrl || "").trim();
  const resolved = resolveTemplateId(eventType);
  const tpl = getTemplateById(resolved);
  if (trimmed) {
    return {
      url: trimmed,
      isTemplateFallback: false,
      templateLabel: tpl?.label || eventType || CUSTOM_TEMPLATE_ID,
    };
  }
  return {
    url: tpl?.imageUrl || CUSTOM_TEMPLATE_IMAGE_URL,
    isTemplateFallback: true,
    templateLabel: tpl?.label || CUSTOM_TEMPLATE_ID,
  };
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

export interface RegistrationFormField {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}

export interface RecommendedQuestion {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  options?: string[];
  category?: string;
  hint?: string;
}

export interface TemplateFormMeta {
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  venuePlaceholder: string;
  onlinePlaceholder: string;
  defaultMode: "online" | "offline" | "hybrid";
  defaultRegistrationType: "solo" | "team";
  questionnaireSubtitle: string;
  questionLabelPlaceholder: string;
  customParamPlaceholder: string;
}

const TEMPLATE_KEYWORDS: Array<[string, string[]]> = [
  ["Hackathons and Competitions", ["hackathon", "hack", "coding", "codefest", "competition", "ideathon", "datathon"]],
  ["Technical Conferences", ["conference", "summit", "tech talk", "symposium", "keynote", "devcon"]],
  ["Corporate Events", ["corporate", "offsite", "townhall", "retreat", "quarterly", "annual meet", "executive"]],
  ["Exhibitions and Trade Shows", ["exhibition", "expo", "trade show", "showcase", "fair", "pavilion"]],
  ["Academic and Training Events", ["academic", "training", "workshop", "bootcamp", "seminar", "lecture", "course", "class", "tutorial"]],
  ["Weddings and Personal Events", ["wedding", "reception", "marriage", "sangeet", "birthday", "anniversary", "engagement", "personal", "party"]],
  ["Community and Nonprofit Events", ["community", "nonprofit", "ngo", "charity", "volunteer", "cleanup", "fundraiser", "meetup", "social"]],
  ["Sports and Recreational Events", ["sports", "marathon", "run", "tournament", "match", "fitness", "cycling", "trek", "recreation"]],
  ["Government and Civic Events", ["government", "civic", "municipal", "public hearing", "policy", "town hall", "citizen"]],
  ["Hybrid and Virtual Events", ["hybrid", "virtual", "webinar", "livestream", "online summit", "remote"]],
];

/**
 * Resolves a template ID or AI-detected event type string to a canonical template ID
 * (matching an `EVENT_TEMPLATES` entry or `CUSTOM_TEMPLATE_ID`).
 */
export function resolveTemplateId(rawType?: string | null): string {
  const trimmed = (rawType || "").trim();
  if (!trimmed) return CUSTOM_TEMPLATE_ID;
  if (trimmed === CUSTOM_TEMPLATE_ID) return CUSTOM_TEMPLATE_ID;

  const exact = EVENT_TEMPLATES.find((t) => t.id.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact.id;

  const normalized = trimmed.toLowerCase();
  if (normalized === "custom" || normalized === "other") return CUSTOM_TEMPLATE_ID;

  for (const [templateId, keywords] of TEMPLATE_KEYWORDS) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return templateId;
    }
  }

  return CUSTOM_TEMPLATE_ID;
}

export const TEMPLATE_FORM_META: Record<string, TemplateFormMeta> = {
  "Technical Conferences": {
    titlePlaceholder: "e.g. Global AI & Cloud Architecture Summit 2026",
    descriptionPlaceholder: "Share keynote speakers, session tracks, agenda highlights, and target audience...",
    venuePlaceholder: "e.g. KTPO Convention Centre, Whitefield, Bengaluru",
    onlinePlaceholder: "e.g. Zoom Webinar or YouTube Livestream URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Collect company role, experience level, session track preferences, and catering details.",
    questionLabelPlaceholder: "e.g. Preferred Session Track",
    customParamPlaceholder: "Param label (e.g. Keynote Speaker)",
  },
  "Hackathons and Competitions": {
    titlePlaceholder: "e.g. NextGen AI Hackathon 2026",
    descriptionPlaceholder: "Outline problem statements, judging criteria, prize pool, rules, and mentor schedule...",
    venuePlaceholder: "e.g. IIIT Auditorium, Gachibowli, Hyderabad",
    onlinePlaceholder: "e.g. Discord Server & Submission Portal URL",
    defaultMode: "offline",
    defaultRegistrationType: "team",
    questionnaireSubtitle: "Gather campus details, tech stack, GitHub/portfolio links, and swag preferences.",
    questionLabelPlaceholder: "e.g. GitHub Profile URL",
    customParamPlaceholder: "Param label (e.g. Prize Pool)",
  },
  "Corporate Events": {
    titlePlaceholder: "e.g. Annual Product Leadership Offsite 2026",
    descriptionPlaceholder: "Describe executive sessions, team activities, dress code, and logistics...",
    venuePlaceholder: "e.g. Taj Lands End, Bandra West, Mumbai",
    onlinePlaceholder: "e.g. Microsoft Teams Townhall or Zoom Meeting URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Capture department, designation, badge requirements, and catering preferences.",
    questionLabelPlaceholder: "e.g. Employee ID / Cost Center",
    customParamPlaceholder: "Param label (e.g. Dress Code)",
  },
  "Exhibitions and Trade Shows": {
    titlePlaceholder: "e.g. FinTech & SaaS Innovation Expo 2026",
    descriptionPlaceholder: "Highlight exhibitor categories, floor plan zones, product demos, and visitor perks...",
    venuePlaceholder: "e.g. Bharat Mandapam, Pragati Maidan, New Delhi",
    onlinePlaceholder: "e.g. Virtual Expo Showcase Portal URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Collect visitor industry sector, attendee role, and booth or product interests.",
    questionLabelPlaceholder: "e.g. Primary Product Interest",
    customParamPlaceholder: "Param label (e.g. Hall Number)",
  },
  "Academic and Training Events": {
    titlePlaceholder: "e.g. Full-Stack System Design Bootcamp 2026",
    descriptionPlaceholder: "Specify syllabus modules, prerequisites, hands-on labs, instructor bio, and certification details...",
    venuePlaceholder: "e.g. Lecture Hall Complex, IIT Delhi",
    onlinePlaceholder: "e.g. Zoom Classroom or Google Meet Link",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Assess learner background, institution details, and workshop preparation needs.",
    questionLabelPlaceholder: "e.g. Prior Experience Level",
    customParamPlaceholder: "Param label (e.g. Certificate Credits)",
  },
  "Weddings and Personal Events": {
    titlePlaceholder: "e.g. Aarav & Meera's Wedding Reception",
    descriptionPlaceholder: "Share celebration schedule, venue directions, dress theme, hospitality notes, and warm wishes...",
    venuePlaceholder: "e.g. Rambagh Palace Lawns, Jaipur",
    onlinePlaceholder: "e.g. Private Ceremony Livestream URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Gather RSVP confirmations, guest counts, meal preferences, and travel or celebration notes.",
    questionLabelPlaceholder: "e.g. Accompanying Guests Count",
    customParamPlaceholder: "Param label (e.g. Dress Theme)",
  },
  "Community and Nonprofit Events": {
    titlePlaceholder: "e.g. City Green Drive & Zero-Waste Cleanup",
    descriptionPlaceholder: "Explain community impact, volunteer roles, schedule, items to bring, and partner NGOs...",
    venuePlaceholder: "e.g. Cubbon Park Bandstand, Bengaluru",
    onlinePlaceholder: "e.g. Community Meetup Call URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Coordinate volunteer participation, availability shifts, emergency contacts, and kit sizes.",
    questionLabelPlaceholder: "e.g. Preferred Volunteer Role",
    customParamPlaceholder: "Param label (e.g. Cause Focus)",
  },
  "Sports and Recreational Events": {
    titlePlaceholder: "e.g. Sunrise 10K City Marathon & Fitness Fest",
    descriptionPlaceholder: "Detail race categories, route map, reporting time, hydration points, and kit collection info...",
    venuePlaceholder: "e.g. Jawaharlal Nehru Stadium, New Delhi",
    onlinePlaceholder: "e.g. Virtual Run Tracker & Leaderboard URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Collect skill/race division, jersey size, emergency contact, and safety waiver consent.",
    questionLabelPlaceholder: "e.g. Race Category (5K / 10K)",
    customParamPlaceholder: "Param label (e.g. Entry Division)",
  },
  "Government and Civic Events": {
    titlePlaceholder: "e.g. Smart City Urban Mobility Public Townhall",
    descriptionPlaceholder: "Outline civic agenda, participating officials, public Q&A guidelines, and accessibility facilities...",
    venuePlaceholder: "e.g. Municipal Corporation Auditorium, Pune",
    onlinePlaceholder: "e.g. Civic Portal Live Stream URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Gather ward/constituency context, accessibility support needs, and citizen agenda questions.",
    questionLabelPlaceholder: "e.g. Accessibility / Language Support",
    customParamPlaceholder: "Param label (e.g. Issuing Department)",
  },
  "Hybrid and Virtual Events": {
    titlePlaceholder: "e.g. Global Remote Engineering Summit 2026",
    descriptionPlaceholder: "Provide streaming access details, interactive breakout tracks, timezone notes, and Q&A format...",
    venuePlaceholder: "e.g. Hybrid Hub Studio, Gurugram + Livestream",
    onlinePlaceholder: "e.g. Zoom Webinar, Hopin, or StreamYard URL",
    defaultMode: "hybrid",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Capture attendance mode, local timezone, preferred breakout track, and speaker Q&A.",
    questionLabelPlaceholder: "e.g. Local Timezone",
    customParamPlaceholder: "Param label (e.g. Streaming Platform)",
  },
  [CUSTOM_TEMPLATE_ID]: {
    titlePlaceholder: "e.g. My Custom Community Gathering 2026",
    descriptionPlaceholder: "Provide descriptive details, guidelines, rules, speakers, or schedule overview...",
    venuePlaceholder: "e.g. Main Convention Centre, City Name",
    onlinePlaceholder: "e.g. Zoom, Google Meet or YouTube Livestream URL",
    defaultMode: "offline",
    defaultRegistrationType: "solo",
    questionnaireSubtitle: "Design custom fields and questions participants answer when registering.",
    questionLabelPlaceholder: "e.g. Custom Participant Question",
    customParamPlaceholder: "Param label (e.g. Special Guest)",
  },
};

export function getTemplateFormMeta(templateId?: string | null): TemplateFormMeta {
  const resolved = resolveTemplateId(templateId);
  return TEMPLATE_FORM_META[resolved] || TEMPLATE_FORM_META[CUSTOM_TEMPLATE_ID];
}

export const TEMPLATE_RECOMMENDED_QUESTIONS: Record<string, RecommendedQuestion[]> = {
  [CUSTOM_TEMPLATE_ID]: [
    { key: "organization", label: "Organization / Company", type: "text" },
    { key: "role", label: "Job Title / Role", type: "text" },
    { key: "linkedin_url", label: "LinkedIn / Portfolio Link", type: "text" },
    { key: "college", label: "College / University", type: "text" },
    { key: "dietary_preference", label: "Dietary Preference", type: "select", options: ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Halal", "No Preference"] },
    { key: "tshirt_size", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "why_attend", label: "Why do you want to join?", type: "textarea" },
    { key: "emergency_contact", label: "Emergency Contact Phone", type: "text" },
    { key: "hear_about", label: "How did you hear about this event?", type: "select", options: ["Social Media", "Friend / Colleague", "Community Group", "Newsletter", "Other"] },
  ],
  "Technical Conferences": [
    { key: "organization", label: "Organization / Company", type: "text" },
    { key: "job_title", label: "Job Title / Designation", type: "text" },
    { key: "experience_level", label: "Years of Experience", type: "select", options: ["Student", "0-2 years", "3-5 years", "5-10 years", "10+ years"] },
    { key: "session_track", label: "Preferred Session Track", type: "text" },
    { key: "github_profile", label: "GitHub / LinkedIn Profile", type: "text" },
    { key: "dietary_preference", label: "Dietary Preference", type: "select", options: ["Veg", "Non-Veg", "Vegan", "Jain"] },
    { key: "tshirt_size", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  ],
  "Hackathons and Competitions": [
    { key: "college", label: "College / University", type: "text" },
    { key: "branch", label: "Branch / Stream", type: "text" },
    { key: "grad_year", label: "Graduation Year", type: "text" },
    { key: "github_url", label: "GitHub / Portfolio URL", type: "text" },
    { key: "tech_skills", label: "Primary Tech Stack", type: "text" },
    { key: "resume_url", label: "Resume / Devpost Link", type: "text" },
    { key: "tshirt_size", label: "T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "food_preference", label: "Food Preference", type: "select", options: ["Veg", "Non-Veg", "Jain", "Vegan"] },
  ],
  "Corporate Events": [
    { key: "company", label: "Company / Business Unit", type: "text" },
    { key: "department", label: "Department", type: "text" },
    { key: "job_title", label: "Role / Designation", type: "text" },
    { key: "employee_id", label: "Employee ID", type: "text" },
    { key: "work_email", label: "Corporate / Work Email", type: "text" },
    { key: "travel_accommodation", label: "Travel / Hotel Required?", type: "select", options: ["Not Required", "Flight + Hotel", "Hotel Only", "Local Transport"] },
    { key: "dietary_preference", label: "Dietary Preference", type: "select", options: ["Veg", "Non-Veg", "Vegan", "Jain", "No Preference"] },
  ],
  "Exhibitions and Trade Shows": [
    { key: "company", label: "Company / Brand Name", type: "text" },
    { key: "role", label: "Job Title / Role", type: "text" },
    { key: "industry", label: "Industry Sector", type: "text" },
    { key: "pass_interest", label: "Attending As", type: "select", options: ["Visitor / Buyer", "Exhibitor / Sponsor", "Media / Press", "Speaker / Partner"] },
    { key: "company_size", label: "Company Size", type: "select", options: ["1-10", "11-50", "51-200", "201-1000", "1000+"] },
    { key: "interest_area", label: "Products or Services of Interest", type: "textarea" },
    { key: "meeting_request", label: "Interested in 1-on-1 Exhibitor Demos?", type: "checkbox" },
  ],
  "Academic and Training Events": [
    { key: "institution", label: "School / College / Organization", type: "text" },
    { key: "current_level", label: "Current Academic / Career Level", type: "select", options: ["High School", "Undergraduate", "Postgraduate / PhD", "Working Professional", "Educator / Faculty"] },
    { key: "field_of_study", label: "Department / Subject Area", type: "text" },
    { key: "prior_experience", label: "Familiarity with Topic", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
    { key: "laptop_required", label: "Bringing Your Own Laptop?", type: "checkbox" },
    { key: "learning_goals", label: "What do you hope to learn?", type: "textarea" },
  ],
  "Weddings and Personal Events": [
    { key: "rsvp_status", label: "RSVP Confirmation", type: "select", options: ["Joyfully Attending", "Attending Ceremony Only", "Attending Reception Only", "Unable to Attend"] },
    { key: "guest_count", label: "Number of Guests (including you)", type: "number" },
    { key: "relation_side", label: "Guest Side / Relation", type: "select", options: ["Bride's Family & Friends", "Groom's Family & Friends", "Host / Mutual Friend", "Colleague"] },
    { key: "dietary_preference", label: "Meal / Dietary Preference", type: "select", options: ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Allergies (Mention in Notes)"] },
    { key: "accommodation_needed", label: "Need Help with Accommodation / Pickup?", type: "checkbox" },
    { key: "song_request", label: "Favorite Dance / Song Request", type: "text" },
    { key: "special_notes", label: "Song Request, Allergies, or Travel Notes", type: "textarea" },
  ],
  "Community and Nonprofit Events": [
    { key: "participation_role", label: "How would you like to participate?", type: "select", options: ["General Attendee", "Event Volunteer", "Donor / Sponsor", "Community Partner"] },
    { key: "availability", label: "Preferred Shift / Availability", type: "select", options: ["Full Event", "Morning Shift", "Afternoon Shift", "Setup / Cleanup"] },
    { key: "emergency_contact", label: "Emergency Contact Number", type: "text" },
    { key: "tshirt_size", label: "Volunteer T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "neighborhood", label: "City / Neighborhood", type: "text" },
    { key: "motivation", label: "Why does this cause matter to you?", type: "textarea" },
  ],
  "Sports and Recreational Events": [
    { key: "division", label: "Category / Skill Level", type: "select", options: ["Beginner / Fun", "Intermediate", "Competitive / Pro", "Junior / Youth"] },
    { key: "jersey_size", label: "Jersey / T-Shirt Size", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { key: "emergency_contact", label: "Emergency Contact Name & Phone", type: "text" },
    { key: "blood_group", label: "Blood Group", type: "select", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
    { key: "club_name", label: "Club / Team Affiliation", type: "text" },
    { key: "medical_waiver", label: "I confirm I am medically fit and accept event safety guidelines", type: "checkbox" },
  ],
  "Government and Civic Events": [
    { key: "neighborhood", label: "Ward / Constituency / Neighborhood", type: "text" },
    { key: "organization", label: "Organization / Civic Association (if any)", type: "text" },
    { key: "attendance_capacity", label: "Participating As", type: "select", options: ["Resident / Citizen", "Government Official", "NGO / Civil Society", "Press / Media"] },
    { key: "accessibility_needs", label: "Accessibility or Language Assistance", type: "text" },
    { key: "govt_id_ack", label: "Bringing Valid Photo ID for Security Check?", type: "checkbox" },
    { key: "civic_question", label: "Question or Topic for the Agenda", type: "textarea" },
  ],
  "Hybrid and Virtual Events": [
    { key: "attendance_mode", label: "How will you attend?", type: "select", options: ["Online (Livestream / Virtual)", "In-Person Venue", "Flexible / Undecided"] },
    { key: "timezone", label: "Your Local Timezone", type: "text" },
    { key: "organization", label: "Organization / Company", type: "text" },
    { key: "preferred_track", label: "Preferred Session / Breakout Topic", type: "text" },
    { key: "recording_opt_in", label: "Send me post-event recording & slides", type: "checkbox" },
    { key: "qa_submission", label: "Questions for Speakers / Hosts", type: "textarea" },
  ],
};

export const TEMPLATE_DEFAULT_QUESTIONS: Record<string, RegistrationFormField[]> = {
  "Technical Conferences": [
    { id: "reg_conf_org", key: "organization", label: "Organization / Company", type: "text", required: true },
    { id: "reg_conf_role", key: "job_title", label: "Job Title / Designation", type: "text", required: true },
    { id: "reg_conf_exp", key: "experience_level", label: "Years of Experience", type: "select", required: false, options: ["Student", "0-2 years", "3-5 years", "5-10 years", "10+ years"] },
    { id: "reg_conf_track", key: "session_track", label: "Preferred Session Track", type: "text", required: false },
    { id: "reg_conf_diet", key: "dietary_preference", label: "Dietary Preference", type: "select", required: false, options: ["Veg", "Non-Veg", "Vegan", "Jain"] },
  ],
  "Hackathons and Competitions": [
    { id: "reg_hack_college", key: "college", label: "College / University", type: "text", required: true },
    { id: "reg_hack_branch", key: "branch", label: "Branch / Stream", type: "text", required: false },
    { id: "reg_hack_github", key: "github_url", label: "GitHub / Portfolio URL", type: "text", required: true },
    { id: "reg_hack_stack", key: "tech_skills", label: "Primary Tech Stack", type: "text", required: false },
    { id: "reg_hack_tshirt", key: "tshirt_size", label: "T-Shirt Size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { id: "reg_hack_food", key: "food_preference", label: "Food Preference", type: "select", required: false, options: ["Veg", "Non-Veg", "Jain", "Vegan"] },
  ],
  "Corporate Events": [
    { id: "reg_corp_company", key: "company", label: "Company / Business Unit", type: "text", required: true },
    { id: "reg_corp_dept", key: "department", label: "Department", type: "text", required: true },
    { id: "reg_corp_role", key: "job_title", label: "Role / Designation", type: "text", required: false },
    { id: "reg_corp_email", key: "work_email", label: "Corporate / Work Email", type: "text", required: false },
    { id: "reg_corp_diet", key: "dietary_preference", label: "Dietary Preference", type: "select", required: false, options: ["Veg", "Non-Veg", "Vegan", "Jain", "No Preference"] },
  ],
  "Exhibitions and Trade Shows": [
    { id: "reg_expo_company", key: "company", label: "Company / Brand Name", type: "text", required: true },
    { id: "reg_expo_pass", key: "pass_interest", label: "Attending As", type: "select", required: true, options: ["Visitor / Buyer", "Exhibitor / Sponsor", "Media / Press", "Speaker / Partner"] },
    { id: "reg_expo_role", key: "role", label: "Job Title / Role", type: "text", required: false },
    { id: "reg_expo_sector", key: "industry", label: "Industry Sector", type: "text", required: false },
    { id: "reg_expo_interest", key: "interest_area", label: "Products or Services of Interest", type: "textarea", required: false },
  ],
  "Academic and Training Events": [
    { id: "reg_acad_inst", key: "institution", label: "School / College / Organization", type: "text", required: true },
    { id: "reg_acad_level", key: "current_level", label: "Current Academic / Career Level", type: "select", required: true, options: ["High School", "Undergraduate", "Postgraduate / PhD", "Working Professional", "Educator / Faculty"] },
    { id: "reg_acad_subject", key: "field_of_study", label: "Department / Subject Area", type: "text", required: false },
    { id: "reg_acad_exp", key: "prior_experience", label: "Familiarity with Topic", type: "select", required: false, options: ["Beginner", "Intermediate", "Advanced"] },
    { id: "reg_acad_goals", key: "learning_goals", label: "What do you hope to learn?", type: "textarea", required: false },
  ],
  "Weddings and Personal Events": [
    { id: "reg_wed_rsvp", key: "rsvp_status", label: "RSVP Confirmation", type: "select", required: true, options: ["Joyfully Attending", "Attending Ceremony Only", "Attending Reception Only", "Unable to Attend"] },
    { id: "reg_wed_guests", key: "guest_count", label: "Number of Guests (including you)", type: "number", required: true },
    { id: "reg_wed_side", key: "relation_side", label: "Guest Side / Relation", type: "select", required: false, options: ["Bride's Family & Friends", "Groom's Family & Friends", "Host / Mutual Friend", "Colleague"] },
    { id: "reg_wed_meal", key: "dietary_preference", label: "Meal / Dietary Preference", type: "select", required: false, options: ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Allergies (Mention in Notes)"] },
    { id: "reg_wed_notes", key: "special_notes", label: "Song Request, Allergies, or Travel Notes", type: "textarea", required: false },
  ],
  "Community and Nonprofit Events": [
    { id: "reg_comm_role", key: "participation_role", label: "How would you like to participate?", type: "select", required: true, options: ["General Attendee", "Event Volunteer", "Donor / Sponsor", "Community Partner"] },
    { id: "reg_comm_shift", key: "availability", label: "Preferred Shift / Availability", type: "select", required: false, options: ["Full Event", "Morning Shift", "Afternoon Shift", "Setup / Cleanup"] },
    { id: "reg_comm_emerg", key: "emergency_contact", label: "Emergency Contact Number", type: "text", required: false },
    { id: "reg_comm_tshirt", key: "tshirt_size", label: "Volunteer T-Shirt Size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { id: "reg_comm_why", key: "motivation", label: "Why does this cause matter to you?", type: "textarea", required: false },
  ],
  "Sports and Recreational Events": [
    { id: "reg_sport_div", key: "division", label: "Category / Skill Level", type: "select", required: true, options: ["Beginner / Fun", "Intermediate", "Competitive / Pro", "Junior / Youth"] },
    { id: "reg_sport_jersey", key: "jersey_size", label: "Jersey / T-Shirt Size", type: "select", required: true, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { id: "reg_sport_emerg", key: "emergency_contact", label: "Emergency Contact Name & Phone", type: "text", required: true },
    { id: "reg_sport_blood", key: "blood_group", label: "Blood Group", type: "select", required: false, options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
    { id: "reg_sport_waiver", key: "medical_waiver", label: "I confirm I am medically fit and accept event safety guidelines", type: "checkbox", required: true },
  ],
  "Government and Civic Events": [
    { id: "reg_civic_ward", key: "neighborhood", label: "Ward / Constituency / Neighborhood", type: "text", required: true },
    { id: "reg_civic_org", key: "organization", label: "Organization / Civic Association (if any)", type: "text", required: false },
    { id: "reg_civic_role", key: "attendance_capacity", label: "Participating As", type: "select", required: false, options: ["Resident / Citizen", "Government Official", "NGO / Civil Society", "Press / Media"] },
    { id: "reg_civic_access", key: "accessibility_needs", label: "Accessibility or Language Assistance", type: "text", required: false },
    { id: "reg_civic_topic", key: "civic_question", label: "Question or Topic for the Agenda", type: "textarea", required: false },
  ],
  "Hybrid and Virtual Events": [
    { id: "reg_hyb_mode", key: "attendance_mode", label: "How will you attend?", type: "select", required: true, options: ["Online (Livestream / Virtual)", "In-Person Venue", "Flexible / Undecided"] },
    { id: "reg_hyb_tz", key: "timezone", label: "Your Local Timezone", type: "text", required: true },
    { id: "reg_hyb_org", key: "organization", label: "Organization / Company", type: "text", required: false },
    { id: "reg_hyb_track", key: "preferred_track", label: "Preferred Session / Breakout Topic", type: "text", required: false },
    { id: "reg_hyb_qa", key: "qa_submission", label: "Questions for Speakers / Hosts", type: "textarea", required: false },
  ],
};

export function getRecommendedQuestionsForTemplate(templateId?: string | null): RecommendedQuestion[] {
  const resolved = resolveTemplateId(templateId);
  return TEMPLATE_RECOMMENDED_QUESTIONS[resolved] || TEMPLATE_RECOMMENDED_QUESTIONS[CUSTOM_TEMPLATE_ID] || [];
}

export function getDefaultQuestionsForTemplate(templateId?: string | null): RegistrationFormField[] {
  const resolved = resolveTemplateId(templateId);
  // Blank / Custom template has an EMPTY questionnaire by default
  if (resolved === CUSTOM_TEMPLATE_ID) {
    return [];
  }
  const questions = TEMPLATE_DEFAULT_QUESTIONS[resolved];
  if (!questions) {
    return [];
  }
  return questions.map((q) => ({
    ...q,
    options: q.options ? [...q.options] : undefined,
  }));
}
