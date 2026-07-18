"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchSessionUser } from "@/lib/session-client";
import { HistoryPanel } from "./components/HistoryPanel";

// ── Tipos ──────────────────────────────────────────────────
type MatchEvent = {
  id: number;
  type: "GOL" | "AMARILLA" | "ROJA";
  minute: number;
  team: "A" | "B";
  player: string;
};

type FinishedMatchActa = {
  id: number;
  fieldNumber: number;
  gender: "masculino" | "femenino";
  phase: string;
  teamA: string;
  logoA?: string;
  teamB: string;
  logoB?: string;
  scoreA: number;
  scoreB: number;
  supervisorName: string;
  finishedAt: string;
  events: MatchEvent[];
  incidentsNotes?: string;
  isLocked: boolean;
  group?: string;
};

type AdminPlayer = {
  id: number;
  name: string;
  document?: string | null;
  team_id: number;
  team: { id: number; name: string } | null;
};

type AdminTeam = { id: number; name: string; category: "MASCULINO" | "FEMENINO" };

type AuditLog = {
  id: number;
  adminName: string;
  adminEmail: string;
  timestamp: string;
  action: string;
  details: string;
  matchId: number;
  gender: "masculino" | "femenino";
};

// ── Componentes de Soporte (Tarjetas de Auditoría) ────────

