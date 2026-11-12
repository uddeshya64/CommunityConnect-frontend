"use client";

import { useEffect, useState } from "react";
import { BARS, CHECKIN_NAMES, QR7, ROLES } from "./landingData";

const GENERATED_ARTIFACTS: ReadonlyArray<{ k: string; v: string; d: string }> = [
  { k: "Portal theme", v: "Hackathon · Custom Accent", d: "0.35s" },
  { k: "Ticket tiers", v: "Live ₹500 · Remote free", d: "0.65s" },
  { k: "Agenda", v: "12 sessions · 24 hrs", d: "0.95s" },
  { k: "Judging rubric", v: "4 criteria", d: "1.25s" },
];

const TEAM_MATCHES: ReadonlyArray<{ init: string; name: string; role: string; v: number; hue: number }> = [
  { init: "AK", name: "Ananya K.", role: "ML engineer · PyTorch", v: 96, hue: 255 },
  { init: "RM", name: "Rohan M.", role: "Frontend · React, Next.js", v: 91, hue: 230 },
  { init: "SD", name: "Sara D.", role: "Product designer · Figma", v: 87, hue: 30 },
];

const QUIZ_OPTIONS = ["useEffect", "useMemo", "useLayoutEffect", "useRef"] as const;

export default function RoleShowcase() {
  const [role, setRole] = useState(0);
  const [manual, setManual] = useState(false);

  // Volunteer QR scanner simulation
  const [scanState, setScanState] = useState<"idle" | "scanning" | "ok">("idle");
  const [checkedCount, setCheckedCount] = useState(1284);

  // Participant matcher + quiz simulation
  const [matchState, setMatchState] = useState<"idle" | "scanning" | "done">("idle");
  const [votes, setVotes] = useState<[number, number, number, number]>([38, 9, 21, 4]);
  const [votedIdx, setVotedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (manual) return;
    const iv = setInterval(() => {
      setRole((r) => (r + 1) % 3);
    }, 8000);
    return () => clearInterval(iv);
  }, [manual]);

  // Subtle background live votes on quiz
  useEffect(() => {
    const iv = setInterval(() => {
      setVotes((prev) => {
        const next: [number, number, number, number] = [...prev];
        const idx = Math.floor(Math.random() * 4);
        next[idx] += 1;
        return next;
      });
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  const runScan = () => {
    if (scanState === "scanning") return;
    setScanState("scanning");
    setTimeout(() => {
      setScanState("ok");
      setCheckedCount((c) => c + 1);
    }, 650);
  };

  const runMatch = () => {
    if (matchState === "scanning") return;
    setMatchState("scanning");
    setTimeout(() => {
      setMatchState("done");
    }, 1000);
  };

  const totalVotes = votes[0] + votes[1] + votes[2] + votes[3];
  const scanColor =
    scanState === "ok"
      ? "#10b981"
      : scanState === "scanning"
        ? "var(--accent)"
        : "var(--muted)";
  const scanShadow =
    scanState === "ok" ? "0 0 50px rgba(16, 185, 129, 0.3)" : "none";
  const scanLabel =
    scanState === "idle"
      ? "Ready to scan"
      : scanState === "scanning"
        ? "Verifying on-device…"
        : "✓ Verified in 0.31s";

  return (
    <section id="roles" className="max-w-[1280px] mx-auto px-6 py-[96px]">
      <div className="text-center">
        <h2
          className="font-bricolage text-[clamp(36px,5vw,68px)] leading-[1.02] tracking-tight font-extrabold mx-auto max-w-[880px] text-balance"
          style={{ color: "var(--text)" }}
        >
          Everyone in the room,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
            }}
          >
            on the same page.
          </span>
        </h2>
      </div>

      {/* Role Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12">
        {ROLES.map((r, i) => {
          const active = i === role;
          return (
            <button
              key={r.n}
              type="button"
              onClick={() => {
                setRole(i);
                setManual(true);
              }}
              className="text-left px-5 pt-4 pb-4 rounded-[20px] cursor-pointer flex flex-col gap-1.5 transition-all duration-300 border backdrop-blur-xl"
              style={{
                borderColor: active
                  ? "color-mix(in oklab, var(--accent) 45%, transparent)"
                  : "var(--border)",
                background: active
                  ? "color-mix(in oklab, var(--accent) 9%, var(--card))"
                  : "var(--card)",
                color: "var(--text)",
              }}
            >
              <div
                className="font-mono text-[11px] font-bold tracking-[0.12em] whitespace-nowrap"
                style={{ color: active ? "var(--accent)" : "var(--subtle)" }}
              >
                {r.n} · {r.role}
              </div>
              <div className="font-bricolage text-[clamp(16px,1.4vw,19px)] font-bold tracking-tight">
                {r.title}
              </div>
              <div
                className="h-[3px] rounded-full mt-2 overflow-hidden"
                style={{ background: "color-mix(in oklab, var(--text) 8%, transparent)" }}
              >
                {active && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                      width: manual ? "100%" : undefined,
                      animation: manual ? "none" : "etx-grow 8s linear forwards",
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Content Stage */}
      <div
        className="mt-4 rounded-[28px] p-5 sm:p-8 min-h-[480px] transition-all border backdrop-blur-xl"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
          boxShadow: "0 20px 50px -24px color-mix(in oklab, var(--accent) 20%, rgba(0,0,0,0.28))",
        }}
      >
        {role === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-start">
            <div>
              <div className="font-bricolage text-[clamp(26px,2.5vw,34px)] font-extrabold tracking-tight leading-[1.08]">
                Describe it.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  }}
                >
                  Eventrix builds it.
                </span>
              </div>
              <p
                className="text-[15px] leading-[1.6] mt-3 max-w-[430px]"
                style={{ color: "var(--muted)" }}
              >
                The AI assistant drafts your portal, ticket tiers and agenda from one sentence. Then
                watch conversion and capacity live.
              </p>

              <div
                className="mt-6 rounded-2xl p-4 font-mono text-[13px] border"
                style={{
                  background: "var(--card2)",
                  borderColor: "var(--border)",
                }}
              >
                <div className="text-[10.5px] font-bold tracking-[0.12em]" style={{ color: "var(--subtle)" }}>
                  PROMPT
                </div>
                <div className="mt-2 flex gap-2 items-start sm:items-center" style={{ color: "var(--text)" }}>
                  <span style={{ color: "var(--accent)" }}>›</span>
                  <span
                    className="inline-block overflow-hidden whitespace-normal sm:whitespace-nowrap max-w-full"
                    style={{
                      borderRight: "2px solid var(--accent)",
                      animation: "etx-type 2.2s steps(44) forwards, etx-caret 0.8s step-end infinite",
                    }}
                  >
                    24-hr AI hackathon, Bengaluru, 200 seats
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-3">
                {GENERATED_ARTIFACTS.map((g) => (
                  <div
                    key={g.k}
                    className="flex justify-between items-center gap-3 px-4 py-3 rounded-xl text-[14px] border opacity-0"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                      animation: `etx-fadeup 0.5s ${g.d} forwards`,
                    }}
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <span style={{ color: "var(--accent)" }}>✓</span>
                      {g.k}
                    </span>
                    <span
                      className="font-mono text-[12px] text-right"
                      style={{ color: "var(--subtle)" }}
                    >
                      {g.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[22px] p-6 border"
              style={{
                background: "var(--card2)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between items-baseline gap-3 flex-wrap">
                <div>
                  <div className="font-mono text-[11px] font-bold tracking-[0.1em]" style={{ color: "var(--subtle)" }}>
                    REGISTRATIONS · 14 DAYS
                  </div>
                  <div className="font-bricolage text-[48px] font-extrabold tracking-tight mt-1.5 leading-none">
                    142
                    <span className="text-[20px] font-semibold" style={{ color: "var(--subtle)" }}>
                      {" "}
                      / 200
                    </span>
                  </div>
                </div>
                <div className="font-mono text-[12px] font-bold" style={{ color: "var(--accent)" }}>
                  ▲ 38% WoW
                </div>
              </div>

              <div className="flex items-end gap-1.5 h-[180px] mt-6">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[6px] rounded-b-[2px] transition-all duration-500"
                    style={{
                      height: `${h}%`,
                      background:
                        i === BARS.length - 1
                          ? "linear-gradient(180deg, var(--accent), var(--accent2))"
                          : "color-mix(in oklab, var(--text) 14%, transparent)",
                    }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-4 sm:mt-5">
                {[
                  { label: "CONVERSION", val: "31.4%" },
                  { label: "REVENUE", val: "₹71k" },
                  { label: "STAFF", val: "18" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-2.5 sm:p-3.5 rounded-xl border min-w-0"
                    style={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.08em] sm:tracking-[0.1em] truncate" style={{ color: "var(--subtle)" }}>
                      {stat.label}
                    </div>
                    <div className="font-bricolage text-[17px] sm:text-[22px] font-extrabold mt-1 truncate">{stat.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {role === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-center">
            <div>
              <div className="font-bricolage text-[clamp(26px,2.5vw,34px)] font-extrabold tracking-tight leading-[1.08]">
                Gate opens.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  }}
                >
                  Queue doesn&apos;t.
                </span>
              </div>
              <p
                className="text-[15px] leading-[1.6] mt-3 max-w-[430px]"
                style={{ color: "var(--muted)" }}
              >
                Encrypted passes verify on-device in under a second and sync when the network
                returns. Try the scanner.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                {[0, 1, 2, 3].map((k) => (
                  <div
                    key={k}
                    className="flex justify-between items-center gap-3 px-4 py-3 rounded-xl border text-[14px]"
                    style={{
                      background: "var(--card2)",
                      borderColor: "var(--border)",
                      opacity: 1 - k * 0.18,
                    }}
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <span
                        className="w-[7px] h-[7px] rounded-full"
                        style={{ background: "#10b981" }}
                      />
                      {CHECKIN_NAMES[(checkedCount - k) % CHECKIN_NAMES.length]}
                    </span>
                    <span className="font-mono text-[12px]" style={{ color: "var(--subtle)" }}>
                      Gate B · {k === 0 ? "now" : `${k * 2}m ago`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex flex-col items-center gap-4 sm:gap-5 p-5 sm:p-7 rounded-[22px] border"
              style={{
                background: "var(--card2)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="flex justify-between w-full font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.1em]"
                style={{ color: "var(--subtle)" }}
              >
                <span>GATE B · DESK 2</span>
                <span style={{ color: "var(--accent)" }}>● OFFLINE MODE</span>
              </div>
              <div
                className="relative w-[172px] h-[172px] sm:w-[196px] sm:h-[196px] rounded-[24px] p-4 sm:p-[22px] grid grid-cols-7 gap-1 transition-all duration-300"
                style={{
                  background: "var(--card)",
                  border: `2px solid ${scanColor}`,
                  boxShadow: scanShadow,
                }}
              >
                {QR7.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-[2px] transition-colors duration-300"
                    style={{
                      background: q
                        ? scanState === "ok"
                          ? "#10b981"
                          : "var(--text)"
                        : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="font-mono text-[13px] font-bold" style={{ color: scanColor }}>
                {scanLabel}
              </div>
              <button
                type="button"
                onClick={runScan}
                className="w-full h-11 rounded-xl text-[14px] font-bold text-white cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  boxShadow: "0 10px 24px -8px color-mix(in oklab, var(--accent) 55%, transparent)",
                }}
              >
                Scan next pass
              </button>
              <div className="font-mono text-[12px]" style={{ color: "var(--subtle)" }}>
                {checkedCount.toLocaleString("en-IN")} checked in today
              </div>
            </div>
          </div>
        )}

        {role === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Matchmaker Card */}
            <div
              className="rounded-[22px] p-6 border flex flex-col gap-4"
              style={{
                background: "var(--card2)",
                borderColor: "var(--border)",
              }}
            >
              <div className="font-bricolage text-[clamp(22px,2.2vw,30px)] font-extrabold tracking-tight leading-[1.1]">
                Find your team{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  }}
                >
                  before kickoff.
                </span>
              </div>
              <div className="text-[14px] leading-[1.55]" style={{ color: "var(--muted)" }}>
                Matching reads your GitHub stack and finds complementary skills — 94% match accuracy.
              </div>
              {TEAM_MATCHES.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl border"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center text-[13px] font-bold shrink-0 text-white"
                    style={{
                      background: `oklch(0.58 0.17 ${m.hue})`,
                    }}
                  >
                    {m.init}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 text-[15px] font-semibold">
                      <span>{m.name}</span>
                      <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>
                        {matchState === "done"
                          ? `${m.v}%`
                          : matchState === "scanning"
                            ? "…"
                            : "—"}
                      </span>
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--subtle)" }}>
                      {m.role}
                    </div>
                    <div
                      className="h-[3px] rounded-full mt-2 overflow-hidden"
                      style={{ background: "color-mix(in oklab, var(--text) 8%, transparent)" }}
                    >
                      <div
                        className="h-full transition-all duration-1000"
                        style={{
                          width: matchState === "done" ? `${m.v}%` : "0%",
                          background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={runMatch}
                className="h-11 rounded-xl border text-[14px] font-bold cursor-pointer transition-all hover:opacity-90"
                style={{
                  borderColor: "color-mix(in oklab, var(--accent) 36%, var(--border))",
                  background: "color-mix(in oklab, var(--accent) 10%, var(--card))",
                  color: "var(--accent)",
                }}
              >
                {matchState === "idle"
                  ? "Find my teammates"
                  : matchState === "scanning"
                    ? "Reading GitHub stacks…"
                    : "Re-run match"}
              </button>
            </div>

            {/* Live Quiz Card */}
            <div
              className="rounded-[22px] p-6 border flex flex-col gap-3.5"
              style={{
                background: "var(--card2)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between items-center font-mono text-[11px] font-bold tracking-[0.1em]">
                <span style={{ color: "var(--subtle)" }}>LIVE QUIZ · ROUND 3</span>
                <span className="flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--accent)" }}
                  />
                  {totalVotes} PLAYING
                </span>
              </div>
              <div className="font-bricolage text-[clamp(20px,2vw,26px)] font-extrabold tracking-tight leading-[1.2]">
                Which React hook runs after every render by default?
              </div>
              {QUIZ_OPTIONS.map((label, i) => {
                const pct = Math.round((votes[i] / totalVotes) * 100);
                const shown = votedIdx !== null;
                const isCorrect = i === 0 && shown;
                const fill = isCorrect
                  ? "rgba(16, 185, 129, 0.2)"
                  : "color-mix(in oklab, var(--accent) 14%, transparent)";
                const border = isCorrect
                  ? "rgba(16, 185, 129, 0.65)"
                  : votedIdx === i
                    ? "var(--accent)"
                    : "var(--border)";
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (votedIdx !== null) return;
                      setVotes((prev) => {
                        const next: [number, number, number, number] = [...prev];
                        next[i] += 1;
                        return next;
                      });
                      setVotedIdx(i);
                    }}
                    className="relative overflow-hidden text-left px-4 py-3.5 rounded-xl border font-mono text-[14px] cursor-pointer"
                    style={{
                      borderColor: border,
                      background: "var(--card)",
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 transition-all duration-500"
                      style={{ width: shown ? `${pct}%` : "0%", background: fill }}
                    />
                    <div className="relative flex justify-between font-medium">
                      <span>{label}</span>
                      <span style={{ color: "var(--muted)" }}>{shown ? `${pct}%` : ""}</span>
                    </div>
                  </button>
                );
              })}
              <div className="font-mono text-[12px]" style={{ color: "var(--subtle)" }}>
                {votedIdx === null
                  ? "Tap an answer — results stream in live."
                  : votedIdx === 0
                    ? "Correct · +50 points · Rank #12"
                    : "Not quite — it's useEffect"}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
