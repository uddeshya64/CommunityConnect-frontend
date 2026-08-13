"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Palette,
  Code,
  Eye,
  Trash2
} from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const FONTS = [
  { name: "Default (Inter)", value: "system-ui, -apple-system, sans-serif" },
  { name: "Playfair (Elegant)", value: "'Playfair Display', Georgia, serif" },
  { name: "Courier (Technical)", value: "'Courier New', Courier, monospace" },
  { name: "Impact (Bold)", value: "Impact, Haettenschweiler, sans-serif" },
  { name: "Comic (Creative)", value: "'Comic Sans MS', cursive" }
];

const COLORS = [
  { name: "Default", value: "inherit" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "White", value: "#ffffff" }
];

const BG_COLORS = [
  { name: "Transparent", value: "transparent" },
  { name: "Light Indigo", value: "#e0e7ff" },
  { name: "Light Emerald", value: "#d1fae5" },
  { name: "Light Rose", value: "#ffe4e6" },
  { name: "Light Amber", value: "#fef3c7" },
  { name: "Light Cyan", value: "#cffafe" },
  { name: "Zinc Dark", value: "#27272a" }
];

export function RichTextEditor({ value, onChange, placeholder = "Write agenda description here..." }: RichTextEditorProps) {
  const { isDark, activeAccent } = useAppearance();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0].value);

  // Sync state with incoming value, avoiding cursors jumping
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
    setHtmlValue(value || "");
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHtmlValue(html);
      onChange(html);
    }
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlValue(val);
    onChange(val);
  };

  const execCommand = (command: string, val: string = "") => {
    if (isHtmlMode) return;
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    execCommand("fontName", font);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    execCommand("foreColor", color);
  };

  const handleBgChange = (color: string) => {
    setSelectedBg(color);
    execCommand("backColor", color);
  };

  const clearFormatting = () => {
    execCommand("removeFormat");
    execCommand("fontName", FONTS[0].value);
    setSelectedFont(FONTS[0].value);
    setSelectedColor(COLORS[0].value);
    setSelectedBg(BG_COLORS[0].value);
  };

  return (
    <div className={`w-full border rounded-2xl overflow-hidden shadow-sm transition-colors ${
      isDark ? "border-white/10 bg-zinc-900/90" : "border-zinc-200 bg-white"
    }`}>
      
      {/* TOOLBAR */}
      <div className={`flex flex-wrap gap-1 p-2 border-b items-center justify-between transition-colors ${
        isDark ? "bg-zinc-950/80 border-white/10" : "bg-zinc-50 border-zinc-200"
      }`}>
        <div className="flex flex-wrap gap-1 items-center">
          
          {/* FONT SELECT */}
          <div className={`relative flex items-center border rounded-lg px-2 py-1 gap-1 text-xs transition-colors ${
            isDark ? "bg-zinc-900 border-white/10 text-zinc-200" : "bg-white border-zinc-200 text-zinc-700"
          }`}>
            <Type className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedFont}
              onChange={(e) => handleFontChange(e.target.value)}
              disabled={isHtmlMode}
              className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value} className={isDark ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {/* BASIC STYLES */}
          <button
            type="button"
            onClick={() => execCommand("bold")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("italic")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("underline")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("strikeThrough")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {/* HEADINGS */}
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h1>")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors flex items-center font-extrabold text-xs ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<h2>")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors flex items-center font-extrabold text-xs ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("formatBlock", "<p>")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors flex items-center text-xs font-medium ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Paragraph"
          >
            p
          </button>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {/* TEXT COLORS */}
          <div className={`relative flex items-center border rounded-lg px-2 py-1 gap-1 text-xs transition-colors ${
            isDark ? "bg-zinc-900 border-white/10 text-zinc-200" : "bg-white border-zinc-200 text-zinc-700"
          }`}>
            <Palette className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedColor}
              onChange={(e) => handleColorChange(e.target.value)}
              disabled={isHtmlMode}
              className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
            >
              {COLORS.map((c) => (
                <option key={c.value} value={c.value} className={isDark ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"}>
                  Text: {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* BG COLORS */}
          <div className={`relative flex items-center border rounded-lg px-2 py-1 gap-1 text-xs ml-1 transition-colors ${
            isDark ? "bg-zinc-900 border-white/10 text-zinc-200" : "bg-white border-zinc-200 text-zinc-700"
          }`}>
            <Palette className={`w-3.5 h-3.5 ${activeAccent.text}`} />
            <select
              value={selectedBg}
              onChange={(e) => handleBgChange(e.target.value)}
              disabled={isHtmlMode}
              className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1"
            >
              {BG_COLORS.map((bg) => (
                <option key={bg.value} value={bg.value} className={isDark ? "bg-zinc-900 text-zinc-100" : "bg-white text-zinc-900"}>
                  Highlight: {bg.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {/* LISTS */}
          <button
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {/* ALIGNMENTS */}
          <button
            type="button"
            onClick={() => execCommand("justifyLeft")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("justifyCenter")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("justifyRight")}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-600"
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className={`w-px h-5 mx-1 ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

          {/* CLEAR FORMAT */}
          <button
            type="button"
            onClick={clearFormatting}
            disabled={isHtmlMode}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              isDark ? "hover:bg-red-950 text-red-400" : "hover:bg-red-50 text-red-600"
            }`}
            title="Clear Formatting"
          >
            <Trash2 className="w-4 h-4" />
          </button>

        </div>

        {/* CODE MODE */}
        <button
          type="button"
          onClick={() => setIsHtmlMode(!isHtmlMode)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            isHtmlMode
              ? `${activeAccent.bg} text-white shadow-sm`
              : isDark
              ? "bg-zinc-900 text-zinc-300 border border-white/10 hover:bg-zinc-800"
              : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
          }`}
          title={isHtmlMode ? "Visual Editor" : "HTML Editor"}
        >
          {isHtmlMode ? (
            <>
              <Eye className="w-3.5 h-3.5" /> Visual
            </>
          ) : (
            <>
              <Code className="w-3.5 h-3.5" /> HTML
            </>
          )}
        </button>
      </div>

      {/* EDITOR AREA */}
      <div className={`relative min-h-[220px] text-sm font-medium transition-colors ${
        isDark ? "bg-zinc-900/50 text-zinc-100" : "bg-white text-zinc-800"
      }`}>
        {isHtmlMode ? (
          <textarea
            value={htmlValue}
            onChange={handleHtmlChange}
            placeholder="Write raw HTML here..."
            className={`w-full min-h-[220px] p-4 font-mono text-xs focus:outline-none border-none resize-y block leading-relaxed ${
              isDark ? "bg-zinc-950 text-zinc-200" : "bg-zinc-900 text-zinc-100"
            }`}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className={`w-full min-h-[220px] p-5 focus:outline-none max-w-none prose prose-sm leading-relaxed overflow-y-auto ${
              isDark ? "prose-invert" : "prose-zinc"
            }`}
            style={{ fontFamily: selectedFont }}
          />
        )}

        {/* Visual Placeholder when empty */}
        {!isHtmlMode && !htmlValue && (
          <div className="absolute top-5 left-5 text-zinc-400 pointer-events-none select-none text-sm font-medium">
            {placeholder}
          </div>
        )}
      </div>

    </div>
  );
}
