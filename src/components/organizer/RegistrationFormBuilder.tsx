"use client";

import { useEffect, useState } from "react";
import { FileText, Lock, Plus, Trash2, Loader2, Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventService } from "@/services/event.service";

export interface RegistrationFormField {
  id: string;
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}

export default function RegistrationFormBuilder({ eventId }: { eventId: string }) {
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
        registration_form_schema,
      });

      setSuccessMsg("Registration form schema updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.response?.data?.message || "Failed to update registration form schema.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center flex items-center justify-center bg-white rounded-[2.5rem] border border-zinc-200">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" /> Attendee Registration Form Builder
          </h1>
          <p className="text-zinc-500 font-medium mt-1">
            Customize the questions attendees must answer when signing up for this event.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-6 shadow-md shadow-indigo-600/20"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Form Schema</>}
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm">
          {errorMsg}
        </div>
      )}

      {/* Fixed Profile Fields Banner */}
      <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-2">
        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
          <Lock className="w-4 h-4 text-indigo-600 shrink-0" /> Fixed Profile Fields (Auto-Collected)
        </div>
        <p className="text-xs text-indigo-700 font-medium">
          These profile fields are always collected for every attendee:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {["Full Name", "Phone Number", "Email Address"].map((f) => (
            <span key={f} className="px-3 py-1 rounded-xl bg-white border border-indigo-200/80 text-xs font-bold text-indigo-800 shadow-2xs">
              ✓ {f}
            </span>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Add Presets</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addField("college", "College / University", "text")}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
          >
            + College
          </button>
          <button
            type="button"
            onClick={() => addField("year", "Graduation Year", "text")}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
          >
            + Year
          </button>
          <button
            type="button"
            onClick={() => addField("branch", "Branch / Stream", "text")}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
          >
            + Branch
          </button>
          <button
            type="button"
            onClick={() => addField("portfolio", "Portfolio URL", "text")}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
          >
            + Portfolio
          </button>
          <button
            type="button"
            onClick={() => addField("resume", "Resume Link", "text")}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
          >
            + Resume
          </button>
          <button
            type="button"
            onClick={() => addField("why_join", "Why do you want to join?", "textarea")}
            className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
          >
            + Why Join?
          </button>
          <button
            type="button"
            onClick={() => addField(`custom_${Date.now()}`, "", "text")}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
          >
            + Blank Question
          </button>
        </div>
      </div>

      {/* Dynamic Fields List */}
      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="text-center py-12 text-zinc-400 font-medium text-sm bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
            No custom questions added. Click a preset above to add questions.
          </div>
        )}

        {fields.map((field) => (
          <div key={field.id} className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <Input
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="Question / Field Label"
                className="py-5 px-4 rounded-xl bg-white border-zinc-200 flex-1 font-semibold text-sm"
              />
              <select
                value={field.type}
                onChange={(e) =>
                  updateField(field.id, {
                    type: e.target.value as any,
                    options: e.target.value === "select" ? field.options || ["Option 1", "Option 2"] : undefined,
                  })
                }
                className="py-3 px-3 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="text">Short Text</option>
                <option value="textarea">Long Text</option>
                <option value="number">Number</option>
                <option value="select">Dropdown Select</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
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
                  className="py-3 px-3 rounded-xl bg-white border-zinc-200 text-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer">
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
