"use client";

import { useState } from "react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { DEMO_VIDEOS } from "./landingData";

export default function VideoTourSection() {
  const [selectedVideoId, setSelectedVideoId] = useState<string>("full");
  const activeVideo = DEMO_VIDEOS.find((v) => v.id === selectedVideoId) || DEMO_VIDEOS[0];

  return (
    <section id="tour" className="max-w-[1280px] mx-auto px-6 pt-14 pb-[96px]">
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div>
          <h2
            className="font-bricolage text-[clamp(36px,5vw,68px)] leading-[1.02] tracking-tight font-extrabold"
            style={{ color: "var(--text)" }}
          >
            See it{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
              }}
            >
              in action.
            </span>
          </h2>
          <p
            className="text-[15px] sm:text-[16px] leading-[1.55] mt-3 max-w-xl"
            style={{ color: "var(--muted)" }}
          >
            Explore the full platform walkthrough or jump into organizer, staff, and attendee
            segments.
          </p>
        </div>
        <div
          className="font-mono text-[12px] font-semibold tracking-[0.1em]"
          style={{ color: "var(--subtle)" }}
        >
          4 INTERACTIVE DEMOS
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-10 items-stretch">
        {/* Left: Video Player Card */}
        <div
          className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between rounded-[24px] p-4 sm:p-5 border backdrop-blur-xl relative overflow-hidden"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            boxShadow: "0 20px 50px -24px color-mix(in oklab, var(--accent) 18%, rgba(0,0,0,0.28))",
          }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-white shrink-0"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                }}
              >
                {activeVideo.badge}
              </span>
              <span className="font-bricolage font-bold text-sm sm:text-base truncate tracking-tight">
                {activeVideo.title}
              </span>
            </div>

            {activeVideo.id !== "full" ? (
              <button
                type="button"
                onClick={() => setSelectedVideoId("full")}
                className="font-mono text-[12px] font-bold flex items-center gap-1.5 hover:underline cursor-pointer shrink-0"
                style={{ color: "var(--accent)" }}
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                <span>Watch Full Overview</span>
              </button>
            ) : (
              <span
                className="font-mono text-[11px] tracking-[0.08em]"
                style={{ color: "var(--subtle)" }}
              >
                FULL WALKTHROUGH
              </span>
            )}
          </div>

          <div
            className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden flex items-center justify-center flex-1 border"
            style={{
              borderColor: "var(--border)",
              background: "var(--card2)",
            }}
          >
            <video
              key={activeVideo.src}
              controls
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            >
              <source src={activeVideo.src} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Right: 3 Role Segments + Full Overview Quick Switch */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between gap-3 h-full">
          {activeVideo.id !== "full" && (
            <button
              type="button"
              onClick={() => setSelectedVideoId("full")}
              className="rounded-[18px] px-4 py-3 flex items-center justify-between cursor-pointer border transition-all hover:opacity-90"
              style={{
                background: "var(--card)",
                borderColor: "color-mix(in oklab, var(--accent) 32%, var(--border))",
              }}
            >
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-xs font-bold">Full Overview Demo</span>
              </div>
              <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent)" }}>
                Play Overview →
              </span>
            </button>
          )}

          {DEMO_VIDEOS.slice(1).map((part) => {
            const isCurrent = activeVideo.id === part.id;
            const Icon = part.icon;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedVideoId(part.id)}
                className="relative overflow-hidden rounded-[22px] p-5 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between flex-1 group border backdrop-blur-xl"
                style={{
                  background: isCurrent
                    ? "color-mix(in oklab, var(--accent) 10%, var(--card))"
                    : "var(--card)",
                  borderColor: isCurrent ? "var(--accent)" : "var(--border)",
                  boxShadow: isCurrent
                    ? "0 16px 36px -18px color-mix(in oklab, var(--accent) 50%, transparent)"
                    : undefined,
                }}
              >
                <span
                  className="font-bricolage font-black absolute right-4 -bottom-2 text-7xl select-none pointer-events-none transition-opacity duration-300"
                  style={{
                    color: isCurrent ? "var(--accent)" : "var(--text)",
                    opacity: isCurrent ? 0.16 : 0.06,
                  }}
                >
                  {part.num}
                </span>

                <div className="relative z-10 space-y-1.5 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className="font-bricolage text-base sm:text-lg font-bold tracking-tight"
                      style={{ color: isCurrent ? "var(--accent)" : "var(--text)" }}
                    >
                      {part.title}
                    </h4>

                    {isCurrent ? (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-[0.06em] text-white flex items-center gap-1.5"
                        style={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>Playing</span>
                      </span>
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity"
                        style={{
                          background: "var(--card2)",
                          color: "var(--muted)",
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {part.role}
                  </p>
                  <p
                    className="text-[12px] leading-relaxed line-clamp-2 max-w-[85%]"
                    style={{ color: "var(--subtle)" }}
                  >
                    {part.desc}
                  </p>
                </div>

                <div
                  className="relative z-10 mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-mono"
                  style={{
                    borderColor: isCurrent
                      ? "color-mix(in oklab, var(--accent) 28%, transparent)"
                      : "var(--border)",
                  }}
                >
                  <span style={{ color: isCurrent ? "var(--accent)" : "var(--subtle)" }}>
                    SEGMENT {part.num}
                  </span>
                  <span
                    className="font-bold flex items-center gap-1"
                    style={{ color: isCurrent ? "var(--accent)" : "var(--text)" }}
                  >
                    <span>{isCurrent ? "Playing Video" : "Click to View"}</span>
                    <span>→</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
