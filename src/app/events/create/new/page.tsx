"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  AlignLeft,
  CheckCircle2,
  Loader2,
  Ticket,
  Plus,
  X,
  ListPlus,
  FileText,
  Lock,
  User,
  Trash2,
  Clock,
  Users,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import {
  EVENT_TEMPLATES,
  CUSTOM_TEMPLATE_ID,
  CUSTOM_FIELD_TYPES,
  getTemplateById,
  type FieldType,
} from "@/lib/eventTemplates";




const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

interface EventFormData {
  title: string;
  category: string; // Backend calls this 'type'
  mode: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
  capacity: string;
  registration_type: string;
  registration_fee: string;
  min_team_size: string;
  max_team_size: string;
  keywords?: string;
}

interface FormErrors {
  title?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
  registration_fee?: string;
  capacity?: string;
  min_team_size?: string;
  max_team_size?: string;
  custom_fields?: string;
  reg_form_fields?: string;
}

interface CustomFieldEntry {
  id: string;
  label: string;
  type: FieldType | "boolean";
  value: string;
  options?: string[];
}

export interface RegistrationFormField {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}

const MODES = ["online", "offline", "hybrid"];
const REG_TYPES = ["solo", "team"];
const TOTAL_STEPS = 6;

const isValidTemplateId = (id: string | null) =>
  !!id && (id === CUSTOM_TEMPLATE_ID || EVENT_TEMPLATES.some((tpl) => tpl.id === id));

// FormRow defined outside the component to prevent typing focus loss!
const FormRow = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-2.5 first:pt-0 last:pb-0">
    <div className="w-9 h-9 flex items-center justify-center text-zinc-400 mt-0.5 shrink-0 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
      {icon}
    </div>
    <div className="flex-1 min-w-0 space-y-1.5">
      {children}
    </div>
  </div>
);

function CreateEventPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, activeAccent } = useAppearance();
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ label: string; value: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const locationControllerRef = useRef<AbortController | null>(null);

  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomFieldEntry[]>([]);

  const [regFormFields, setRegFormFields] = useState<RegistrationFormField[]>([
    { id: "reg_college", key: "college", label: "College / University", type: "text", required: true },
    { id: "reg_branch", key: "branch", label: "Branch / Stream", type: "text", required: false },
    { id: "reg_year", key: "year", label: "Graduation Year / Academic Year", type: "text", required: false },
    { id: "reg_tshirt", key: "tshirt_size", label: "T-Shirt Size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { id: "reg_food", key: "food_preference", label: "Food Preference", type: "select", required: false, options: ["Veg", "Non-Veg", "Jain", "Vegan"] },
  ]);

  const templateFromUrl = searchParams.get("template");
  const initialCategory = isValidTemplateId(templateFromUrl) ? (templateFromUrl as string) : EVENT_TEMPLATES[0].id;

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    category: initialCategory,
    mode: "offline",
    start_date: "",
    end_date: "",
    location: "",
    description: "",
    capacity: "0",
    registration_type: "solo",
    registration_fee: "0",
    min_team_size: "1",
    max_team_size: "4",
  });

  const activeTemplate = getTemplateById(formData.category);
  const isCustom = formData.category === CUSTOM_TEMPLATE_ID;

  const updateForm = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field as keyof FormErrors);
  };

  const clearFieldError = (field: keyof FormErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  useEffect(() => {
    const searchTerm = formData.location.trim();
    if (isLocationSelected || searchTerm.length < 3) {
      if (isLocationSelected) {
        setLocationSuggestions([]);
      }
      setIsLoadingSuggestions(false);
      return;
    }

    const timer = window.setTimeout(() => {
      locationControllerRef.current?.abort();
      const controller = new AbortController();
      locationControllerRef.current = controller;
      setIsLoadingSuggestions(true);

      fetch(`${API_BASE_URL}/locations/search?q=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to fetch locations");
          const result = await response.json();
          const suggestions = Array.isArray(result?.data)
            ? result.data.map((item: any) => {
                const label = [item.name, item.address].filter(Boolean).join(" - ");
                return { label: label || "Unknown location", value: label || "Unknown location" };
              })
            : [];
          setLocationSuggestions(suggestions);
        })
        .catch(() => setLocationSuggestions([]))
        .finally(() => {
          if (locationControllerRef.current === controller) setIsLoadingSuggestions(false);
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [formData.location]);

  const updateTemplateValue = (fieldId: string, value: string) => {
    setTemplateValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const addCustomField = (type: FieldType | "boolean") => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setCustomFields((prev) => [
      ...prev,
      {
        id,
        label: "",
        type,
        value: type === "boolean" ? "true" : "",
        options: type === "select" ? ["Option 1", "Option 2"] : undefined,
      },
    ]);
  };

  const updateCustomField = (id: string, updates: Partial<CustomFieldEntry>) => {
    setCustomFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...updates } : field))
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== id));
  };

  const addRegFormField = (
    key: string,
    label: string,
    type: "text" | "textarea" | "number" | "select" | "checkbox",
    options?: string[]
  ) => {
    const id = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanKey = (key || label).toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30) || id;
    setRegFormFields((prev) => [
      ...prev,
      {
        id,
        key: cleanKey,
        label,
        type,
        required: false,
        options: type === "select" ? (options || ["Option A", "Option B"]) : undefined,
      },
    ]);
    clearFieldError("reg_form_fields");
  };

  const updateRegFormField = (id: string, patch: Partial<RegistrationFormField>) => {
    setRegFormFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    clearFieldError("reg_form_fields");
  };

  const removeRegFormField = (id: string) => {
    setRegFormFields((prev) => prev.filter((f) => f.id !== id));
    clearFieldError("reg_form_fields");
  };

  const validateForm = (targetStep = step): boolean => {
    const nextErrors: FormErrors = {};
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const now = new Date();
    const minStart = new Date(now.getTime() - 10 * 60 * 1000);

    if (targetStep === 1 || targetStep === 6) {
      if (!trimmedTitle) {
        nextErrors.title = "Title is required.";
      } else if (trimmedTitle.length < 5) {
        nextErrors.title = "Title must be at least 5 characters long.";
      } else if (trimmedTitle.length > 150) {
        nextErrors.title = "Title cannot exceed 150 characters.";
      }
    }

    if (targetStep === 2 || targetStep === 6) {
      if (isCustom) {
        if (customFields.length === 0) {
          nextErrors.custom_fields = "Please add at least one custom property for this event type.";
        }
        customFields.forEach((field) => {
          if (!field.label.trim()) {
            nextErrors.custom_fields = "All custom properties must have a title label.";
          }
        });
      }
    }

    if (targetStep === 3 || targetStep === 6) {
      if (!formData.start_date) {
        nextErrors.start_date = "Start date is required.";
      } else {
        const startDate = new Date(formData.start_date);
        if (startDate < minStart) {
          nextErrors.start_date = "Start date and time cannot be in the past.";
        }
      }

      if (!formData.end_date) {
        nextErrors.end_date = "End date is required.";
      }

      if (formData.start_date && formData.end_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate <= startDate) {
          nextErrors.end_date = "End date must be scheduled after start date.";
        }
      }

      if (formData.mode !== "online" && !formData.location.trim()) {
        nextErrors.location = "Location address is required for offline or hybrid events.";
      }
    }

    if (targetStep === 4 || targetStep === 6) {
      if (!trimmedDescription) {
        nextErrors.description = "Description is required.";
      } else if (trimmedDescription.length < 20) {
        nextErrors.description = "Please add a more detailed description (at least 20 characters).";
      }

      const fee = parseFloat(formData.registration_fee);
      if (isNaN(fee) || fee < 0) {
        nextErrors.registration_fee = "Registration fee must be ₹0 or higher.";
      } else if (fee > 100000) {
        nextErrors.registration_fee = "Registration fee cannot exceed ₹100,000.";
      }

      const cap = parseInt(formData.capacity);
      if (isNaN(cap) || cap < 0) {
        nextErrors.capacity = "Maximum capacity must be a positive integer.";
      }

      if (formData.registration_type === "team") {
        const minSize = parseInt(formData.min_team_size);
        const maxSize = parseInt(formData.max_team_size);
        if (isNaN(minSize) || minSize < 1) {
          nextErrors.min_team_size = "Minimum team size must be at least 1.";
        }
        if (isNaN(maxSize) || maxSize < 1) {
          nextErrors.max_team_size = "Maximum team size must be at least 1.";
        }
        if (!isNaN(minSize) && !isNaN(maxSize) && maxSize < minSize) {
          nextErrors.max_team_size = "Maximum team size cannot be less than minimum team size.";
        }
      }
    }

    if (targetStep === 5 || targetStep === 6) {
      regFormFields.forEach((field) => {
        if (!field.label.trim()) {
          nextErrors.reg_form_fields = "Please specify a question title for all form custom inputs.";
        }
      });
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateForm(step)) return;
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const buildCustomPayload = () => {
    const registration_form_schema = [
      { key: "name", label: "Full Name", type: "text", required: true, is_fixed: true },
      { key: "email", label: "Email Address", type: "text", required: true, is_fixed: true },
      { key: "phone", label: "Phone Number", type: "text", required: true, is_fixed: true },
      ...regFormFields
        .filter((f) => f.label.trim())
        .map((f) => ({
          id: f.id,
          key: f.key || f.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          label: f.label.trim(),
          type: f.type,
          required: f.required,
          options: f.options,
          is_fixed: false,
        })),
    ];

    if (isCustom) {
      const custom_fields: Record<string, unknown> = {
        registration_form_schema,
      };
      const custom_form_schema = customFields
        .filter((f) => f.label.trim())
        .map((f) => {
          const type = f.type === "boolean" ? "checkbox" : f.type;
          custom_fields[f.id] =
            f.type === "boolean" || f.type === "checkbox"
              ? f.value === "true"
              : f.type === "number"
              ? Number(f.value) || 0
              : f.value;
          return {
            id: f.id,
            label: f.label.trim(),
            type,
            required: false,
            options: f.type === "select" ? f.options : undefined,
          };
        });
      return { custom_fields, custom_form_schema, registration_form_schema };
    }

    const custom_fields: Record<string, unknown> = {
      registration_form_schema,
    };
    if (activeTemplate) {
      activeTemplate.fields.forEach((f) => {
        const raw = templateValues[f.id];
        if (raw === undefined || raw === "") return;
        custom_fields[f.id] = f.type === "checkbox" ? raw === "true" : f.type === "number" ? Number(raw) || 0 : raw;
      });
    }
    return { custom_fields, custom_form_schema: undefined, registration_form_schema };
  };

  const onSubmit = async () => {
    if (!validateForm(6)) return;

    try {
      setIsLoading(true);
      const { custom_fields, custom_form_schema, registration_form_schema } = buildCustomPayload();

      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.category,
        mode: formData.mode,
        location: formData.location || "Online",
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        capacity: parseInt(formData.capacity) || 0,
        registration_type: formData.registration_type,
        registration_fee: parseFloat(formData.registration_fee) || 0,
        min_team_size: parseInt(formData.min_team_size) || 1,
        max_team_size: parseInt(formData.max_team_size) || 1,
        custom_fields: {
          ...custom_fields,
          keywords: formData.keywords || "",
        },
        registration_form_schema,
        ...(custom_form_schema ? { custom_form_schema } : {}),
      };

      await eventService.createEvent(payload);
      showSuccess("Event created successfully!");
      router.push("/home");
    } catch (err: any) {
      setIsLoading(false);
      showError(err?.message || "Failed to create event. Please try again.");
    }
  };

  const renderTemplateFieldInput = (field: { id: string; label: string; type: FieldType; options?: string[]; placeholder?: string }) => {
    const value = templateValues[field.id] ?? "";

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={2}
            className="w-full py-2 px-3 rounded-lg bg-zinc-50 border border-zinc-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-zinc-900 placeholder:text-zinc-400"
          />
        );
      case "select":
        return (
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateTemplateValue(field.id, opt)}
                className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all ${
                  value === opt ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-zinc-50 text-zinc-700 border-zinc-200"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <button
            type="button"
            onClick={() => updateTemplateValue(field.id, value === "true" ? "false" : "true")}
            className={`px-4 py-1.5 rounded-lg border font-bold text-xs transition-all ${
              value === "true" ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-zinc-50 text-zinc-700 border-zinc-200"
            }`}
          >
            {value === "true" ? "Yes" : "No"}
          </button>
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="py-2 px-3 h-9 rounded-lg bg-zinc-50 border-zinc-200 text-sm font-semibold max-w-[140px]"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            className="py-2 px-3 h-9 rounded-lg bg-zinc-50 border-zinc-200 text-sm font-semibold max-w-[160px]"
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="py-2 px-3 h-9 rounded-lg bg-zinc-50 border-zinc-200 text-sm font-semibold"
          />
        );
    }
  };

  const renderCustomFieldValueInput = (field: CustomFieldEntry) => {
    switch (field.type) {
      case "boolean":
        return (
          <div className="flex gap-1.5 max-w-[140px]">
            <button
              type="button"
              onClick={() => updateCustomField(field.id, { value: "true" })}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex-1 transition-all ${
                field.value === "true" ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-white text-zinc-600 border-zinc-200"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => updateCustomField(field.id, { value: "false" })}
              className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex-1 transition-all ${
                field.value === "false" ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-white text-zinc-600 border-zinc-200"
              }`}
            >
              No
            </button>
          </div>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={field.value === "true"}
              onChange={(e) => updateCustomField(field.id, { value: e.target.checked ? "true" : "false" })}
              className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
            />
            Checked by default
          </label>
        );
      case "select":
        return (
          <div className="space-y-1.5">
            <Input
              value={(field.options || []).join(", ")}
              onChange={(e) =>
                updateCustomField(field.id, {
                  options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                })
              }
              placeholder="Options, separated by comma"
              className="py-2 px-3 h-9 rounded-lg bg-white border-zinc-200 text-sm font-semibold"
            />
            <div className="flex flex-wrap gap-1">
              {(field.options || []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateCustomField(field.id, { value: opt })}
                  className={`px-2.5 py-1 rounded border font-bold text-xs transition-all ${
                    field.value === opt ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-white text-zinc-600 border-zinc-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case "number":
        return (
          <Input
            type="number"
            value={field.value}
            placeholder="Value"
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            className="py-2 px-3 h-8.5 rounded-lg bg-white border-zinc-200 text-sm font-semibold max-w-[120px]"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={field.value}
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            className="py-2 px-3 h-8.5 rounded-lg bg-white border-zinc-200 text-sm font-semibold max-w-[120px]"
          />
        );
      default:
        return (
          <Input
            value={field.value}
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            placeholder="Value"
            className="py-2 px-3 h-8.5 rounded-lg bg-white border-zinc-200 text-sm font-semibold"
          />
        );
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  function clearSelectedLocation(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();

    updateForm("location", "");
    setIsLocationSelected(false);
    setLocationSuggestions([]);
    setIsLoadingSuggestions(false);
    clearFieldError("location");
  }

  function handleLocationSelect(value: string) {
    const normalized = (value || "").trim();
    if (!normalized) return;

    updateForm("location", normalized);
    setIsLocationSelected(true);
    setLocationSuggestions([]);
    setIsLoadingSuggestions(false);
    clearFieldError("location");
  }

  return (
    <div className="h-screen w-screen bg-zinc-50 flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* Minimal moving ambient background animations */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -35, 25, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-[-10%] left-[-10%] w-[42%] h-[42%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -25, 30, 0],
          y: [0, 25, -20, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed bottom-[-10%] right-[-10%] w-[52%] h-[52%] rounded-full bg-purple-500/5 blur-[140px] pointer-events-none"
      />

      {/* Header Navigation - Static */}
      <nav className="relative z-10 w-full p-4 border-b border-zinc-200 bg-white flex items-center justify-between shadow-xs shrink-0">
        <Link href="/events/create">
          <Button variant="ghost" className="rounded-md hover:bg-zinc-100 font-bold text-zinc-500 hover:text-zinc-950 transition-all text-xs h-8 px-2.5">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
            Event Creator
          </span>
        </div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Step {step} of {TOTAL_STEPS}
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10 overflow-hidden">
        
        {/* Detail Progress Bar - Static */}
        <div className="w-full max-w-4xl mb-6 shrink-0 flex gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= i ? "bg-indigo-600" : "bg-zinc-200"}`} />
          ))}
        </div>

        {/* Wider, Boxy Central Card - Locked internal scroll */}
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-zinc-250 flex flex-col overflow-hidden h-[calc(100vh-170px)] max-h-[620px]">
          
          {/* Scrollable inner content body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <AnimatePresence mode="wait" custom={1}>

              {/* --- STEP 1: BASICS --- */}
              {step === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></div>
                    <div>
                      <h1 className="text-xl font-black text-zinc-900 tracking-tight">Let&apos;s start with the basics</h1>
                      <p className="text-zinc-450 text-sm font-semibold">
                        {activeTemplate ? `Creating a ${activeTemplate.label} event.` : "Creating a custom event."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <FormRow icon={<Sparkles className="w-4 h-4 text-indigo-500" />}>
                      <div className="space-y-1">
                        <Label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Event Title</Label>
                        <input style={{ color: isDark ? "#f9fafb" : "#111827" }}
                          type="text"
                          placeholder="Add title (e.g. CodeHack 2026)"
                          value={formData.title}
                          onChange={(e) => updateForm("title", e.target.value)}
                          className={`text-xl font-extrabold w-full border-b border-zinc-200 hover:border-zinc-300 focus:border-indigo-600 focus:outline-none bg-transparent transition-all pb-1 placeholder:text-zinc-300 text-zinc-950 font-sans ${
                            fieldErrors.title ? "border-red-400 focus:border-red-500 text-red-500" : ""
                          }`}
                        />
                        {fieldErrors.title && <p className="text-sm text-red-500 mt-1 font-medium">{fieldErrors.title}</p>}
                      </div>
                    </FormRow>

                    <FormRow icon={<ListPlus className="w-4 h-4 text-zinc-500" />}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Event Category</Label>
                          <Link href="/events/create" className="text-sm font-bold text-indigo-650 hover:text-indigo-700 transition-colors">
                            Change template
                          </Link>
                        </div>
                        <div className="px-3.5 py-2.5 rounded-lg bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-sm flex items-center gap-2 mt-1">
                          {isCustom ? <ListPlus className="w-3.5 h-3.5 text-zinc-400" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                          {isCustom ? "Custom (User-Defined Schema)" : activeTemplate?.label || "Event"}
                        </div>
                      </div>
                    </FormRow>

                    <FormRow icon={<Users className="w-4 h-4 text-zinc-500" />}>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Hosting Mode</Label>
                        <div className="flex gap-2">
                          {MODES.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => updateForm("mode", mode)}
                              className={`flex-1 py-2 px-3 rounded-lg border font-bold text-sm capitalize transition-all ${
                                formData.mode === mode
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    </FormRow>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 2: TEMPLATE-SPECIFIC ATTRIBUTES (HORIZONTAL BLOCKS) --- */}
              {step === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className={`flex items-center gap-4 border-b ${isDark ? "border-white/10" : "border-zinc-100"} pb-4`}>
                    <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-lg flex items-center justify-center shrink-0 border border-violet-500/20"><ListPlus className="w-5 h-5" /></div>
                    <div>
                      <h1 className={`text-xl font-black ${isDark ? "text-white" : "text-zinc-900"} tracking-tight`}>
                        {isCustom ? "Build custom fields" : `${activeTemplate?.label || "Event"} attributes`}
                      </h1>
                      <p className={`${isDark ? "text-zinc-300" : "text-zinc-600"} text-sm font-semibold`}>
                        {isCustom ? "Add custom parameters your event tracks." : "Set extra attributes determined by template."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <FormRow icon={<ListPlus className="w-4 h-4 text-violet-400" />}>
                      {!isCustom && activeTemplate && activeTemplate.fields.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeTemplate.fields.map((field) => (
                            <div key={field.id} className={`space-y-1.5 p-3 rounded-lg border ${isDark ? "border-zinc-700 bg-zinc-800/60" : "border-zinc-200 bg-zinc-50/50"}`}>
                              <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"} uppercase tracking-wider`}>{field.label}</Label>
                              <div className="mt-1">{renderTemplateFieldInput(field)}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!isCustom && (!activeTemplate || activeTemplate.fields.length === 0) && (
                        <div className={`py-12 text-center ${isDark ? "text-zinc-300 border-zinc-700 bg-zinc-800/40" : "text-zinc-600 border-zinc-200 bg-zinc-50"} text-sm font-semibold border border-dashed rounded-xl`}>
                          No extra attributes required for this template. Press continue.
                        </div>
                      )}

                      {isCustom && (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Add Event Parameters</label>
                            <div className="flex flex-wrap gap-1.5">
                              {CUSTOM_FIELD_TYPES.map((t) => (
                                <button
                                  key={t.type}
                                  type="button"
                                  onClick={() => addCustomField(t.type)}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md ${isDark ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30" : "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700"} border transition-all text-sm font-bold`}
                                >
                                  <Plus className="w-4 h-4" /> {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {fieldErrors.custom_fields && (
                            <p className="text-sm text-red-500 font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                              {fieldErrors.custom_fields}
                            </p>
                          )}

                          {/* Horizontal Row block scaling builders */}
                          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                            {customFields.length === 0 && (
                              <div className={`text-center py-10 ${isDark ? "text-zinc-400 border-zinc-700 bg-zinc-800/40" : "text-zinc-500 border-zinc-200 bg-zinc-50"} font-semibold text-sm border border-dashed rounded-xl`}>
                                No custom parameters added. Click presets above to construct.
                              </div>
                            )}
                            {customFields.map((field) => (
                              <div key={field.id} className={`flex flex-col md:flex-row items-center gap-3 p-3 ${isDark ? "bg-zinc-800/70 border-zinc-700" : "bg-zinc-50 border-zinc-200"} border rounded-lg`}>
                                <div className="w-full md:w-1/3">
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                                    placeholder="Param label (e.g. Prize)"
                                    className={`h-8.5 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-white border-zinc-200 text-zinc-900"} text-sm font-semibold`}
                                  />
                                </div>
                                <div className="w-full md:w-1/4">
                                  <select
                                    value={field.type}
                                    onChange={(e) =>
                                      updateCustomField(field.id, {
                                        type: e.target.value as any,
                                        options: e.target.value === "select" ? field.options || ["Option 1", "Option 2"] : undefined,
                                        value: e.target.value === "boolean" ? "true" : "",
                                      })
                                    }
                                    className={`w-full h-8.5 py-1 px-2.5 rounded-lg border ${isDark ? "border-zinc-700 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-800"} text-sm font-bold focus:outline-none`}
                                  >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="select">Dropdown Choices</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="boolean">Yes/No Toggle</option>
                                  </select>
                                </div>
                                <div className={`flex-1 w-full pl-0 md:pl-2 border-l-0 md:border-l-2 ${isDark ? "border-zinc-700" : "border-zinc-200"}`}>
                                  {renderCustomFieldValueInput(field)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCustomField(field.id)}
                                  className="p-1.5 rounded hover:text-red-400 text-zinc-400 hover:bg-red-500/10 transition-colors shrink-0"
                                  aria-label="Remove parameter"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </FormRow>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 3: SCHEDULE & VENUE --- */}
              {step === 3 && (
                <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className={`flex items-center gap-4 border-b ${isDark ? "border-white/10" : "border-zinc-100"} pb-4`}>
                    <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-lg flex items-center justify-center shrink-0 border border-rose-500/20"><MapPin className="w-5 h-5" /></div>
                    <div>
                      <h1 className={`text-xl font-black ${isDark ? "text-white" : "text-zinc-900"} tracking-tight`}>Schedule & Venue</h1>
                      <p className={`${isDark ? "text-zinc-300" : "text-zinc-600"} text-sm font-semibold`}>Define event date boundaries and hosting addresses.</p>
                    </div>
                  </div>

                  <div className="space-y-5 relative">
                    <FormRow icon={<Clock className="w-4 h-4 text-rose-400" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Start Date & Time</Label>
                          <Input
                            type="datetime-local"
                            value={formData.start_date}
                            onChange={(e) => updateForm("start_date", e.target.value)}
                            className={`h-9 px-3 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"} text-sm focus-visible:ring-indigo-500 ${
                              fieldErrors.start_date ? "border-red-400 focus-visible:ring-red-400" : ""
                            }`}
                          />
                          {fieldErrors.start_date && <p className="text-sm text-red-500 mt-1 font-medium">{fieldErrors.start_date}</p>}
                        </div>

                        <div className="space-y-1">
                          <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>End Date & Time</Label>
                          <Input
                            type="datetime-local"
                            value={formData.end_date}
                            onChange={(e) => updateForm("end_date", e.target.value)}
                            className={`h-9 px-3 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"} text-sm focus-visible:ring-indigo-500 ${
                              fieldErrors.end_date ? "border-red-400 focus-visible:ring-red-400" : ""
                            }`}
                          />
                          {fieldErrors.end_date && <p className="text-sm text-red-500 mt-1 font-medium">{fieldErrors.end_date}</p>}
                        </div>
                      </div>
                    </FormRow>

                    <FormRow icon={<MapPin className="w-4 h-4 text-red-400" />}>
                      <div className="space-y-1.5 relative">
                        <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>
                          Location / Venue {formData.mode === "online" && "(Optional)"}
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder={formData.mode === "online" ? "e.g. Zoom or Meet URL" : "e.g. Auditorium Hall, Tech Hub Jaipur"}
                            value={formData.location}
                            onChange={(e) => {
                              updateForm("location", e.target.value);
                              setIsLocationSelected(false);
                            }}
                            className={`h-9 px-3 pr-9 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"} text-sm focus-visible:ring-indigo-500 ${
                              fieldErrors.location ? "border-red-400 focus-visible:ring-red-400" : ""
                            }`}
                          />
                          {formData.location.trim() && (
                            <button
                              type="button"
                              onClick={clearSelectedLocation}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                              aria-label="Clear location"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {isLoadingSuggestions && formData.location.trim().length >= 3 && (
                          <p className={`absolute z-30 mt-1 text-xs ${isDark ? "text-zinc-300 bg-zinc-800 border-zinc-700" : "text-zinc-500 bg-white border-zinc-200"} px-2.5 py-1.5 rounded border shadow-sm animate-pulse`}>
                            Searching locations...
                          </p>
                        )}
                        {locationSuggestions.length > 0 && (
                          <ul className={`absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border ${isDark ? "border-zinc-700 bg-zinc-900 divide-zinc-800" : "border-zinc-200 bg-white divide-zinc-100"} shadow-xl py-1 divide-y`}>
                            {locationSuggestions.map((suggestion) => (
                              <li
                                key={suggestion.value}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleLocationSelect(suggestion.value);
                                }}
                                className={`cursor-pointer px-3 py-2.5 text-sm ${isDark ? "text-zinc-100 hover:bg-zinc-800 hover:text-white" : "text-zinc-800 hover:bg-indigo-50 hover:text-indigo-950"} transition-colors font-semibold`}
                              >
                                {suggestion.label}
                              </li>
                            ))}
                          </ul>
                        )}
                        {fieldErrors.location && <p className="text-sm text-red-500 mt-1 font-medium">{fieldErrors.location}</p>}
                      </div>
                    </FormRow>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 4: REGISTRATION & LIMITS --- */}
              {step === 4 && (
                <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className={`flex items-center gap-4 border-b ${isDark ? "border-white/10" : "border-zinc-100"} pb-4`}>
                    <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center shrink-0 border border-amber-500/20"><AlignLeft className="w-5 h-5" /></div>
                    <div>
                      <h1 className={`text-xl font-black ${isDark ? "text-white" : "text-zinc-900"} tracking-tight`}>Registration Specs & Limits</h1>
                      <p className={`${isDark ? "text-zinc-300" : "text-zinc-600"} text-sm font-semibold`}>Set pricing fee, capacities, and detailed guides.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <FormRow icon={<AlignLeft className="w-4 h-4 text-amber-400 mt-1" />}>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Event Description</Label>
                          <span className={`text-xs font-bold ${formData.description.length >= 20 ? "text-emerald-500" : "text-amber-500"}`}>
                            {formData.description.length} / Min 20 chars
                          </span>
                        </div>
                        <textarea
                          placeholder="Provide descriptive details, speakers, agenda..."
                          value={formData.description}
                          onChange={(e) => updateForm("description", e.target.value)}
                          className={`w-full h-20 text-sm py-2 px-3 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400"} border focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all font-medium ${
                            fieldErrors.description ? "border-red-400 focus:ring-red-500" : ""
                          }`}
                        />
                        {fieldErrors.description && <p className="text-sm text-red-500 font-medium">{fieldErrors.description}</p>}
                      </div>
                    </FormRow>

                    <FormRow icon={<Ticket className="w-4 h-4 text-indigo-400 mt-1" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Registration Type</Label>
                          <div className="flex gap-2">
                            {REG_TYPES.map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => updateForm("registration_type", type)}
                                className={`flex-1 py-2 px-3 rounded-lg border font-bold text-sm capitalize transition-all ${
                                  formData.registration_type === type
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                    : isDark
                                      ? "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                                      : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Registration Fee (₹)</Label>
                          <Input
                            type="number"
                            placeholder="0 (Free)"
                            value={formData.registration_fee}
                            onChange={(e) => updateForm("registration_fee", e.target.value)}
                            className={`h-9 px-3 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"} text-sm focus-visible:ring-indigo-500 ${
                              fieldErrors.registration_fee ? "border-red-400 focus-visible:ring-red-400" : ""
                            }`}
                          />
                          {fieldErrors.registration_fee && <p className="text-sm text-red-500 font-medium">{fieldErrors.registration_fee}</p>}
                        </div>
                      </div>
                    </FormRow>

                    <FormRow icon={<Users className="w-4 h-4 text-teal-400 mt-1" />}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Attendee Capacity</Label>
                          <Input
                            type="number"
                            placeholder="e.g. 100"
                            value={formData.capacity}
                            onChange={(e) => updateForm("capacity", e.target.value)}
                            className={`h-9 px-3 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"} text-sm focus-visible:ring-indigo-500 ${
                              fieldErrors.capacity ? "border-red-400 focus-visible:ring-red-400" : ""
                            }`}
                          />
                          {fieldErrors.capacity && <p className="text-sm text-red-500 font-medium">{fieldErrors.capacity}</p>}
                        </div>

                        {formData.registration_type === "team" && (
                          <div className={`grid grid-cols-2 gap-2 ${isDark ? "bg-zinc-800/60 border-zinc-700" : "bg-zinc-50/50 border-zinc-200"} p-2 rounded-lg border`}>
                            <div className="space-y-0.5">
                              <Label className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase`}>Min Size</Label>
                              <Input
                                type="number"
                                min="1"
                                value={formData.min_team_size}
                                onChange={(e) => updateForm("min_team_size", e.target.value)}
                                className={`h-8 rounded ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900"} text-sm font-semibold px-2`}
                              />
                            </div>
                            <div className="space-y-0.5">
                              <Label className={`text-xs font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase`}>Max Size</Label>
                              <Input
                                type="number"
                                min="1"
                                value={formData.max_team_size}
                                onChange={(e) => updateForm("max_team_size", e.target.value)}
                                className={`h-8 rounded ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900"} text-sm font-semibold px-2`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {formData.registration_type === "team" && (fieldErrors.min_team_size || fieldErrors.max_team_size) && (
                        <p className="text-sm text-red-500 font-medium mt-1">
                          {fieldErrors.min_team_size || fieldErrors.max_team_size}
                        </p>
                      )}
                    </FormRow>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 5: ATTENDEE QUESTION BUILDER (HORIZONTAL BLOCKS) --- */}
              {step === 5 && (
                <motion.div key="step5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className={`flex items-center gap-4 border-b ${isDark ? "border-white/10" : "border-zinc-100"} pb-4`}>
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/20"><FileText className="w-5 h-5" /></div>
                    <div>
                      <h1 className={`text-xl font-black ${isDark ? "text-white" : "text-zinc-900"} tracking-tight`}>Attendee Custom Questionnaire</h1>
                      <p className={`${isDark ? "text-zinc-300" : "text-zinc-600"} text-sm font-semibold`}>Build forms attendees answer during checkout registration.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <FormRow icon={<FileText className="w-4 h-4 text-blue-400 mt-1" />}>
                      <div className={`p-3.5 rounded-lg ${isDark ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300" : "bg-indigo-50/50 border-indigo-100 text-indigo-900"} border space-y-1`}>
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Fixed Profile Fields
                        </div>
                        <p className={`text-xs ${isDark ? "text-zinc-300" : "text-indigo-700"} font-medium`}>
                          These fields are mandatory: **Full Name, Email Address, Phone Number**.
                        </p>
                      </div>

                      <div className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                          <label className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-700"} uppercase tracking-wider`}>Quick Presets & Blank</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "College / University", key: "college", type: "text" },
                              { label: "Graduation Year", key: "year", type: "text" },
                              { label: "Branch / Stream", key: "branch", type: "text" },
                              { label: "Resume Link", key: "resume", type: "text" },
                              { label: "Why Join?", key: "why_join", type: "textarea" },
                            ].map((p) => (
                              <button
                                key={p.label}
                                type="button"
                                onClick={() => addRegFormField(p.key, p.label, p.type as any)}
                                className={`px-3 py-1.5 rounded-lg ${isDark ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700" : "bg-zinc-100 hover:bg-indigo-50 border-zinc-200 text-zinc-800 hover:text-indigo-700"} border text-xs font-bold transition-all shadow-xs`}
                              >
                                + {p.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => addRegFormField(`custom_${Date.now()}`, "", "text")}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all animate-pulse"
                            >
                              + Blank Question
                            </button>
                          </div>
                        </div>

                        {fieldErrors.reg_form_fields && (
                          <p className="text-sm text-red-500 font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                            {fieldErrors.reg_form_fields}
                          </p>
                        )}

                        {/* Horizontal Row block scaling builders */}
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {regFormFields.length === 0 && (
                            <p className={`text-center py-6 ${isDark ? "text-zinc-400" : "text-zinc-500"} italic text-sm`}>No dynamic checkout questions added.</p>
                          )}
                          {regFormFields.map((field) => (
                            <div key={field.id} className={`flex flex-col md:flex-row items-center gap-3 p-3 ${isDark ? "bg-zinc-800/70 border-zinc-700" : "bg-zinc-50 border-zinc-200"} border rounded-lg`}>
                              <div className="w-full md:w-1/3">
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateRegFormField(field.id, { label: e.target.value })}
                                  placeholder="Question Label (e.g. Laptop Brand)"
                                  className={`h-8.5 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-white border-zinc-200 text-zinc-900"} text-sm font-semibold`}
                                />
                              </div>
                              <div className="w-full md:w-1/4">
                                <select
                                  value={field.type}
                                  onChange={(e) =>
                                    updateRegFormField(field.id, {
                                      type: e.target.value as any,
                                      options: e.target.value === "select" ? field.options || ["Option 1", "Option 2"] : undefined,
                                    })
                                  }
                                  className={`w-full h-8.5 py-1 px-2.5 rounded-lg border ${isDark ? "border-zinc-700 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-800"} text-sm font-bold focus:outline-none`}
                                >
                                  <option value="text">Short Text</option>
                                  <option value="textarea">Long Text</option>
                                  <option value="number">Number</option>
                                  <option value="select">Dropdown Options</option>
                                  <option value="checkbox">Checkbox Toggle</option>
                                </select>
                              </div>
                              <div className="flex-1 w-full">
                                {field.type === "select" ? (
                                  <Input
                                    value={(field.options || []).join(", ")}
                                    onChange={(e) =>
                                      updateRegFormField(field.id, {
                                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                                      })
                                    }
                                    placeholder="e.g. S, M, L, XL"
                                    className={`h-8.5 rounded-lg ${isDark ? "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500" : "bg-white border-zinc-200 text-zinc-900"} text-sm font-semibold px-2.5`}
                                  />
                                ) : (
                                  <div className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-semibold italic text-center md:text-left`}>
                                    No additional configuration
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-3">
                                <label className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? "text-white" : "text-zinc-800"} cursor-pointer uppercase select-none`}>
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateRegFormField(field.id, { required: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                                  />
                                  Req
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeRegFormField(field.id)}
                                  className="p-1.5 rounded hover:text-red-400 text-zinc-400 hover:bg-red-500/10 transition-colors shrink-0"
                                  aria-label="Remove field"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </FormRow>
                  </div>
                </motion.div>
              )}

              {/* --- STEP 6: VERIFY & DEPLOY --- */}
              {step === 6 && (
                <motion.div key="step6" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
                  <div className={`flex items-center gap-4 border-b ${isDark ? "border-white/10" : "border-zinc-100"} pb-4`}>
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20"><CheckCircle2 className="w-5 h-5" /></div>
                    <div>
                      <h1 className={`text-xl font-black ${isDark ? "text-white" : "text-zinc-900"} tracking-tight`}>Review event specs</h1>
                      <p className={`${isDark ? "text-zinc-300" : "text-zinc-600"} text-sm font-semibold`}>Verify setup parameters before launching.</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
                    <div className={`w-full md:w-72 ${isDark ? "bg-zinc-800 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900"} rounded-xl p-2 border shadow-md`}>
                      <div className="w-full h-24 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <div className="text-white/20 font-black text-2xl uppercase">{formData.category.slice(0, 4)}</div>
                      </div>
                      <div className="p-2 space-y-2">
                        <h3 className={`text-sm font-black ${isDark ? "text-white" : "text-zinc-900"} line-clamp-1`}>{formData.title || "Untitled Event"}</h3>
                        <div className={`space-y-1.5 text-xs font-semibold ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{formData.start_date ? new Date(formData.start_date).toLocaleDateString() : "TBA"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400" />
                            <span className="truncate">{formData.location || "Online / TBA"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5 text-amber-400" />
                            <span>{Number(formData.registration_fee) === 0 ? "Free Entry" : `₹${formData.registration_fee}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`flex-1 w-full rounded-xl border ${isDark ? "border-zinc-700 bg-zinc-800/50" : "border-zinc-200 bg-zinc-50/50"} p-4 space-y-3 text-sm`}>
                      <div className={`grid grid-cols-2 gap-y-3 pb-3 border-b ${isDark ? "border-zinc-700" : "border-zinc-200"}`}>
                        <div>
                          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-bold uppercase`}>Mode</p>
                          <p className={`font-bold ${isDark ? "text-white" : "text-zinc-900"} text-sm capitalize`}>{formData.mode}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-bold uppercase`}>Pricing / Fee</p>
                          <p className={`font-bold ${isDark ? "text-white" : "text-zinc-900"} text-sm`}>
                            {Number(formData.registration_fee) === 0 ? "Free" : `₹${formData.registration_fee}`}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-bold uppercase`}>Attendee Capacity</p>
                          <p className={`font-bold ${isDark ? "text-white" : "text-zinc-900"} text-sm`}>
                            {Number(formData.capacity) === 0 ? "Unlimited" : `${formData.capacity} Seats`}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-bold uppercase`}>Registration Type</p>
                          <p className={`font-bold ${isDark ? "text-white" : "text-zinc-900"} text-sm capitalize`}>
                            {formData.registration_type} {formData.registration_type === "team" && `(Sizes: ${formData.min_team_size}-${formData.max_team_size})`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} font-bold uppercase`}>Custom Questionnaire</p>
                        <div className={`${isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200"} rounded-lg p-2.5 border space-y-1.5 text-xs`}>
                          {regFormFields.length === 0 ? (
                            <p className={`${isDark ? "text-zinc-400" : "text-zinc-500"} italic`}>No custom checkout questions added</p>
                          ) : (
                            regFormFields.map((f) => (
                              <div key={f.id} className={`flex justify-between items-center ${isDark ? "text-white" : "text-zinc-800"} font-medium`}>
                                <span>• {f.label || "(Empty)"}</span>
                                <span className={`font-bold ${isDark ? "text-zinc-400" : "text-zinc-500"} capitalize`}>
                                  {f.type} {f.required ? "(Req)" : ""}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons footer inside the card - Static */}
          <footer className={`h-16 border-t ${isDark ? "border-white/10 bg-zinc-900" : "border-zinc-200 bg-zinc-50/50"} px-6 flex items-center justify-between shrink-0`}>
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1 || isLoading}
              className={`rounded-md font-bold ${isDark ? "text-zinc-200 hover:text-white hover:bg-white/10" : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100"} transition-all ${step === 1 ? 'invisible' : 'visible'}`}
            >
              Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={nextStep}
                className={`rounded-md ${activeAccent.bg} text-white hover:opacity-90 px-8 py-5 text-sm shadow-md ${activeAccent.shadow} transition-all font-bold`}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={onSubmit}
                disabled={isLoading}
                className={`rounded-md ${activeAccent.bg} hover:opacity-90 text-white px-8 py-5 text-sm shadow-md ${activeAccent.shadow} transition-all font-bold`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publish Event <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={null}>
      <CreateEventPageInner />
    </Suspense>
  );
}

