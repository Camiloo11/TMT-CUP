"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import MatchCardContainer from "./components/MatchCardContainer";
import TeamPresenceCard from './components/TeamPresenceCard'
import ControlAlertPopup from './components/ControlAlertPopup'
import { fetchSessionUser, logout, clearSupervisorCache, SUPERVISOR_CACHE_KEY } from "@/lib/session-client";

type View = "dashboard" | "waiting" | "live" | "summary";
type MatchStatus = "upcoming" | "live" | "finished";
type Filter = "upcoming" | "finished"; // Ahora solo filtramos por próximos y finalizados
type TeamSide = "home" | "away";
type EventKind = "goal" | "yellow" | "red";

type MatchCard = {
  id: string;
  time: string;
  phase: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  readyNow?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
};

type Player = {
  id: string;
  name: string;
  suspended?: boolean; // expulsado en un partido anterior: bloqueado
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

// ── DATOS REALES DEL BACKEND ─────────────────────────────────────
// El dashboard ya no usa partidos ni jugadores inventados: todo sale
// de la agenda del día para la cancha asignada al supervisor logueado.

type ApiTeamRef = { id: number; name: string } | null;

type ApiMatch = {
  id: number;
  scheduled_at: string;
  phase: string;
  status: string; // PROGRAMADO | EN_ESPERA | EN_JUEGO | FINALIZADO
  field_number: number;
  score_a: number | null;
  score_b: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
  waiting_started_at: string | null;
  kickoff_at: string | null;
  team_a_present_at: string | null;
  team_b_present_at: string | null;
  published_at: string | null;
  walkover: string | null;
  teamA: ApiTeamRef;
  teamB: ApiTeamRef;
};

type Assignment = {
  id: number;
  day: string;
  field_number: number;
  supervisor_name: string;
  referee_name: string;
};

type ApiEvent = {
  id: number;
  team_id: number;
  minute: number | null;
  type: string; // GOL | AMARILLA | ROJA
  player: { id: number; name: string } | null;
};

type ApiTeamDetail = {
  id: number;
  name: string;
  players?: Array<{ id: number; name: string; suspended?: boolean }>;
} | null;

type Rosters = { home: Player[]; away: Player[] };
type TeamIds = { home: number | null; away: number | null };

const PHASE_LABEL: Record<string, string> = {
  GRUPOS: "Fase de grupos",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

function phaseLabel(phase: string) {
  return PHASE_LABEL[phase] ?? phase;
}

// Hora local de Bogotá (el bug de AM/PM ya nos mordió una vez)
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });
}

function cardStatus(status: string): MatchStatus {
  if (status === "EN_ESPERA" || status === "EN_JUEGO") return "live";
  if (status === "FINALIZADO") return "finished";
  return "upcoming";
}

function toCard(m: ApiMatch): MatchCard {
  return {
    id: String(m.id),
    time: formatTime(m.scheduled_at),
    phase: phaseLabel(m.phase),
    homeTeam: m.teamA?.name ?? "Por definir",
    awayTeam: m.teamB?.name ?? "Por definir",
    status: cardStatus(m.status),
    homeScore: m.score_a,
    awayScore: m.score_b,
  };
}

