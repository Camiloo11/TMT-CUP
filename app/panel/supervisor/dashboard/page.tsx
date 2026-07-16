"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";
import MatchCardContainer from "./components/MatchCardContainer";
import TeamPresenceCard from './components/TeamPresenceCard'
import ControlAlertPopup from './components/ControlAlertPopup'

type View = "dashboard" | "waiting" | "live" | "summary";
type MatchStatus = "upcoming" | "live" | "finished";
type Filter = "upcoming" | "finished";
type TeamSide = "home" | "away";
type EventKind = "goal" | "yellow" | "red";
type SupervisorName = "Ana Beltrán" | "Mario Silva" | "Sofía Ramos" | "Diego Costa";

type MatchCard = {
  id: string;
  time: string;
  phase: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  readyNow?: boolean;
};

type Player = {
  id: string;
  name: string;
};

type LiveEvent = {
  id: string;
  playerId: string;
  team: TeamSide;
  kind: EventKind;
  minute: number;
};

type Incident = {
  id: string;
  label: string;
  note: string;
};

type Report = {
  title: string;
  subtitle: string;
  score: string;
  goals: Array<{ label: string; team: string }>;
  cards: Array<{ label: string; team: string }>;
  incidents: Incident[];
  walkover?: string;
};

const matches: MatchCard[] = [
  { id: "m1", time: "08:00", phase: "Grupo A - Jornada 1", homeTeam: "Raptors FC", awayTeam: "North Stars", status: "finished" },
  { id: "m2", time: "08:32", phase: "Grupo A - Jornada 1", homeTeam: "Blue Tigers", awayTeam: "Iron United", status: "upcoming", readyNow: true },
  { id: "m3", time: "09:00", phase: "Grupo B - Jornada 1", homeTeam: "Red Lions", awayTeam: "Storm Club", status: "live" },
];

const homePlayers: Player[] = [
  { id: "h1", name: "Lucas Ferreira" },
  { id: "h2", name: "Mateo Silva" },
  { id: "h3", name: "Andrés Ramos" },
  { id: "h4", name: "Bruno Costa" },
  { id: "h5", name: "Sergio Luna" },
  { id: "h6", name: "Thiago Pérez" },
  { id: "h7", name: "Diego Mora" },
  { id: "h8", name: "Jonas Vidal" },
];

const awayPlayers: Player[] = [
  { id: "a1", name: "Carlos Mendes" },
  { id: "a2", name: "Rafael Torres" },
  { id: "a3", name: "Nicolás Fuentes" },
  { id: "a4", name: "Marcos Vidal" },
  { id: "a5", name: "Esteban Rojas" },
  { id: "a6", name: "Pablo Herrera" },
  { id: "a7", name: "Kevin Alves" },
  { id: "a8", name: "Oliver Núñez" },
];

const matchDuration = 0.1 * 60; // 1 minuto para pruebas rápidas
const waitingDuration = 6 * 60;

function createEmptyEvents() {
  return { home: {}, away: {} } as Record<TeamSide, Record<string, LiveEvent[]>>;
}

function createEmptyPresence() {
  return { home: false, away: false };
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function isPlayerSentOff(events: Record<string, LiveEvent[]>, playerId: string) {
  return events[playerId]?.some((event) => event.kind === "red") ?? false;
}

function getLatestEvent(events: Record<string, LiveEvent[]>, playerId: string) {
  const playerEvents = events[playerId] ?? [];
  return playerEvents[playerEvents.length - 1] ?? null;
}

function countGoals(events: Record<TeamSide, Record<string, LiveEvent[]>>) {
  const countForSide = (side: TeamSide) =>
    Object.values(events[side]).reduce((total, playerEvents) => {
      return total + playerEvents.filter((event) => event.kind === "goal").length;
    }, 0);

  return { home: countForSide("home"), away: countForSide("away") };
}

function buildReport(params: {
  match: MatchCard;
  score: { home: number; away: number };
  events: Record<TeamSide, Record<string, LiveEvent[]>>;
  incidents: Incident[];
  walkover?: string;
}) {
  const goals = [
    ...Object.entries(params.events.home).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "goal")
        .map(() => {
          const player = homePlayers.find((entry) => entry.id === playerId);
          return { label: player?.name ?? "Jugador local", team: params.match.homeTeam };
        }),
    ),
    ...Object.entries(params.events.away).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "goal")
        .map(() => {
          const player = awayPlayers.find((entry) => entry.id === playerId);
          return { label: player?.name ?? "Jugador visitante", team: params.match.awayTeam };
        }),
    ),
  ];

  const cards = [
    ...Object.entries(params.events.home).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "yellow" || event.kind === "red")
        .map((event) => {
          const player = homePlayers.find((entry) => entry.id === playerId);
          return { label: `${player?.name ?? "Jugador local"} · ${event.kind === "yellow" ? "Amarilla" : "Roja"}`, team: params.match.homeTeam };
        }),
    ),
    ...Object.entries(params.events.away).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "yellow" || event.kind === "red")
        .map((event) => {
          const player = awayPlayers.find((entry) => entry.id === playerId);
          return { label: `${player?.name ?? "Jugador visitante"} · ${event.kind === "yellow" ? "Amarilla" : "Roja"}`, team: params.match.awayTeam };
        }),
    ),
  ];

  return {
    title: `${params.match.homeTeam} vs ${params.match.awayTeam}`,
    subtitle: `${params.match.phase} · ${params.match.time}`,
    score: `${params.score.home} - ${params.score.away}`,
    goals,
    cards,
    incidents: params.incidents,
    walkover: params.walkover,
  } satisfies Report;
}

