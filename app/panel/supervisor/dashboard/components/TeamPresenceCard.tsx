"use client";

import { teamEmoji } from "@/lib/team-emoji";

interface TeamPresenceCardProps {
  label: string;
  isPresent: boolean;
  onToggle: () => void;
}

export default function TeamPresenceCard({
  label,
  isPresent,
  onToggle,
}: TeamPresenceCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex flex-col items-center justify-between rounded-[2.2rem] border-2 p-6 text-center transition-all duration-300 active:scale-[0.95] min-h-[180px] shadow-[0_10px_25px_rgba(16,32,76,0.02)] ${
        isPresent
          ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 backdrop-blur-md shadow-[0_12px_30px_rgba(16,185,129,0.15)]"
          : "border-white/60 bg-white/40 backdrop-blur-md text-[#10204c] hover:border-[#10204c]/20"
      }`}
    >
      {/* Nombre del Club (con su emoji hardcodeado si lo tiene) */}
      <div className="flex-1 flex flex-col items-center justify-center w-full gap-1">
        {teamEmoji(label) && <span className="text-4xl leading-none">{teamEmoji(label)}</span>}
        <span className="text-2xl font-light tracking-wide leading-tight line-clamp-2 px-1">
          {label}
        </span>
      </div>
      
      {/* Botón de estado: Más grande pero con texto más delgado (font-medium) */}
      <span 
        className={`mt-4 rounded-full px-6 py-2.5 text-xs font-medium border tracking-wide transition-all duration-300 shadow-xs ${
          isPresent 
            ? "bg-emerald-500 text-white border-emerald-500 shadow-md" 
            : "bg-white text-[#10204c] border-[#10204c]/10"
        }`}
      >
        {isPresent ? "Presente" : "Marcar presente"}
      </span>
    </button>
  );
}