// Nombres sin tildes ni mayúsculas para casar credencial ↔ asignación
function normalizeName(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function secondsSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

// Respaldo local de la mesa de control: si el supervisor cierra la app o
// se le apaga el teléfono en medio de un partido, NADA se pierde. El
// respaldo solo se borra al cerrar sesión explícitamente o al enviar el acta.
type PersistedControl = {
  version: 2;
  savedAt: number; // epoch ms, para descontar el tiempo real transcurrido
  view: View;
  match: MatchCard;
  matchDbId: number | null;
  fieldNumber: number | null;
  teamIds: TeamIds;
  rosters: Rosters;
  waitingSeconds: number;
  presence: { home: boolean; away: boolean };
  liveSeconds: number;
  paused: boolean;
  eventsByTeam: Record<TeamSide, Record<string, LiveEvent[]>>;
  incidents: Incident[];
  report: Report | null;
};

// Un respaldo más viejo que esto es de otro día de torneo: se descarta
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function readControlBackup(): PersistedControl | null {
  try {
    const raw = localStorage.getItem(SUPERVISOR_CACHE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as PersistedControl;
    if (saved?.version !== 2 || !saved.match || saved.view === "dashboard") return null;
    if (Date.now() - saved.savedAt > CACHE_MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null; // respaldo corrupto o almacenamiento no disponible
  }
}

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

// Convierte los eventos del servidor al formato de la consola en vivo
// (para retomar un partido EN_JUEGO desde otro dispositivo, por ejemplo)
function hydrateEvents(
  events: ApiEvent[],
  teamAId: number | null,
  teamBId: number | null
): Record<TeamSide, Record<string, LiveEvent[]>> {
  const hydrated = createEmptyEvents();
  for (const ev of events) {
    const side: TeamSide | null =
      ev.team_id === teamAId ? "home" : ev.team_id === teamBId ? "away" : null;
    // Los goles "de oficio" (sin jugador) no pertenecen a ningún roster
    if (!side || !ev.player?.id) continue;
    const pid = String(ev.player.id);
    const kind: EventKind = ev.type === "GOL" ? "goal" : ev.type === "AMARILLA" ? "yellow" : "red";
    hydrated[side][pid] = [
      ...(hydrated[side][pid] ?? []),
      { id: String(ev.id), playerId: pid, team: side, kind, minute: ev.minute ?? 0 },
    ];
  }
  return hydrated;
}

function buildReport(params: {
  match: MatchCard;
  score: { home: number; away: number };
  events: Record<TeamSide, Record<string, LiveEvent[]>>;
  incidents: Incident[];
  rosters: Rosters;
  walkover?: string;
}) {
  const findName = (side: TeamSide, playerId: string) =>
    params.rosters[side].find((entry) => entry.id === playerId)?.name ??
    (side === "home" ? "Jugador local" : "Jugador visitante");

  const goals = (["home", "away"] as const).flatMap((side) =>
    Object.entries(params.events[side]).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "goal")
        .map(() => ({
          label: findName(side, playerId),
          team: side === "home" ? params.match.homeTeam : params.match.awayTeam,
        })),
    ),
  );

  const cards = (["home", "away"] as const).flatMap((side) =>
    Object.entries(params.events[side]).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "yellow" || event.kind === "red")
        .map((event) => ({
          label: `${findName(side, playerId)} · ${event.kind === "yellow" ? "Amarilla" : "Roja"}`,
          team: side === "home" ? params.match.homeTeam : params.match.awayTeam,
        })),
    ),
  );

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

const EMPTY_CARD: MatchCard = {
  id: "",
  time: "--:--",
  phase: "",
  homeTeam: "Local",
  awayTeam: "Visitante",
  status: "upcoming",
};