function AuditLogCard({ log }: { log: AuditLog }) {
  const isGol = log.action.toLowerCase().includes("gol");

  let eventosAntes: MatchEvent[] = [];
  let eventosDespues: MatchEvent[] = [];

  try {
    const datos = JSON.parse(log.details);
    eventosAntes = datos.antes || [];
    eventosDespues = datos.despues || [];
  } catch (e) {
    eventosAntes = [];
    eventosDespues = [];
  }

  const renderListaEventos = (eventos: MatchEvent[]) => {
    if (eventos.length === 0) {
      return <span className="text-[11px] text-gray-400 italic font-light">Sin eventos</span>;
    }
    return (
      <div className="space-y-1 w-full text-left px-1">
        {eventos.map((ev) => (
          <div key={ev.id} className="text-[11px] font-light text-gray-700 flex items-center gap-1 bg-white p-1 rounded-lg border border-black/5 truncate">
            <span className="shrink-0">
              {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"}
            </span>
            <span className="truncate">
              {ev.player} <span className="text-gray-400">({ev.minute}&apos;)</span>
            </span>
            <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1 rounded-sm shrink-0 ml-auto">
              {ev.team}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full rounded-2xl p-4 shadow-[0_2px_12px_rgba(16,32,76,0.02)] transition-all font-poppins text-left bg-white border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">
          {isGol ? "⚽" : "🟨"}
        </span>
        <span className="text-xs font-bold text-[#10204c]/80 tracking-wide">
          {isGol ? "Ajuste de goles" : "Ajuste de tarjetas"}
        </span>
      </div>

      <div className="grid grid-cols-7 items-start bg-gray-50/60 p-3 rounded-xl border border-gray-100 gap-1 min-h-[80px]">
        <div className="col-span-3 flex flex-col items-center justify-start w-full">
          <span className="text-[10px] text-gray-400 font-medium mb-2 block text-center">Registro inicial</span>
          {renderListaEventos(eventosAntes)}
        </div>

        <div className="col-span-1 flex items-center justify-center text-gray-400 h-full self-center">
          <span className="material-symbols-outlined !text-[18px] md:!text-[20px]">
            arrow_forward
          </span>
        </div>

        <div className="col-span-3 flex flex-col items-center justify-start w-full">
          <span className="text-[10px] text-gray-400 font-medium mb-2 block text-center">Resultado final</span>
          {renderListaEventos(eventosDespues)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50 text-[10px] md:text-xs text-gray-400">
        <span>
          Por: <strong className="font-semibold text-gray-600">{log.adminName}</strong>
        </span>
        <span className="opacity-75">{log.timestamp} hs</span>
      </div>
    </div>
  );
}

// ── Componentes de Actas de Partido con Incidentes Integrados ──

export function FinishedMatchCardMasculino({ acta, onEdit }: { acta: FinishedMatchActa; onEdit: (acta: FinishedMatchActa) => void }) {
  return (
    <div
      data-theme="masculino"
      className="w-full rounded-3xl p-4 md:p-6 shadow-[0_4px_20px_rgba(16,32,76,0.02)] transition-all font-poppins"
      style={{ backgroundColor: "var(--card-strong)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between border-b border-gray-50 pb-2 md:pb-3 mb-3 md:mb-4">
        <span className="text-xs md:text-sm font-light tracking-widest" style={{ color: "var(--foreground)", opacity: 0.5 }}>
          Cancha {acta.fieldNumber} • <span className="font-normal">{acta.phase}</span> {acta.group && `• ${acta.group}`}
        </span>
        <span className="px-3 py-1 rounded-full text-[10px] md:text-xs font-medium" style={{ backgroundColor: "rgba(22, 163, 74, 0.1)", color: "var(--success)" }}>
          Finalizado
        </span>
      </div>

      <div className="grid grid-cols-7 items-center justify-between my-2">
        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xs md:text-base font-normal border border-gray-100 shadow-sm transition-all" style={{ backgroundColor: "rgba(16, 32, 76, 0.02)", color: "var(--primary)" }}>
            {acta.logoA ? <img src={acta.logoA} alt={acta.teamA} className="w-full h-full object-contain rounded-full" /> : acta.teamA.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs md:text-sm font-medium truncate max-w-full px-1" style={{ color: "var(--foreground)" }}>
            {acta.teamA}
          </span>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="font-secondary-modak flex items-baseline justify-center gap-1 tabular-nums transition-all" style={{ fontSize: 'clamp(2.1rem, 4vw, 3.5rem)', lineHeight: 1 }}>
            <span style={{ color: "var(--primary)" }}>{acta.scoreA}</span>
            <span className="text-gray-300 font-light text-xl md:text-3xl -mb-0.5">:</span>
            <span style={{ color: "var(--primary)" }}>{acta.scoreB}</span>
          </div>
        </div>

        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xs md:text-base font-normal border border-gray-100 shadow-sm transition-all" style={{ backgroundColor: "rgba(16, 32, 76, 0.02)", color: "var(--primary)" }}>
            {acta.logoB ? <img src={acta.logoB} alt={acta.teamB} className="w-full h-full object-contain rounded-full" /> : acta.teamB.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs md:text-sm font-medium truncate max-w-full px-1" style={{ color: "var(--foreground)" }}>
            {acta.teamB}
          </span>
        </div>
      </div>

      {acta.events.length > 0 && (
        <div className="border-t border-gray-50 mt-4 pt-3 text-[11px] md:text-xs space-y-2" style={{ color: "var(--foreground)", opacity: 0.7 }}>
          {acta.events.map((ev) => (
            <div key={ev.id} className="grid grid-cols-2 gap-4">
              <div className="text-left pl-1 min-h-[16px] font-light">
                {ev.team === "A" && (
                  <span>
                    {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.player} ({ev.minute}&apos;)
                  </span>
                )}
              </div>
              <div className="text-right pr-1 min-h-[16px] font-light">
                {ev.team === "B" && (
                  <span>
                    {ev.player} ({ev.minute}&apos;) {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {acta.incidentsNotes && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-50/60 border border-amber-100 text-left">
          <span className="text-[12px] font-medium tracking-wider text-amber-800 flex items-center gap-1">
            <span className="material-symbols-outlined !text-[14px]">warning</span> Incidentes:
          </span>
          <p className="text-xs font-light text-amber-950 mt-1 italic">&quot;{acta.incidentsNotes}&quot;</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <div className="flex flex-col text-gray-400 justify-center text-left">
          <span className="text-[10px] md:text-xs leading-tight">
            Enviado por: <strong className="font-semibold" style={{ color: "var(--foreground)" }}>{acta.supervisorName}</strong>
          </span>
          <span className="text-[9px] md:text-[11px] opacity-75">{acta.finishedAt} hs</span>
        </div>
        <button
          type="button"
          onClick={() => onEdit(acta)}
          className="bg-[#233c97] hover:bg-[#1a2e75] text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap flex items-center justify-center h-8 min-[375px]:h-9 md:h-10 text-[9px] min-[375px]:text-[10px] min-[425px]:text-xs md:text-xs lg:text-xs px-4 min-[375px]:px-5 md:px-6 py-2.5"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

export function FinishedMatchCardFemenino({ acta, onEdit }: { acta: FinishedMatchActa; onEdit: (acta: FinishedMatchActa) => void }) {
  return (
    <div
      data-theme="femenino"
      className="w-full rounded-3xl p-4 md:p-6 shadow-[0_4px_20px_rgba(16,32,76,0.02)] transition-all font-poppins"
      style={{ backgroundColor: "var(--card-strong)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between border-b border-gray-50 pb-2 md:pb-3 mb-3 md:mb-4">
        <span className="text-xs md:text-sm font-light tracking-widest" style={{ color: "var(--foreground)", opacity: 0.5 }}>
          Cancha {acta.fieldNumber} • <span className="font-normal">{acta.phase}</span> {acta.group && `• ${acta.group}`}
        </span>
        <span className="px-3 py-1 rounded-full text-[10px] md:text-xs font-medium" style={{ backgroundColor: "rgba(13, 148, 136, 0.1)", color: "var(--success)" }}>
          Finalizado
        </span>
      </div>

      <div className="grid grid-cols-7 items-center justify-between my-2">
        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xs md:text-base font-normal border border-gray-100 shadow-sm transition-all" style={{ backgroundColor: "rgba(16, 32, 76, 0.02)", color: "var(--primary)" }}>
            {acta.logoA ? <img src={acta.logoA} alt={acta.teamA} className="w-full h-full object-contain rounded-full" /> : acta.teamA.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs md:text-sm font-medium truncate max-w-full px-1" style={{ color: "var(--foreground)" }}>
            {acta.teamA}
          </span>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="font-secondary-modak flex items-baseline justify-center gap-1 tabular-nums transition-all" style={{ fontSize: 'clamp(2.1rem, 4vw, 3.5rem)', lineHeight: 1 }}>
            <span style={{ color: "var(--primary)" }}>{acta.scoreA}</span>
            <span className="text-gray-300 font-light text-xl md:text-3xl -mb-0.5">:</span>
            <span style={{ color: "var(--primary)" }}>{acta.scoreB}</span>
          </div>
        </div>

        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xs md:text-base font-normal border border-gray-100 shadow-sm transition-all" style={{ backgroundColor: "rgba(16, 32, 76, 0.02)", color: "var(--primary)" }}>
            {acta.logoB ? <img src={acta.logoB} alt={acta.teamB} className="w-full h-full object-contain rounded-full" /> : acta.teamB.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs md:text-sm font-medium truncate max-w-full px-1" style={{ color: "var(--foreground)" }}>
            {acta.teamB}
          </span>
        </div>
      </div>

      {acta.events.length > 0 && (
        <div className="border-t border-gray-50 mt-4 pt-3 text-[11px] md:text-xs space-y-2" style={{ color: "var(--foreground)", opacity: 0.7 }}>
          {acta.events.map((ev) => (
            <div key={ev.id} className="grid grid-cols-2 gap-4">
              <div className="text-left pl-1 min-h-[16px] font-light">
                {ev.team === "A" && (
                  <span>
                    {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.player} ({ev.minute}&apos;)
                  </span>
                )}
              </div>
              <div className="text-right pr-1 min-h-[16px] font-light">
                {ev.team === "B" && (
                  <span>
                    {ev.player} ({ev.minute}&apos;) {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {acta.incidentsNotes && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-50/60 border border-amber-100 text-left">
          <span className="text-[12px] font-medium tracking-wider text-amber-800 flex items-center gap-1">
            <span className="material-symbols-outlined !text-[14px]">warning</span> Incidentes:
          </span>
          <p className="text-xs font-light text-amber-950 mt-1 italic">&quot;{acta.incidentsNotes}&quot;</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <div className="flex flex-col text-gray-400 justify-center text-left">
          <span className="text-[10px] md:text-xs leading-tight">
            Enviado por: <strong className="font-semibold" style={{ color: "var(--foreground)" }}>{acta.supervisorName}</strong>
          </span>
          <span className="text-[9px] md:text-[11px] opacity-75">{acta.finishedAt} hs</span>
        </div>
        <button
          type="button"
          onClick={() => onEdit(acta)}
          className="bg-[#233c97] hover:bg-[#1a2e75] text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap flex items-center justify-center h-8 min-[375px]:h-9 md:h-10 text-[9px] min-[375px]:text-[10px] min-[425px]:text-xs md:text-xs lg:text-xs px-4 min-[375px]:px-5 md:px-6 py-2.5"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

// ── Componente Principal ────────────────────────────────────

export default function AdminSupervisorPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [genderFilter, setGenderFilter] = useState(0);
  const [historyGenderFilter, setHistoryGenderFilter] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Registro: búsqueda de jugadores por ID / nombre ──
  const [playerIdQuery, setPlayerIdQuery] = useState("");
  const [playerNameQuery, setPlayerNameQuery] = useState("");

  // ── Registro: fotos de jugadores capturadas en el momento ──
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, string>>({});
  const [cameraTarget, setCameraTarget] = useState<AdminPlayer | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const navTabs = [{ label: "Dashboard" }, { label: "Registro" }];

  const genderTabs = [
    { label: "Todos", icon: "groups" },
    { label: "Masculino", icon: "man" },
    { label: "Femenino", icon: "woman" }
  ];

  useEffect(() => {
    fetchSessionUser()
      .then((u) => { if (u?.role !== "ADMIN") router.replace("/panel"); })
      .catch(() => router.replace("/panel"));
  }, [router]);

  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);

  useEffect(() => {
    fetch("/api/players").then((r) => r.json()).then((d) => setPlayers(Array.isArray(d) ? d : [])).catch(() => setPlayers([]));
    fetch("/api/teams").then((r) => r.json()).then((d) => setTeams(Array.isArray(d) ? d : [])).catch(() => setTeams([]));
  }, []);

  const [actas, setActas] = useState<FinishedMatchActa[]>([
    { id: 201, fieldNumber: 2, gender: "masculino", phase: "Fase de Grupos", group: "Grupo A", teamA: "Lions FC", teamB: "Tigres B", scoreA: 3, scoreB: 1, supervisorName: "Carlos Pérez", finishedAt: "13:45", isLocked: false, incidentsNotes: "Reclamo menor por conducta antideportiva en el banco de suplentes.", events: [{ id: 1, type: "GOL", minute: 10, team: "A", player: "Mateo Gómez" }] },
    { id: 202, fieldNumber: 3, gender: "femenino", phase: "Semifinal", teamA: "Atenas FC", teamB: "Spartans Fem", scoreA: 2, scoreB: 2, supervisorName: "Laura R.", finishedAt: "15:10", isLocked: false, incidentsNotes: "Ingreso no autorizado de personal médico externo sin previo aviso.", events: [{ id: 2, type: "GOL", minute: 22, team: "A", player: "Lucía Pérez" }, { id: 3, type: "GOL", minute: 45, team: "B", player: "Ana Martínez" }] }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 1, adminName: "Admin Principal", adminEmail: "admin@tmtcup.com", timestamp: "16:42", action: "Ajuste de goles", details: JSON.stringify({ antes: [{ id: 2, type: "GOL", minute: 22, team: "A", player: "Lucía Pérez" }], despues: [{ id: 2, type: "GOL", minute: 22, team: "A", player: "Lucía Pérez" }, { id: 3, type: "GOL", minute: 45, team: "B", player: "Ana Martínez" }] }), matchId: 202, gender: "femenino" }
  ]);

  const [actaEdicion, setActaEdicion] = useState<FinishedMatchActa | null>(null);
  // Jugador cuyo menú de eventos (+/-) está abierto en el roster del modal
  const [openActaPlayer, setOpenActaPlayer] = useState<string | null>(null);

  const abrirEdicionActa = (acta: FinishedMatchActa) => { setActaEdicion(JSON.parse(JSON.stringify(acta))); };

  const guardarCambiosActa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actaEdicion) return;
    const actaOriginal = actas.find((a) => a.id === actaEdicion.id);

    const detalleEstructurado = JSON.stringify({
      antes: actaOriginal?.events || [],
      despues: actaEdicion.events || []
    });

    const cambioGoles = actaOriginal?.scoreA !== actaEdicion.scoreA || actaOriginal?.scoreB !== actaEdicion.scoreB;
    const tipoAccion = cambioGoles ? "Ajuste de goles" : "Ajuste de tarjetas";

    setActas((prev) => prev.map((a) => (a.id === actaEdicion.id ? actaEdicion : a)));
    setAuditLogs((prev) => [
      {
        id: Date.now(),
        adminName: "Super Admin",
        adminEmail: "admin@tmtcup.com",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action: tipoAccion,
        details: detalleEstructurado,
        matchId: actaEdicion.id,
        gender: actaEdicion.gender
      },
      ...prev
    ]);
    setActaEdicion(null);
  };

  const agregarEventoEnEdicion = (tipo: "GOL" | "AMARILLA" | "ROJA", equipo: "A" | "B", minuto: number, jugador: string) => {
    if (!actaEdicion) return;
    let nuevosGolesA = actaEdicion.scoreA;
    let nuevosGolesB = actaEdicion.scoreB;
    if (tipo === "GOL") { if (equipo === "A") nuevosGolesA += 1; else nuevosGolesB += 1; }
    setActaEdicion({ ...actaEdicion, scoreA: nuevosGolesA, scoreB: nuevosGolesB, events: [...actaEdicion.events, { id: Date.now(), type: tipo, minute: minuto || 0, team: equipo, player: jugador || "Jugador" }] });
  };

  const eliminarEventoEnEdicion = (eventoId: number) => {
    if (!actaEdicion) return;
    const ev = actaEdicion.events.find((e) => e.id === eventoId);
    if (!ev) return;
    let restaA = ev.type === "GOL" && ev.team === "A" ? 1 : 0;
    let restaB = ev.type === "GOL" && ev.team === "B" ? 1 : 0;
    setActaEdicion({ ...actaEdicion, scoreA: Math.max(0, actaEdicion.scoreA - restaA), scoreB: Math.max(0, actaEdicion.scoreB - restaB), events: actaEdicion.events.filter((e) => e.id !== eventoId) });
  };

  // ── Roster del acta (como en "partido en vivo"): jugadores reales del
  //    equipo + cualquiera que ya tenga eventos registrados en el acta ──
  const rosterActa = (teamName: string, side: "A" | "B") => {
    const reales = players.filter((p) => p.team?.name === teamName).map((p) => p.name);
    const conEventos = (actaEdicion?.events ?? [])
      .filter((e) => e.team === side)
      .map((e) => e.player);
    return Array.from(new Set([...reales, ...conEventos]));
  };
  const eventosDeJugador = (side: "A" | "B", jugador: string) =>
    (actaEdicion?.events ?? []).filter((e) => e.team === side && e.player === jugador);

  // Agregar / quitar un evento a un jugador concreto desde el roster
  const agregarEventoJugador = (tipo: "GOL" | "AMARILLA" | "ROJA", side: "A" | "B", jugador: string) =>
    agregarEventoEnEdicion(tipo, side, 0, jugador);
  const quitarEventoJugador = (tipo: "GOL" | "AMARILLA" | "ROJA", side: "A" | "B", jugador: string) => {
    if (!actaEdicion) return;
    const delTipo = actaEdicion.events.filter(
      (e) => e.team === side && e.player === jugador && e.type === tipo
    );
    const ultimo = delTipo[delTipo.length - 1];
    if (ultimo) eliminarEventoEnEdicion(ultimo.id);
  };

  const handleLogout = () => { router.push("/panel"); };

  // Filtra jugadores de cada equipo según los buscadores de ID y nombre (aplican en conjunto)
  const jugadorCoincideBusqueda = (p: AdminPlayer) => {
    const idQuery = playerIdQuery.trim().toLowerCase();
    const nameQuery = playerNameQuery.trim().toLowerCase();
    const coincideId = idQuery ? (p.document || "").toLowerCase().includes(idQuery) || p.id.toString().includes(idQuery) : true;
    const coincideNombre = nameQuery ? p.name.toLowerCase().includes(nameQuery) : true;
    return coincideId && coincideNombre;
  };

  const hayFiltroDeJugadorActivo = playerIdQuery.trim() !== "" || playerNameQuery.trim() !== "";

  const equiposConJugadores = teams.map((t) => ({
    team: t,
    jugadores: players.filter((p) => p.team_id === t.id),
    jugadoresFiltrados: players.filter((p) => p.team_id === t.id && jugadorCoincideBusqueda(p))
  }));

  // ── Cámara: iniciar/detener el stream cuando se abre o cierra el modal ──
  useEffect(() => {
    if (!cameraTarget) return;
    setCameraError(null);
    let cancelado = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelado) setCameraError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
      });

    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraTarget]);

  const abrirCamaraParaJugador = (player: AdminPlayer) => {
    setCameraError(null);
    setCameraTarget(player);
  };

  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraTarget(null);
    setCameraError(null);
  };

  const capturarFoto = () => {
    if (!cameraTarget || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setPlayerPhotos((prev) => ({ ...prev, [cameraTarget.id]: dataUrl }));

    // Intento de persistencia en backend (ajustar endpoint real cuando esté disponible)
    fetch(`/api/players/${cameraTarget.id}/photo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo: dataUrl })
    }).catch(() => { });

    cerrarCamara();
  };

  const actasFiltradas = actas.filter((acta) => {
    if (genderFilter === 1 && acta.gender !== "masculino") return false;
    if (genderFilter === 2 && acta.gender !== "femenino") return false;
    const query = searchQuery.toLowerCase().trim();
    return query ? (acta.teamA.toLowerCase().includes(query) || acta.teamB.toLowerCase().includes(query) || acta.group?.toLowerCase().includes(query) || acta.phase?.toLowerCase().includes(query) || acta.incidentsNotes?.toLowerCase().includes(query)) : true;
  });

  const historialFiltrado = auditLogs.filter((log) => {
    if (historyGenderFilter === 1 && log.gender !== "masculino") return false;
    if (historyGenderFilter === 2 && log.gender !== "femenino") return false;
    const query = historySearchQuery.toLowerCase().trim();
    return query ? (log.details.toLowerCase().includes(query) || log.action.toLowerCase().includes(query) || log.adminName.toLowerCase().includes(query) || log.adminEmail.toLowerCase().includes(query) || log.matchId.toString() === query) : true;
  });

  const renderGenderFilterTabs = (currentFilter: number, filterSetter: (val: number) => void) => (
    <div className="w-full flex justify-center">
      <nav className="inline-flex rounded-full p-1 bg-[#10204c]/[0.05] border border-[#10204c]/[0.04] shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)]">
        {genderTabs.map((tab, index) => {
          const isActive = currentFilter === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => filterSetter(index)}
              className={`flex items-center justify-center h-9 md:h-10 rounded-full px-4 text-xs font-semibold leading-none transition-all duration-200 outline-none select-none active:scale-[0.97] whitespace-nowrap ${isActive
                ? "bg-white text-[#233c97] shadow-[0_3px_10px_rgba(16,32,76,0.12),_0_1px_2px_rgba(16,32,76,0.04)] font-bold"
                : "text-[#10204c]/55 hover:text-[#10204c]/85"
                }`}
            >
              <span className="material-symbols-outlined max-[424px]:inline hidden !text-[24px]">
                {tab.icon}
              </span>
              <span className="hidden min-[425px]:inline text-xs md:text-sm px-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderHistoryContainer = () => (
    <div className="flex flex-col h-full w-full space-y-4">
      <div className="pb-2 flex flex-col items-center justify-center text-center gap-3 w-full">
        {renderGenderFilterTabs(historyGenderFilter, setHistoryGenderFilter)}

        <div className="w-full max-w-md mx-auto">
          <div className="relative flex items-center rounded-full p-0.5 min-[375px]:p-1 bg-[#10204c]/[0.05] border border-[#10204c]/[0.04] shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)]">
            <span className="material-symbols-outlined absolute left-3.5 text-[#10204c]/55 !text-[19px] md:!text-[20px]">search</span>
            <input
              type="text"
              placeholder="Buscar por cambios, administrador o partido..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 h-7 min-[375px]:h-8 min-[425px]:h-8 sm:h-9 md:h-10 rounded-full text-xs sm:text-xs md:text-sm font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-[#10204c]/85 placeholder:text-[#10204c]/40 transition-all"
            />
            {historySearchQuery && (
              <button onClick={() => setHistorySearchQuery("")} className="absolute right-3.5 text-[#10204c]/55 hover:text-[#10204c]/85 font-bold text-xs">
                <span className="material-symbols-outlined !text-[16px] md:!text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
        {historialFiltrado.length === 0 ? (
          <div className="text-center py-10 opacity-50 space-y-1">
            <span className="material-symbols-outlined text-3xl">history</span>
            <p className="text-xs">No hay registros de modificaciones bajo este filtro.</p>
          </div>
        ) : (
          historialFiltrado.map((log) => (
            <AuditLogCard key={log.id} log={log} />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col font-poppins bg-[var(--background)] text-[var(--foreground)] transition-colors pt-16 min-[375px]:pt-20 md:pt-28 no-scrollbar">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

      <style dangerouslySetInnerHTML={{
        __html: `
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        html, body, .no-scrollbar {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
      `}} />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full rounded-b-2xl md:rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] font-poppins transform-gpu will-change-transform">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-1.5 md:py-0 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex-shrink-0 relative flex items-center justify-start w-[50px] min-[375px]:w-[70px] min-[425px]:w-[80px] md:w-[135px] lg:w-[160px]">
            <Image src="/assets/Logo_tMtCup.svg" alt="Logo oficial TMT CUP" width={140} height={140} className="object-contain drop-shadow-md w-[45px] h-[45px] min-[375px]:w-[65px] min-[375px]:h-[65px] min-[425px]:w-[75px] min-[425px]:h-[75px] md:w-[120px] md:h-[120px] lg:w-[140px] lg:h-[140px] transition-all duration-300" priority />
          </div>

          <nav className="flex-1 min-w-0 max-w-[150px] min-[375px]:max-w-[170px] min-[425px]:max-w-[190px] sm:max-w-[300px] md:max-w-[340px] mx-auto">
            <div className="grid grid-cols-2 w-full rounded-full p-1 bg-[#10204c]/[0.05] border border-[#10204c]/[0.04] shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)]">
              {navTabs.map((tab, index) => {
                const isActive = activeIndex === index;
                const iconName = index === 0 ? "dashboard" : "groups";
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    title={tab.label}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 w-full min-w-0 h-7 min-[375px]:h-8 sm:h-9 md:h-10 rounded-full px-1 sm:px-3 text-xs sm:text-xs md:text-sm font-semibold leading-none transition-all duration-200 outline-none select-none active:scale-[0.97] whitespace-nowrap ${isActive
                      ? "bg-white text-[#233c97] shadow-[0_3px_10px_rgba(16,32,76,0.12),_0_1px_2px_rgba(16,32,76,0.04)] font-bold"
                      : "text-[#10204c]/55 hover:text-[#10204c]/85"
                      }`}
                  >
                    <span className="material-symbols-outlined !text-[18px] sm:!text-[19px] md:!text-[20px] shrink-0 w-5 h-5 flex items-center justify-center leading-none">
                      {iconName}
                    </span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* BOTÓN CERRAR SESIÓN HEADER */}
          <div className="hidden md:flex items-center justify-end flex-shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="bg-[#f83636] hover:bg-[#d62b2b] text-white text-xs font-medium px-5 py-2 md:px-6 md:py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 min-[375px]:px-4 md:px-8 py-3 space-y-6 no-scrollbar">

        {/* DASHBOARD */}
        {activeIndex === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start no-scrollbar">

            {/* SECCIÓN ACTAS CON INCIDENTES INTERNOS */}
            <section className="col-span-1 lg:col-span-6 bg-[var(--card-strong)] rounded-3xl p-4 min-[375px]:p-5 border border-[var(--border)] shadow-xs space-y-4 no-scrollbar">
              <div className="border-b border-[var(--border)] pb-4 flex flex-col items-center justify-center text-center gap-3 w-full">
                <h2 className="text-base min-[375px]:text-lg md:text-xl font-medium tracking-wide text-[#233c97]">
                  Actas de partidos finalizados
                </h2>
                {renderGenderFilterTabs(genderFilter, setGenderFilter)}
                <div className="w-full max-w-md mx-auto">
                  <div className="relative flex items-center rounded-full p-0.5 min-[375px]:p-1 bg-[#10204c]/[0.05] border border-[#10204c]/[0.04] shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)]">
                    <span className="material-symbols-outlined absolute left-3.5 text-[#10204c]/55 !text-[19px] md:!text-[20px]">search</span>
                    <input type="text" placeholder="Buscar por equipo, grupo o incidentes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-10 h-7 min-[375px]:h-8 min-[425px]:h-8 sm:h-9 md:h-10 rounded-full text-xs sm:text-xs md:text-sm font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-[#10204c]/85 placeholder:text-[#10204c]/40 transition-all" />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3.5 text-[#10204c]/55 hover:text-[#10204c]/85 font-bold text-xs">
                        <span className="material-symbols-outlined !text-[16px] md:!text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto pr-0 no-scrollbar" style={{ scrollbarWidth: "none" }}>
                {actasFiltradas.length === 0 ? (
                  <div className="text-center py-10 opacity-50 space-y-1">
                    <span className="material-symbols-outlined text-3xl">inbox</span>
                    <p className="text-xs">No se encontraron actas bajo este filtro.</p>
                  </div>
                ) : (
                  actasFiltradas.map((acta) => (
                    acta.gender === "femenino" ? (
                      <FinishedMatchCardFemenino key={acta.id} acta={acta} onEdit={abrirEdicionActa} />
                    ) : (
                      <FinishedMatchCardMasculino key={acta.id} acta={acta} onEdit={abrirEdicionActa} />
                    )
                  ))
                )}
              </div>
            </section>

            {/* HISTORIAL DE AUDITORÍA LATERAL (Escritorio) */}
            <section className="hidden lg:flex lg:col-span-6 bg-[var(--card-strong)] rounded-3xl p-5 border border-[var(--border)] shadow-xs flex-col max-h-[calc(100vh-140px)] no-scrollbar">
              <h2 className="text-base min-[375px]:text-lg md:text-xl font-medium tracking-wide text-[#233c97] mb-2 text-center">
                Historial de Auditoría
              </h2>
              {renderHistoryContainer()}
            </section>

          </div>
        )}

        {/* REGISTRO */}
        {activeIndex === 1 && (
          <section className="bg-[var(--card-strong)] rounded-3xl p-4 min-[375px]:p-5 md:p-6 border border-[var(--border)] shadow-xs space-y-6 no-scrollbar">

            {/* Encabezado y Buscador */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div className="w-full text-center lg:text-left">
                <h2 className="text-base min-[375px]:text-lg md:text-xl font-medium tracking-wide text-[#233c97]">
                  Nómina de Equipos y Jugadores Inscritos
                </h2>
              </div>

              {/* Buscador de Jugadores */}
              <div className="flex flex-col min-[425px]:flex-row gap-2 w-full lg:max-w-md mx-auto lg:mx-0">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Buscar jugador por nombre o documento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 h-9 rounded-xl text-xs font-medium bg-[#10204c]/[0.04] border border-transparent focus:bg-white focus:border-[#233c97] focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined !text-[14px]">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Renderizado de Tarjetas de Equipos */}
            {teams.length === 0 ? (
              <p className="text-xs text-center py-12 opacity-50">No hay equipos registrados en el sistema.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 no-scrollbar">
                {equiposConJugadores.map(({ team, jugadores }) => {
                  const isFem = team.category === "FEMENINO";

                  const jugadoresFiltrados = jugadores.filter((p) => {
                    const query = searchQuery.toLowerCase().trim();
                    if (!query) return true;
                    return p.name.toLowerCase().includes(query) || (p.document || "").toLowerCase().includes(query);
                  });

                  if (searchQuery && jugadoresFiltrados.length === 0) return null;

                  return (
                    <div key={team.id} className="rounded-2xl bg-[var(--background)] border border-[var(--border)] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">

                      {/* Cabecera del Equipo */}
                      <div className={`p-3 border-b flex items-center justify-between gap-2 ${isFem ? "bg-purple-50/40 border-purple-100/60 text-purple-950" : "bg-blue-50/40 border-blue-100/60 text-blue-950"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-white border border-black/5 flex items-center justify-center text-xs shrink-0 select-none">
                            ⚽
                          </div>
                          <h3 className="text-xs min-[375px]:text-sm font-medium tracking-wide truncate text-[#10204c]">
                            {team.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-normal tracking-wider opacity-60 lowercase first-letter:uppercase">
                          {isFem ? "Femenino" : "Masculino"}
                        </span>
                      </div>

                      {/* Lista Interna del Equipo */}
                      <div className="p-3 space-y-2 flex-1 max-h-72 overflow-y-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
                        {jugadoresFiltrados.map((p, idx) => {
                          const isRegistered = (p as any).registered === true;

                          return (
                            <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-black/5 shadow-xs transition-all hover:border-gray-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-medium text-gray-400 w-4 shrink-0 text-right">{idx + 1}.</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-[11.5px] text-[#10204c]/90 truncate">{p.name}</span>
                                  <span className="text-[9.5px] font-light text-gray-400">{p.document || "Sin Documento"}</span>
                                </div>
                              </div>

                              {/* Controles de Foto y Registro */}
                              <div className="flex items-center gap-1.5 shrink-0">

                                {/* Módulo de Foto */}
                                <label className="cursor-pointer flex items-center justify-center w-7 h-7 rounded-lg bg-gray-50 text-gray-500 hover:bg-[#233c97] hover:text-white border border-black/5 transition-all duration-200" title="Tomar Foto">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const imageUrl = URL.createObjectURL(file);
                                        setPlayers(prev => prev.map(player => player.id === p.id ? { ...player, fotoUrl: imageUrl } : player));
                                      }
                                    }}
                                  />
                                  <span className="material-symbols-outlined !text-[15px]">photo_camera</span>
                                </label>

                                {((p as any).fotoUrl) && (
                                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-emerald-500 bg-gray-100 group">
                                    <img src={(p as any).fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => setPlayers(prev => prev.map(player => player.id === p.id ? { ...player, fotoUrl: undefined } : player))}
                                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <span className="material-symbols-outlined !text-[12px]">delete</span>
                                    </button>
                                  </div>
                                )}

                                {/* Botón de Registro Toggle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlayers(prev => prev.map(player => player.id === p.id ? { ...player, registered: !isRegistered } : player));
                                  }}
                                  className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all duration-200 ${isRegistered
                                      ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                      : "bg-gray-50 border-black/5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95"
                                    }`}
                                  title={isRegistered ? "Quitar registro" : "Confirmar registro"}
                                >
                                  <span className="material-symbols-outlined !text-[16px] font-bold">
                                    {isRegistered ? "check" : "how_to_reg"}
                                  </span>
                                </button>

                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer de la tarjeta */}
                      <div className="p-2.5 bg-gray-50/40 border-t border-[var(--border)] text-right">
                        <span className="text-[10px] font-normal text-gray-400">
                          {jugadoresFiltrados.length} registrados
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </main>

      {/* MODAL DE EDICIÓN ACTA */}
      {actaEdicion && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 no-scrollbar">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-4 min-[375px]:p-6 border border-[var(--border)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {/* Cabecera: equipos, cancha y supervisor (sin "Editar Partido #") */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-medium text-[var(--primary)]">{actaEdicion.teamA} <span className="opacity-40">vs</span> {actaEdicion.teamB}</h3>
                <p className="text-[10px] opacity-60">Cancha {actaEdicion.fieldNumber} • {actaEdicion.phase} • Registrado por {actaEdicion.supervisorName}</p>
              </div>
              <button onClick={() => { setActaEdicion(null); setOpenActaPlayer(null); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors flex items-center justify-center"><span className="material-symbols-outlined !text-[18px]">close</span></button>
            </div>
            <form onSubmit={guardarCambiosActa} className="space-y-4">
              {/* Marcador (se ajusta solo al asignar goles a los jugadores) */}
              <div className="p-3 rounded-2xl bg-gray-50 border border-[var(--border)]">
                <div className="grid grid-cols-5 items-center gap-2">
                  <div className="col-span-2 text-center"><span className="text-xs font-semibold block truncate">{actaEdicion.teamA}</span><input type="number" min="0" value={actaEdicion.scoreA} onChange={(e) => setActaEdicion({ ...actaEdicion, scoreA: parseInt(e.target.value) || 0 })} className="w-16 mx-auto text-center py-1 font-bold text-lg rounded-xl border border-[var(--border)] bg-white" /></div>
                  <div className="col-span-1 text-center font-bold opacity-40">:</div>
                  <div className="col-span-2 text-center"><span className="text-xs font-semibold block truncate">{actaEdicion.teamB}</span><input type="number" min="0" value={actaEdicion.scoreB} onChange={(e) => setActaEdicion({ ...actaEdicion, scoreB: parseInt(e.target.value) || 0 })} className="w-16 mx-auto text-center py-1 font-bold text-lg rounded-xl border border-[var(--border)] bg-white" /></div>
                </div>
              </div>

              {/* ROSTER estilo "partido en vivo": jugadores por equipo con sus eventos.
                  Toca la flecha de un jugador para agregar/quitar gol, amarilla o roja. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { title: actaEdicion.teamA, side: "A" as const },
                  { title: actaEdicion.teamB, side: "B" as const },
                ]).map((team) => (
                  <div key={team.side} className="rounded-2xl border border-[var(--border)] bg-white p-3">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 border border-[var(--border)] flex items-center justify-center shrink-0"><span className="text-[11px] font-black text-[var(--primary)]">{team.title[0]}</span></div>
                      <h4 className="text-sm font-semibold text-[var(--primary)] truncate">{team.title}</h4>
                    </div>
                    <div className="space-y-2">
                      {rosterActa(team.title, team.side).length === 0 && (
                        <p className="text-[10px] text-center opacity-50 py-2">Sin jugadores en la base para este equipo.</p>
                      )}
                      {rosterActa(team.title, team.side).map((jugador) => {
                        const evs = eventosDeJugador(team.side, jugador);
                        const key = `${team.side}-${jugador}`;
                        const isOpen = openActaPlayer === key;
                        const expulsado = evs.some((e) => e.type === "ROJA");
                        return (
                          <div key={key} className={`rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 flex flex-col gap-2 ${expulsado ? "opacity-50 grayscale-[0.6] bg-gray-100" : ""}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {jugador}
                                {expulsado && <span className="ml-1.5 align-middle text-[9px] font-black tracking-wider text-red-600">🟥 EXPULSADO</span>}
                              </span>
                              <button type="button" onClick={() => setOpenActaPlayer(isOpen ? null : key)} className="h-7 w-7 rounded-full bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                                <span className={`material-symbols-outlined !text-[16px] transition-transform ${isOpen ? "rotate-180" : ""}`}>expand_more</span>
                              </button>
                            </div>
                            {evs.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {evs.map((ev) => (
                                  <span key={ev.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 border border-[var(--border)] text-slate-600 select-none">
                                    {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.minute}&apos;
                                  </span>
                                ))}
                              </div>
                            )}
                            {isOpen && (
                              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                                {([
                                  { icon: "⚽", type: "GOL" as const },
                                  { icon: "🟨", type: "AMARILLA" as const },
                                  { icon: "🟥", type: "ROJA" as const },
                                ]).map((act) => (
                                  <div key={act.type} className="flex items-center gap-1 px-1.5 py-1 rounded-full border border-[var(--border)] bg-gray-50">
                                    <button type="button" onClick={() => quitarEventoJugador(act.type, team.side, jugador)} className="w-5 h-5 rounded-full bg-white hover:bg-gray-200 border border-[var(--border)] flex items-center justify-center font-bold text-xs active:scale-90 transition-transform"><span className="leading-none mt-[-2px]">-</span></button>
                                    <span className="text-[11px] select-none">{act.icon}</span>
                                    <button type="button" onClick={() => agregarEventoJugador(act.type, team.side, jugador)} className="w-5 h-5 rounded-full bg-white hover:bg-gray-200 border border-[var(--border)] flex items-center justify-center font-bold text-xs active:scale-90 transition-transform"><span className="leading-none mt-[-1px]">+</span></button>
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

              {/* Eventos registrados (original) vs. actualizados (tras la edición) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-2xl bg-gray-50 border border-[var(--border)]">
                  <span className="block text-[13px] font-medium opacity-60 tracking-wider mb-1.5">Eventos registrados</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
                    {(actas.find((a) => a.id === actaEdicion.id)?.events ?? []).length === 0 && <p className="text-[10px] opacity-40">Sin eventos.</p>}
                    {(actas.find((a) => a.id === actaEdicion.id)?.events ?? []).map((ev) => (
                      <div key={`o-${ev.id}`} className="text-[10px] text-slate-600">{ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.player} ({ev.minute}&apos;) · {ev.team === "A" ? actaEdicion.teamA : actaEdicion.teamB}</div>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/15">
                  <span className="block text-[13px] font-medium text-[var(--primary)] tracking-wider mb-1.5">Eventos actualizados</span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
                    {actaEdicion.events.length === 0 && <p className="text-[10px] opacity-40">Sin eventos.</p>}
                    {actaEdicion.events.map((ev) => (
                      <div key={`u-${ev.id}`} className="text-[10px] text-slate-700">{ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.player} ({ev.minute}&apos;) · {ev.team === "A" ? actaEdicion.teamA : actaEdicion.teamB}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Incidentes */}
              <div>
                <label className="block text-[13px] font-medium opacity-70 tracking-wider mb-1">Incidentes</label>
                <textarea rows={2} value={actaEdicion.incidentsNotes || ""} onChange={(e) => setActaEdicion({ ...actaEdicion, incidentsNotes: e.target.value })} placeholder="Describe cualquier incidente del partido…" className="w-full p-2 text-xs rounded-xl border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => { setActaEdicion(null); setOpenActaPlayer(null); }} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-full bg-[var(--primary)] text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CÁMARA: captura de foto del jugador en el momento del registro */}
      {cameraTarget && (
        <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 no-scrollbar">
          <div className="bg-white rounded-3xl w-full max-w-sm p-4 min-[375px]:p-5 border border-[var(--border)] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--primary)] truncate">Foto de {cameraTarget.name}</h3>
                <p className="text-[10px] opacity-60">{cameraTarget.team?.name || "Sin equipo"}</p>
              </div>
              <button onClick={cerrarCamara} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined !text-[18px]">close</span>
              </button>
            </div>

            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              {cameraError ? (
                <div className="text-center px-4 space-y-2">
                  <span className="material-symbols-outlined !text-[28px] text-white/70">videocam_off</span>
                  <p className="text-[11px] text-white/80">{cameraError}</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={cerrarCamara} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100">
                Cancelar
              </button>
              <button
                type="button"
                onClick={capturarFoto}
                disabled={!!cameraError}
                className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined !text-[16px]">photo_camera</span>
                Capturar foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL DESPLEGABLE HISTORIAL DE AUDITORÍA (Móvil - Bottom Sheet con soporte para gestos) */}
      <HistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)}>
        {renderHistoryContainer()}
      </HistoryPanel>

      {/* ── BOTONES FLOTANTES MÓVIL RESPONSIVE ── */}
      <div className="fixed bottom-4 left-4 min-[375px]:bottom-5 min-[375px]:left-5 min-[425px]:bottom-6 min-[425px]:left-6 z-40 block lg:hidden">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="h-11 w-11 min-[375px]:h-13 min-[375px]:w-13 min-[425px]:h-14 min-[425px]:w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-[0_8px_30px_rgba(245,158,11,0.4)] flex items-center justify-center border border-white/20 active:scale-95 transition-all duration-200"
          aria-label="Ver Historial de Auditoría"
        >
          <span className="material-symbols-outlined !text-[20px] min-[375px]:!text-[22px] min-[425px]:!text-[24px] sm:!text-[28px]">history</span>
        </button>
      </div>

      <div className="fixed bottom-4 right-4 min-[375px]:bottom-5 min-[375px]:right-5 min-[425px]:bottom-6 min-[425px]:right-6 z-40 flex md:hidden">
        <button
          type="button"
          onClick={handleLogout}
          title="Cerrar Sesión"
          className="h-11 w-11 min-[375px]:h-13 min-[375px]:w-13 min-[425px]:h-14 min-[425px]:w-14 shrink-0 rounded-full bg-[#f83636] text-white shadow-[0_4px_15px_rgba(248,54,54,0.35)] hover:bg-[#d62b2b] flex items-center justify-center border border-white/10 active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined !text-[20px] min-[375px]:!text-[22px] min-[425px]:!text-[24px] flex items-center justify-center leading-none">logout</span>
        </button>
      </div>

    </div>
  );
}