export default function SupervisorPage() {
  const [view, setView] = useState<View>("dashboard");
  const [supervisor] = useState<SupervisorName>("Ana Beltrán");
  const [activeFilter, setActiveFilter] = useState<Filter>("upcoming");
  const [selectedMatch, setSelectedMatch] = useState<MatchCard>(matches[2]);
  const [waitingSeconds, setWaitingSeconds] = useState(waitingDuration);
  const [presence, setPresence] = useState(createEmptyPresence);
  const [liveSeconds, setLiveSeconds] = useState(matchDuration);
  const [paused, setPaused] = useState(false);
  const [, setExtraTimeUnlocked] = useState(false);
  const [eventsByTeam, setEventsByTeam] = useState(createEmptyEvents);
  const [openEventMenu, setOpenEventMenu] = useState<{ team: TeamSide; playerId: string } | null>(null);
  const [undoTarget, setUndoTarget] = useState<{ team: TeamSide; playerId: string; eventId: string } | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const score = countGoals(eventsByTeam);

  useEffect(() => {
    if (view !== "waiting" || waitingSeconds === 0) return;
    const timer = window.setInterval(() => {
      setWaitingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, waitingSeconds]);

  useEffect(() => {
    if (view !== "live" || paused || liveSeconds === 0) return;
    const timer = window.setInterval(() => {
      setLiveSeconds((current) => {
        if (current <= 1) {
          setExtraTimeUnlocked(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, paused, liveSeconds]);

  const liveMatch = matches.find((m) => m.status === "live");
  const upcomingMatch = matches.find((m) => m.status === "upcoming");
  const finishedMatch = matches.find((m) => m.status === "finished");

  const presenceCount = Number(presence.home) + Number(presence.away);
  const warningText =
    waitingSeconds > 240
      ? { text: "Esperando a los equipos... (Sin sanción)", tone: "text-slate-700" }
      : waitingSeconds > 120
        ? { text: "ALERTA: El equipo tardío inicia con 1 jugador menos", tone: "text-[#f7c600]" }
        : { text: "ALERTA: El equipo tardío inicia con 2 jugadores menos y un 0-1 en contra", tone: "text-[#f83636]" };

  const waitingActionLabel =
    waitingSeconds === 0
      ? presenceCount === 0
        ? "Declarar doble walkover"
        : presenceCount === 1
          ? "Declarar walkover completo"
          : "Equipos en cancha"
      : "Equipos en cancha";

  function beginMatchLifecycle(match: MatchCard) {
    if (match.status !== "live") {
      alert("Solo se puede ingresar a la mesa de control de partidos en vivo.");
      return;
    }
    setSelectedMatch(match);
    setWaitingSeconds(waitingDuration);
    setPresence(createEmptyPresence());
    setLiveSeconds(matchDuration);
    setPaused(false);
    setExtraTimeUnlocked(false);
    setEventsByTeam(createEmptyEvents());
    setOpenEventMenu(null);
    setUndoTarget(null);
    setIncidentOpen(false);
    setIncidentDraft("");
    setIncidents([]);
    setReport(null);
    setShowSuccessPopup(false);
    setView("waiting");
  }

  function togglePresence(team: TeamSide) {
    setPresence((current) => ({ ...current, [team]: !current[team] }));
  }

  function triggerManualFinish() {
    setReport(
      buildReport({
        match: selectedMatch,
        score,
        events: eventsByTeam,
        incidents,
      })
    );
    setView("summary");
  }

  function handleSaveAndSend() {
    // Activa la visualización del popup de confirmación de éxito
    setShowSuccessPopup(true);
  }

  function handleReturnToDashboard() {
    // Restablece la vista y cierra el popup
    setShowSuccessPopup(false);
    setView("dashboard");
  }

  function registerEvent(team: TeamSide, playerId: string, kind: EventKind) {
    const event: LiveEvent = {
      id: `${playerId}-${kind}-${Date.now()}`,
      playerId,
      team,
      kind,
      minute: Math.max(1, 26 - Math.ceil(liveSeconds / 60)),
    };

    setEventsByTeam((current) => ({
      ...current,
      [team]: {
        ...current[team],
        [playerId]: [...(current[team][playerId] ?? []), event],
      },
    }));

    setUndoTarget({ team, playerId, eventId: event.id });
    setOpenEventMenu(null);
  }

  function submitIncident() {
    if (!incidentDraft.trim()) return;

    setIncidents((current) => [
      ...current,
      {
        id: `incident-${Date.now()}`,
        label: "Nota rápida del incidente",
        note: incidentDraft.trim(),
      },
    ]);
    setIncidentDraft("");
    setIncidentOpen(false);
  }

  function advanceWaiting() {
    if (waitingSeconds === 0 && presenceCount < 2) {
      const walkover = presenceCount === 0 ? "Double walkover" : "Full walkover";
      setReport(
        buildReport({
          match: selectedMatch,
          score,
          events: eventsByTeam,
          incidents,
          walkover,
        }),
      );
      setView("summary");
      return;
    }
    setView("live");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <main className="flex-1 px-4 py-5 text-[15px] text-slate-800 sm:px-6 sm:py-6 md:px-8">
        <div className="mx-auto flex w-full flex-col gap-5 sm:gap-6">

          {/* VISTA DEL DASHBOARD / PANEL PRINCIPAL */}
          {view === "dashboard" && (
            <section className="flex flex-1 flex-col gap-6 w-full">
              <header className="sticky top-0 z-50 -mx-4 -mt-5 w-[calc(100%+2rem)] rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] overflow-hidden font-poppins sm:-mx-6 sm:-mt-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)]">
                <div className="mx-auto w-full px-4 pt-5 pb-4 flex flex-col gap-4 sm:gap-5 sm:px-6 md:px-8">
                  <div className="flex items-center justify-between w-full gap-1">
                    <div className="flex flex-1 min-w-0 items-center justify-start">
                      <NextImage
                        src="/assets/Logo_tMtCup.svg"
                        alt="Logo oficial TMT CUP"
                        width={85}
                        height={85}
                        className="h-14 w-14 object-contain drop-shadow-sm sm:h-[72px] sm:w-[72px] md:h-[85px] md:w-[85px]"
                        priority
                      />
                    </div>
                    <div className="flex shrink-0 flex-col items-center justify-center font-poppins px-1">
                      <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#10204c] shadow-xl sm:mb-1.5 sm:h-20 sm:w-20">
                        <span className="font-secondary-modak mt-1 text-4xl leading-none text-white sm:text-5xl">
                          1
                        </span>
                      </div>
                      <span className="text-[13px] font-medium leading-none tracking-wide text-[#10204c] sm:text-[15px]">
                        Cancha
                      </span>
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col items-end justify-center pl-1 text-right sm:pl-2">
                      <span className="mb-0.5 truncate text-[10px] font-bold leading-none text-[#233c97]/50">
                        Supervisor
                      </span>
                      <h3 className="w-full truncate text-sm font-black leading-tight text-[#10204c] sm:text-base">
                        {supervisor || "Ana Beltrán"}
                      </h3>
                      <p className="mt-1 w-full truncate text-[10px] font-medium text-[#10204c]/60 sm:text-[11px]">
                        <span className="font-bold text-[#233c97]/70">Árb:</span> Carlos Gómez
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-[1px] bg-[#10204c]/5" />
                  <div className="w-full flex justify-center">
                    <nav className="w-full max-w-[210px] flex p-1 bg-[#10204c]/[0.05] rounded-full shadow-[inset_0_2px_4px_rgba(16,32,76,0.04)] border border-[#10204c]/[0.01] items-center px-1">
                      {["Próximos", "Finalizados"].map((tabLabel) => {
                        const tabValue = tabLabel === "Próximos" ? "upcoming" : "finished";
                        const isActive = activeFilter === tabValue;
                        return (
                          <button
                            key={tabLabel}
                            type="button"
                            onClick={() => setActiveFilter(tabValue)}
                            className={`
                              flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 select-none outline-none text-center whitespace-nowrap
                              ${isActive
                                ? "bg-white text-[#233c97] shadow-[0_3px_8px_rgba(16,32,76,0.08)] border border-white font-extrabold scale-[1.01]"
                                : "text-[#10204c]/50 hover:text-[#10204c]/80"
                              }
                              active:scale-[0.97] transition-transform
                            `}
                          >
                            {tabLabel}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </header>

              {liveMatch ? (
                <MatchCardContainer
                  match={liveMatch}
                  onAction={() => beginMatchLifecycle(liveMatch)}
                />
              ) : (
                <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)]">
                  No hay ningún partido en vivo en juego en este momento.
                </div>
              )}

              <div className="flex-1 overflow-hidden relative pb-6">
                <div 
                  className="flex w-[200%] transition-transform duration-500 ease-in-out"
                  style={{
                    transform: activeFilter === "upcoming" ? "translateX(0%)" : "translateX(-50%)"
                  }}
                >
                  <div className="w-1/2 pr-2 shrink-0">
                    <div className="space-y-4">
                      {upcomingMatch ? (
                        <MatchCardContainer match={upcomingMatch} />
                      ) : (
                        <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)]">
                          No hay partidos próximos para mostrar.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-1/2 pl-2 shrink-0">
                    <div className="space-y-4">
                      {finishedMatch ? (
                        <MatchCardContainer match={finishedMatch} />
                      ) : (
                        <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)]">
                          No hay partidos finalizados para mostrar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* VISTA MODO DE ESPERA */}
          {view === "waiting" && (
            <section className="flex flex-1 flex-col gap-6 font-poppins w-full relative min-h-[75vh] px-1 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 select-none">
                <NextImage
                  src="/assets/Logo_tMtCup.svg"
                  alt="Fondo oficial TMT CUP"
                  width={320}
                  height={320}
                  className="object-contain max-w-[80vw]"
                  priority
                />
              </div>

              <div className="z-10 rounded-[2.5rem] bg-white/45 backdrop-blur-md border-2 border-white/40 p-4 shadow-[0_12px_35px_rgba(16,32,76,0.12)] text-center relative overflow-hidden sm:p-6">
                <div className="flex items-center justify-between w-full mb-3 gap-2">
                  <div className="bg-[#10204c] text-white text-[11px] font-weight px-3 py-1 rounded-full shadow-xs tracking-wide whitespace-nowrap sm:text-[12px]">
                    Prog: {selectedMatch.time}
                  </div>
                  <span className="text-[11px] font-weight tracking-wider text-[#10204c]/50 bg-[#10204c]/5 px-2.5 py-1 rounded-full truncate sm:text-[12px]">
                    {selectedMatch.phase}
                  </span>
                </div>
                <div className="py-2">
                  <div className="font-secondary-modak text-6xl text-[#10204c] tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(16,32,76,0.06)] min-[375px]:text-7xl min-[425px]:text-8xl">
                    {formatClock(waitingSeconds)}
                  </div>
                </div>
              </div>

              <div className="z-10 grid grid-cols-2 gap-4">
                {([
                  { key: "home", label: selectedMatch.homeTeam },
                  { key: "away", label: selectedMatch.awayTeam },
                ] as const).map((team) => (
                  <TeamPresenceCard
                    key={team.key}
                    label={team.label}
                    isPresent={presence[team.key]}
                    onToggle={() => togglePresence(team.key)}
                  />
                ))}
              </div>

              {warningText.text && (
                <ControlAlertPopup
                  text={warningText.text}
                  tone={warningText.tone}
                  isCritical={waitingSeconds === 0 && presenceCount < 2}
                  homeTeam={selectedMatch.homeTeam}
                  awayTeam={selectedMatch.awayTeam}
                  presence={presence}
                />
              )}

              <div className="mt-auto z-10 w-full flex justify-center px-1 py-4">
                <button
                  type="button"
                  onClick={advanceWaiting}
                  className={`w-fit h-[3.75rem] rounded-full px-8 text-base font-black text-white shadow-lg transition-all duration-200 active:scale-[0.98] border border-white/20 flex items-center justify-center ${waitingSeconds === 0 && presenceCount < 2
                    ? "bg-red-600 shadow-red-600/20"
                    : "bg-[#E11D48] shadow-[#E11D48]/20"
                    }`}
                >
                  {waitingActionLabel}
                </button>
              </div>
            </section>
          )}

          {/* VISTA PARTIDO EN VIVO */}
          {view === "live" && (
            <section className="flex flex-1 flex-col gap-6 font-poppins w-full relative min-h-[75vh] px-2 py-4 pb-24">
              <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 select-none">
                <NextImage
                  src="/assets/Logo_tMtCup.svg"
                  alt="Fondo oficial TMT CUP"
                  width={320}
                  height={320}
                  className="object-contain max-w-[80vw]"
                  priority
                />
              </div>

              <div className="z-10 rounded-[2.5rem] bg-white/45 backdrop-blur-md border-2 border-white/40 p-4 shadow-[0_12px_35px_rgba(16,32,76,0.15)] relative sm:p-6">
                <div className="flex items-center justify-between w-full mb-4 gap-2">
                  <div className="bg-[#10204c] text-white text-[10px] font-medium px-3 py-1 rounded-full tracking-wider truncate">
                    {selectedMatch.phase}
                  </div>
                  <span className="text-[10px] font-medium tracking-widest text-[#10204c]/50 bg-[#10204c]/5 px-3 py-1 rounded-full whitespace-nowrap">
                    Cancha 1
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 mb-5 sm:gap-4">
                  <div className="font-secondary-modak text-5xl text-[#10204c] tracking-tight leading-none min-[375px]:text-6xl">
                    {formatClock(liveSeconds)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaused(!paused)}
                    className="w-11 h-11 rounded-full bg-[#10204c] text-white flex items-center justify-center shadow-lg active:scale-[0.95] transition-transform shrink-0 sm:w-12 sm:h-12"
                  >
                    {paused ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    )}
                  </button>
                </div>

                <div className="border-t border-[#10204c]/10 pt-5 flex justify-center items-center gap-3 sm:gap-6">
                  <div className="w-10 h-10 rounded-full bg-white/60 border border-[#10204c]/15 shadow-sm flex items-center justify-center shrink-0 sm:w-12 sm:h-12">
                    <span className="text-xs text-[#10204c]/65 font-bold">L</span>
                  </div>

                  <div className="font-secondary-modak text-5xl text-[#10204c] tracking-[0.05em] select-none min-w-[92px] text-center min-[375px]:text-6xl min-[375px]:min-w-[112px] sm:text-7xl sm:min-w-[140px]">
                    {score.home} - {score.away}
                  </div>

                  <div className="w-10 h-10 rounded-full bg-white/60 border border-[#10204c]/15 shadow-sm flex items-center justify-center shrink-0 sm:w-12 sm:h-12">
                    <span className="text-xs text-[#10204c]/65 font-bold">V</span>
                  </div>
                </div>
              </div>

              <div className="z-10 grid gap-6 md:grid-cols-2 md:items-start">
                {[{ title: selectedMatch.homeTeam, side: "home", players: homePlayers },
                { title: selectedMatch.awayTeam, side: "away", players: awayPlayers }].map((team) => (
                  <div key={team.side} className="rounded-[1.6rem] border border-slate-200 bg-white/80 backdrop-blur-sm p-3.5 shadow-sm sm:p-5">
                    <div className="flex items-center justify-center gap-3 mb-5 w-full">
                      <div className="w-11 h-11 rounded-full bg-white border border-[#10204c]/10 flex items-center justify-center shadow-xs">
                        <span className="text-sm text-[#10204c]/50 font-black uppercase">{team.title[0]}</span>
                      </div>
                      <h3 className="text-2xl font-light tracking-wide text-[#10204c] text-center">
                        {team.title}
                      </h3>
                    </div>

                    <div className="space-y-2.5">
                      {team.players.map((player) => {
                        const isOpen = openEventMenu?.playerId === player.id && openEventMenu.team === team.side;
                        return (
                          <div key={player.id} className="rounded-[1.25rem] border border-slate-200 bg-white px-2.5 py-3 flex flex-col gap-2 transition-all w-full overflow-hidden sm:px-3.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-800 truncate pr-2">{player.name}</span>
                              <button
                                type="button"
                                onClick={() => setOpenEventMenu(isOpen ? null : { team: team.side as TeamSide, playerId: player.id })}
                                className="h-9 w-9 rounded-full bg-[#10204c]/5 hover:bg-[#10204c]/10 text-[#10204c] flex items-center justify-center transition-all shrink-0"
                              >
                                <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>

                            {isOpen && (
                              <div className="flex flex-wrap gap-1.5 mt-2 w-full justify-center items-center">
                                {[
                                  { icon: "⚽", type: "goal" },
                                  { icon: "🟨", type: "yellow" },
                                  { icon: "🟥", type: "red" }
                                ].map((act) => (
                                  <div key={act.type} className="flex items-center gap-1 px-1.5 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-700 shrink-0 sm:gap-1.5 sm:px-2">
                                    <button
                                      type="button"
                                      onClick={() => console.log(`Restar ${act.type} al jugador ${player.id}`)}
                                      className="w-5 h-5 rounded-full bg-white hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs shadow-xs border border-slate-300/40 active:scale-90 transition-transform shrink-0 sm:w-6 sm:h-6 sm:text-sm"
                                    >
                                      <span className="leading-none mt-[-2px]">-</span>
                                    </button>
                                    <span className="text-[11px] select-none shrink-0 sm:text-xs">{act.icon}</span>
                                    <button
                                      type="button"
                                      onClick={() => registerEvent(team.side as TeamSide, player.id, act.type as EventKind)}
                                      className="w-5 h-5 rounded-full bg-white hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs shadow-xs border border-slate-300/40 active:scale-90 transition-transform shrink-0 sm:w-6 sm:h-6 sm:text-sm"
                                    >
                                      <span className="leading-none mt-[-1px]">+</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* ÁREA DE BOTONES DE ACCIÓN INFERIORES FLOTANTES */}
              <div className="fixed bottom-6 left-6 right-6 z-40 flex items-center justify-between gap-3">
                <div className="flex-1 min-h-[56px] flex items-center">
                  {liveSeconds === 0 && (
                    <button
                      type="button"
                      onClick={triggerManualFinish}
                      className="animate-slide-up w-full h-14 rounded-full bg-[#10204c] text-white font-bold text-sm shadow-[0_8px_30px_rgba(16,32,76,0.3)] flex items-center justify-center border border-white/20 active:scale-95 transition-all duration-200"
                    >
                      Finalizar encuentro
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIncidentOpen(true)}
                  className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-[0_8px_30px_rgba(248,54,54,0.4)] flex items-center justify-center border border-white/20 active:scale-95 transition-all duration-200"
                  aria-label="Reportar incidente"
                >
                  <svg
                    className="w-6 h-6 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </button>
              </div>
            </section>
          )}

          {/* VISTA RESUMEN DEL PARTIDO */}
          {view === "summary" && report && (
            <section className="flex flex-1 flex-col gap-6 font-poppins w-full relative min-h-[75vh] px-1 overflow-hidden pb-10">
              {/* MARCA DE AGUA */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 select-none">
                <NextImage
                  src="/assets/Logo_tMtCup.svg"
                  alt="Fondo oficial TMT CUP"
                  width={320}
                  height={320}
                  className="object-contain max-w-[80vw]"
                  priority
                />
              </div>

              {/* CABECERA CENTRADA CON ESTILO TARJETA ESPERA */}
              <div className="z-10 rounded-[2.5rem] bg-white/45 backdrop-blur-md border-2 border-white/40 p-5 shadow-[0_12px_35px_rgba(16,32,76,0.12)] text-center relative overflow-hidden flex flex-col items-center justify-center">
                <div className="flex items-center justify-center w-full mb-3 gap-2">
                  <span className="text-[11px] font-weight tracking-wider text-[#10204c]/50 bg-[#10204c]/5 px-2.5 py-1 rounded-full truncate">
                    {report.subtitle}
                  </span>
                </div>
                
                <div className="py-2 flex flex-col items-center justify-center">
                  <div className="font-secondary-modak text-6xl text-[#10204c] tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(16,32,76,0.06)] min-[375px]:text-7xl">
                    {report.score}
                  </div>
                  <p className="mt-3 text-lg font-light tracking-wide text-[#10204c] sm:text-xl text-center">
                    {report.title}
                  </p>
                </div>
              </div>

              {/* LISTADOS DE SUCESOS */}
              <div className="z-10 space-y-4">
                <SummarySection title="Goles">
                  {report.goals.length === 0 ? (
                    <SummaryEmpty>No se registraron goles en el encuentro.</SummaryEmpty>
                  ) : (
                    report.goals.map((goal, index) => (
                      <SummaryRow key={`${goal.label}-${index}`} primary={goal.label} secondary={goal.team} accent="⚽ Gol" />
                    ))
                  )}
                </SummarySection>

                <SummarySection title="Sanciones / Tarjetas">
                  {report.cards.length === 0 ? (
                    <SummaryEmpty>Limpio de amonestaciones.</SummaryEmpty>
                  ) : (
                    report.cards.map((card, index) => {
                      const isRed = card.label.toLowerCase().includes("roja");
                      return (
                        <SummaryRow 
                          key={`${card.label}-${index}`} 
                          primary={card.label} 
                          secondary={card.team} 
                          accent={isRed ? "🟥 Expulsión" : "🟨 Amarilla"} 
                        />
                      );
                    })
                  )}
                </SummarySection>
              </div>

              {/* ACCIÓN DE ENVÍO - BOTÓN AJUSTADO AL TEXTO */}
              <div className="mt-auto z-10 w-full flex justify-center px-1 py-4">
                <button
                  type="button"
                  onClick={handleSaveAndSend}
                  className="w-auto h-[3.75rem] rounded-full px-10 text-base font-black text-white shadow-lg transition-all duration-200 active:scale-[0.98] border border-white/20 flex items-center justify-center gap-2 bg-[#E11D48] hover:bg-[#F43F5E] shadow-[#E11D48]/20"
                >
                  Guardar y enviar a mesa
                </button>
              </div>
            </section>
          )}
        </div>

        {/* MODAL DE INCIDENTES RÁPIDOS */}
        {incidentOpen && (
          <div className="fixed inset-0 z-45 flex items-end justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-[1.8rem] bg-white p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-medium text-[#10204c] sm:text-xl">Reportar incidente</h3>
                <button type="button" onClick={() => setIncidentOpen(false)} className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 sm:text-sm">
                  Cerrar
                </button>
              </div>
              <textarea
                value={incidentDraft}
                onChange={(event) => setIncidentDraft(event.target.value)}
                placeholder="Escribe los detalles aquí..."
                className="mt-3 h-28 w-full rounded-[1.2rem] border border-slate-200 p-3 text-sm outline-none resize-none focus:border-[#10204c] sm:mt-4 sm:h-32 sm:p-4"
              />
              <div className="mt-3 flex justify-center sm:mt-4 sm:justify-end">
                <button
                  type="button"
                  onClick={submitIncident}
                  className="h-11 rounded-full bg-red-600 px-6 text-xs font-semibold text-white shadow-md sm:h-12 sm:px-8 sm:text-sm"
                >
                  Guardar nota del incidente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP DE CONFIRMACIÓN DE ENVÍO */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl border border-slate-100 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#10204c]">¡Enviado con éxito!</h3>
                <p className="text-xs text-slate-500 mt-1">Los datos del partido han sido registrados y enviados correctamente a la mesa principal.</p>
              </div>
              <button
                type="button"
                onClick={handleReturnToDashboard}
                className="w-full h-12 rounded-full bg-[#10204c] text-white text-sm font-bold shadow-md hover:bg-[#1a2f6a] transition-all active:scale-[0.98]"
              >
                Volver al Panel Principal
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.6rem] border-2 border-white/40 bg-white/45 backdrop-blur-md p-4 shadow-[0_8px_24px_rgba(16,32,76,0.06)]">
      {/* Título de sección más grande y delgado */}
      <h3 className="text-lg font-light text-[#10204c] tracking-wide">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <div className="flex items-center justify-between bg-white/70 p-3 rounded-xl border border-slate-100 shadow-xs text-sm">
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-bold text-[#10204c] truncate">{primary}</p>
        <p className="text-xs text-[#10204c]/65 truncate">{secondary}</p>
      </div>
      <span className="text-xs font-bold text-[#10204c] bg-[#10204c]/5 px-3 py-1 rounded-full whitespace-nowrap shrink-0">{accent}</span>
    </div>
  );
}

function SummaryEmpty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-[#10204c]/50 italic p-2">{children}</div>;
}