export default function SupervisorPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("dashboard");

  // ── Datos reales según la credencial ──────────────────────────
  const [supervisorName, setSupervisorName] = useState("");
  const [refereeName, setRefereeName] = useState("");
  const [fieldNumber, setFieldNumber] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [apiMatches, setApiMatches] = useState<ApiMatch[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);

  // ── Mesa de control del partido seleccionado ──────────────────
  const [activeFilter, setActiveFilter] = useState<Filter>("upcoming");
  const [selectedMatch, setSelectedMatch] = useState<MatchCard>(EMPTY_CARD);
  const [matchDbId, setMatchDbId] = useState<number | null>(null);
  const [rosters, setRosters] = useState<Rosters>({ home: [], away: [] });
  const [teamIds, setTeamIds] = useState<TeamIds>({ home: null, away: null });
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
  const [busyAction, setBusyAction] = useState(false);
  // true cuando ya se intentó restaurar el respaldo local (evita
  // sobrescribirlo con el estado inicial vacío antes de leerlo)
  const [restored, setRestored] = useState(false);

  const score = countGoals(eventsByTeam);

  // Carga la agenda del día: asignación de cancha por nombre + partidos
  async function loadField(field: number) {
    setFieldNumber(field);
    const data = await fetch(`/api/agenda?field=${field}`).then((r) => r.json()).catch(() => null);
    const assignment = (data?.assignment ?? null) as Assignment | null;
    setRefereeName(assignment?.referee_name ?? "");
    setApiMatches(Array.isArray(data?.matches) ? data.matches : []);
  }

  async function loadAgenda(name: string) {
    setAgendaLoading(true);
    try {
      const all = await fetch("/api/agenda").then((r) => r.json()).catch(() => []);
      const list: Assignment[] = Array.isArray(all) ? all : [];
      setAssignments(list);
      // La credencial manda: la cancha del supervisor es la que tiene su
      // nombre en la asignación de hoy. Si no hay match (p. ej. un admin
      // supervisando), se abre la primera cancha y puede cambiarla tocando
      // el número.
      const mine = list.find((a) => normalizeName(a.supervisor_name ?? "") === normalizeName(name));
      const field = mine?.field_number ?? list[0]?.field_number ?? 1;
      await loadField(field);
    } finally {
      setAgendaLoading(false);
    }
  }

  // Guard de sesión + carga inicial: solo staff puede ver la mesa de
  // control. fetchSessionUser renueva el token expirado antes de negar acceso.
  useEffect(() => {
    let cancelled = false;
    fetchSessionUser()
      .then(async (user) => {
        if (!user) {
          router.replace("/panel");
          return;
        }
        if (cancelled) return;
        setSupervisorName(user.name);
        await loadAgenda(user.name);
      })
      .catch(() => router.replace("/panel"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial única por sesión
  }, [router]);

  // Cambiar de cancha tocando el número (útil para admins o reemplazos)
  function cycleField() {
    const fields = [...new Set(assignments.map((a) => a.field_number))].sort((a, b) => a - b);
    if (fields.length < 2 || view !== "dashboard") return;
    const idx = fields.indexOf(fieldNumber ?? fields[0]);
    void loadField(fields[(idx + 1) % fields.length]);
  }

  // ── RESTAURAR: al abrir la app, si quedó un partido a medias se retoma ──
  /* eslint-disable react-hooks/set-state-in-effect -- localStorage solo existe en el cliente: restaurar el respaldo exige setState al montar */
  useEffect(() => {
    const saved = readControlBackup();
    if (saved) {
      // Los cronómetros descuentan el tiempo REAL transcurrido con la app cerrada
      const elapsed = Math.round((Date.now() - saved.savedAt) / 1000);
      setSelectedMatch(saved.match);
      setMatchDbId(saved.matchDbId);
      setRosters(saved.rosters ?? { home: [], away: [] });
      setTeamIds(saved.teamIds ?? { home: null, away: null });
      setPresence(saved.presence);
      setEventsByTeam(saved.eventsByTeam);
      setIncidents(saved.incidents);
      setReport(saved.report);
      setPaused(saved.paused);
      const waiting = saved.view === "waiting"
        ? Math.max(0, saved.waitingSeconds - elapsed)
        : saved.waitingSeconds;
      const live = saved.view === "live" && !saved.paused
        ? Math.max(0, saved.liveSeconds - elapsed)
        : saved.liveSeconds;
      setWaitingSeconds(waiting);
      setLiveSeconds(live);
      if (live === 0) setExtraTimeUnlocked(true);
      setView(saved.view);
    }
    setRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── RESPALDAR: cada cambio de la mesa de control queda en localStorage ──
  useEffect(() => {
    if (!restored) return;
    try {
      if (view === "dashboard") return; // sin partido activo no hay nada que respaldar
      if (locked) {
        // Acta enviada: el respaldo ya cumplió su misión
        clearSupervisorCache();
        return;
      }
      const snapshot: PersistedControl = {
        version: 2,
        savedAt: Date.now(),
        view,
        match: selectedMatch,
        matchDbId,
        fieldNumber,
        teamIds,
        rosters,
        waitingSeconds,
        presence,
        liveSeconds,
        paused,
        eventsByTeam,
        incidents,
        report,
      };
      localStorage.setItem(SUPERVISOR_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // sin espacio o modo privado: la mesa de control sigue funcionando
    }
  }, [restored, view, selectedMatch, matchDbId, fieldNumber, teamIds, rosters, waitingSeconds, presence, liveSeconds, paused, eventsByTeam, incidents, report, locked]);

  // Cierre de sesión EXPLÍCITO: la única acción que borra el respaldo local
  async function handleLogout() {
    const activeMatch = view !== "dashboard" && !locked;
    const message = activeMatch
      ? "Hay un partido a medias: cerrar sesión BORRA el respaldo local de la mesa de control. ¿Cerrar sesión de todas formas?"
      : "¿Cerrar sesión?";
    if (!window.confirm(message)) return;
    await logout();
    router.replace("/panel");
  }

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

  // El partido en curso REAL de esta cancha (EN_ESPERA o EN_JUEGO)
  const liveApi = apiMatches.find((m) => m.status === "EN_ESPERA" || m.status === "EN_JUEGO");
  const liveMatch = liveApi ? toCard(liveApi) : undefined;

  // Lista completa según el filtro (próximos o finalizados)
  const filteredMatches = apiMatches.map(toCard).filter((c) => c.status === activeFilter);

  // El siguiente por jugar: es el único al que se le puede iniciar la espera
  const nextUpcoming = !liveApi ? apiMatches.find((m) => m.status === "PROGRAMADO") : undefined;

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

  async function lifecycleAction(action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/matches/${matchDbId}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  }

  // Abre la mesa de control de un partido REAL, sincronizando el estado
  // local con el estado del servidor (espera / en juego / finalizado).
  async function beginMatchLifecycle(card: MatchCard) {
    if (busyAction) return;
    const apiMatch = apiMatches.find((m) => String(m.id) === card.id);
    if (!apiMatch) return;
    if (!apiMatch.team_a_id || !apiMatch.team_b_id) {
      alert("Este partido aún no tiene equipos definidos (se llenan al cerrar la fase anterior).");
      return;
    }
    if (apiMatch.published_at) {
      alert("El acta de este partido ya fue publicada: solo un administrador puede modificarla.");
      return;
    }
    setBusyAction(true);
    try {
      // Plantillas reales (con expulsados marcados) + eventos ya registrados
      const detail = await fetch(`/api/matches/${apiMatch.id}`).then((r) => r.json()).catch(() => null);
      const toRoster = (team: ApiTeamDetail): Player[] =>
        (team?.players ?? []).map((p) => ({ id: String(p.id), name: p.name, suspended: p.suspended }));

      let status = apiMatch.status;
      let waitingStartedAt = apiMatch.waiting_started_at;

      // Un partido programado arranca su espera de 6 min EN EL SERVIDOR
      if (status === "PROGRAMADO") {
        const { ok, data } = await lifecycleActionFor(apiMatch.id, "start_waiting");
        if (!ok) {
          alert(data?.error ?? "No se pudo iniciar la espera");
          return;
        }
        status = "EN_ESPERA";
        waitingStartedAt = data?.waiting_started_at ?? new Date().toISOString();
      }

      setSelectedMatch(card);
      setMatchDbId(apiMatch.id);
      setRosters({ home: toRoster(detail?.teamA ?? null), away: toRoster(detail?.teamB ?? null) });
      setTeamIds({ home: apiMatch.team_a_id, away: apiMatch.team_b_id });
      setPresence({ home: !!apiMatch.team_a_present_at, away: !!apiMatch.team_b_present_at });
      setEventsByTeam(hydrateEvents(detail?.events ?? [], apiMatch.team_a_id, apiMatch.team_b_id));
      setOpenEventMenu(null);
      setUndoTarget(null);
      setIncidentOpen(false);
      setIncidentDraft("");
      setIncidents([]);
      setReport(null);
      setLocked(false);
      setPaused(false);
      setExtraTimeUnlocked(false);

      // Los cronómetros se sincronizan con los timestamps del servidor
      if (status === "EN_ESPERA") {
        setWaitingSeconds(
          waitingStartedAt ? Math.max(0, waitingDuration - secondsSince(waitingStartedAt)) : waitingDuration
        );
        setLiveSeconds(matchDuration);
        setView("waiting");
      } else if (status === "EN_JUEGO") {
        setLiveSeconds(
          apiMatch.kickoff_at ? Math.max(0, matchDuration - secondsSince(apiMatch.kickoff_at)) : matchDuration
        );
        setView("live");
      } else if (status === "FINALIZADO") {
        // Acta pendiente de publicar: reconstruye el resumen desde el servidor
        const events = hydrateEvents(detail?.events ?? [], apiMatch.team_a_id, apiMatch.team_b_id);
        setEventsByTeam(events);
        setReport(
          buildReport({
            match: card,
            score: { home: apiMatch.score_a ?? 0, away: apiMatch.score_b ?? 0 },
            events,
            incidents: [],
            rosters: { home: toRoster(detail?.teamA ?? null), away: toRoster(detail?.teamB ?? null) },
            walkover: apiMatch.walkover ? `Walkover: ${apiMatch.walkover}` : undefined,
          })
        );
        setView("summary");
      }
    } finally {
      setBusyAction(false);
    }
  }

  // Variante con id explícito (para usarla antes de setMatchDbId)
  async function lifecycleActionFor(id: number, action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/matches/${id}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  }

  // Marca la llegada de un equipo EN EL SERVIDOR (aplica sanción por retraso
  // automáticamente según el minuto). El backend no permite "des-marcar".
  async function togglePresence(team: TeamSide) {
    if (presence[team] || !matchDbId || busyAction) return;
    const { ok, data } = await lifecycleAction("team_present", { team: team === "home" ? "A" : "B" });
    if (!ok) {
      alert(data?.error ?? "No se pudo registrar la llegada del equipo");
      return;
    }
    setPresence((current) => ({ ...current, [team]: true }));
  }

  // Registra el evento localmente (respaldo inmediato) y lo sincroniza con
  // el servidor, que es la fuente de verdad del acta final.
  function registerEvent(team: TeamSide, playerId: string, kind: EventKind) {
    const minute = Math.max(1, Math.ceil((matchDuration - liveSeconds) / 60));
    const event: LiveEvent = {
      id: `${playerId}-${kind}-${Date.now()}`,
      playerId,
      team,
      kind,
      minute,
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

    const teamId = teamIds[team];
    if (matchDbId && teamId) {
      const type = kind === "goal" ? "GOL" : kind === "yellow" ? "AMARILLA" : "ROJA";
      fetch(`/api/matches/${matchDbId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, teamId, playerId: Number(playerId), minute }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const d = await res.json().catch(() => null);
            alert(`El evento quedó guardado localmente pero no se sincronizó: ${d?.error ?? `error ${res.status}`}`);
          }
        })
        .catch(() => {
          alert("Sin conexión: el evento quedó guardado localmente y saldrá en el acta.");
        });
    }
  }

  function submitIncident() {
    if (!incidentDraft.trim()) return;
    const note = incidentDraft.trim();

    setIncidents((current) => [
      ...current,
      {
        id: `incident-${Date.now()}`,
        label: "Nota rápida del incidente",
        note,
      },
    ]);
    setIncidentDraft("");
    setIncidentOpen(false);

    // La nota también queda en el servidor (visible para la mesa de control)
    if (matchDbId) {
      fetch(`/api/matches/${matchDbId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      }).catch(() => {
        // sin conexión: la nota sigue en el respaldo local
      });
    }
  }

  // Avanza desde la espera: kickoff si están los dos, walkover si se agotó
  // la tolerancia. Todo pasa por el servidor.
  async function advanceWaiting() {
    if (!matchDbId || busyAction) return;
    setBusyAction(true);
    try {
      if (waitingSeconds === 0 && presenceCount < 2) {
        const { ok, data } = await lifecycleAction("declare_walkover");
        if (!ok) {
          alert(data?.error ?? "No se pudo declarar el walkover");
          return;
        }
        const walkover = presenceCount === 0
          ? "Doble W: ningún equipo se presentó"
          : "W: el equipo ausente pierde 3-0";
        setReport(
          buildReport({
            match: selectedMatch,
            score: { home: data?.score_a ?? 0, away: data?.score_b ?? 0 },
            events: eventsByTeam,
            incidents,
            rosters,
            walkover,
          })
        );
        setView("summary");
        return;
      }

      if (presenceCount < 2) {
        alert("Ambos equipos deben estar marcados como presentes para el kickoff.");
        return;
      }

      const { ok, data } = await lifecycleAction("kickoff");
      if (!ok) {
        alert(data?.error ?? "No se pudo iniciar el partido");
        return;
      }
      // Si hubo W_4MIN, el kickoff ya insertó el gol de oficio en el servidor
      setLiveSeconds(matchDuration);
      setView("live");
    } finally {
      setBusyAction(false);
    }
  }

  // Pitazo final: cierra el partido en el servidor y arma el resumen
  async function finishMatch() {
    if (!matchDbId || busyAction) return;
    const message = liveSeconds > 0
      ? "Aún queda tiempo en el cronómetro. ¿Finalizar el partido de todas formas?"
      : "¿Finalizar el partido y pasar al resumen?";
    if (!window.confirm(message)) return;
    setBusyAction(true);
    try {
      const { ok, data } = await lifecycleAction("finish");
      if (!ok) {
        alert(data?.error ?? "No se pudo finalizar el partido");
        return;
      }
      // El marcador final lo dicta el servidor (recuenta desde los eventos)
      setReport(
        buildReport({
          match: selectedMatch,
          score: { home: data?.score_a ?? score.home, away: data?.score_b ?? score.away },
          events: eventsByTeam,
          incidents,
          rosters,
        })
      );
      setView("summary");
    } finally {
      setBusyAction(false);
    }
  }

  // Publica el acta: bloquea la edición del supervisor definitivamente
  async function publishReport() {
    if (locked || busyAction) return;
    if (!matchDbId) {
      setLocked(true);
      return;
    }
    setBusyAction(true);
    try {
      const { ok, data } = await lifecycleAction("publish");
      if (!ok) {
        alert(data?.error ?? "No se pudo publicar el acta");
        return;
      }
      setLocked(true);
    } finally {
      setBusyAction(false);
    }
  }

  // Después de publicar: volver al panel con la agenda actualizada
  async function backToDashboard() {
    clearSupervisorCache();
    setView("dashboard");
    setSelectedMatch(EMPTY_CARD);
    setMatchDbId(null);
    setReport(null);
    setLocked(false);
    if (fieldNumber) await loadField(fieldNumber);
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
                      <button
                        type="button"
                        onClick={cycleField}
                        className="w-20 h-20 bg-[#10204c] rounded-2xl flex items-center justify-center shadow-xl border border-white/10 mb-1.5 active:scale-[0.96] transition-transform"
                        title={assignments.length > 1 ? "Toca para cambiar de cancha" : undefined}
                      >
                        <span className="font-secondary-modak text-5xl text-white leading-none mt-1">
                          {fieldNumber ?? "—"}
                        </span>
                      </button>
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
                        {supervisorName || "—"}
                      </h3>
                      <p className="text-[11px] font-medium text-[#10204c]/60 mt-1 truncate w-full max-w-[130px] sm:max-w-none">
                        <span className="font-bold text-[#233c97]/70">Árb:</span> {refereeName || "—"}
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
                {agendaLoading ? (
                  <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)]">
                    Cargando la agenda de la cancha...
                  </div>
                ) : (
                  <>
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

                    {filteredMatches.length > 0 ? (
                      filteredMatches.map((m) => (
                        <MatchCardContainer
                          key={m.id}
                          match={m}
                          onAction={
                            nextUpcoming && String(nextUpcoming.id) === m.id
                              ? () => beginMatchLifecycle(m)
                              : undefined
                          }
                        />
                      ))
                    ) : (
                      <div className="p-4 text-center rounded-2xl bg-[var(--background)]/50 text-[var(--foreground)]/40 italic text-xs border border-dashed border-[var(--border)]">
                        No hay partidos para mostrar en este filtro.
                      </div>
                    )}
                  </>
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
                  <div className="bg-[#10204c] text-white text-[12px] font-weight px-3 py-1 rounded-full shadow-xs tracking-wide">
                    Prog: {selectedMatch.time}
                  </div>
                  <span className="text-[12px] font-weight tracking-wider text-[#10204c]/50 bg-[#10204c]/5 px-2.5 py-1 rounded-full">
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
                  disabled={busyAction}
                  className={`w-fit h-15 rounded-full px-8 text-base font-black text-white shadow-lg transition-all duration-200 active:scale-[0.98] border border-white/20 flex items-center justify-center disabled:opacity-60 ${waitingSeconds === 0 && presenceCount < 2
                    ? "bg-red-600 shadow-red-600/20"
                    : "bg-[#E11D48] shadow-[#E11D48]/20"
                    }`}
                >
                  {waitingActionLabel}
                </button>
              </div>

            </section>
          )}

          {/* VISTA PARTIDO EN VIVO - DISEÑO COMPLETO Y UNIFICADO */}
          {view === "live" && (
            <section className="flex flex-1 flex-col gap-6 font-poppins w-full relative min-h-[75vh] px-2 py-4">

              {/* MARCA DE AGUA (Logo de fondo) */}
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

              {/* ENCABEZADO PRINCIPAL (Bloque único) */}
              <div className="z-10 rounded-[2.5rem] bg-white/45 backdrop-blur-md border-2 border-white/40 p-6 shadow-[0_12px_35px_rgba(16,32,76,0.15)] relative">

                {/* Fila superior: Fase y Cancha */}
                <div className="flex items-center justify-between w-full mb-4">
                  <div className="bg-[#10204c] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedMatch.phase}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#10204c]/50 bg-[#10204c]/5 px-3 py-1 rounded-full">
                    Cancha {fieldNumber ?? "—"}
                  </span>
                </div>

                {/* Fila Central: Cronómetro + Controles */}
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="font-secondary-modak text-6xl text-[#10204c] tracking-tight leading-none">
                    {formatClock(liveSeconds)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaused(!paused)}
                    className="w-12 h-12 rounded-full bg-[#10204c] text-white flex items-center justify-center shadow-lg active:scale-[0.95] transition-transform shrink-0"
                  >
                    {paused ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    )}
                  </button>
                </div>

                {/* MARCADOR INTEGRADO (Simétrico con logos) */}
                <div className="border-t border-[#10204c]/10 pt-4 flex justify-center items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/50 border border-[#10204c]/10 flex items-center justify-center">
                    <span className="text-[8px] text-[#10204c]/40 font-bold">L</span>
                  </div>
                  <div className="font-secondary-modak text-5xl text-[#10204c] tracking-[0.1em]">
                    {score.home} - {score.away}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/50 border border-[#10204c]/10 flex items-center justify-center">
                    <span className="text-[8px] text-[#10204c]/40 font-bold">V</span>
                  </div>
                </div>
              </div>

              {/* LISTA DE JUGADORES (RosterPanels) */}
              <div className="z-10 grid gap-4">
                <RosterPanel
                  title={selectedMatch.homeTeam}
                  side="home"
                  players={rosters.home}
                  events={eventsByTeam.home}
                  openEventMenu={openEventMenu}
                  onOpenEventMenu={setOpenEventMenu}
                  onRegisterEvent={registerEvent}
                  undoTarget={undoTarget}
                />
                <RosterPanel
                  title={selectedMatch.awayTeam}
                  side="away"
                  players={rosters.away}
                  events={eventsByTeam.away}
                  openEventMenu={openEventMenu}
                  onOpenEventMenu={setOpenEventMenu}
                  onRegisterEvent={registerEvent}
                  undoTarget={undoTarget}
                />
              </div>

              {/* BOTÓN DE PITAZO FINAL */}
              <div className="z-10 w-full flex justify-center pb-16">
                <button
                  type="button"
                  onClick={finishMatch}
                  disabled={busyAction}
                  className="w-fit rounded-full bg-[#10204c] px-8 py-4 text-base font-black text-white shadow-lg transition-all duration-200 active:scale-[0.98] border border-white/20 disabled:opacity-60"
                >
                  Finalizar partido
                </button>
              </div>

              {/* BOTÓN FLOTANTE DE INCIDENTES */}
              <button
                type="button"
                onClick={() => setIncidentOpen(true)}
                className="fixed bottom-28 right-6 z-30 h-14 w-14 rounded-full bg-[#f83636] text-white shadow-xl flex items-center justify-center font-black text-xl hover:scale-105 transition-transform border border-white/20"
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
                  {report.walkover && (
                    <p className="mt-2 text-center text-xs font-bold text-amber-300">{report.walkover}</p>
                  )}
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
                onClick={publishReport}
                disabled={locked || busyAction}
                className="mt-auto h-16 rounded-full bg-[#10204c] px-6 text-base font-semibold text-white disabled:opacity-70"
              >
                {locked ? "Acta publicada y bloqueada" : "Guardar y enviar a mesa de control"}
              </button>

              {locked && (
                <button
                  type="button"
                  onClick={backToDashboard}
                  className="h-12 rounded-full border-2 border-[#10204c]/20 bg-white px-6 text-sm font-bold text-[#10204c] shadow-sm transition-all active:scale-[0.98]"
                >
                  Volver al panel de la cancha
                </button>
              )}
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
        {/* Botón de Cerrar Sesión fijo (Solo visible en Dashboard) */}
        {view === "dashboard" && (
          <button
            type="button"
            onClick={handleLogout}
            className="fixed bottom-6 left-6 z-50 bg-[#f83636] hover:bg-[#d62b2b] text-white text-xs font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center gap-2"
          >
            Cerrar sesión
          </button>
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
        {players.length === 0 && (
          <div className="text-sm text-slate-400 italic p-2">
            Este equipo aún no tiene jugadores registrados.
          </div>
        )}
        {players.map((player) => {
          // Roja en ESTE partido o expulsión previa en el torneo: bloqueado
          const sentOff = isPlayerSentOff(events, player.id) || !!player.suspended;
          const latestEvent = getLatestEvent(events, player.id);

          return (
            <div
              key={player.id}
              className={`rounded-[1.25rem] border px-3 py-3 flex flex-col gap-2 ${sentOff ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {player.name}
                  {player.suspended && <span className="ml-2 text-[10px] font-bold text-red-500">SUSPENDIDO</span>}
                </span>
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
                  Último: {latestEvent.kind === "goal" ? "⚽" : latestEvent.kind === "yellow" ? "🟨" : "🟥"} ({latestEvent.minute}&apos;)
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
