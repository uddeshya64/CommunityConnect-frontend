"use client";

import { useEffect, useState } from "react";
import { FileText, Lock, Plus, Trash2, Loader2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";
import { useAppearance } from "@/components/providers/AppearanceProvider";

export interface RegistrationFormField {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}

export default function RegistrationFormBuilder({ eventId }: { eventId: string }) {
  const { isDark, activeAccent } = useAppearance();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [fields, setFields] = useState<RegistrationFormField[]>([
    { id: "reg_college", key: "college", label: "College / University", type: "text", required: true },
    { id: "reg_branch", key: "branch", label: "Branch / Stream", type: "text", required: false },
    { id: "reg_year", key: "year", label: "Graduation Year", type: "text", required: false },
    { id: "reg_tshirt", key: "tshirt_size", label: "T-Shirt Size", type: "select", required: false, options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { id: "reg_food", key: "food_preference", label: "Food Preference", type: "select", required: false, options: ["Veg", "Non-Veg", "Jain", "Vegan"] },
  ]);

  useEffect(() => {
    const fetchEventFormSchema = async () => {
      try {
        const response = await eventService.getEventById(eventId);
        const rawEvent = response?.data?.event || response?.data || response?.event || response;
        const schema = rawEvent?.custom_fields?.registration_form_schema || rawEvent?.registration_form_schema;
        if (Array.isArray(schema) && schema.length > 0) {
          const dynamicFields = schema
            .filter((f: any) => !f.is_fixed)
            .map((f: any) => ({
              id: f.id || `reg_${Math.random().toString(36).slice(2, 7)}`,
              key: f.key || f.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              label: f.label || "",
              type: f.type || "text",
              required: !!f.required,
              options: f.options,
            }));
          if (dynamicFields.length > 0) {
            setFields(dynamicFields);
          }
        }
      } catch (err) {
        console.error("Error loading registration form schema", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEventFormSchema();
  }, [eventId]);

  const addField = (
    key: string,
    label: string,
    type: "text" | "textarea" | "number" | "select" | "checkbox",
    options?: string[]
  ) => {
    const id = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setFields((prev) => [...prev, { id, key, label, type, required: false, options }]);
  };

  const updateField = (id: string, patch: Partial<RegistrationFormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const registration_form_schema = [
        { key: "name", label: "Full Name", type: "text", required: true, is_fixed: true },
        { key: "email", label: "Email Address", type: "text", required: true, is_fixed: true },
        { key: "phone", label: "Phone Number", type: "text", required: true, is_fixed: true },
        ...fields.filter((f) => f.label.trim()).map((f) => ({
          id: f.id,
          key: f.key || f.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          label: f.label.trim(),
          type: f.type,
          required: f.required,
          options: f.options,
          is_fixed: false,
        })),
      ];

      await eventService.updateEvent(eventId, {
        custom_fields: {
          registration_form_schema,
        },
      });

      setSuccessMsg("Registration questions saved successfully!");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Failed to save registration form questions.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`p-12 rounded-[2.5rem] border flex items-center justify-center min-h-[300px] ${
        isDark ? "bg-zinc-900/60 border-white/10" : "bg-white border-zinc-200"
      }`}>
        <Loader2 className={`w-8 h-8 animate-spin ${activeAccent.text}`} />
      </div>
    );
  }

  return (
    <div className={`p-8 md:p-10 rounded-[2.5rem] border shadow-sm space-y-8 animate-in fade-in duration-500 transition-colors ${
      isDark ? "bg-zinc-900/60 border-white/10" : "bg-white border-zinc-200"
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
        isDark ? "border-white/10" : "border-zinc-100"
      }`}>
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight flex items-center gap-3 ${
            isDark ? "text-white" : "text-zinc-900"
          }`}>
            <FileText className={`w-8 h-8 ${activeAccent.text}`} /> Attendee Registration Form Builder
          </h1>
          <p className={`font-medium mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Customize the questions attendees must answer when signing up for this event.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={`rounded-2xl ${activeAccent.bg} hover:opacity-90 text-white font-bold px-6 py-6 shadow-md ${activeAccent.shadow} transition-all`}
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Form Schema</>}
        </Button>
      </div>

      {successMsg && (
        <div className={`p-4 rounded-2xl border font-bold text-sm flex items-center gap-2 ${
          isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className={`p-4 rounded-2xl border font-bold text-sm ${
          isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
        }`}>
          {errorMsg}
        </div>
      )}

      {/* Fixed Profile Fields Banner */}
      <div className={`p-5 rounded-2xl border space-y-2 ${
        isDark ? "bg-zinc-950/70 border-white/10" : "bg-indigo-50/80 border-indigo-100"
      }`}>
        <div className={`flex items-center gap-2 font-bold text-sm ${
          isDark ? "text-zinc-200" : "text-indigo-900"
        }`}>
          <Lock className={`w-4 h-4 ${activeAccent.text} shrink-0`} /> Fixed Profile Fields (Auto-Collected)
        </div>
        <p className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-indigo-700"}`}>
          These profile fields are always collected for every attendee:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {["Full Name", "Phone Number", "Email Address"].map((f) => (
            <span key={f} className={`px-3 py-1 rounded-xl border text-xs font-bold shadow-2xs ${
              isDark ? "bg-zinc-900 border-white/10 text-zinc-200" : "bg-white border-indigo-200/80 text-indigo-800"
            }`}>
              ✓ {f}
            </span>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Add Presets</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "college", label: "College / University", type: "text" as const, title: "+ College" },
            { key: "year", label: "Graduation Year", type: "text" as const, title: "+ Year" },
            { key: "branch", label: "Branch / Stream", type: "text" as const, title: "+ Branch" },
            { key: "portfolio", label: "Portfolio URL", type: "text" as const, title: "+ Portfolio" },
            { key: "resume", label: "Resume Link", type: "text" as const, title: "+ Resume" },
            { key: "why_join", label: "Why do you want to join?", type: "textarea" as const, title: "+ Why Join?" },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => addField(preset.key, preset.label, preset.type)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isDark
                  ? "bg-zinc-800/80 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white"
                  : "bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 border-zinc-200"
              }`}
            >
              {preset.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addField(`custom_${Date.now()}`, "", "text")}
            className={`px-3 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-sm ${activeAccent.bg} hover:opacity-90`}
          >
            + Blank Question
          </button>
        </div>
      </div>

      {/* Dynamic Fields List */}
      <div className="space-y-4">
        {fields.length === 0 && (
          <div className={`text-center py-12 font-medium text-sm rounded-2xl border border-dashed ${
            isDark ? "bg-zinc-950/40 border-white/10 text-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-400"
          }`}>
            No custom questions added. Click a preset above to add questions.
          </div>
        )}

        {fields.map((field) => (
          <div key={field.id} className={`p-5 rounded-2xl border space-y-4 transition-colors ${
            isDark ? "bg-zinc-950/50 border-white/10" : "bg-zinc-50 border-zinc-200"
          }`}>
            <div className="flex items-center gap-3">
              <Input
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="Question / Field Label"
                className={`py-5 px-4 rounded-xl flex-1 font-semibold text-sm ${
                  isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                }`}
              />
              <select
                value={field.type}
                onChange={(e) =>
                  updateField(field.id, {
                    type: e.target.value as any,
                    options: e.target.value === "select" ? field.options || ["Option 1", "Option 2"] : undefined,
                  })
                }
                className={`py-3 px-3 rounded-xl border text-xs font-bold focus:outline-none transition-colors ${
                  isDark ? "bg-zinc-900 border-white/10 text-zinc-200" : "bg-white border-zinc-200 text-zinc-700"
                }`}
              >
                <option value="text" className={isDark ? "bg-zinc-900" : "bg-white"}>Short Text</option>
                <option value="textarea" className={isDark ? "bg-zinc-900" : "bg-white"}>Long Text</option>
                <option value="number" className={isDark ? "bg-zinc-900" : "bg-white"}>Number</option>
                <option value="select" className={isDark ? "bg-zinc-900" : "bg-white"}>Dropdown Select</option>
                <option value="checkbox" className={isDark ? "bg-zinc-900" : "bg-white"}>Checkbox</option>
              </select>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {field.type === "select" && (
              <div className="space-y-1.5 pl-1">
                <Label className="text-xs font-bold text-zinc-500">Dropdown Options (Comma separated)</Label>
                <Input
                  value={(field.options || []).join(", ")}
                  onChange={(e) =>
                    updateField(field.id, {
                      options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. XS, S, M, L, XL"
                  className={`py-3 px-3 rounded-xl text-xs ${
                    isDark ? "bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500" : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                  }`}
                />
              </div>
            )}

            <div className={`flex items-center justify-between pt-2 border-t ${
              isDark ? "border-white/10" : "border-zinc-200/60"
            }`}>
              <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                isDark ? "text-zinc-300" : "text-zinc-700"
              }`}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                Required Question
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
