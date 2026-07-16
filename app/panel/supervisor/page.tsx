"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderSupervisor from "@/app/components/HeaderSupervisor";
import Footer from "@/app/components/Footer";

type View = "config" | "dashboard" | "waiting" | "live" | "summary";
type MatchStatus = "upcoming" | "live" | "finished";
type Filter = "upcoming" | "live" | "finished";
type TeamSide = "home" | "away";
type EventKind = "goal" | "yellow" | "red";
type Assignment = {
  id: number;
  day: string;
  field_number: number;
  supervisor_name: string;
  referee_name: string;
};

type MatchCard = {
  id: number;
  teamAId: number;
  teamBId: number;
  time: string;
  phase: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  readyNow?: boolean;
};

type Player = {
  id: number;
  name: string;
  suspended?: boolean;
};

type LiveEvent = {
  id: number;
  playerId: number;
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

// ── Conexión al backend ─────────────────────────────────────
async function api<T = unknown>(path: string, options?: RequestInit, _retried = false): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  // Token vencido: renueva la sesión una vez y reintenta
  if (res.status === 401 && !_retried && !path.startsWith("/api/auth/")) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshed.ok) return api<T>(path, options, true);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? `Error ${res.status}`);
  }
  return data as T;
}

const phaseLabels: Record<string, string> = {
  GRUPOS: "Fase de Grupos",
  CUARTOS: "Cuartos de Final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

type ApiMatch = {
  id: number;
  phase: string;
  status: string;
  field_number: number;
  scheduled_at: string;
  team_a_id: number;
  team_b_id: number;
  score_a: number | null;
  score_b: number | null;
  waiting_started_at: string | null;
  team_a_present_at: string | null;
  team_b_present_at: string | null;
  kickoff_at: string | null;
  published_at: string | null;
  walkover: string | null;
  teamA: { id: number; name: string; players?: Player[] } | null;
  teamB: { id: number; name: string; players?: Player[] } | null;
  events?: Array<{ id: number; type: string; minute: number | null; team_id: number; player_id: number | null }>;
};

function toMatchCard(m: ApiMatch): MatchCard {
  const scheduled = new Date(m.scheduled_at);
  const status: MatchStatus =
    m.status === "FINALIZADO" ? "finished" : m.status === "PROGRAMADO" ? "upcoming" : "live";
  return {
    id: m.id,
    teamAId: m.team_a_id,
    teamBId: m.team_b_id,
    time: scheduled.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    phase: phaseLabels[m.phase] ?? m.phase,
    homeTeam: m.teamA?.name ?? "Equipo A",
    awayTeam: m.teamB?.name ?? "Equipo B",
    status,
    readyNow: status === "upcoming" && scheduled.getTime() <= Date.now(),
  };
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

function isPlayerSentOff(events: Record<string, LiveEvent[]>, playerId: number) {
  return events[playerId]?.some((event) => event.kind === "red") ?? false;
}

function getLatestEvent(events: Record<string, LiveEvent[]>, playerId: number) {
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
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const goals = [
    ...Object.entries(params.events.home).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "goal")
        .map(() => {
          const player = params.homePlayers.find((entry) => String(entry.id) === playerId);
          return {
            label: player?.name ?? "Gol de oficio (W)",
            team: params.match.homeTeam,
          };
        }),
    ),
    ...Object.entries(params.events.away).flatMap(([playerId, playerEvents]) =>
      playerEvents
        .filter((event) => event.kind === "goal")
        .map(() => {
          const player = params.awayPlayers.find((entry) => String(entry.id) === playerId);
          return {
            label: player?.name ?? "Gol de oficio (W)",
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
          const player = params.homePlayers.find((entry) => String(entry.id) === playerId);
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
          const player = params.awayPlayers.find((entry) => String(entry.id) === playerId);
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

type AuthState =
  | { status: "checking" }
  | { status: "guest" }
  | { status: "authed"; name: string; role: string }
  | { status: "needs-login" };

export default function SupervisorPage() {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const [view, setView] = useState<View>("config");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [supervisor, setSupervisor] = useState<string>("");
  const [matchList, setMatchList] = useState<MatchCard[]>([]);
  const [agendaSummary, setAgendaSummary] = useState({ total: 0, played: 0 });
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [extraMin, setExtraMin] = useState(0);
  const [supervisorMenuOpen, setSupervisorMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>("upcoming");
  const [selectedMatch, setSelectedMatch] = useState<MatchCard | null>(null);
  const [waitingSeconds, setWaitingSeconds] = useState(waitingDuration);
  const [presence, setPresence] = useState(createEmptyPresence);
  const [liveSeconds, setLiveSeconds] = useState(matchDuration);
  const [paused, setPaused] = useState(false);
  const [extraTimeUnlocked, setExtraTimeUnlocked] = useState(false);
  const [eventsByTeam, setEventsByTeam] = useState(createEmptyEvents);
  const [openEventMenu, setOpenEventMenu] = useState<{
    team: TeamSide;
    playerId: number;
  } | null>(null);
  const [undoTarget, setUndoTarget] = useState<{
    team: TeamSide;
    playerId: number;
    eventId: number;
  } | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [locked, setLocked] = useState(false);
  const supervisorSelectRef = useRef<HTMLDivElement | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const score = countGoals(eventsByTeam);
  const assignment = assignments.find((a) => a.supervisor_name === supervisor) ?? null;

  // Chequeo de sesión al entrar: authed | guest (modo abierto) | needs-login
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: { name: string; role: string } | null; openMode: boolean }) => {
        if (d.user) setAuth({ status: "authed", name: d.user.name, role: d.user.role });
        else if (d.openMode) setAuth({ status: "guest" });
        else setAuth({ status: "needs-login" });
      })
      .catch(() => setAuth({ status: "needs-login" }));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo iniciar sesión");
      setAuth({ status: "authed", name: d.name, role: d.role });
      setLoginPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Error de inicio de sesión");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAuth({ status: "needs-login" });
    setView("config");
  }

  useEffect(() => {
    if (auth.status === "checking" || auth.status === "needs-login") return;
    api<Assignment[]>("/api/agenda")
      .then((data) => {
        setAssignments(data);
        // Si hoy solo hay una asignación, selecciona ese perfil automáticamente
        if (data.length === 1) {
          setSupervisor((current) => current || data[0].supervisor_name);
        }
      })
      .catch((err) => console.error("No se pudieron cargar las asignaciones:", err));
  }, [auth.status]);

  async function loadAgenda(fieldNumber: number) {
    try {
      const data = await api<{ summary: { total: number; played: number }; matches: ApiMatch[] }>(
        `/api/agenda?field=${fieldNumber}`,
      );
      setMatchList(data.matches.map(toMatchCard));
      setAgendaSummary(data.summary);
    } catch (err) {
      console.error("No se pudo cargar la agenda:", err);
    }
  }

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

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!supervisorSelectRef.current) return;
      if (!supervisorSelectRef.current.contains(event.target as Node)) {
        setSupervisorMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  const readyMatches = matchList.filter((match) => match.status === activeFilter);
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

  async function beginMatchLifecycle(match: MatchCard) {
    setSelectedMatch(match);
    setWaitingSeconds(waitingDuration);
    setPresence(createEmptyPresence());
    setLiveSeconds(matchDuration);
    setPaused(false);
    setExtraTimeUnlocked(false);
    setExtraMin(0);
    setEventsByTeam(createEmptyEvents());
    setOpenEventMenu(null);
    setUndoTarget(null);
    setIncidentOpen(false);
    setIncidentDraft("");
    setIncidents([]);
    setReport(null);
    setLocked(false);

    try {
      // Trae plantillas y estado real del partido desde el backend
      const detail = await api<ApiMatch>(`/api/matches/${match.id}`);
      const teamAPlayers = detail.teamA?.players ?? [];
      const teamBPlayers = detail.teamB?.players ?? [];
      setHomePlayers(teamAPlayers);
      setAwayPlayers(teamBPlayers);

      // Reconstruye eventos ya registrados (resiste recargas de página)
      const grouped = createEmptyEvents();
      for (const e of detail.events ?? []) {
        const side: TeamSide = e.team_id === detail.team_a_id ? "home" : "away";
        const key = String(e.player_id ?? 0);
        const live: LiveEvent = {
          id: e.id,
          playerId: e.player_id ?? 0,
          team: side,
          kind: e.type === "GOL" ? "goal" : e.type === "AMARILLA" ? "yellow" : "red",
          minute: e.minute ?? 0,
        };
        grouped[side][key] = [...(grouped[side][key] ?? []), live];
      }
      setEventsByTeam(grouped);

      const elapsedSince = (iso: string | null) =>
        iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 1000) : 0;

      if (detail.status === "PROGRAMADO") {
        await api(`/api/matches/${match.id}/lifecycle`, {
          method: "POST",
          body: JSON.stringify({ action: "start_waiting" }),
        });
        setView("waiting");
      } else if (detail.status === "EN_ESPERA") {
        // Retoma la espera donde iba: reloj y presencias desde el servidor
        setWaitingSeconds(Math.max(0, waitingDuration - elapsedSince(detail.waiting_started_at)));
        setPresence({
          home: Boolean(detail.team_a_present_at),
          away: Boolean(detail.team_b_present_at),
        });
        setView("waiting");
      } else if (detail.status === "EN_JUEGO") {
        setLiveSeconds(Math.max(0, matchDuration - elapsedSince(detail.kickoff_at)));
        setPresence({ home: true, away: true });
        setView("live");
      } else {
        // Partido terminado: acta en solo lectura
        setLocked(Boolean(detail.published_at));
        setReport(
          buildReport({
            match,
            score: { home: detail.score_a ?? 0, away: detail.score_b ?? 0 },
            events: grouped,
            incidents: [],
            walkover: detail.walkover ? `Walkover (${detail.walkover})` : undefined,
            homePlayers: teamAPlayers,
            awayPlayers: teamBPlayers,
          }),
        );
        setView("summary");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo abrir el partido");
    }
  }

  function selectSupervisor(name: string) {
    setSupervisor(name);
    setSupervisorMenuOpen(false);
  }

  async function togglePresence(team: TeamSide) {
    if (!selectedMatch || presence[team]) {
      return; // la llegada no se "des-marca"
    }
    try {
      await api(`/api/matches/${selectedMatch.id}/lifecycle`, {
        method: "POST",
        body: JSON.stringify({ action: "team_present", team: team === "home" ? "A" : "B" }),
      });
      setPresence((current) => ({ ...current, [team]: true }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo marcar la presencia");
    }
  }

  async function registerEvent(team: TeamSide, playerId: number, kind: EventKind) {
    if (!selectedMatch) return;
    const teamId = team === "home" ? selectedMatch.teamAId : selectedMatch.teamBId;
    const minute = Math.max(1, 26 - Math.ceil(liveSeconds / 60));
    try {
      const saved = await api<{ id: number }>(`/api/matches/${selectedMatch.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          type: kind === "goal" ? "GOL" : kind === "yellow" ? "AMARILLA" : "ROJA",
          teamId,
          playerId,
          minute,
        }),
      });

      const event: LiveEvent = { id: saved.id, playerId, team, kind, minute };
      const key = String(playerId);
      setEventsByTeam((current) => ({
        ...current,
        [team]: {
          ...current[team],
          [key]: [...(current[team][key] ?? []), event],
        },
      }));
      setUndoTarget({ team, playerId, eventId: saved.id });
      setOpenEventMenu(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo registrar el evento");
    }
  }

  async function undoEvent() {
    const target = undoTarget;
    if (!target || !selectedMatch) return;
    try {
      await api(`/api/matches/${selectedMatch.id}/events/${target.eventId}`, {
        method: "DELETE",
      });
      const key = String(target.playerId);
      setEventsByTeam((current) => {
        const playerEvents = current[target.team][key] ?? [];
        return {
          ...current,
          [target.team]: {
            ...current[target.team],
            [key]: playerEvents.filter((event) => event.id !== target.eventId),
          },
        };
      });
      setUndoTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo deshacer el evento");
    }
  }

  async function submitIncident() {
    if (!incidentDraft.trim() || !selectedMatch) {
      return;
    }
    try {
      await api(`/api/matches/${selectedMatch.id}/incidents`, {
        method: "POST",
        body: JSON.stringify({ note: incidentDraft.trim() }),
      });
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar el incidente");
    }
  }

  async function advanceWaiting() {
    if (!selectedMatch) return;

    if (waitingSeconds === 0 && presenceCount < 2) {
      try {
        await api(`/api/matches/${selectedMatch.id}/lifecycle`, {
          method: "POST",
          body: JSON.stringify({ action: "declare_walkover" }),
        });
        const walkover = presenceCount === 0 ? "Doble walkover (sin puntos)" : "Walkover 3-0";
        setReport(
          buildReport({
            match: selectedMatch,
            score,
            events: eventsByTeam,
            incidents,
            walkover,
            homePlayers,
            awayPlayers,
          }),
        );
        setView("summary");
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo declarar el walkover");
      }
      return;
    }

    if (presenceCount < 2) {
      alert("Marca la presencia de ambos equipos antes de empezar");
      return;
    }

    try {
      await api(`/api/matches/${selectedMatch.id}/lifecycle`, {
        method: "POST",
        body: JSON.stringify({ action: "kickoff" }),
      });
      setView("live");
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo iniciar el partido");
    }
  }

  function addExtraTime() {
    setExtraTimeUnlocked(true);
    setExtraMin((current) => current + 2);
    setLiveSeconds((current) => current + 120);
    setPaused(false);
  }

  async function finishMatch() {
    if (!selectedMatch) return;
    try {
      await api(`/api/matches/${selectedMatch.id}/lifecycle`, {
        method: "POST",
        body: JSON.stringify({ action: "finish", extraTimeMin: extraMin }),
      });
      setReport(
        buildReport({
          match: selectedMatch,
          score,
          events: eventsByTeam,
          incidents,
          homePlayers,
          awayPlayers,
        }),
      );
      setView("summary");
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo finalizar el partido");
    }
  }

  async function saveAndLock() {
    if (!selectedMatch) return;
    try {
      await api(`/api/matches/${selectedMatch.id}/lifecycle`, {
        method: "POST",
        body: JSON.stringify({ action: "publish" }),
      });
      setLocked(true);
      if (assignment) void loadAgenda(assignment.field_number);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo publicar el acta");
    }
  }

  // Pantalla de carga mientras se verifica la sesión
  if (auth.status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--background)] text-[color:var(--primary)]">
        <p className="text-sm font-semibold">Cargando...</p>
      </div>
    );
  }

  // Pantalla de login (solo cuando ya existe staff registrado)
  if (auth.status === "needs-login") {
    return (
      <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
        <HeaderSupervisor />
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm space-y-5 rounded-[2rem] border border-[#d8def3] bg-white p-6 shadow-[0_20px_40px_rgba(35,60,151,0.05)]"
          >
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-medium tracking-wide text-[color:var(--primary)]">Mesa de control</h1>
              <p className="text-sm text-slate-400">Ingresa con tu cuenta de staff</p>
            </div>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="correo@tmtcup.com"
              className="h-14 w-full rounded-[1.25rem] border-2 border-[#c9d1f0] bg-[#f9fbff] px-5 text-base outline-none focus:border-[color:var(--primary)] focus:bg-white"
            />
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Contraseña"
              className="h-14 w-full rounded-[1.25rem] border-2 border-[#c9d1f0] bg-[#f9fbff] px-5 text-base outline-none focus:border-[color:var(--primary)] focus:bg-white"
            />
            {loginError && (
              <p className="rounded-[1rem] bg-[color:var(--danger)]/10 px-4 py-2 text-sm font-semibold text-[color:var(--danger)]">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginBusy}
              className="h-14 w-full rounded-[1.25rem] bg-[color:var(--primary)] text-lg font-semibold text-white shadow-[0_10px_25px_rgba(35,60,151,0.15)] transition active:scale-[0.98] disabled:opacity-50"
            >
              {loginBusy ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      <HeaderSupervisor />

      <main className="flex-1 px-4 pb-16 text-[15px] text-[color:var(--foreground)] sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-md flex flex-col gap-6 sm:max-w-lg items-center">

          {view === "config" && (
            <section className="font-poppins space-y-6 w-full flex flex-col items-center animate-fade-in">
              <div className="flex justify-center pt-2">
                <Image
                  src="/assets/Logo_tMtCup.svg"
                  alt="Logo TMT CUP"
                  width={260}
                  height={260}
                  className="object-contain drop-shadow-[0_12px_24px_rgba(35,60,151,0.08)] sm:h-72 sm:w-72"
                  priority
                />
              </div>

              <div className="w-full space-y-6 rounded-3xl border border-[#e2e8f5] bg-white p-6 shadow-[0_15px_35px_rgba(35,60,151,0.04)]">
                <div className="space-y-1 text-center">
                  <label className="block text-xl sm:text-2xl font-medium tracking-wide text-[color:var(--primary)]" htmlFor="supervisor-select">
                    Selecciona tu perfil
                  </label>
                  <p className="text-xs sm:text-sm text-slate-400 font-normal">
                    Elige tu nombre para acceder a la mesa de control
                  </p>
                </div>

                <div className="relative" ref={supervisorSelectRef}>
                  <button
                    id="supervisor-select"
                    type="button"
                    onClick={() => setSupervisorMenuOpen(!supervisorMenuOpen)}
                    className="flex h-14 w-full items-center justify-between gap-4 rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-4 text-left text-sm font-medium text-[color:var(--foreground)] outline-none transition-all duration-200 focus:border-[color:var(--primary)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(35,60,151,0.08)]"
                  >
                    <span className={supervisor ? "text-[color:var(--foreground)] font-normal" : "text-slate-400"}>
                      {supervisor || "Elige tu nombre..."}
                    </span>
                    <svg
                      viewBox="0 0 20 20"
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${supervisorMenuOpen ? "rotate-180 text-[color:var(--primary)]" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {supervisorMenuOpen && (
                    <div
                      role="listbox"
                      className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-56 overflow-y-auto rounded-[1.25rem] border border-[#c9d1f0] bg-white p-2 shadow-[0_20px_40px_rgba(35,60,151,0.12)] animate-select-dropdown"
                    >
                      {assignments.map((entry) => {
                        const name = entry.supervisor_name;
                        const selected = supervisor === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => selectSupervisor(name)}
                            className={`flex w-full items-center justify-between rounded-[1rem] px-4 py-3 text-left text-base font-semibold transition ${selected ? "bg-[color:var(--primary)] text-white" : "bg-white text-[color:var(--foreground)] hover:bg-[#eef3ff]"}`}
                          >
                            <span>{name}</span>
                            {selected && <span className="text-sm font-bold text-[color:var(--accent)]">Seleccionado</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {supervisor && (
                  <div className="grid gap-3 rounded-[1.5rem] border border-[#e2e8f5] bg-[#f9fbff]/60 p-4 text-sm sm:grid-cols-2 animate-fade-in">
                    <div className="rounded-[1.15rem] border border-[color:var(--border)] bg-white px-4 py-3.5 shadow-sm">
                      <p className="text-xs font-medium text-slate-400">Árbitro central</p>
                      <p className="mt-0.5 text-base font-bold text-[color:var(--foreground)] tracking-wide">{assignment?.referee_name ?? "Por asignar"}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-[color:var(--border)] bg-white px-4 py-3.5 shadow-sm">
                      <p className="text-xs font-medium text-slate-400">Cancha asignada</p>
                      <p className="mt-0.5 text-base font-bold text-[color:var(--foreground)] tracking-wide">{assignment ? `Cancha ${assignment.field_number}` : "Por asignar"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={!supervisor || isExiting}
                  onClick={() => {
                    setIsExiting(true);
                    if (assignment) void loadAgenda(assignment.field_number);
                    setView("dashboard");
                    setTimeout(() => {
                      setIsExiting(false);
                    }, 350);
                  }}
                  className="inline-flex h-14 w-fit items-center justify-center rounded-[1.25rem] bg-[color:var(--primary)] px-8 text-xl font-semibold text-white shadow-[0_10px_25px_rgba(35,60,151,0.15)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"
                >
                  Ingresar al panel
                </button>
              </div>

              {/* Sesión activa + cerrar sesión */}
              {auth.status === "authed" && (
                <p className="pt-3 text-center text-sm text-slate-400">
                  Sesión:{" "}
                  <span className="font-semibold text-[color:var(--primary)]">{auth.name}</span>{" "}
                  ({auth.role === "ADMIN" ? "Admin" : "Supervisor"}) ·{" "}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="font-semibold text-[color:var(--danger)] underline-offset-2 hover:underline"
                  >
                    Cerrar sesión
                  </button>
                </p>
              )}
            </section>
          )}

          {/* VISTA DEL DASHBOARD / PANEL PRINCIPAL */}
          {view === "dashboard" && (
            <section className={`flex flex-1 flex-col gap-4 w-full ${isExiting ? "animate-view-enter-right" : ""}`}>
              {/* Encabezado con efecto de desvanecimiento gradual */}
              <header className="sticky top-0 z-20 -mx-4 -mt-6 mb-2 bg-[color:var(--primary)]/80 px-6 py-5 text-white shadow-sm blur-gradient-header">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-white/75">Cancha asignada</p>
                    <h2 className="text-2xl font-semibold tracking-wide">Cancha {assignment?.field_number ?? "—"}</h2>
                  </div>
                  <div className="rounded-full bg-white/12 px-3 py-2 text-sm font-semibold backdrop-blur-md">Partidos: {agendaSummary.played}/{agendaSummary.total}</div>
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
                    onClick={() => void beginMatchLifecycle(match)}
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
          {view === "waiting" && selectedMatch && (
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
                      onClick={() => void togglePresence(team.key)}
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
                onClick={() => void advanceWaiting()}
                className={`mt-auto h-16 rounded-full px-6 text-base font-semibold text-white shadow-[0_14px_32px_rgba(35,60,151,0.22)] transition active:scale-[0.99] ${waitingSeconds === 0 && presenceCount < 2 ? "bg-[color:var(--danger)]" : "bg-[color:var(--primary)]"}`}
              >
                {waitingActionLabel}
              </button>
            </section>
          )}

          {/* VISTA PARTIDO EN VIVO */}
          {view === "live" && selectedMatch && (
            <section className="flex flex-1 flex-col gap-4 pb-16">
              <header className="rounded-[1.75rem] bg-[color:var(--primary)] p-4 text-white shadow-[0_18px_40px_rgba(35,60,151,0.18)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.26em] text-white/70">
                  <span>{selectedMatch.phase}</span>
                  <span className="font-semibold">Cancha {assignment?.field_number ?? "—"}</span>
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
                  onRequestUndo={setUndoTarget}
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
                  onRequestUndo={setUndoTarget}
                  undoTarget={undoTarget}
                />
              </div>

              <div className="flex justify-center pt-1 w-full">
                <button
                  type="button"
                  onClick={() => setIncidentOpen(true)}
                  className="fixed bottom-28 right-6 z-30 h-14 w-14 rounded-full bg-[color:var(--danger)] text-xl font-bold text-white shadow-lg flex items-center justify-center ring-4 ring-white"
                  aria-label="Abrir reporte de incidentes"
                >
                  !
                </button>
              </div>

              <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-[color:var(--border)] bg-white/90 px-4 py-3 backdrop-blur-xl">
                <div className="flex gap-2">
                  {extraTimeUnlocked && (
                    <button
                      type="button"
                      onClick={addExtraTime}
                      className="h-14 flex-1 rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--primary)]"
                    >
                      + Añadir tiempo extra
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void finishMatch()}
                    className="h-14 flex-1 rounded-full bg-[color:var(--primary)] px-4 text-sm font-semibold text-white"
                  >
                    Finalizar y publicar partido
                  </button>
                </div>
              </div>

              {undoTarget && (
                <div className="fixed bottom-24 left-1/2 z-30 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-full border border-[color:var(--border)] bg-white/95 px-4 py-3 text-center shadow-[0_16px_40px_rgba(15,23,42,0.15)] backdrop-blur-md">
                  <button type="button" onClick={() => void undoEvent()} className="text-sm font-semibold text-[color:var(--danger)]">
                    Deshacer último evento
                  </button>
                </div>
              )}
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
                onClick={() => void saveAndLock()}
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
              <button type="button" onClick={() => void submitIncident()} className="mt-3 h-14 w-full rounded-full bg-[color:var(--danger)] text-sm font-semibold text-white shadow-md">
                Guardar nota del incidente
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
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
  onRequestUndo,
  undoTarget,
}: {
  title: string;
  side: TeamSide;
  players: Player[];
  events: Record<string, LiveEvent[]>;
  openEventMenu: { team: TeamSide; playerId: number } | null;
  onOpenEventMenu: React.Dispatch<React.SetStateAction<{ team: TeamSide; playerId: number } | null>>;
  onRegisterEvent: (team: TeamSide, playerId: number, kind: EventKind) => void;
  onRequestUndo: React.Dispatch<React.SetStateAction<{ team: TeamSide; playerId: number; eventId: number } | null>>;
  undoTarget: { team: TeamSide; playerId: number; eventId: number } | null;
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
          const sentOff = Boolean(player.suspended) || isPlayerSentOff(events, player.id);
          const latestEvent = getLatestEvent(events, player.id);
          const hasUndoTarget = undoTarget?.playerId === player.id && undoTarget?.team === side;

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