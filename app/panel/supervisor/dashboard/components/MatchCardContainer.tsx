"use client";

import { useState } from "react";

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type MatchStatus = "upcoming" | "live" | "finished";

export type MatchCard = {
  id: string;
  time: string;
  phase: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  readyNow?: boolean;
};

type MatchCardProps = {
  match: MatchCard;
  onAction?: () => void;
};

// ==========================================
// COMPONENTE PRINCIPAL (CONTROLADOR)
// ==========================================
export default function MatchCardContainer({ match, onAction }: MatchCardProps) {
  if (match.status === "live") {
    return <LiveMatchCard match={match} onAction={onAction} />;
  }

  if (match.status === "finished") {
    return <FinishedMatchCard match={match} />;
  }

  return <UpcomingMatchCard match={match} />;
}

// ==========================================
// SUBCOMPONENTE 1: PARTIDO EN VIVO (MÁXIMA PRIORIDAD VISUAL)
// ==========================================
function LiveMatchCard({ match, onAction }: MatchCardProps) {
  return (
    <button
      type="button"
      onClick={onAction}
      className="w-full text-left bg-[var(--card-strong)] border-2 border-rose-500/30 rounded-3xl p-5 shadow-[0_12px_30px_rgba(244,63,94,0.08),_0_2px_8px_rgba(244,63,94,0.02)] transition-all duration-300 hover:shadow-[0_16px_36px_rgba(244,63,94,0.15)] hover:border-rose-500 active:scale-[0.99] group relative overflow-hidden mb-6 animate-pulse-[duration:3s]"
    >
      {/* Fondo con destello animado de transmisión en vivo */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-[var(--foreground)]/50 tracking-wide">
            {match.phase}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 animate-spin-[duration:4s]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>En curso desde {match.time}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-extrabold shadow-md shadow-rose-500/30 tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Vivo</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 bg-rose-500/[0.02] border border-rose-500/10 rounded-2xl px-4 py-3 relative z-10 transition-colors group-hover:bg-rose-500/[0.04]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-rose-600 border border-rose-500/20 group-hover:scale-105 transition-transform duration-300">
            {match.homeTeam.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-black text-[var(--foreground)] truncate">
            {match.homeTeam}
          </span>
        </div>

        <span className="text-xs font-bold text-rose-500/40 px-2 select-none animate-pulse">VS</span>

        <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
          <span className="text-sm font-black text-[var(--foreground)] truncate">
            {match.awayTeam}
          </span>
          <div className="w-10 h-10 rounded-xl bg-rose-500/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-rose-600 border border-rose-500/20 group-hover:scale-105 transition-transform duration-300">
            {match.awayTeam.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-dashed border-rose-500/20 flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors duration-200">
        <span>Toca para abrir mesa de arbitraje</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 duration-200">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  );
}

// ==========================================
// SUBCOMPONENTE 2: PARTIDO FINALIZADO (COMPACTO Y LIMPIO)
// ==========================================
function FinishedMatchCard({ match }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const mockMatch = {
    ...match,
    homeScore: 2,
    awayScore: 1,
    events: [
      { kind: "goal", team: "home", playerName: "Carlos Mendoza", minute: 14 },
      { kind: "yellow", team: "home", playerName: "Marcos Roca", minute: 30 },
      { kind: "goal", team: "away", playerName: "Luis Andrés", minute: 42 },
      { kind: "goal", team: "home", playerName: "Andrés Villa", minute: 78 },
      { kind: "red", team: "away", playerName: "Juan Castro", minute: 85 }
    ]
  };

  const renderIconoEvento = (kind: string) => {
    switch (kind) {
      case "goal": return "⚽";
      case "yellow": return "🟨";
      case "red": return "🟥";
      default: return "";
    }
  };

  return (
    <div className="w-full bg-[var(--card-strong)] border border-[var(--border)] rounded-3xl p-5 shadow-[0_4px_20px_rgba(16,32,76,0.02)] opacity-95 hover:opacity-100 transition-all duration-300">
      
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-[var(--foreground)]/50">
            {mockMatch.phase}
          </span>
          <p className="text-[10px] text-[var(--foreground)]/40 font-medium">
            Concluido · Programado {mockMatch.time}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-3 py-1 rounded-full text-xs font-bold">
            Finalizado
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 text-[var(--foreground)]/40 hover:text-[var(--primary)] hover:bg-[var(--background)] rounded-full transition-all duration-200 relative z-30"
            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 items-center justify-between my-2 relative z-10">
        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-[var(--foreground)]/[0.02] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--primary)] border border-[var(--border)]">
            {mockMatch.homeTeam.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-[var(--foreground)]/80 truncate max-w-full px-1">
            {mockMatch.homeTeam}
          </span>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="font-secondary-modak flex items-baseline justify-center gap-1 text-4xl font-black text-[var(--primary)] tracking-tight tabular-nums">
            <span>{mockMatch.homeScore}</span>
            <span className="text-slate-300 font-light text-2xl -translate-y-0.5">:</span>
            <span>{mockMatch.awayScore}</span>
          </div>
        </div>

        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-[var(--foreground)]/[0.02] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--primary)] border border-[var(--border)]">
            {mockMatch.awayTeam.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-[var(--foreground)]/80 truncate max-w-full px-1">
            {mockMatch.awayTeam}
          </span>
        </div>
      </div>

      {isExpanded && mockMatch.events.length > 0 && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="border-t border-[var(--border)] mt-4 pt-4 text-[11px] text-[var(--foreground)]/60 space-y-2.5 animate-select-dropdown"
        >
          {mockMatch.events.map((evento, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-4">
              <div className="text-left pl-1 min-h-[16px]">
                {evento.team === "home" && (
                  <span className="font-medium text-[var(--foreground)]">
                    {renderIconoEvento(evento.kind)} {evento.playerName} ({evento.minute}')
                  </span>
                )}
              </div>
              <div className="text-right pr-1 min-h-[16px]">
                {evento.team === "away" && (
                  <span className="font-medium text-[var(--foreground)]">
                    {evento.playerName} ({evento.minute}') {renderIconoEvento(evento.kind)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENTE 3: PARTIDO PRÓXIMO (NUEVO ESTILO AMARILLO/DORADO)
// ==========================================
function UpcomingMatchCard({ match }: MatchCardProps) {
  return (
    <div className="w-full bg-[var(--card-strong)] border border-[var(--border)] hover:border-amber-300 rounded-3xl p-5 shadow-[0_4px_20px_rgba(16,32,76,0.02)] hover:shadow-[0_8px_24px_rgba(217,119,6,0.05)] transition-all duration-300 group">
      
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-[var(--foreground)]/50">
            {match.phase}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-500/5 px-1.5 py-0.5 rounded-md w-max">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span>Prog. {match.time}</span>
          </div>
        </div>

        <span className="bg-amber-50 text-amber-600 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm shadow-amber-500/5">
          Próximo
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 bg-[var(--background)]/40 border border-[var(--border)] group-hover:border-amber-200/50 rounded-2xl px-4 py-3 relative z-10 transition-colors duration-300">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--primary)] border border-[var(--border)] group-hover:bg-amber-500/5 group-hover:border-amber-200 transition-colors duration-300">
            {match.homeTeam.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-bold text-[var(--foreground)]/80 truncate">
            {match.homeTeam}
          </span>
        </div>

        <span className="text-xs font-semibold text-[var(--foreground)]/20 px-2 select-none group-hover:text-amber-500/40 transition-colors">vs</span>

        <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
          <span className="text-sm font-bold text-[var(--foreground)]/80 truncate">
            {match.awayTeam}
          </span>
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 flex-shrink-0 flex items-center justify-center text-xs font-bold text-[var(--primary)] border border-[var(--border)] group-hover:bg-amber-500/5 group-hover:border-amber-200 transition-colors duration-300">
            {match.awayTeam.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}