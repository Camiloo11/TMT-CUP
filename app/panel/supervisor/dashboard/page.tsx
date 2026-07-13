"use client";

import { useEffect, useRef, useState } from "react";

type View = "dashboard" | "waiting" | "live" | "summary";
type MatchStatus = "upcoming" | "live" | "finished";
type Filter = "upcoming" | "live" | "finished";
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
  {
    id: "m1",
    time: "08:00",
    phase: "Grupo A - Jornada 1",
    homeTeam: "Raptors FC",
    awayTeam: "North Stars",
    status: "finished",
  },
  {
    id: "m2",
    time: "08:32",
    phase: "Grupo A - Jornada 1",
    homeTeam: "Blue Tigers",
    awayTeam: "Iron United",
    status: "upcoming",
    readyNow: true,
  },
  {
    id: "m3",
    time: "09:00",
    phase: "Grupo B - Jornada 1",
    homeTeam: "Red Lions",
    awayTeam: "Storm Club",
    status: "live",
  },
  {
    id: "m4",
    time: "09:26",
    phase: "Grupo B - Jornada 1",
    homeTeam: "Atlas FC",
    awayTeam: "Phoenix Junior",
    status: "upcoming",
  },
  {
    id: "m5",
    time: "09:52",
    phase: "Ruta de Playoff - Ronda 1",
    homeTeam: "Green Valley",
    awayTeam: "Orchid Athletic",
    status: "upcoming",
  },
  {
    id: "m6",
    time: "10:18",
    phase: "Ruta de Playoff - Ronda 1",
    homeTeam: "Galaxy FC",
    awayTeam: "Vortex United",
    status: "upcoming",
  },
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
          return {
            label: player?.name ?? "Jugador local",
            team: params.match.homeTeam,
          };
        }),
    ),
    ...Object.entries(params.events.away).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "goal")
        .map(() => {
          const player = awayPlayers.find((entry) => entry.id === playerId);
          return {
            label: player?.name ?? "Jugador visitante",
            team: params.match.awayTeam,
          };
        }),
    ),
  ];

  const cards = [
    ...Object.entries(params.events.home).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "yellow" || event.kind === "red")
        .map((event) => {
          const player = homePlayers.find((entry) => entry.id === playerId);
          return {
            label: `${player?.name ?? "Jugador local"} · ${event.kind === "yellow" ? "Amarilla" : "Roja"}`,
            team: params.match.homeTeam,
          };
        }),
    ),
    ...Object.entries(params.events.away).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "yellow" || event.kind === "red")
        .map((event) => {
          const player = awayPlayers.find((entry) => entry.id === playerId);
          return {
            label: `${player?.name ?? "Jugador visitante"} · ${event.kind === "yellow" ? "Amarilla" : "Roja"}`,
            team: params.match.awayTeam,
          };
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
  const [supervisor] = useState<SupervisorName>("Ana Beltrán"); // Ajustado por defecto tras remover config
  const [activeFilter, setActiveFilter] = useState<Filter>("upcoming");
  const [selectedMatch, setSelectedMatch] = useState<MatchCard>(matches[1]);
  const [waitingSeconds, setWaitingSeconds] = useState(waitingDuration);
  const [presence, setPresence] = useState(createEmptyPresence);
  const [liveSeconds, setLiveSeconds] = useState(matchDuration);
  const [paused, setPaused] = useState(false);
  const [, setExtraTimeUnlocked] = useState(false);
  const [eventsByTeam, setEventsByTeam] = useState(createEmptyEvents);
  const [openEventMenu, setOpenEventMenu] = useState<{
    team: TeamSide;
    playerId: string;
  } | null>(null);
  const [undoTarget, setUndoTarget] = useState<{
    team: TeamSide;
    playerId: string;
    eventId: string;
  } | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [locked, setLocked] = useState(false);

  const score = countGoals(eventsByTeam);

  useEffect(() => {
    if (view !== "waiting" || waitingSeconds === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setWaitingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [view, waitingSeconds]);

  useEffect(() => {
    if (view !== "live" || paused || liveSeconds === 0) {
      return;
    }

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

  const readyMatches = matches.filter((match) => match.status === activeFilter);
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
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      <main className="flex-1 px-4 pb-16 text-[15px] text-[color:var(--foreground)] sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 sm:max-w-lg">
          
          {/* VISTA DEL DASHBOARD / PANEL PRINCIPAL */}
          {view === "dashboard" && (
            <section className="flex flex-1 flex-col gap-4 w-full">
              <header className="sticky top-0 z-20 -mx-4 -mt-6 mb-2 bg-[color:var(--primary)]/80 px-6 py-5 text-white shadow-sm blur-gradient-header">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/75">Cancha asignada</p>
                    <h2 className="text-2xl font-semibold tracking-wide">Cancha 1</h2>
                  </div>
                  <div className="rounded-full bg-white/12 px-3 py-2 text-sm font-semibold backdrop-blur-md">Partidos: 2/6</div>
                </div>
                <p className="mt-2 text-sm text-white/85 font-light">El supervisor {supervisor} está habilitado para la jornada.</p>
              </header>

              <div className="grid grid-cols-3 gap-2 px-1">
                {(["upcoming", "live", "finished"] as Filter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`h-12 rounded-full border px-3 text-sm font-semibold capitalize transition ${activeFilter === filter
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-[0_10px_24px_rgba(35,60,151,0.18)]"
                      : "border-[color:var(--border)] bg-white text-slate-700"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pb-1">
                {readyMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => beginMatchLifecycle(match)}
                    className={`w-full rounded-[1.6rem] border bg-white p-4 text-left shadow-[0_10px_24px_rgba(16,32,76,0.06)] transition active:scale-[0.995] ${match.readyNow ? "border-[color:var(--danger)] border-dashed animate-pulse" : "border-[color:var(--border)]"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{match.time}</p>
                        <p className="mt-1 text-sm font-semibold text-[color:var(--primary)]">{match.phase}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${match.status === "upcoming"
                          ? "bg-[color:var(--accent)]/18 text-[#8d6b00]"
                          : match.status === "live"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-slate-500/12 text-slate-600"
                        }`}
                      >
                        {match.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{match.homeTeam}</p>
                        <p className="text-sm text-slate-500">vs {match.awayTeam}</p>
                      </div>
                      {match.readyNow && (
                        <span className="rounded-full bg-[color:var(--danger)]/12 px-3 py-2 text-xs font-semibold text-[color:var(--danger)]">
                          Listo para modo de espera
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* VISTA MODO DE ESPERA */}
          {view === "waiting" && (
            <section className="flex flex-1 flex-col gap-4">
              <header className="rounded-[1.75rem] bg-[color:var(--primary)] p-4 text-white shadow-[0_16px_40px_rgba(35,60,151,0.18)]">
                <div className="flex items-center justify-between gap-3 text-sm uppercase tracking-[0.26em] text-white/70">
                  <span>{selectedMatch.time}</span>
                  <span>{selectedMatch.phase}</span>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Modo de espera</p>
                  <div className="text-7xl font-bold leading-none text-[color:var(--accent)] drop-shadow-[0_4px_0_rgba(0,0,0,0.1)] sm:text-8xl">
                    {formatClock(waitingSeconds)}
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "home", label: selectedMatch.homeTeam },
                  { key: "away", label: selectedMatch.awayTeam },
                ] as const).map((team) => {
                  const isPresent = presence[team.key];
                  return (
                    <button
                      key={team.key}
                      type="button"
                      onClick={() => togglePresence(team.key)}
                      className={`flex aspect-square flex-col items-center justify-center rounded-full border-4 p-4 text-center transition active:scale-[0.98] ${isPresent
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-800"
                        : "border-[color:var(--primary)] bg-white text-[color:var(--primary)]"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Toca cuando esté presente</span>
                      <span className="mt-2 text-lg font-semibold leading-tight">{team.label}</span>
                      <span className={`mt-3 rounded-full px-4 py-2 text-xs font-semibold ${isPresent ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                        {isPresent ? "Presente" : "Marcar presente"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={`rounded-[1.5rem] border p-4 text-center text-sm font-semibold ${warningText.tone} bg-white/75`}>{warningText.text}</div>

              <button
                type="button"
                onClick={advanceWaiting}
                className={`mt-auto h-16 rounded-full px-6 text-base font-semibold text-white shadow-[0_14px_32px_rgba(35,60,151,0.22)] transition active:scale-[0.99] ${waitingSeconds === 0 && presenceCount < 2 ? "bg-[color:var(--danger)]" : "bg-[color:var(--primary)]"}`}
              >
                {waitingActionLabel}
              </button>
            </section>
          )}

          {/* VISTA PARTIDO EN VIVO */}
          {view === "live" && (
            <section className="flex flex-1 flex-col gap-4 pb-16">
              <header className="rounded-[1.75rem] bg-[color:var(--primary)] p-4 text-white shadow-[0_18px_40px_rgba(35,60,151,0.18)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.26em] text-white/70">
                  <span>{selectedMatch.phase}</span>
                  <span className="font-semibold">Cancha 1</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/75">Cronómetro del partido</p>
                    <div className="text-6xl font-bold leading-none text-[color:var(--accent)] sm:text-7xl">
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
                className="fixed bottom-28 right-6 z-30 h-14 w-14 rounded-full bg-[color:var(--danger)] text-xl font-bold text-white shadow-lg flex items-center justify-center ring-4 ring-white"
                aria-label="Abrir reporte de incidentes"
              >
                !
              </button>
            </section>
          )}

          {/* VISTA RESUMEN DEL PARTIDO */}
          {view === "summary" && report && (
            <section className="flex flex-1 flex-col gap-4">
              <header className="rounded-[1.8rem] bg-[color:var(--primary)] p-4 text-white shadow-[0_18px_40px_rgba(35,60,151,0.18)]">
                <p className="text-xs uppercase tracking-[0.28em] text-white/70">Informe del partido</p>
                <h2 className="mt-2 text-2xl font-semibold">Resumen y bloqueo</h2>
                <div className="mt-4 rounded-[1.4rem] bg-white/10 p-4 backdrop-blur-md">
                  <div className="text-center text-7xl font-bold leading-none text-[color:var(--accent)]">{report.score}</div>
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
                className="mt-auto h-16 rounded-full bg-[color:var(--primary)] px-6 text-base font-semibold text-white disabled:opacity-70"
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
                <h3 className="text-xl font-bold text-[color:var(--primary)]">Reportar incidente</h3>
                <button type="button" onClick={() => setIncidentOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                  Cerrar
                </button>
              </div>
              <textarea
                value={incidentDraft}
                onChange={(event) => setIncidentDraft(event.target.value)}
                placeholder="Escribe los detalles aquí..."
                className="mt-4 h-32 w-full rounded-[1.2rem] border border-[color:var(--border)] p-4 text-sm outline-none resize-none focus:border-[color:var(--primary)]"
              />
              <button type="button" onClick={submitIncident} className="mt-3 h-14 w-full rounded-full bg-[color:var(--danger)] text-sm font-semibold text-white shadow-md">
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
  undoTarget,
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
    <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{side === "home" ? "Equipo local" : "Equipo visitante"}</p>
          <h3 className="text-lg font-bold text-[color:var(--primary)]">{title}</h3>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {players.map((player) => {
          const sentOff = isPlayerSentOff(events, player.id);
          const latestEvent = getLatestEvent(events, player.id);

          return (
            <div
              key={player.id}
              className={`rounded-[1.25rem] border px-3 py-3 flex flex-col gap-2 ${sentOff ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60" : "border-[color:var(--border)] bg-white"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">{player.name}</span>
                <button
                  type="button"
                  onClick={() => onOpenEventMenu({ team: side, playerId: player.id })}
                  disabled={sentOff}
                  className="h-10 w-10 rounded-full bg-[color:var(--primary)] text-white font-bold text-lg disabled:bg-slate-200"
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
                  <button type="button" onClick={() => onRegisterEvent(side, player.id, "yellow")} className="bg-[color:var(--accent)] text-slate-900 rounded-full py-2 text-xs font-bold">🟨 Amarilla</button>
                  <button type="button" onClick={() => onRegisterEvent(side, player.id, "red")} className="bg-[color:var(--danger)] text-white rounded-full py-2 text-xs font-bold">🟥 Roja</button>
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
    <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-white p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--primary)]">{title}</h3>
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