"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, MapPin, Calendar, AlignLeft, CheckCircle2, Loader2, Ticket, Plus, X, ListPlus } from "lucide-react";
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

// Updated to match your Backend Zod Schema
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
}

interface FormErrors {
  title?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
}

// A field the organizer builds themselves when "Custom" is selected
interface CustomFieldEntry {
  id: string;
  label: string;
  type: FieldType | "boolean";
  value: string; // stored as string/ "true"/"false"; parsed appropriately on submit
  options?: string[]; // for select type
}

const MODES = ["online", "offline", "hybrid"];
const REG_TYPES = ["solo", "team"];
const TOTAL_STEPS = 5;
const isValidTemplateId = (id: string | null) =>
  !!id && (id === CUSTOM_TEMPLATE_ID || EVENT_TEMPLATES.some((tpl) => tpl.id === id));

function CreateEventPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ label: string; value: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const locationControllerRef = useRef<AbortController | null>(null);

  // Template-driven fields: values keyed by field id (works for both a picked template and custom fields)
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomFieldEntry[]>([]);

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
    capacity: "100",
    registration_type: "solo",
    registration_fee: "0",
    min_team_size: "1",
    max_team_size: "1",
  });

  const isCustom = formData.category === CUSTOM_TEMPLATE_ID;
  const activeTemplate = getTemplateById(formData.category);

  const updateForm = (field: keyof EventFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const clearFieldError = (field: keyof FormErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
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

      fetch(`http://localhost:3000/api/locations/search?q=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to fetch locations");
          const result = await response.json();
          const suggestions = Array.isArray(result?.data)
            ? result.data.map((item: unknown) => {
                if (typeof item === "object" && item !== null) {
                  const place = item as { name?: string; address?: string; mapboxId?: string };
                  const label = [place.name, place.address].filter(Boolean).join(" - ");
                  return {
                    label: label || "Unknown location",
                    value: label || "Unknown location",
                  };
                }
                return null;
              })
            : [];
          setLocationSuggestions(suggestions.filter(Boolean) as Array<{ label: string; value: string }>);
        })
        .catch(() => {
          setLocationSuggestions([]);
        })
        .finally(() => {
          if (locationControllerRef.current === controller) {
            setIsLoadingSuggestions(false);
          }
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [formData.location]);

  const handleLocationSelect = (value: string) => {
    updateForm("location", value);
    setLocationSuggestions([]);
    setIsLocationSelected(true);
    clearFieldError("location");
  };

  const clearSelectedLocation = () => {
    updateForm("location", "");
    setLocationSuggestions([]);
    setIsLocationSelected(false);
  };

  const handleTemplateSelect = (id: string) => {
    updateForm("category", id);
    clearFieldError("category");
    // Reset step-2 data when switching templates so stale fields don't leak across templates
    setTemplateValues({});
    setCustomFields([]);
  };

  const updateTemplateValue = (fieldId: string, value: string) => {
    setTemplateValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // --- Custom field builder helpers ---
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

  const updateCustomField = (id: string, patch: Partial<CustomFieldEntry>) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const validateForm = (targetStep = step) => {
    const nextErrors: FormErrors = {};
    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetStep === 1 || targetStep === 5) {
      if (!trimmedTitle) {
        nextErrors.title = "Title is required.";
      } else if (trimmedTitle.length < 5) {
        nextErrors.title = "Title must be at least 5 characters long.";
      }
    }

    if (targetStep === 3 || targetStep === 5) {
      if (!formData.start_date) {
        nextErrors.start_date = "Start date is required.";
      } else {
        const startDate = new Date(formData.start_date);
        if (startDate < today) {
          nextErrors.start_date = "Start date cannot be before today.";
        }
      }

      if (!formData.end_date) {
        nextErrors.end_date = "End date is required.";
      } else {
        const endDate = new Date(formData.end_date);
        if (endDate < today) {
          nextErrors.end_date = "End date cannot be before today.";
        }
      }

      if (formData.start_date && formData.end_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate < startDate) {
          nextErrors.end_date = "End date cannot be before start date.";
        }
      }

      if (formData.mode !== "online" && !formData.location.trim()) {
        nextErrors.location = "Location is required for offline or hybrid events.";
      }
    }

    if (targetStep === 4 || targetStep === 5) {
      if (!trimmedDescription) {
        nextErrors.description = "Description is required.";
      } else if (trimmedDescription.length < 30) {
        nextErrors.description = "Please add a more detailed description (at least 30 characters).";
      }
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

  // Build the payload pieces for custom_fields / custom_form_schema
  const buildCustomPayload = () => {
    if (isCustom) {
      const custom_fields: Record<string, unknown> = {};
      const custom_form_schema = customFields
        .filter((f) => f.label.trim())
        .map((f) => {
          const type = f.type === "boolean" ? "checkbox" : f.type; // backend enum doesn't need a separate boolean type
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
      return { custom_fields, custom_form_schema };
    }

    // Template mode: values only, schema is implied by the template id
    const custom_fields: Record<string, unknown> = {};
    if (activeTemplate) {
      activeTemplate.fields.forEach((f) => {
        const raw = templateValues[f.id];
        if (raw === undefined || raw === "") return;
        custom_fields[f.id] = f.type === "checkbox" ? raw === "true" : f.type === "number" ? Number(raw) || 0 : raw;
      });
    }
    return { custom_fields, custom_form_schema: undefined };
  };

  const onSubmit = async () => {
    if (!validateForm(5)) return;

    try {
      setIsLoading(true);

      const { custom_fields, custom_form_schema } = buildCustomPayload();

      // Transform our frontend state into the EXACT payload the backend Zod schema wants
      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.category, // Map 'category' to 'type'
        mode: formData.mode,
        location: formData.location || "Online",
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        capacity: parseInt(formData.capacity) || 0,
        registration_type: formData.registration_type,
        registration_fee: parseFloat(formData.registration_fee) || 0,
        min_team_size: parseInt(formData.min_team_size) || 1,
        max_team_size: parseInt(formData.max_team_size) || 1,
        custom_fields,
        ...(custom_form_schema ? { custom_form_schema } : {}),
      };

      await eventService.createEvent(payload);
      router.push("/home");
    } catch {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 50 : -50, opacity: 0 }),
  };

  // Renders one dynamic input for a template field (Step 2, template mode)
  const renderTemplateFieldInput = (field: { id: string; label: string; type: FieldType; options?: string[]; placeholder?: string }) => {
    const value = templateValues[field.id] ?? "";

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full h-24 text-base py-3 px-4 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
          />
        );
      case "select":
        return (
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateTemplateValue(field.id, opt)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  value === opt ? "bg-indigo-600 text-white" : "bg-zinc-50 text-zinc-600 border border-zinc-200"
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
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              value === "true" ? "bg-indigo-600 text-white" : "bg-zinc-50 text-zinc-600 border border-zinc-200"
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
            className="py-5 px-4 rounded-2xl bg-zinc-50 border-zinc-200"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            className="py-5 px-4 rounded-2xl bg-zinc-50 border-zinc-200"
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="py-5 px-4 rounded-2xl bg-zinc-50 border-zinc-200"
          />
        );
    }
  };

  // Renders the value input for one custom field row, matching its chosen type
  const renderCustomFieldValueInput = (field: CustomFieldEntry) => {
    switch (field.type) {
      case "boolean":
        return (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateCustomField(field.id, { value: "true" })}
              className={`px-4 py-2 rounded-xl font-semibold text-sm flex-1 transition-all ${
                field.value === "true" ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 border border-zinc-200"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => updateCustomField(field.id, { value: "false" })}
              className={`px-4 py-2 rounded-xl font-semibold text-sm flex-1 transition-all ${
                field.value === "false" ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 border border-zinc-200"
              }`}
            >
              No
            </button>
          </div>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={field.value === "true"}
              onChange={(e) => updateCustomField(field.id, { value: e.target.checked ? "true" : "false" })}
              className="w-4 h-4 rounded"
            />
            Checked
          </label>
        );
      case "select":
        return (
          <div className="space-y-2">
            <Input
              value={(field.options || []).join(", ")}
              onChange={(e) =>
                updateCustomField(field.id, {
                  options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                })
              }
              placeholder="Options, comma separated"
              className="py-4 px-4 rounded-xl bg-white border-zinc-200 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {(field.options || []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateCustomField(field.id, { value: opt })}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                    field.value === opt ? "bg-indigo-600 text-white" : "bg-white text-zinc-600 border border-zinc-200"
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
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            className="py-4 px-4 rounded-xl bg-white border-zinc-200"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={field.value}
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            className="py-4 px-4 rounded-xl bg-white border-zinc-200"
          />
        );
      default:
        return (
          <Input
            value={field.value}
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            placeholder="Value"
            className="py-4 px-4 rounded-xl bg-white border-zinc-200"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col relative overflow-hidden">
      <div className="fixed top-0 left-1/4 w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[150px] pointer-events-none" />

      <nav className="relative z-10 w-full p-6 flex items-center justify-between">
        <Link href="/events/create">
          <Button variant="ghost" className="rounded-full hover:bg-zinc-200/50">
            <ArrowLeft className="w-5 h-5 mr-2" /> Cancel
          </Button>
        </Link>
        <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Step {step} of {TOTAL_STEPS}</div>
        <div className="w-24"></div>
      </nav>

      <main className="flex-1 flex flex-col items-center pt-10 px-6 relative z-10 pb-20">
        <div className="w-full max-w-2xl mb-12 flex gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step >= i ? "bg-indigo-600" : "bg-zinc-200"}`} />
          ))}
        </div>

        <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-100 p-8 md:p-12 relative overflow-hidden min-h-[550px] flex flex-col">

          <AnimatePresence mode="wait" custom={1}>

            {/* --- STEP 1: BASICS (template already chosen on the picker page) --- */}
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col overflow-y-auto pr-2">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 shrink-0"><Sparkles className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2 shrink-0">Let&apos;s start with the basics</h1>
                <p className="text-zinc-500 font-medium mb-10 shrink-0">
                  {activeTemplate ? `Creating a ${activeTemplate.label} event.` : "Creating a custom event."}
                </p>

                <div className="space-y-8 flex-1">
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Event Title</Label>
                    <Input
                      placeholder="e.g., CodeHack 2026..."
                      value={formData.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      className={`text-lg py-7 px-5 rounded-2xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 ${fieldErrors.title ? "border-red-400" : ""}`}
                    />
                    {fieldErrors.title && <p className="text-sm text-red-500">{fieldErrors.title}</p>}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-bold text-zinc-900">Template</Label>
                      <Link href="/events/create" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                        Change template
                      </Link>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-sm flex items-center gap-2">
                      {isCustom && <ListPlus className="w-4 h-4" />}
                      {isCustom ? "Custom" : activeTemplate?.label || "Event"}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Mode</Label>
                    <div className="flex flex-wrap gap-2">
                      {MODES.map((mode) => (
                        <button key={mode} onClick={() => updateForm("mode", mode)} className={`px-4 py-2 rounded-xl font-semibold text-sm capitalize transition-all ${formData.mode === mode ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-zinc-50 text-zinc-600 border border-zinc-200"}`}>{mode}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- STEP 2: TEMPLATE-SPECIFIC FIELDS OR CUSTOM BUILDER --- */}
            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col overflow-y-auto pr-2">
                <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-6 shrink-0"><ListPlus className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2 shrink-0">
                  {isCustom ? "Build your own fields" : `${activeTemplate?.label || "Event"} details`}
                </h1>
                <p className="text-zinc-500 font-medium mb-6 shrink-0">
                  {isCustom
                    ? "Add whatever fields describe this event best."
                    : "A few extra details specific to this kind of event."}
                </p>

                {!isCustom && activeTemplate && activeTemplate.fields.length > 0 && (
                  <div className="space-y-6 flex-1">
                    {activeTemplate.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-sm font-bold text-zinc-900">{field.label}</Label>
                        {renderTemplateFieldInput(field)}
                      </div>
                    ))}
                  </div>
                )}

                {!isCustom && (!activeTemplate || activeTemplate.fields.length === 0) && (
                  <div className="flex-1 flex items-center justify-center text-zinc-400 font-medium text-sm">
                    No extra details needed for this template — continue to the next step.
                  </div>
                )}

                {isCustom && (
                  <div className="flex-1 space-y-5">
                    <div className="flex flex-wrap gap-2">
                      {CUSTOM_FIELD_TYPES.map((t) => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => addCustomField(t.type)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-all text-xs font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" /> {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {customFields.length === 0 && (
                        <div className="text-center py-10 text-zinc-400 font-medium text-sm">
                          No fields yet — pick a type above to add your first field.
                        </div>
                      )}
                      {customFields.map((field) => (
                        <div key={field.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={field.label}
                              onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                              placeholder="Field label, e.g. Number of Judges"
                              className="py-4 px-4 rounded-xl bg-white border-zinc-200 flex-1 font-semibold text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomField(field.id)}
                              className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                              aria-label="Remove field"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {renderCustomFieldValueInput(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* --- STEP 3: TIME & PLACE --- */}
            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-8"><MapPin className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">When and where?</h1>
                <p className="text-zinc-500 font-medium mb-8">Set the stage for your attendees.</p>

                <div className="space-y-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Start Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => updateForm("start_date", e.target.value)}
                        className={`py-6 px-4 rounded-2xl bg-zinc-50 border-zinc-200 ${fieldErrors.start_date ? "border-red-400" : ""}`}
                      />
                      {fieldErrors.start_date && <p className="text-sm text-red-500">{fieldErrors.start_date}</p>}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">End Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => updateForm("end_date", e.target.value)}
                        className={`py-6 px-4 rounded-2xl bg-zinc-50 border-zinc-200 ${fieldErrors.end_date ? "border-red-400" : ""}`}
                      />
                      {fieldErrors.end_date && <p className="text-sm text-red-500">{fieldErrors.end_date}</p>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Location {formData.mode === 'online' && '(Optional for Online)'}</Label>
                    <div className="relative">
                      <Input
                        placeholder="e.g., Tech Hub Jaipur, or Zoom URL"
                        value={formData.location}
                        onChange={(e) => {
                          updateForm("location", e.target.value);
                          setIsLocationSelected(false);
                        }}
                        className={`text-lg py-7 px-5 pr-12 rounded-2xl bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-600 ${fieldErrors.location ? "border-red-400" : ""}`}
                      />
                      {formData.location.trim() && (
                        <button
                          type="button"
                          onClick={clearSelectedLocation}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
                          aria-label="Clear location"
                        >
                          ×
                        </button>
                      )}
                      {isLoadingSuggestions && formData.location.trim().length >= 3 && (
                        <p className="mt-2 text-sm text-zinc-500">Searching locations...</p>
                      )}
                      {locationSuggestions.length > 0 && (
                        <ul className="absolute z-20 mt-2 w-full rounded-2xl border border-zinc-200 bg-white shadow-lg">
                          {locationSuggestions.map((suggestion) => (
                            <li
                              key={suggestion.value}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleLocationSelect(suggestion.value);
                              }}
                              className="cursor-pointer px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50"
                            >
                              <div className="font-medium text-zinc-900">{suggestion.label}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {fieldErrors.location && <p className="text-sm text-red-500">{fieldErrors.location}</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- STEP 4: DETAILS & REGISTRATION --- */}
            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col overflow-y-auto pr-2">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shrink-0"><AlignLeft className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2 shrink-0">Registration details</h1>
                <p className="text-zinc-500 font-medium mb-6 shrink-0">Define how people will join.</p>

                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                    <Label className="text-base font-bold text-zinc-900">Description</Label>
                    <textarea
                      placeholder="What is the agenda? Who are the speakers?"
                      value={formData.description}
                      onChange={(e) => updateForm("description", e.target.value)}
                      className={`w-full h-24 text-base py-4 px-5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none ${fieldErrors.description ? "border-red-400" : ""}`}
                    />
                    {fieldErrors.description && <p className="text-sm text-red-500">{fieldErrors.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Reg. Type</Label>
                      <div className="flex gap-2">
                        {REG_TYPES.map((type) => (
                           <button key={type} onClick={() => updateForm("registration_type", type)} className={`px-4 py-2 rounded-xl font-semibold text-sm capitalize flex-1 transition-all ${formData.registration_type === type ? "bg-indigo-600 text-white" : "bg-zinc-50 text-zinc-600 border border-zinc-200"}`}>{type}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-base font-bold text-zinc-900">Fee (₹)</Label>
                      <Input type="number" placeholder="0 for Free" value={formData.registration_fee} onChange={(e) => updateForm("registration_fee", e.target.value)} className="py-5 px-4 rounded-2xl bg-zinc-50 border-zinc-200" />
                    </div>
                  </div>

                  {formData.registration_type === "team" && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
                       <div className="space-y-2">
                          <Label className="text-sm font-bold text-zinc-900">Min Team Size</Label>
                          <Input type="number" min="1" value={formData.min_team_size} onChange={(e) => updateForm("min_team_size", e.target.value)} className="rounded-xl" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-sm font-bold text-zinc-900">Max Team Size</Label>
                          <Input type="number" min="1" value={formData.max_team_size} onChange={(e) => updateForm("max_team_size", e.target.value)} className="rounded-xl" />
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- STEP 5: REVIEW --- */}
            {step === 5 && (
              <motion.div key="step5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="flex-1 flex flex-col overflow-y-auto pr-2">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-8 shrink-0"><CheckCircle2 className="w-8 h-8" /></div>
                <h1 className="text-3xl font-extrabold text-zinc-900 mb-2 shrink-0">Ready to publish?</h1>
                <p className="text-zinc-500 font-medium mb-10 shrink-0">Here is a sneak peek of your event card.</p>

                <div className="flex-1 flex flex-col items-center gap-8">
                  <div className="w-full max-w-sm bg-white rounded-3xl p-3 border border-zinc-200 shadow-xl shadow-zinc-200/50">
                    <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-zinc-900 shadow-sm capitalize">
                        {formData.category} • {formData.mode}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-zinc-900 mb-4 line-clamp-2">{formData.title}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : "Date TBA"}
                        </div>
                        <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                          <MapPin className="w-4 h-4 text-rose-400" />
                          {formData.location || "Online"}
                        </div>
                        <div className="flex items-center text-sm font-medium text-zinc-500 gap-3">
                          <Ticket className="w-4 h-4 text-amber-400" />
                          {Number(formData.registration_fee) === 0 ? "Free Entry" : `₹${formData.registration_fee}`} • {formData.registration_type}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom / template field summary */}
                  {isCustom && customFields.filter((f) => f.label.trim()).length > 0 && (
                    <div className="w-full max-w-sm space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Custom fields</p>
                      {customFields.filter((f) => f.label.trim()).map((f) => (
                        <div key={f.id} className="flex justify-between text-sm bg-zinc-50 rounded-xl px-4 py-2 border border-zinc-100">
                          <span className="text-zinc-500 font-medium">{f.label}</span>
                          <span className="text-zinc-900 font-semibold">
                            {f.type === "boolean" || f.type === "checkbox" ? (f.value === "true" ? "Yes" : "No") : f.value || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isCustom && activeTemplate && activeTemplate.fields.some((f) => templateValues[f.id]) && (
                    <div className="w-full max-w-sm space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{activeTemplate.label} details</p>
                      {activeTemplate.fields
                        .filter((f) => templateValues[f.id])
                        .map((f) => (
                          <div key={f.id} className="flex justify-between text-sm bg-zinc-50 rounded-xl px-4 py-2 border border-zinc-100 gap-3">
                            <span className="text-zinc-500 font-medium shrink-0">{f.label}</span>
                            <span className="text-zinc-900 font-semibold text-right truncate">
                              {f.type === "checkbox" ? (templateValues[f.id] === "true" ? "Yes" : "No") : templateValues[f.id]}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between shrink-0">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1 || isLoading} className={`rounded-full px-6 font-semibold ${step === 1 ? 'invisible' : 'visible'}`}>
              Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button onClick={nextStep} className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-6 text-base shadow-lg transition-all hover:scale-105">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={isLoading} className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-base shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Publish Event <Sparkles className="w-4 h-4 ml-2" /></>}
              </Button>
            )}
          </div>
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