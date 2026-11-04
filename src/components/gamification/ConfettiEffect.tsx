"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
  isCircle: boolean;
}

const COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#eab308"
];

export default function ConfettiEffect({ count = 60 }: { count?: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const generated: ConfettiPiece[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage across screen
      y: -10 - Math.random() * 20, // start above view
      size: 6 + Math.random() * 8, // 6px to 14px
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2,
      isCircle: Math.random() > 0.6
    }));
    setPieces(generated);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute block animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: p.isCircle ? `${p.size}px` : `${p.size * 1.6}px`,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            animationIterationCount: "infinite"
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          75% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(110vh) rotate(720deg) scale(0.6);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation-name: confettiFall;
        }
      `}</style>
    </div>
  );
}

