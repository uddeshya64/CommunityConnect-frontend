"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useToast } from "@/components/providers/ToastProvider";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import {
  ArrowLeft, ArrowRight, Sparkles, MapPin, Calendar, AlignLeft,
  CheckCircle2, Loader2, Ticket, Plus, X, ListPlus, FileText,
  Lock, Trash2, Clock, Users, Globe, Crosshair, Tag, Layers,
  HelpCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { eventService } from "@/services/event.service";
import { locationService } from "@/services/location.service";
import {
  cancelNavigationDraftNotify,
  createDraftId,
  deleteEventDraft,
  getEventDraftById,
  hasMeaningfulManualDraft,
  notifyDraftSaved,
  removeNotificationsForDraft,
  saveManualDraft,
  scheduleNavigationDraftNotify,
  type ManualDraftState,
} from "@/lib/eventDraftStorage";
import {
  EVENT_TEMPLATES,
  CUSTOM_TEMPLATE_ID,
  CUSTOM_FIELD_TYPES,
  getTemplateById,
  getDefaultQuestionsForTemplate,
  getRecommendedQuestionsForTemplate,
  type FieldType,
  type RegistrationFormField,
  type RecommendedQuestion,
} from "@/lib/eventTemplates";
import AppLayout from "@/components/layout/AppLayout";
import BackButton from "@/components/ui/BackButton";
import EventFeeBadge from "@/components/events/EventFeeBadge";
import { isFreeFee } from "@/lib/feeUtils";

interface EventFormData {
  title: string;
  category: string;
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

const MODES = [
  { id: "offline", label: "In-Person / Offline", icon: MapPin, desc: "Physical attendance at venue" },
  { id: "online", label: "Virtual / Online", icon: Globe, desc: "Streaming link, Zoom or Meet" },
  { id: "hybrid", label: "Hybrid Format", icon: Sparkles, desc: "Both physical & virtual access" }
];

const REG_TYPES = [
  { id: "solo", label: "Solo Attendee (Individual)", desc: "Participants register on their own" },
  { id: "team", label: "Team Participation", desc: "Collaborative groups with member limits" }
];

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  { step: 1, label: "Basics", icon: Sparkles },
  { step: 2, label: "Venue & Time", icon: Calendar },
  { step: 3, label: "Limits & Specs", icon: Ticket },
  { step: 4, label: "Questionnaire", icon: FileText },
  { step: 5, label: "Blueprint", icon: ListPlus },
  { step: 6, label: "Review & Launch", icon: CheckCircle2 },
];

const isValidTemplateId = (id: string | null) =>
  !!id && (id === CUSTOM_TEMPLATE_ID || EVENT_TEMPLATES.some((tpl) => tpl.id === id));

const FormRow = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0">
    <div
      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center mt-0.5 shrink-0 rounded-xl border transition-colors"
      style={{
        background: "color-mix(in oklab, var(--accent) 12%, var(--card2))",
        borderColor: "color-mix(in oklab, var(--accent) 25%, var(--border))",
        color: "var(--accent)"
      }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0 space-y-2">
      {children}
    </div>
  </div>
);

function CreateEventPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDark, activeAccent } = useAppearance();
  const { success: showSuccess, error: showError, info: showInfo } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ label: string; value: string }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocationSelected, setIsLocationSelected] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationControllerRef = useRef<AbortController | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement | null>(null);

  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomFieldEntry[]>([]);

  const templateFromUrl = searchParams.get("template");
  const initialCategory = isValidTemplateId(templateFromUrl) ? (templateFromUrl as string) : EVENT_TEMPLATES[0].id;

  const [regFormFields, setRegFormFields] = useState<RegistrationFormField[]>(() =>
    getDefaultQuestionsForTemplate(initialCategory)
  );

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

  const draftFromUrl = searchParams.get("draft");
  const draftIdRef = useRef<string>(draftFromUrl || createDraftId("manual"));
  const hydratedDraftIdRef = useRef<string | null>(null);
  const isPublishedRef = useRef(false);
  const initialCategoryRef = useRef(initialCategory);
  const initialRegKeysRef = useRef<string[]>(
    getDefaultQuestionsForTemplate(initialCategory).map((r) => `${r.key}:${r.label}:${r.required}`)
  );

  const manualSnapshotRef = useRef<ManualDraftState>({
    step,
    templateId: templateFromUrl || initialCategory,
    formData,
    templateValues,
    customFields: customFields.map((f) => ({ ...f })),
    regFormFields,
    isLocationSelected,
  });

  manualSnapshotRef.current = {
    step,
    templateId: templateFromUrl || formData.category,
    formData,
    templateValues,
    customFields: customFields.map((f) => ({ ...f })),
    regFormFields,
    isLocationSelected,
  };

  useEffect(() => {
    cancelNavigationDraftNotify("manual");

    if (draftFromUrl && hydratedDraftIdRef.current !== draftFromUrl) {
      const existing = getEventDraftById(draftFromUrl);
      if (existing?.source === "manual" && existing.manualState) {
        hydratedDraftIdRef.current = draftFromUrl;
        draftIdRef.current = draftFromUrl;
        const ms = existing.manualState;
        initialCategoryRef.current = ms.formData.category || initialCategory;
        setFormData(ms.formData);
        setTemplateValues(ms.templateValues || {});
        setCustomFields((ms.customFields || []) as CustomFieldEntry[]);
        if (Array.isArray(ms.regFormFields)) {
          setRegFormFields(ms.regFormFields);
        }
        setStep(ms.step || 1);
        setIsLocationSelected(Boolean(ms.isLocationSelected || ms.formData.location));
        showInfo(`Restored draft "${existing.title}"`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftFromUrl]);

  useEffect(() => {
    if (isPublishedRef.current) return;
    const timer = window.setTimeout(() => {
      const snap = manualSnapshotRef.current;
      if (
        hasMeaningfulManualDraft(snap, {
          initialCategory: initialCategoryRef.current,
          initialRegKeys: initialRegKeysRef.current,
        })
      ) {
        saveManualDraft(
          draftIdRef.current,
          snap,
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "autosave"
        );
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [step, formData, templateValues, customFields, regFormFields, isLocationSelected]);

  useEffect(() => {
    const isDirty = () =>
      !isPublishedRef.current &&
      hasMeaningfulManualDraft(manualSnapshotRef.current, {
        initialCategory: initialCategoryRef.current,
        initialRegKeys: initialRegKeysRef.current,
      });

    const handleOffline = () => {
      if (isDirty()) {
        const saved = saveManualDraft(draftIdRef.current, manualSnapshotRef.current, "offline");
        notifyDraftSaved(saved, "offline");
      }
    };

    const handleBeforeUnload = () => {
      if (isDirty()) {
        saveManualDraft(
          draftIdRef.current,
          manualSnapshotRef.current,
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "navigation"
        );
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);

      if (isDirty()) {
        const reason =
          typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "navigation";
        const saved = saveManualDraft(draftIdRef.current, manualSnapshotRef.current, reason);
        scheduleNavigationDraftNotify("manual", saved);
      }
    };
  }, []);

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

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(event.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, []);

  const handleDetectLocation = async () => {
    if (isDetectingLocation) return;
    setIsDetectingLocation(true);
    try {
      const address = await locationService.detectCurrentLocation();
      updateForm("location", address);
      setIsLocationSelected(true);
      setLocationSuggestions([]);
      setIsLocationDropdownOpen(false);
      clearFieldError("location");
      showSuccess(`Accurate location detected: ${address.split(",")[0]}`);
    } catch (err: any) {
      showError(err?.message || "Could not detect location. Please check browser GPS permissions.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    const searchTerm = formData.location.trim();
    if (isLocationSelected || searchTerm.length < 3 || formData.mode === "online") {
      if (isLocationSelected || formData.mode === "online") {
        setLocationSuggestions([]);
        setIsLocationDropdownOpen(false);
      }
      setIsLoadingSuggestions(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      locationControllerRef.current?.abort();
      const controller = new AbortController();
      locationControllerRef.current = controller;
      setIsLoadingSuggestions(true);

      try {
        const raw = await locationService.search(searchTerm, controller.signal);
        const suggestions = raw.map((item) => {
          const label = [item.name, item.address].filter(Boolean).join(" - ") || item.name;
          return { label, value: label };
        });
        setLocationSuggestions(suggestions);
        setIsLocationDropdownOpen(suggestions.length > 0);
      } catch {
        setLocationSuggestions([]);
        setIsLocationDropdownOpen(false);
      } finally {
        if (locationControllerRef.current === controller) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [formData.location, isLocationSelected, formData.mode]);

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

    // Step 1: Basics
    if (targetStep === 1 || targetStep === 6) {
      if (!trimmedTitle) {
        nextErrors.title = "Event title is required.";
      } else if (trimmedTitle.length < 5) {
        nextErrors.title = "Title must be at least 5 characters.";
      } else if (trimmedTitle.length > 150) {
        nextErrors.title = "Title cannot exceed 150 characters.";
      }
    }

    // Step 2: Venue & Time
    if (targetStep === 2 || targetStep === 6) {
      if (formData.start_date && !formData.end_date) {
        nextErrors.end_date = "End date & time is required when start date is set.";
      } else if (!formData.start_date && formData.end_date) {
        nextErrors.start_date = "Start date & time is required when end date is set.";
      }

      if (formData.start_date) {
        const startDate = new Date(formData.start_date);
        if (startDate < minStart) {
          nextErrors.start_date = "Start date and time cannot be in the past.";
        }
      }

      if (formData.start_date && formData.end_date) {
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (endDate <= startDate) {
          nextErrors.end_date = "End date must be scheduled after start date.";
        }
      }

      if (formData.mode !== "online" && !formData.location.trim()) {
        nextErrors.location = "Venue address is required for offline or hybrid events.";
      }
    }

    // Step 3: Limits & Specs
    if (targetStep === 3 || targetStep === 6) {
      if (!trimmedDescription) {
        nextErrors.description = "Event description is required.";
      } else if (trimmedDescription.length < 20) {
        nextErrors.description = "Please add a more detailed description (at least 20 characters).";
      }

      const rawFee = (formData.registration_fee ?? "").trim();
      const fee = rawFee === "" ? 0 : parseFloat(rawFee);
      if (isNaN(fee) || fee < 0) {
        nextErrors.registration_fee = "Registration fee must be ₹0 or higher.";
      } else if (fee > 100000) {
        nextErrors.registration_fee = "Registration fee cannot exceed ₹100,000.";
      }

      const cap = parseInt(formData.capacity);
      if (isNaN(cap) || cap < 0) {
        nextErrors.capacity = "Maximum capacity must be 0 (unlimited) or a positive number.";
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

    // Step 4: Questionnaire
    if (targetStep === 4 || targetStep === 6) {
      regFormFields.forEach((field) => {
        if (!field.label.trim()) {
          nextErrors.reg_form_fields = "Please specify a question title for all custom inputs.";
        }
      });
    }

    // Step 5: Blueprint
    if (targetStep === 5 || targetStep === 6) {
      if (isCustom) {
        if (customFields.length === 0) {
          nextErrors.custom_fields = "Please add at least one custom property for this event blueprint.";
        }
        customFields.forEach((field) => {
          if (!field.label.trim()) {
            nextErrors.custom_fields = "All custom properties must have a title label.";
          }
        });
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

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const saved = saveManualDraft(draftIdRef.current, manualSnapshotRef.current, "offline");
      notifyDraftSaved(saved, "offline");
      showError("No internet connection — your event has been saved to Drafts.");
      return;
    }

    try {
      setIsLoading(true);
      const { custom_fields, custom_form_schema, registration_form_schema } = buildCustomPayload();

      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.category,
        mode: formData.mode,
        location: formData.location || "Online",
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
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

      const res = await eventService.createEvent(payload);
      isPublishedRef.current = true;
      deleteEventDraft(draftIdRef.current);
      removeNotificationsForDraft(draftIdRef.current);
      showSuccess("Event published successfully!");
      if (res?.data?.id || res?.id) {
        router.push(`/events/${res?.data?.id || res?.id}`);
      } else {
        router.push("/home");
      }
    } catch (err: any) {
      setIsLoading(false);
      const isNetworkDown =
        (typeof navigator !== "undefined" && !navigator.onLine) || !err?.response;
      if (isNetworkDown && hasMeaningfulManualDraft(manualSnapshotRef.current)) {
        const saved = saveManualDraft(draftIdRef.current, manualSnapshotRef.current, "offline");
        notifyDraftSaved(saved, "error");
        showError("Connection interrupted — your event was saved to Drafts.");
        return;
      }
      const resData = err?.response?.data;
      let errMsg = err?.message || "Failed to create event. Please check inputs and try again.";
      if (Array.isArray(resData?.error) && resData.error.length > 0) {
        const nextErrs: Partial<Record<keyof FormErrors, string>> = {};
        const validKeys = new Set<keyof FormErrors>([
          "title",
          "category",
          "start_date",
          "end_date",
          "location",
          "description",
          "registration_fee",
          "capacity",
          "min_team_size",
          "max_team_size",
          "custom_fields",
          "reg_form_fields",
        ]);
        const msgs: string[] = [];
        for (const issue of resData.error) {
          const msg = issue?.message;
          const field = Array.isArray(issue?.path) ? String(issue.path[0] || "") : "";
          if (msg) msgs.push(msg);
          if (field && validKeys.has(field as keyof FormErrors)) {
            nextErrs[field as keyof FormErrors] = msg || "Invalid value";
          }
        }
        if (Object.keys(nextErrs).length > 0) setFieldErrors((prev) => ({ ...prev, ...nextErrs }));
        if (msgs.length > 0) errMsg = msgs.join(" ");
      } else if (typeof resData?.error === "string") {
        errMsg = resData.error;
      } else if (typeof resData?.message === "string") {
        errMsg = resData.message;
      }
      showError(errMsg);
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
            placeholder={field.placeholder || "Enter details..."}
            rows={2}
            className="w-full py-2 px-3 rounded-xl text-xs sm:text-sm font-medium outline-none resize-none transition-all"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
        );
      case "select":
        return (
          <div className="flex flex-wrap gap-1.5">
            {(field.options || []).map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateTemplateValue(field.id, opt)}
                  className="px-3.5 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-xs"
                  style={
                    isSelected
                      ? { background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", borderColor: "transparent" }
                      : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
                  }
                >
                  {opt}
                </button>
              );
            })}
          </div>
        );
      case "checkbox":
        const isChecked = value === "true";
        return (
          <button
            type="button"
            onClick={() => updateTemplateValue(field.id, isChecked ? "false" : "true")}
            className="px-4 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-xs"
            style={
              isChecked
                ? { background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", borderColor: "transparent" }
                : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
            }
          >
            {isChecked ? "Yes / Included" : "No / Excluded"}
          </button>
        );
      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder || "0"}
            className="h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold max-w-[160px] outline-none"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        );
      case "date":
        return (
          <div className="max-w-[240px]">
            <DateTimePicker
              mode="date"
              value={value}
              onChange={(val) => updateTemplateValue(field.id, val)}
              placeholder="Select date"
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateTemplateValue(field.id, e.target.value)}
            placeholder={field.placeholder || "Enter value..."}
            className="w-full h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold outline-none"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        );
    }
  };

  const renderCustomFieldValueInput = (field: CustomFieldEntry) => {
    switch (field.type) {
      case "boolean":
        return (
          <div className="flex gap-1.5 max-w-[160px]">
            <button
              type="button"
              onClick={() => updateCustomField(field.id, { value: "true" })}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex-1 transition-all cursor-pointer"
              style={
                field.value === "true"
                  ? { background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", borderColor: "transparent" }
                  : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
              }
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => updateCustomField(field.id, { value: "false" })}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex-1 transition-all cursor-pointer"
              style={
                field.value === "false"
                  ? { background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff", borderColor: "transparent" }
                  : { background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }
              }
            >
              No
            </button>
          </div>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={field.value === "true"}
              onChange={(e) => updateCustomField(field.id, { value: e.target.checked ? "true" : "false" })}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: "var(--accent)" }}
            />
            <span>Enabled by default</span>
          </label>
        );
      case "select":
        return (
          <input
            value={(field.options || []).join(", ")}
            onChange={(e) =>
              updateCustomField(field.id, {
                options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
              })
            }
            placeholder="Options: Alpha, Beta, Gamma"
            className="w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        );
      case "date":
        return (
          <div className="max-w-[220px]">
            <DateTimePicker
              mode="date"
              value={field.value}
              onChange={(val) => updateCustomField(field.id, { value: val })}
              placeholder="Select date"
            />
          </div>
        );
      case "number":
        return (
          <input
            type="number"
            value={field.value}
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            placeholder="0"
            className="h-9 px-3 rounded-xl border text-xs font-semibold max-w-[140px] outline-none"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        );
      default:
        return (
          <input
            value={field.value}
            onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
            placeholder="Default placeholder value"
            className="w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none"
            style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        );
    }
  };

  const clearSelectedLocation = () => {
    updateForm("location", "");
    setIsLocationSelected(false);
    setLocationSuggestions([]);
    setIsLocationDropdownOpen(false);
    setIsLoadingSuggestions(false);
    clearFieldError("location");
  };

  function handleLocationSelect(value: string) {
    const normalized = (value || "").trim();
    if (!normalized) return;

    updateForm("location", normalized);
    setIsLocationSelected(true);
    setLocationSuggestions([]);
    setIsLocationDropdownOpen(false);
    setIsLoadingSuggestions(false);
    clearFieldError("location");
  }

  const slideVariants = {
    enter: { opacity: 0, y: 12 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  };

  const currentStepMeta = STEP_LABELS[step - 1] || STEP_LABELS[0];

  return (
    <AppLayout>
      <div
        className="min-h-full flex-1 flex flex-col justify-start transition-colors duration-300 pb-16"
        style={{
          background: "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--accent) 8%, var(--bg)), var(--bg))",
          color: "var(--text)"
        }}
      >
        {/* WORKSPACE MAIN BODY */}
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-7 space-y-6">
          {/* BACK NAVIGATION */}
          <div className="flex items-center">
            <BackButton href="/events/create" label="Exit Studio" />
          </div>

          {/* STUDIO HEADER BAR */}
          <div
            className="w-full rounded-2xl border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 z-20 shadow-xs"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border font-mono"
                style={{
                  background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                  borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
                  color: "var(--accent)"
                }}
              >
                {isCustom ? "Custom Blueprint" : activeTemplate?.label || "Event"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Step {step} of {TOTAL_STEPS}
              </div>
            </div>
          </div>

          {/* STEP PROGRESS CHECKPOINTS */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pb-1">
              {STEP_LABELS.map((s) => {
                const isCompleted = step > s.step;
                const isCurrent = step === s.step;
                const StepIcon = s.icon;

                return (
                  <div
                    key={s.step}
                    className="flex items-center gap-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none"
                    onClick={() => {
                      if (s.step < step) setStep(s.step);
                    }}
                    style={{
                      color: isCurrent
                        ? "var(--accent)"
                        : isCompleted
                          ? "var(--text)"
                          : "var(--subtle)"
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-extrabold transition-all"
                      style={
                        isCurrent
                          ? {
                            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                            color: "#fff",
                            boxShadow: "0 2px 8px color-mix(in oklab, var(--accent) 35%, transparent)"
                          }
                          : isCompleted
                            ? {
                              background: "color-mix(in oklab, var(--accent) 20%, transparent)",
                              color: "var(--accent)"
                            }
                            : {
                              background: "var(--card2)",
                              color: "var(--subtle)",
                              border: "1px solid var(--border)"
                            }
                      }
                    >
                      {isCompleted ? "✓" : s.step}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Continuous Progress Bar Line */}
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card2)" }}>
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${(step / TOTAL_STEPS) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))"
                }}
              />
            </div>
          </div>

          {/* MAIN ELEVATED FORM CARD */}
          <div
            className="w-full rounded-3xl border shadow-xl flex flex-col overflow-visible transition-all duration-300 relative"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25)"
            }}
          >
            {/* Scrollable form body */}
            <div className="p-6 sm:p-8 md:p-10 space-y-6 relative z-20 min-h-[460px]">
              <AnimatePresence mode="wait">
                {/* ================= STEP 1: BASICS ================= */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                          Event Identity & Hosting Mode
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          {activeTemplate ? `Configuring a ${activeTemplate.label} blueprint.` : "Configuring a custom event blueprint."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Event Title */}
                      <FormRow icon={<Sparkles className="w-4 h-4" />}>
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Event Title *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. NextGen AI Hackathon 2026"
                            value={formData.title}
                            onChange={(e) => updateForm("title", e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border text-base sm:text-lg font-bold outline-none transition-all placeholder:font-normal"
                            style={{
                              background: "var(--input)",
                              borderColor: fieldErrors.title ? "#ef4444" : "var(--border)",
                              color: "var(--text)"
                            }}
                          />
                          {fieldErrors.title && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.title}</p>}
                        </div>
                      </FormRow>

                      {/* Selected Template Badge */}
                      <FormRow icon={<ListPlus className="w-4 h-4" />}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              Active Blueprint
                            </label>
                            <Link
                              href="/events/create"
                              className="text-xs font-bold transition hover:underline"
                              style={{ color: "var(--accent)" }}
                            >
                              Switch blueprint &rarr;
                            </Link>
                          </div>
                          <div
                            className="px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-between"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--text)" }}
                          >
                            <div className="flex items-center gap-2.5">
                              {isCustom ? <ListPlus className="w-4 h-4" style={{ color: "var(--accent)" }} /> : <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />}
                              <span>{isCustom ? "Custom (User-Defined Schema)" : activeTemplate?.label || "Event"}</span>
                            </div>
                            <span className="text-xs font-mono font-bold opacity-60">Ready</span>
                          </div>
                        </div>
                      </FormRow>

                      {/* Hosting Mode Cards */}
                      <FormRow icon={<Globe className="w-4 h-4" />}>
                        <div className="space-y-2">
                          <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Hosting Format *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {MODES.map((m) => {
                              const isSelected = formData.mode === m.id;
                              const ModeIcon = m.icon;

                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => updateForm("mode", m.id)}
                                  className="p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer shadow-xs"
                                  style={
                                    isSelected
                                      ? {
                                        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                        color: "#fff",
                                        borderColor: "transparent",
                                        boxShadow: "0 6px 16px color-mix(in oklab, var(--accent) 30%, transparent)"
                                      }
                                      : {
                                        background: "var(--card2)",
                                        borderColor: "var(--border)",
                                        color: "var(--text)"
                                      }
                                  }
                                >
                                  <div className="flex items-center justify-between w-full mb-2">
                                    <span
                                      className="p-1.5 rounded-lg text-xs"
                                      style={{
                                        background: isSelected ? "rgba(255, 255, 255, 0.2)" : "var(--input)",
                                        color: isSelected ? "#fff" : "var(--accent)"
                                      }}
                                    >
                                      <ModeIcon className="w-4 h-4" />
                                    </span>
                                    {isSelected && <span className="text-[10px] font-mono font-black uppercase">Selected</span>}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm tracking-tight">{m.label}</p>
                                    <p
                                      className="text-[11px] mt-0.5 line-clamp-1"
                                      style={{ color: isSelected ? "rgba(255, 255, 255, 0.8)" : "var(--muted)" }}
                                    >
                                      {m.desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </FormRow>
                    </div>
                  </motion.div>
                )}

                {/* ================= STEP 2: SCHEDULE & VENUE ================= */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-6 relative z-20"
                  >
                    <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                          Schedule & Venue Boundaries
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Configure start and end dates, times, and event location coordinates.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Dates */}
                      <FormRow icon={<Clock className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                          <div className="space-y-1.5">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              Start Date &amp; Time
                            </label>
                            <DateTimePicker
                              value={formData.start_date}
                              onChange={(val) => updateForm("start_date", val)}
                              error={!!fieldErrors.start_date}
                              placeholder="Select start date & time"
                            />
                            {fieldErrors.start_date && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.start_date}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              End Date &amp; Time
                            </label>
                            <DateTimePicker
                              value={formData.end_date}
                              onChange={(val) => updateForm("end_date", val)}
                              minDate={formData.start_date || undefined}
                              error={!!fieldErrors.end_date}
                              placeholder="Select end date & time"
                              align="right"
                            />
                            {fieldErrors.end_date && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.end_date}</p>}
                          </div>
                        </div>
                      </FormRow>

                      {/* Location Input with Mapbox & GPS */}
                      <FormRow icon={<MapPin className="w-4 h-4" />}>
                        <div className="space-y-2 relative w-full">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              Venue Location {formData.mode === "online" && "(Optional / Streaming Link)"}
                            </label>
                            {formData.mode !== "online" && (
                              <button
                                type="button"
                                onClick={handleDetectLocation}
                                disabled={isDetectingLocation}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                style={{
                                  background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                                  borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
                                  color: "var(--accent)"
                                }}
                              >
                                {isDetectingLocation ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Detecting…</span>
                                  </>
                                ) : (
                                  <>
                                    <Crosshair className="w-3.5 h-3.5" />
                                    <span>Use Accurate GPS</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div ref={locationWrapperRef} className="relative w-full z-30">
                            <input
                              type="text"
                              placeholder={formData.mode === "online" ? "e.g. Zoom, Google Meet or YouTube Livestream URL" : "e.g. KTPO Trade Centre, Whitefield, Bengaluru"}
                              value={formData.location}
                              onFocus={() => {
                                if (locationSuggestions.length > 0 && !isLocationSelected) {
                                  setIsLocationDropdownOpen(true);
                                }
                              }}
                              onChange={(e) => {
                                updateForm("location", e.target.value);
                                setIsLocationSelected(false);
                                setIsLocationDropdownOpen(true);
                              }}
                              className="w-full h-11 px-3.5 pr-10 rounded-xl border text-xs sm:text-sm font-semibold outline-none"
                              style={{
                                background: "var(--input)",
                                borderColor: fieldErrors.location ? "#ef4444" : "var(--border)",
                                color: "var(--text)"
                              }}
                            />
                            {formData.location.trim() && (
                              <button
                                type="button"
                                onClick={clearSelectedLocation}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:opacity-80 transition cursor-pointer"
                                style={{ color: "var(--muted)" }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {isLoadingSuggestions && formData.location.trim().length >= 3 && !isLocationSelected && (
                              <p className="mt-1.5 text-xs px-3 py-1.5 rounded-lg border shadow-xs animate-pulse font-mono" style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}>
                                Searching Mapbox locations...
                              </p>
                            )}

                            {isLocationDropdownOpen && locationSuggestions.length > 0 && (
                              <ul
                                className="absolute left-0 top-full mt-2 w-full z-50 max-h-56 overflow-y-auto rounded-2xl border shadow-2xl py-1 divide-y backdrop-blur-md"
                                style={{
                                  background: "var(--card)",
                                  borderColor: "var(--border)",
                                  boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.35)"
                                }}
                              >
                                {locationSuggestions.map((suggestion) => (
                                  <li
                                    key={suggestion.value}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleLocationSelect(suggestion.value);
                                    }}
                                    className="cursor-pointer px-4 py-2.5 text-xs sm:text-sm flex items-center gap-2.5 transition-colors font-medium hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{ color: "var(--text)" }}
                                  >
                                    <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                                    <span className="truncate">{suggestion.label}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {fieldErrors.location && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.location}</p>}
                        </div>
                      </FormRow>
                    </div>
                  </motion.div>
                )}

                {/* ================= STEP 3: SPECS & LIMITS ================= */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                          Registration Specs & Limits
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Set ticket pricing, attendee capacities, team boundaries, and event description.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Description */}
                      <FormRow icon={<AlignLeft className="w-4 h-4" />}>
                        <div className="space-y-1.5 w-full">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              Event Description *
                            </label>
                            <span
                              className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                              style={
                                formData.description.length >= 20
                                  ? { background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }
                                  : { background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }
                              }
                            >
                              {formData.description.length} / Min 20 chars
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            placeholder="Provide descriptive details, guidelines, rules, speakers, or schedule overview..."
                            value={formData.description}
                            onChange={(e) => updateForm("description", e.target.value)}
                            className="w-full p-3.5 rounded-xl border text-xs sm:text-sm font-medium outline-none resize-none"
                            style={{
                              background: "var(--input)",
                              borderColor: fieldErrors.description ? "#ef4444" : "var(--border)",
                              color: "var(--text)"
                            }}
                          />
                          {fieldErrors.description && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.description}</p>}
                        </div>
                      </FormRow>

                      {/* Registration Type (Solo vs Team) */}
                      <FormRow icon={<Users className="w-4 h-4" />}>
                        <div className="space-y-2 w-full">
                          <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                            Registration Type *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {REG_TYPES.map((t) => {
                              const isSelected = formData.registration_type === t.id;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => updateForm("registration_type", t.id)}
                                  className="p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer shadow-xs"
                                  style={
                                    isSelected
                                      ? {
                                        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                                        color: "#fff",
                                        borderColor: "transparent",
                                        boxShadow: "0 4px 14px color-mix(in oklab, var(--accent) 30%, transparent)"
                                      }
                                      : {
                                        background: "var(--card2)",
                                        borderColor: "var(--border)",
                                        color: "var(--text)"
                                      }
                                  }
                                >
                                  <p className="font-bold text-sm tracking-tight">{t.label}</p>
                                  <p
                                    className="text-[11px] mt-0.5 line-clamp-1"
                                    style={{ color: isSelected ? "rgba(255, 255, 255, 0.8)" : "var(--muted)" }}
                                  >
                                    {t.desc}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </FormRow>

                      {/* Team size limits (if team) */}
                      {formData.registration_type === "team" && (
                        <FormRow icon={<Users className="w-4 h-4" />}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full p-4 rounded-2xl border" style={{ background: "var(--card2)", borderColor: "var(--border)" }}>
                            <div className="space-y-1">
                              <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                                Min Team Members
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formData.min_team_size}
                                onChange={(e) => updateForm("min_team_size", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border text-xs sm:text-sm font-bold outline-none"
                                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                                Max Team Members
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={formData.max_team_size}
                                onChange={(e) => updateForm("max_team_size", e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border text-xs sm:text-sm font-bold outline-none"
                                style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                              />
                            </div>
                            {(fieldErrors.min_team_size || fieldErrors.max_team_size) && (
                              <p className="text-xs text-red-500 font-bold col-span-2">
                                {fieldErrors.min_team_size || fieldErrors.max_team_size}
                              </p>
                            )}
                          </div>
                        </FormRow>
                      )}

                      {/* Pricing & Capacity Grid */}
                      <FormRow icon={<Ticket className="w-4 h-4" />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                                Registration Fee (₹)
                              </label>
                              {isFreeFee(formData.registration_fee) && (
                                <EventFeeBadge fee={0} size="xs" />
                              )}
                            </div>
                            <input
                              type="number"
                              min="0"
                              placeholder="0 (Leave blank for Free)"
                              value={formData.registration_fee}
                              onChange={(e) => updateForm("registration_fee", e.target.value)}
                              className="w-full h-11 px-3.5 rounded-xl border text-xs sm:text-sm font-bold outline-none"
                              style={{
                                background: "var(--input)",
                                borderColor: fieldErrors.registration_fee ? "#ef4444" : "var(--border)",
                                color: "var(--text)"
                              }}
                            />
                            {fieldErrors.registration_fee && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.registration_fee}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                              Attendee Capacity (0 = Unlimited)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0 (No limit)"
                              value={formData.capacity}
                              onChange={(e) => updateForm("capacity", e.target.value)}
                              className="w-full h-11 px-3.5 rounded-xl border text-xs sm:text-sm font-bold outline-none"
                              style={{
                                background: "var(--input)",
                                borderColor: fieldErrors.capacity ? "#ef4444" : "var(--border)",
                                color: "var(--text)"
                              }}
                            />
                            {fieldErrors.capacity && <p className="text-xs text-red-500 font-bold mt-1">{fieldErrors.capacity}</p>}
                          </div>
                        </div>
                      </FormRow>
                    </div>
                  </motion.div>
                )}

                {/* ================= STEP 4: QUESTIONNAIRE ================= */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                          Attendee Checkout Questionnaire
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Design custom fields and questions participants answer when registering.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <FormRow icon={<FileText className="w-4 h-4" />}>
                        <div className="space-y-4 w-full">
                          {/* Mandatory Fields Notice */}
                          <div
                            className="p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-medium"
                            style={{
                              background: "color-mix(in oklab, var(--accent) 8%, var(--card2))",
                              borderColor: "color-mix(in oklab, var(--accent) 25%, var(--border))",
                              color: "var(--text)"
                            }}
                          >
                            <Lock className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                            <span>
                              <strong>Fixed Core Fields:</strong> Full Name, Email Address, and Phone Number are captured automatically from attendee profiles.
                            </span>
                          </div>

                          {/* Quick Presets & Recommendations */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                                  {isCustom ? "Recommended Questions (Blank Canvas)" : `Recommended Questions (${activeTemplate?.label || "Template"})`}
                                </label>
                                <span
                                  className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                                  style={{
                                    background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                                    borderColor: "color-mix(in oklab, var(--accent) 25%, transparent)",
                                    color: "var(--accent)"
                                  }}
                                >
                                  {isCustom ? "Personalized Suggestions" : "Template Blueprint"}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium hidden sm:inline" style={{ color: "var(--muted)" }}>
                                Click to add to questionnaire
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getRecommendedQuestionsForTemplate(formData.category).map((p) => {
                                const isAdded = regFormFields.some(
                                  (f) => f.label.toLowerCase() === p.label.toLowerCase() || (p.key && f.key === p.key)
                                );

                                return (
                                  <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => {
                                      if (!isAdded) {
                                        addRegFormField(p.key, p.label, p.type, p.options);
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 hover:scale-105 active:scale-95"
                                    style={
                                      isAdded
                                        ? {
                                          background: "color-mix(in oklab, var(--accent) 12%, var(--card2))",
                                          borderColor: "color-mix(in oklab, var(--accent) 35%, var(--border))",
                                          color: "var(--accent)",
                                          opacity: 0.9
                                        }
                                        : {
                                          background: "var(--card2)",
                                          borderColor: "var(--border)",
                                          color: "var(--text)"
                                        }
                                    }
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                                        <span>{p.label}</span>
                                        <span className="text-[10px] opacity-70 font-normal font-mono">(Added)</span>
                                      </>
                                    ) : (
                                      <>
                                        <span style={{ color: "var(--accent)" }}>+</span>
                                        <span>{p.label}</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => addRegFormField(`custom_${Date.now()}`, "", "text")}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5"
                                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                              >
                                <Plus className="w-3.5 h-3.5" /> Blank Question
                              </button>
                            </div>
                          </div>

                          {fieldErrors.reg_form_fields && (
                            <p className="text-xs text-red-500 font-bold p-3 rounded-xl border border-red-500/20 bg-red-500/10">
                              {fieldErrors.reg_form_fields}
                            </p>
                          )}

                          {/* Questions List */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                                Attendee Questions ({regFormFields.length})
                              </label>
                              {regFormFields.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setRegFormFields([])}
                                  className="text-[11px] font-mono font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                  Clear All
                                </button>
                              )}
                            </div>

                            {regFormFields.length === 0 ? (
                              <div
                                className="py-10 px-6 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center space-y-3 transition-colors"
                                style={{
                                  background: "color-mix(in oklab, var(--accent) 3%, var(--card2))",
                                  borderColor: "color-mix(in oklab, var(--accent) 25%, var(--border))",
                                }}
                              >
                                <div
                                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
                                  style={{
                                    background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                                    color: "var(--accent)",
                                  }}
                                >
                                  <HelpCircle className="w-6 h-6" />
                                </div>
                                <div className="max-w-md space-y-1">
                                  <h3 className="font-black text-sm sm:text-base tracking-tight" style={{ color: "var(--text)" }}>
                                    {isCustom ? "No Questions Added Yet (Blank Canvas)" : "No Custom Questions Added"}
                                  </h3>
                                  <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                                    Participants will only submit standard core fields (Full Name, Email, and Phone) at checkout. Click any of the recommended questions above or add a blank question to collect custom details.
                                  </p>
                                </div>
                                <div className="pt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addRegFormField(`custom_${Date.now()}`, "", "text")}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5"
                                    style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add Blank Question
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                                {regFormFields.map((field, idx) => (
                                  <div
                                    key={field.id}
                                    className="flex flex-col md:flex-row items-center gap-3 p-3.5 border rounded-2xl transition-all"
                                    style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 self-start md:self-center"
                                      style={{
                                        background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                                        color: "var(--accent)"
                                      }}
                                    >
                                      {idx + 1}
                                    </div>
                                    <div className="w-full md:w-1/3">
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateRegFormField(field.id, { label: e.target.value })}
                                        placeholder="Question Title (e.g. GitHub URL)"
                                        className="w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none"
                                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
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
                                        className="w-full h-9 px-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                                        style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                                      >
                                        <option value="text">Short Text</option>
                                        <option value="textarea">Long Text</option>
                                        <option value="number">Number</option>
                                        <option value="select">Dropdown</option>
                                        <option value="checkbox">Checkbox</option>
                                      </select>
                                    </div>
                                    <div className="flex-1 w-full">
                                      {field.type === "select" ? (
                                        <input
                                          type="text"
                                          value={(field.options || []).join(", ")}
                                          onChange={(e) =>
                                            updateRegFormField(field.id, {
                                              options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                                            })
                                          }
                                          placeholder="Options: S, M, L, XL"
                                          className="w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none"
                                          style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                                        />
                                      ) : (
                                        <div className="text-[11px] italic text-center md:text-left" style={{ color: "var(--muted)" }}>
                                          Standard {field.type} response
                                        </div>
                                      )}
                                    </div>
                                    <div className="shrink-0 flex items-center gap-3">
                                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none" style={{ color: "var(--text)" }}>
                                        <input
                                          type="checkbox"
                                          checked={field.required}
                                          onChange={(e) => updateRegFormField(field.id, { required: e.target.checked })}
                                          className="w-3.5 h-3.5 rounded cursor-pointer"
                                          style={{ accentColor: "var(--accent)" }}
                                        />
                                        Req
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => removeRegFormField(field.id)}
                                        className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition cursor-pointer shrink-0"
                                        title="Remove question"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  onClick={() => addRegFormField(`custom_${Date.now()}`, "", "text")}
                                  className="w-full py-2.5 rounded-2xl border border-dashed text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-80 transition cursor-pointer"
                                  style={{
                                    background: "var(--card2)",
                                    borderColor: "var(--border)",
                                    color: "var(--accent)"
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add Another Question
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </FormRow>
                    </div>
                  </motion.div>
                )}

                {/* ================= STEP 5: TEMPLATE BLUEPRINT ================= */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        <ListPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                          {isCustom ? "Build Custom Parameters" : `${activeTemplate?.label || "Event"} Blueprint Attributes`}
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          {isCustom ? "Construct custom fields and track specific properties for your event." : "Define custom properties tailored to this event category."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <FormRow icon={<ListPlus className="w-4 h-4" />}>
                        {!isCustom && activeTemplate && activeTemplate.fields.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            {activeTemplate.fields.map((field) => (
                              <div
                                key={field.id}
                                className="space-y-1.5 p-4 rounded-2xl border"
                                style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                              >
                                <label className="text-xs font-mono font-bold uppercase tracking-wider block" style={{ color: "var(--muted)" }}>
                                  {field.label}
                                </label>
                                <div className="mt-1">{renderTemplateFieldInput(field)}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isCustom && (!activeTemplate || activeTemplate.fields.length === 0) && (
                          <div
                            className="py-12 text-center text-xs sm:text-sm font-semibold border border-dashed rounded-2xl w-full"
                            style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                          >
                            No extra attributes required for this template. Click Continue to proceed.
                          </div>
                        )}

                        {isCustom && (
                          <div className="space-y-5 w-full">
                            <div className="space-y-2">
                              <label className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                                Quick Add Event Parameters
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {CUSTOM_FIELD_TYPES.map((t) => (
                                  <button
                                    key={t.type}
                                    type="button"
                                    onClick={() => addCustomField(t.type)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                    style={{
                                      background: "color-mix(in oklab, var(--accent) 12%, var(--card2))",
                                      borderColor: "color-mix(in oklab, var(--accent) 30%, var(--border))",
                                      color: "var(--accent)"
                                    }}
                                  >
                                    <Plus className="w-3.5 h-3.5" /> {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {fieldErrors.custom_fields && (
                              <p className="text-xs text-red-500 font-bold p-3 rounded-xl border border-red-500/20 bg-red-500/10">
                                {fieldErrors.custom_fields}
                              </p>
                            )}

                            {/* Custom Fields List */}
                            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                              {customFields.length === 0 && (
                                <div
                                  className="text-center py-10 font-semibold text-xs sm:text-sm border border-dashed rounded-2xl"
                                  style={{ background: "var(--card2)", borderColor: "var(--border)", color: "var(--muted)" }}
                                >
                                  No custom parameters added yet. Click preset chips above to add fields.
                                </div>
                              )}
                              {customFields.map((field) => (
                                <div
                                  key={field.id}
                                  className="flex flex-col md:flex-row items-center gap-3 p-3.5 border rounded-2xl"
                                  style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                                >
                                  <div className="w-full md:w-1/3">
                                    <input
                                      type="text"
                                      value={field.label}
                                      onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                                      placeholder="Param label (e.g. Prize Pool)"
                                      className="w-full h-9 px-3 rounded-xl border text-xs font-semibold outline-none"
                                      style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
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
                                      className="w-full h-9 px-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer"
                                      style={{ background: "var(--input)", borderColor: "var(--border)", color: "var(--text)" }}
                                    >
                                      <option value="text">Text</option>
                                      <option value="number">Number</option>
                                      <option value="date">Date</option>
                                      <option value="select">Dropdown</option>
                                      <option value="checkbox">Checkbox</option>
                                      <option value="boolean">Yes/No Toggle</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 w-full">
                                    {renderCustomFieldValueInput(field)}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeCustomField(field.id)}
                                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition cursor-pointer shrink-0"
                                    title="Remove parameter"
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

                {/* ================= STEP 6: REVIEW & LAUNCH ================= */}
                {step === 6 && (
                  <motion.div
                    key="step6"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 border-b pb-4" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                          Review & Launch Event
                        </h1>
                        <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "var(--muted)" }}>
                          Verify configuration parameters before publishing this event to the platform.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Ticket Preview Card */}
                      <div
                        className="rounded-3xl p-4 border shadow-md flex flex-col justify-between space-y-3"
                        style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                      >
                        <div
                          className="w-full h-28 rounded-2xl flex flex-col justify-between p-3 relative overflow-hidden shadow-inner"
                          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", color: "#fff" }}
                        >
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 self-start border border-white/20">
                            {formData.category}
                          </span>
                          <p className="font-extrabold text-sm sm:text-base line-clamp-1 drop-shadow-xs">
                            {formData.title || "Untitled Event"}
                          </p>
                        </div>

                        <div className="space-y-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                            <span>{formData.start_date ? new Date(formData.start_date).toLocaleDateString() : "Coming Soon"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                            <span className="truncate">{formData.location || "Online"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Ticket className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <EventFeeBadge fee={formData.registration_fee} size="sm" />
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-center block pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--subtle)" }}>
                          Live Preview Ticket
                        </span>
                      </div>

                      {/* Specs Summary Grid */}
                      <div
                        className="md:col-span-2 rounded-3xl border p-5 space-y-4 text-xs"
                        style={{ background: "var(--card2)", borderColor: "var(--border)" }}
                      >
                        <h4 className="font-mono font-bold uppercase tracking-wider text-[11px]" style={{ color: "var(--muted)" }}>
                          Blueprint Specifications Summary
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
                          <div>
                            <p className="font-mono uppercase text-[10px]" style={{ color: "var(--muted)" }}>Hosting Mode</p>
                            <p className="font-bold text-sm capitalize mt-0.5" style={{ color: "var(--text)" }}>{formData.mode}</p>
                          </div>
                          <div>
                            <p className="font-mono uppercase text-[10px]" style={{ color: "var(--muted)" }}>Pricing Tier</p>
                            <div className="mt-1">
                              <EventFeeBadge fee={formData.registration_fee} size="md" paidClassName="font-bold text-sm text-[var(--text)]" />
                            </div>
                          </div>
                          <div>
                            <p className="font-mono uppercase text-[10px]" style={{ color: "var(--muted)" }}>Capacity Limit</p>
                            <p className="font-bold text-sm mt-0.5" style={{ color: "var(--text)" }}>
                              {Number(formData.capacity) === 0 ? "Unlimited Seats" : `${formData.capacity} Seats`}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono uppercase text-[10px]" style={{ color: "var(--muted)" }}>Registration Format</p>
                            <p className="font-bold text-sm capitalize mt-0.5" style={{ color: "var(--text)" }}>
                              {formData.registration_type} {formData.registration_type === "team" ? `(${formData.min_team_size}-${formData.max_team_size} members)` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Blueprint properties summary */}
                          <div className="space-y-1.5">
                            <p className="font-mono uppercase text-[10px]" style={{ color: "var(--muted)" }}>
                              {isCustom ? `Custom Properties (${customFields.length})` : `${activeTemplate?.label || "Template"} Properties`}
                            </p>
                            <div
                              className="rounded-2xl p-3 border space-y-1.5 max-h-32 overflow-y-auto no-scrollbar"
                              style={{ background: "var(--card)", borderColor: "var(--border)" }}
                            >
                              {isCustom ? (
                                customFields.length === 0 ? (
                                  <p className="italic text-[11px]" style={{ color: "var(--muted)" }}>No custom properties configured.</p>
                                ) : (
                                  customFields.map((f) => (
                                    <div key={f.id} className="flex justify-between items-center font-medium">
                                      <span style={{ color: "var(--text)" }}>&bull; {f.label || "(Untitled)"}</span>
                                      <span className="font-mono text-[10px] uppercase font-bold" style={{ color: "var(--muted)" }}>
                                        {f.type}
                                      </span>
                                    </div>
                                  ))
                                )
                              ) : activeTemplate?.fields && activeTemplate.fields.length > 0 ? (
                                activeTemplate.fields.map((f) => (
                                  <div key={f.id} className="flex justify-between items-center font-medium">
                                    <span style={{ color: "var(--text)" }}>&bull; {f.label}</span>
                                    <span className="font-mono text-[10px] uppercase font-bold" style={{ color: "var(--muted)" }}>
                                      {templateValues[f.id] || "Default"}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="italic text-[11px]" style={{ color: "var(--muted)" }}>Standard template schema.</p>
                              )}
                            </div>
                          </div>

                          {/* Custom Questionnaire list */}
                          <div className="space-y-1.5">
                            <p className="font-mono uppercase text-[10px]" style={{ color: "var(--muted)" }}>
                              Checkout Questions ({regFormFields.length})
                            </p>
                            <div
                              className="rounded-2xl p-3 border space-y-1.5 max-h-32 overflow-y-auto no-scrollbar"
                              style={{ background: "var(--card)", borderColor: "var(--border)" }}
                            >
                              {regFormFields.length === 0 ? (
                                <p className="italic text-[11px]" style={{ color: "var(--muted)" }}>No dynamic questions added.</p>
                              ) : (
                                regFormFields.map((f) => (
                                  <div key={f.id} className="flex justify-between items-center font-medium">
                                    <span style={{ color: "var(--text)" }}>&bull; {f.label || "(Untitled)"}</span>
                                    <span className="font-mono text-[10px] uppercase font-bold" style={{ color: "var(--muted)" }}>
                                      {f.type} {f.required ? "(Req)" : ""}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div
              className="px-4 sm:px-8 py-4 border-t flex items-center justify-between gap-3 rounded-b-3xl relative z-10"
              style={{ background: "var(--card2)", borderColor: "var(--border)" }}
            >
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1 || isLoading}
                className={`px-4 sm:px-5 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shrink-0 ${step === 1 ? "invisible" : "visible"
                  }`}
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--muted)"
                }}
              >
                &larr; Back
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  Continue &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isLoading}
                  className="px-5 sm:px-8 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="hidden sm:inline">Publish Event &bull; Launch</span>
                  <span className="sm:hidden">Publish</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      }
    >
      <CreateEventPageInner />
    </Suspense>
  );
}
