"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";
import MatchCardContainer from "./components/MatchCardContainer";
import TeamPresenceCard from './components/TeamPresenceCard'
import ControlAlertPopup from './components/ControlAlertPopup'

type View = "dashboard" | "waiting" | "live" | "summary";
type MatchStatus = "upcoming" | "live" | "finished";
type Filter = "upcoming" | "finished"; // Ahora solo filtramos por próximos y finalizados
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

const matchDuration = 26 * 60;
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
  const [selectedMatch, setSelectedMatch] = useState<MatchCard>(matches[2]); // Default al partido "live" (m3)
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
  const [locked, setLocked] = useState(false);

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

  // Se extrae el único partido en vivo (si existe) para fijarlo arriba
  const liveMatch = matches.find((m) => m.status === "live");

  // Se extrae solo el primer partido que cumpla el estado filtrado actual (Caja única)
  const filteredMatch = matches.find((m) => m.status === activeFilter);

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

  // Función de edición restringida únicamente a partidos en vivo
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
    setLocked(false);
    setView("waiting");
  }

  function togglePresence(team: TeamSide) {
    setPresence((current) => ({ ...current, [team]: !current[team] }));
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
      <main className="flex-1 px-4 py-6 text-[15px] text-slate-800 sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 sm:max-w-lg">

          {/* VISTA DEL DASHBOARD / PANEL PRINCIPAL */}
          {view === "dashboard" && (
            <section className="flex flex-1 flex-col gap-6 w-full">

              {/* ENCABEZADO FIJO: CORREGIDO PARA OCUPAR TODO EL ANCHO DE EXTREMO A EXTREMO */}
              <header className="sticky top-0 z-50 -mx-4 -mt-6 w-[calc(100%+2rem)] rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] overflow-hidden font-poppins">
                <div className="w-full mx-auto px-4 pt-5 pb-4 flex flex-col gap-5">

                  {/* FILA SUPERIOR: LOGO -> BLOQUE CANCHA GIGANTE -> PERSONAL */}
                  <div className="flex items-center justify-between w-full gap-0">

                    {/* 1. LOGO LIBRE (AJUSTADO A LA IZQUIERDA) */}
                    <div className="flex-1 flex items-center justify-start">
                      <NextImage
                        src="/assets/Logo_tMtCup.svg"
                        alt="Logo oficial TMT CUP"
                        width={85}
                        height={85}
                        className="object-contain drop-shadow-sm"
                        priority
                      />
                    </div>

                    {/* 2. INDICADOR GEOMÉTRICO CENTRAL (NÚMERO ARRIBA, TEXTO ABAJO) */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center font-poppins px-1">
                      <div className="w-20 h-20 bg-[#10204c] rounded-2xl flex items-center justify-center shadow-xl border border-white/10 mb-1.5">
                        <span className="font-secondary-modak text-5xl text-white leading-none mt-1">
                          1
                        </span>
                      </div>
                      <span className="text-[15px] font-medium text-[#10204c] tracking-wide leading-none">
                        Cancha
                      </span>
                    </div>

                    {/* 3. INFORMACIÓN DEL PERSONAL (AJUSTADO A LA DERECHA) */}
                    <div className="flex-1 flex flex-col items-end text-right justify-center pl-2">
                      <span className="text-[10px] font-bold text-[#233c97]/50 leading-none mb-0.5">
                        Supervisor
                      </span>
                      <h3 className="text-base font-black text-[#10204c] leading-tight truncate w-full max-w-[130px] sm:max-w-none">
                        {supervisor || "Ana Beltrán"}
                      </h3>
                      <p className="text-[11px] font-medium text-[#10204c]/60 mt-1 truncate w-full max-w-[130px] sm:max-w-none">
                        <span className="font-bold text-[#233c97]/70">Árb:</span> Carlos Gómez
                      </p>
                    </div>

                  </div>

                  {/* LÍNEA DIVISORIA SUTIL DENTRO DEL HEADER */}
                  <div className="w-full h-[1px] bg-[#10204c]/5" />

                  {/* FILA INFERIOR: BARRA DE NAVEGACIÓN SEGMENTADA INTEGRADA */}
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

              {/* CONTENEDOR DE PARTIDOS */}
              <div className="flex-1 space-y-4 overflow-y-auto pb-6">
                {liveMatch ? (
                  <MatchCardContainer
                    match={liveMatch}
                    onAction={() => beginMatchLifecycle(liveMatch)}
                  />
                ) : (
                  <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)] mb-6">
                    No hay ningún partido en vivo en juego en este momento.
                  </div>
                )}

                {filteredMatch ? (
                  <MatchCardContainer match={filteredMatch} />
                ) : (
                  <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)]">
                    No hay partidos para mostrar en este filtro.
                  </div>
                )}
              </div>

            </section>
          )}

          {/* VISTA MODO DE ESPERA */}
          {view === "waiting" && (
            <section className="flex flex-1 flex-col gap-6 font-poppins w-full relative min-h-[75vh] px-1 overflow-hidden">

              {/* 0. MARCA DE AGUA: LOGO COMPLETO ORIGINAL */}
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

              {/* CONTENEDOR DEL CRONÓMETRO */}
              <div className="z-10 rounded-[2.5rem] bg-white/45 backdrop-blur-md border-2 border-white/40 p-6 shadow-[0_12px_35px_rgba(16,32,76,0.12)] text-center relative overflow-hidden">
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="bg-[#10204c] text-white text-[11px] font-black px-3 py-1 rounded-full shadow-xs tracking-wide">
                    Prog: {selectedMatch.time}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#10204c]/50 bg-[#10204c]/5 px-2.5 py-1 rounded-full">
                    {selectedMatch.phase}
                  </span>
                </div>

                <div className="py-2">
                  <div className="font-secondary-modak text-8xl text-[#10204c] tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(16,32,76,0.06)]">
                    {formatClock(waitingSeconds)}
                  </div>
                </div>
              </div>

              {/* CONTROL DE ASISTENCIA: TARJETAS CON NUEVOS BOTONES ESTILIZADOS */}
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

              {/* POP-UP DE ALERTAS TEMPORIZADO CON IDENTIFICADOR DE SANCIÓN */}
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

              {/* BOTÓN DE ACCIÓN PRINCIPAL (CON ESPACIADO INFERIOR PARA EVITAR SOMBRA CORTADA) */}
              <div className="mt-auto z-10 w-full flex justify-center px-1 py-4">
                <button
                  type="button"
                  onClick={advanceWaiting}
                  className={`w-fit h-15 rounded-full px-8 text-base font-black text-white shadow-lg transition-all duration-200 active:scale-[0.98] border border-white/20 flex items-center justify-center ${waitingSeconds === 0 && presenceCount < 2
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
            <section className="flex flex-1 flex-col gap-4 pb-16">
              <header className="rounded-[1.75rem] bg-[#10204c] p-4 text-white shadow-[0_18px_40px_rgba(35,60,151,0.18)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.26em] text-white/70">
                  <span>{selectedMatch.phase}</span>
                  <span className="font-semibold">Cancha 1</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/75">Cronómetro del partido</p>
                    <div className="text-6xl font-bold leading-none text-white sm:text-7xl">
                      {formatClock(liveSeconds)}
                    </div>
                  </div>
                  <button type="button" onClick={() => setPaused((current) => !current)} className="h-14 rounded-full bg-white/15 px-4 text-sm font-semibold backdrop-blur-md">
                    {paused ? "Reanudar" : "Pausa"}
                  </button>
                </div>
                <div className="mt-4 rounded-[1.4rem] bg-white/10 p-4 text-center backdrop-blur-md">
                  <span className="text-6xl font-bold leading-none sm:text-7xl">
                    {score.home} - {score.away}
                  </span>
                </div>
              </header>

              <div className="grid gap-3">
                <RosterPanel
                  title={selectedMatch.homeTeam}
                  side="home"
                  players={homePlayers}
                  events={eventsByTeam.home}
                  openEventMenu={openEventMenu}
                  onOpenEventMenu={setOpenEventMenu}
                  onRegisterEvent={registerEvent}
                  undoTarget={undoTarget}
                />

                <RosterPanel
                  title={selectedMatch.awayTeam}
                  side="away"
                  players={awayPlayers}
                  events={eventsByTeam.away}
                  openEventMenu={openEventMenu}
                  onOpenEventMenu={setOpenEventMenu}
                  onRegisterEvent={registerEvent}
                  undoTarget={undoTarget}
                />
              </div>

              <button
                type="button"
                onClick={() => setIncidentOpen(true)}
                className="fixed bottom-28 right-6 z-30 h-14 w-14 rounded-full bg-red-600 text-xl font-bold text-white shadow-lg flex items-center justify-center ring-4 ring-white"
                aria-label="Abrir reporte de incidentes"
              >
                !
              </button>
            </section>
          )}

          {/* VISTA RESUMEN DEL PARTIDO */}
          {view === "summary" && report && (
            <section className="flex flex-1 flex-col gap-4">
              <header className="rounded-[1.8rem] bg-[#10204c] p-4 text-white shadow-[0_18px_40px_rgba(35,60,151,0.18)]">
                <p className="text-xs uppercase tracking-[0.28em] text-white/70">Informe del partido</p>
                <h2 className="mt-2 text-2xl font-semibold">Resumen y bloqueo</h2>
                <div className="mt-4 rounded-[1.4rem] bg-white/10 p-4 backdrop-blur-md">
                  <div className="text-center text-7xl font-bold leading-none text-white">{report.score}</div>
                  <p className="mt-2 text-center text-sm text-white/80">{report.title}</p>
                  <p className="text-center text-xs uppercase tracking-[0.24em] text-white/60">{report.subtitle}</p>
                </div>
              </header>

              <div className="space-y-3 overflow-y-auto pb-1">
                <SummarySection title="Goles">
                  {report.goals.length === 0 ? (
                    <SummaryEmpty>No se registraron goles.</SummaryEmpty>
                  ) : (
                    report.goals.map((goal, index) => <SummaryRow key={`${goal.label}-${index}`} primary={goal.label} secondary={goal.team} accent="Gol" />)
                  )}
                </SummarySection>

                <SummarySection title="Tarjetas">
                  {report.cards.length === 0 ? (
                    <SummaryEmpty>No se registraron tarjetas.</SummaryEmpty>
                  ) : (
                    report.cards.map((card, index) => <SummaryRow key={`${card.label}-${index}`} primary={card.label} secondary={card.team} accent="Tarjeta" />)
                  )}
                </SummarySection>
              </div>

              <button
                type="button"
                onClick={() => setLocked(true)}
                disabled={locked}
                className="mt-auto h-16 rounded-full bg-[#10204c] px-6 text-base font-semibold text-white disabled:opacity-70"
              >
                {locked ? "Bloqueado y enviado" : "Guardar y enviar a mesa de control"}
              </button>
            </section>
          )}
        </div>

        {/* MODAL DE INCIDENTES RÁPIDOS */}
        {incidentOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-[1.8rem] bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#10204c]">Reportar incidente</h3>
                <button type="button" onClick={() => setIncidentOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                  Cerrar
                </button>
              </div>
              <textarea
                value={incidentDraft}
                onChange={(event) => setIncidentDraft(event.target.value)}
                placeholder="Escribe los detalles aquí..."
                className="mt-4 h-32 w-full rounded-[1.2rem] border border-slate-200 p-4 text-sm outline-none resize-none focus:border-[#10204c]"
              />
              <button type="button" onClick={submitIncident} className="mt-3 h-14 w-full rounded-full bg-red-600 text-sm font-semibold text-white shadow-md">
                Guardar nota del incidente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function RosterPanel({
  title,
  side,
  players,
  events,
  openEventMenu,
  onOpenEventMenu,
  onRegisterEvent,
}: {
  title: string;
  side: TeamSide;
  players: Player[];
  events: Record<string, LiveEvent[]>;
  openEventMenu: { team: TeamSide; playerId: string } | null;
  onOpenEventMenu: React.Dispatch<React.SetStateAction<{ team: TeamSide; playerId: string } | null>>;
  onRegisterEvent: (team: TeamSide, playerId: string, kind: EventKind) => void;
  undoTarget: { team: TeamSide; playerId: string; eventId: string } | null;
}) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{side === "home" ? "Equipo local" : "Equipo visitante"}</p>
          <h3 className="text-lg font-bold text-[#10204c]">{title}</h3>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {players.map((player) => {
          const sentOff = isPlayerSentOff(events, player.id);
          const latestEvent = getLatestEvent(events, player.id);

          return (
            <div
              key={player.id}
              className={`rounded-[1.25rem] border px-3 py-3 flex flex-col gap-2 ${sentOff ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{player.name}</span>
                <button
                  type="button"
                  onClick={() => onOpenEventMenu({ team: side, playerId: player.id })}
                  disabled={sentOff}
                  className="h-10 w-10 rounded-full bg-[#10204c] text-white font-bold text-lg disabled:bg-slate-200"
                >
                  +
                </button>
              </div>

              {latestEvent && (
                <div className="text-xs font-semibold text-slate-500">
                  Último: {latestEvent.kind === "goal" ? "⚽" : latestEvent.kind === "yellow" ? "🟨" : "🟥"} ({latestEvent.minute}')
                </div>
              )}

              {openEventMenu?.playerId === player.id && openEventMenu.team === side && (
                <div className="grid grid-cols-3 gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <button type="button" onClick={() => onRegisterEvent(side, player.id, "goal")} className="bg-emerald-600 text-white rounded-full py-2 text-xs font-bold">⚽ Gol</button>
                  <button type="button" onClick={() => onRegisterEvent(side, player.id, "yellow")} className="bg-amber-500 text-slate-900 rounded-full py-2 text-xs font-bold">🟨 Amarilla</button>
                  <button type="button" onClick={() => onRegisterEvent(side, player.id, "red")} className="bg-red-600 text-white rounded-full py-2 text-xs font-bold">🟥 Roja</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-[#10204c]">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl text-sm">
      <div>
        <p className="font-bold text-slate-800">{primary}</p>
        <p className="text-xs text-slate-500">{secondary}</p>
      </div>
      <span className="text-xs font-bold bg-slate-200 px-3 py-1 rounded-full">{accent}</span>
    </div>
  );
}

function SummaryEmpty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-400 italic p-2">{children}</div>;
}

type MatchFilterTabsProps = {
  activeFilter: Filter;
  onFilterChange: (filter: Filter) => void;
};

// COMPONENTE DE LA BARRA DE NAVEGACIÓN (PRÓXIMOS Y FINALIZADOS)
function MatchFilterTabs({ activeFilter, onFilterChange }: MatchFilterTabsProps) {
  const tabs: { id: Filter; label: string }[] = [
    { id: "upcoming", label: "Próximos" },
    { id: "finished", label: "Finalizados" },
  ];

  return (
    <nav className="flex p-1 bg-[#10204c]/[0.05] rounded-full shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)] border border-[#10204c]/[0.01] items-center gap-1 font-poppins">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            className={`
              flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 select-none outline-none text-center whitespace-nowrap px-1
              ${isActive
                ? "bg-white text-[#233c97] shadow-[0_3px_10px_rgba(16,32,76,0.12),_0_1px_2px_rgba(16,32,76,0.04)] border border-white font-extrabold scale-[1.02]"
                : "text-[#10204c]/50 hover:text-[#10204c]/80"
              }
              active:scale-[0.96] transition-transform
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}