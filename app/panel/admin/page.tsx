"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { fetchSessionUser } from "@/lib/session-client";

// ── Tipos ──────────────────────────────────────────────────
type IncidentSeverity = "Baja" | "Media" | "Alta" | "Crítica";
type IncidentStatus = "PENDIENTE" | "EN_REVISION" | "RESUELTO";

// Jugadores reales (Supabase) para la pestaña de nómina
type AdminPlayer = {
  id: number;
  name: string;
  document?: string | null;
  team_id: number;
  team: { id: number; name: string } | null;
};

type AdminTeam = { id: number; name: string; category: "MASCULINO" | "FEMENINO" };

type Incident = {
  id: number;
  matchId: number;
  matchTitle: string;
  fieldNumber: number;
  minute: number | null;
  reporter: string; // Supervisor que reporta
  timestamp: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
};

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
  teamB: string;
  scoreA: number;
  scoreB: number;
  supervisorName: string;
  finishedAt: string;
  events: MatchEvent[];
  incidentsNotes?: string;
  isLocked: boolean;
};

type AuditLog = {
  id: number;
  adminName: string;
  adminEmail: string;
  timestamp: string;
  action: string;
  details: string;
  matchId: number;
};

export default function AdminSupervisorPage() {
  const router = useRouter();

  // ── Buscador Global y Filtros ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [generoFiltro, setGeneroFiltro] = useState<"todos" | "masculino" | "femenino">("todos");
  const [vistaActiva, setVistaActiva] = useState<"columnas" | "historial" | "jugadores">("columnas");

  // Guard: esta mesa es SOLO para administradores (redirige, sin tocar el diseño)
  useEffect(() => {
    fetchSessionUser()
      .then((u) => {
        if (u?.role !== "ADMIN") router.replace("/panel");
      })
      .catch(() => router.replace("/panel"));
  }, [router]);

  // ── Nómina real de jugadores (Supabase vía /api/players y /api/teams) ──
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((d) => setPlayers(Array.isArray(d) ? d : []))
      .catch(() => setPlayers([]));
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(Array.isArray(d) ? d : []))
      .catch(() => setTeams([]));
  }, []);

  // ── 1. Incidentes en Tiempo Real ───────────────────────────
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 1,
      matchId: 101,
      matchTitle: "Equipo Alpha vs Equipo Beta",
      fieldNumber: 1,
      minute: 28,
      reporter: "Supervisor Juan C.",
      timestamp: "14:28",
      description: "Reclamo por conducta antideportiva en el banco de suplentes.",
      severity: "Media",
      status: "PENDIENTE",
    },
    {
      id: 2,
      matchId: 102,
      matchTitle: "Atenas FC vs Esparta Fem",
      fieldNumber: 4,
      minute: 15,
      reporter: "Supervisora Elena R.",
      timestamp: "14:45",
      description: "Jugadora lesionada requiere atención médica en cancha.",
      severity: "Alta",
      status: "EN_REVISION",
    },
  ]);

  // ── 2. Actas de Partidos Finalizados ────────────────────────
  const [actas, setActas] = useState<FinishedMatchActa[]>([
    {
      id: 201,
      fieldNumber: 2,
      gender: "masculino",
      phase: "Fase de Grupos",
      teamA: "Lions FC",
      teamB: "Tigres B",
      scoreA: 3,
      scoreB: 1,
      supervisorName: "Carlos Pérez",
      finishedAt: "13:45",
      isLocked: false,
      incidentsNotes: "Sin novedades graves. Partido finalizado a tiempo.",
      events: [
        { id: 1, type: "GOL", minute: 10, team: "A", player: "Mateo Gómez" },
        { id: 2, type: "GOL", minute: 22, team: "A", player: "Lucas Silva" },
        { id: 3, type: "AMARILLA", minute: 30, team: "B", player: "Andrés Villa" },
        { id: 4, type: "GOL", minute: 38, team: "B", player: "Felipe Ríos" },
        { id: 5, type: "GOL", minute: 42, team: "A", player: "Mateo Gómez" },
      ],
    },
    {
      id: 202,
      fieldNumber: 3,
      gender: "femenino",
      phase: "Cuartos de Final",
      teamA: "Valkirias",
      teamB: "Sirenas FC",
      scoreA: 0,
      scoreB: 0,
      supervisorName: "Andrea M.",
      finishedAt: "12:30",
      isLocked: true,
      incidentsNotes: "Definición por penales ganada por Valkirias 4-2.",
      events: [
        { id: 6, type: "AMARILLA", minute: 14, team: "A", player: "Camila Ruiz" },
        { id: 7, type: "ROJA", minute: 39, team: "B", player: "Laura Cano" },
      ],
    },
  ]);

  // ── 3. Historial de Cambios (Audit Log) ────────────────────
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 1,
      adminName: "Admin Principal",
      adminEmail: "admin@tmtcup.com",
      timestamp: "14:10 - 16/Jul",
      action: "Edición de Marcador",
      details: "Modificó resultado de Partido #202 (Goles Team A: 0 -> 0)",
      matchId: 202,
    },
  ]);

  // ── Estado de Edición de Acta Seleccionada ──────────────────
  const [actaEdicion, setActaEdicion] = useState<FinishedMatchActa | null>(null);
  // Jugador cuyo menú de eventos (+/-) está abierto en el roster del modal
  const [openActaPlayer, setOpenActaPlayer] = useState<string | null>(null);

  // Funciones para resolver incidentes
  const cambiarEstadoIncidente = (id: number, nuevoEstado: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: nuevoEstado } : inc))
    );
  };

  // Abrir modal de edición
  const abrirEdicionActa = (acta: FinishedMatchActa) => {
    setActaEdicion(JSON.parse(JSON.stringify(acta))); // Copia profunda
  };

  // Guardar Cambios en el Acta y Registrar Auditoría
  const guardarCambiosActa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actaEdicion) return;

    const actaOriginal = actas.find((a) => a.id === actaEdicion.id);

    // Calcular diferencias para el log
    const cambioGoles =
      actaOriginal?.scoreA !== actaEdicion.scoreA ||
      actaOriginal?.scoreB !== actaEdicion.scoreB;

    const detalleLog = cambioGoles
      ? `Ajuste de marcador: ${actaOriginal?.teamA} (${actaOriginal?.scoreA} ➔ ${actaEdicion.scoreA}) vs ${actaOriginal?.teamB} (${actaOriginal?.scoreB} ➔ ${actaEdicion.scoreB})`
      : `Actualizó eventos u observaciones del partido #${actaEdicion.id}`;

    // Actualizar Actas
    setActas((prev) =>
      prev.map((a) => (a.id === actaEdicion.id ? actaEdicion : a))
    );

    // Añadir al Audit Log
    const nuevoLog: AuditLog = {
      id: Date.now(),
      adminName: "Super Admin",
      adminEmail: "admin@tmtcup.com",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      action: "Edición de Acta Final",
      details: detalleLog,
      matchId: actaEdicion.id,
    };

    setAuditLogs((prev) => [nuevoLog, ...prev]);
    setActaEdicion(null);
  };

  // Auxiliares para manipular eventos dentro de la edición
  const agregarEventoEnEdicion = (
    tipo: "GOL" | "AMARILLA" | "ROJA",
    equipo: "A" | "B",
    minuto: number,
    jugador: string
  ) => {
    if (!actaEdicion) return;
    const nuevoEvento: MatchEvent = {
      id: Date.now(),
      type: tipo,
      minute: minuto || 0,
      team: equipo,
      player: jugador || "Jugador",
    };

    let nuevosGolesA = actaEdicion.scoreA;
    let nuevosGolesB = actaEdicion.scoreB;

    if (tipo === "GOL") {
      if (equipo === "A") nuevosGolesA += 1;
      else nuevosGolesB += 1;
    }

    setActaEdicion({
      ...actaEdicion,
      scoreA: nuevosGolesA,
      scoreB: nuevosGolesB,
      events: [...actaEdicion.events, nuevoEvento],
    });
  };

  const eliminarEventoEnEdicion = (eventoId: number) => {
    if (!actaEdicion) return;
    const ev = actaEdicion.events.find((e) => e.id === eventoId);
    if (!ev) return;

    let restaA = 0;
    let restaB = 0;
    if (ev.type === "GOL") {
      if (ev.team === "A") restaA = 1;
      else restaB = 1;
    }

    setActaEdicion({
      ...actaEdicion,
      scoreA: Math.max(0, actaEdicion.scoreA - restaA),
      scoreB: Math.max(0, actaEdicion.scoreB - restaB),
      events: actaEdicion.events.filter((e) => e.id !== eventoId),
    });
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

  // Nómina agrupada por equipo, respetando el buscador y el filtro de género
  const equiposConJugadores = teams
    .filter((t) =>
      generoFiltro === "todos" ||
      t.category === (generoFiltro === "masculino" ? "MASCULINO" : "FEMENINO")
    )
    .map((t) => ({
      team: t,
      jugadores: players.filter(
        (p) =>
          p.team_id === t.id &&
          (searchQuery === "" ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.document ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    }))
    .filter((g) => g.jugadores.length > 0 || searchQuery === "");

  // Filtrado general de partidos
  const actasFiltradas = actas.filter((a) => {
    const coincideGenero = generoFiltro === "todos" || a.gender === generoFiltro;
    const coincideBusqueda =
      searchQuery === "" ||
      a.teamA.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toString().includes(searchQuery) ||
      `cancha ${a.fieldNumber}`.toLowerCase().includes(searchQuery.toLowerCase());
    return coincideGenero && coincideBusqueda;
  });

  return (
    <div className="min-h-screen w-full flex flex-col font-poppins bg-[var(--background)] text-[var(--foreground)] transition-colors">
      
      {/* Iconos Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0"
      />

      {/* HEADER DE CONTROL */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-[var(--border)] px-3 min-[375px]:px-4 md:px-8 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 group">
            <Image
              src="/assets/Logo_tMtCup.svg"
              alt="tMt Cup Logo"
              width={36}
              height={36}
              className="w-8 h-8 min-[375px]:w-9 min-[375px]:h-9 object-contain"
            />
            <span className="font-bold text-xs min-[375px]:text-sm md:text-base tracking-tight text-[var(--primary)]">
              Mesa Administradora
            </span>
          </Link>
          <span className="text-[9px] min-[375px]:text-[10px] px-2 py-0.5 rounded-full bg-[#233c97]/10 text-[var(--primary)] font-bold">
            AUDITORÍA & CONTROL
          </span>
        </div>

        {/* Pestañas de Navegación Administrador */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-[var(--border)]">
          <button
            onClick={() => setVistaActiva("columnas")}
            className={`px-3 py-1 rounded-lg text-[10px] min-[375px]:text-xs font-semibold transition-all flex items-center gap-1 ${
              vistaActiva === "columnas"
                ? "bg-white text-[var(--primary)] shadow-xs"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <span className="material-symbols-outlined !text-[15px]">dashboard</span>
            <span>Tablero Principal</span>
          </button>
          <button
            onClick={() => setVistaActiva("jugadores")}
            className={`px-3 py-1 rounded-lg text-[10px] min-[375px]:text-xs font-semibold transition-all flex items-center gap-1 ${
              vistaActiva === "jugadores"
                ? "bg-white text-[var(--primary)] shadow-xs"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <span className="material-symbols-outlined !text-[15px]">groups</span>
            <span>Jugadores ({players.length})</span>
          </button>
          <button
            onClick={() => setVistaActiva("historial")}
            className={`px-3 py-1 rounded-lg text-[10px] min-[375px]:text-xs font-semibold transition-all flex items-center gap-1 ${
              vistaActiva === "historial"
                ? "bg-white text-[var(--primary)] shadow-xs"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <span className="material-symbols-outlined !text-[15px]">history</span>
            <span>Historial Cambios ({auditLogs.length})</span>
          </button>
        </div>
      </header>

      {/* BARRA SUPERIOR DE BÚSQUEDA Y FILTROS */}
      <section className="w-full max-w-7xl mx-auto px-3 min-[375px]:px-4 md:px-8 pt-4 pb-2">
        <div className="bg-[var(--card-strong)] rounded-2xl p-3 border border-[var(--border)] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Buscador de partidos */}
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por equipo, cancha o ID de partido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            />
          </div>

          {/* Filtros Generales */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-[10px] opacity-60 font-medium">Género:</span>
            <div className="flex bg-[var(--background)] p-1 rounded-xl border border-[var(--border)] gap-1 text-[10px] font-semibold">
              <button
                onClick={() => setGeneroFiltro("todos")}
                className={`px-2.5 py-0.5 rounded-lg ${
                  generoFiltro === "todos" ? "bg-[var(--primary)] text-white" : "opacity-60"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setGeneroFiltro("masculino")}
                className={`px-2.5 py-0.5 rounded-lg ${
                  generoFiltro === "masculino" ? "bg-[#233c97] text-white" : "opacity-60"
                }`}
              >
                Masc
              </button>
              <button
                onClick={() => setGeneroFiltro("femenino")}
                className={`px-2.5 py-0.5 rounded-lg ${
                  generoFiltro === "femenino" ? "bg-[#7c3aed] text-white" : "opacity-60"
                }`}
              >
                Fem
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 min-[375px]:px-4 md:px-8 py-3 space-y-6">
        
        {vistaActiva === "columnas" ? (
          /* VISTA EN 2 COLUMNAS PRINCIPALES */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* ────────────────────────────────────────────────────────── */}
            {/* COLUMNA 1: INCIDENTES EN TIEMPO REAL (5 COLUMNAS EN PC)    */}
            {/* ────────────────────────────────────────────────────────── */}
            <section className="lg:col-span-5 bg-[var(--card-strong)] rounded-3xl p-3 min-[375px]:p-4 border border-[var(--border)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <h2 className="text-xs min-[375px]:text-sm font-bold tracking-tight">
                    Incidentes en Vivo ({incidents.filter((i) => i.status !== "RESUELTO").length})
                  </h2>
                </div>
                <span className="text-[10px] opacity-60">Supervisores en campo</span>
              </div>

              <div className="space-y-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                {incidents.length === 0 ? (
                  <p className="text-xs text-center py-8 opacity-50">Sin incidentes reportados.</p>
                ) : (
                  incidents.map((inc) => {
                    const colorSeveridad =
                      inc.severity === "Crítica" || inc.severity === "Alta"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : inc.severity === "Media"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200";

                    return (
                      <div
                        key={inc.id}
                        className={`p-3 rounded-2xl border transition-all space-y-2 ${colorSeveridad}`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold uppercase tracking-wider">
                            Cancha {inc.fieldNumber} • Min {inc.minute}&apos;
                          </span>
                          <span className="font-semibold">{inc.timestamp} hs</span>
                        </div>

                        <p className="text-xs font-semibold leading-tight">{inc.matchTitle}</p>
                        <p className="text-[11px] opacity-90 leading-relaxed bg-white/60 p-2 rounded-xl">
                          &quot;{inc.description}&quot;
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10px]">
                          <span className="opacity-70 font-medium">Por: {inc.reporter}</span>
                          
                          {/* Cambiar Estado del Incidente */}
                          <select
                            value={inc.status}
                            onChange={(e) =>
                              cambiarEstadoPartidoIncidente(inc.id, e.target.value as IncidentStatus)
                            }
                            className="py-0.5 px-2 rounded-lg bg-white border border-black/10 font-bold text-[9.5px] cursor-pointer focus:outline-none"
                          >
                            <option value="PENDIENTE">🔴 PENDIENTE</option>
                            <option value="EN_REVISION">🟡 EN REVISIÓN</option>
                            <option value="RESUELTO">🟢 RESUELTO</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* ────────────────────────────────────────────────────────── */}
            {/* COLUMNA 2: ACTAS / CAJAS DE PARTIDOS FINALIZADOS (7 COLS)  */}
            {/* ────────────────────────────────────────────────────────── */}
            <section className="lg:col-span-7 bg-[var(--card-strong)] rounded-3xl p-3 min-[375px]:p-4 border border-[var(--border)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--primary)] !text-[20px]">
                    assignment_turned_in
                  </span>
                  <h2 className="text-xs min-[375px]:text-sm font-bold tracking-tight">
                    Actas de Partidos Finalizados ({actasFiltradas.length})
                  </h2>
                </div>
                <span className="text-[10px] opacity-60">Guardadas por supervisores</span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                {actasFiltradas.length === 0 ? (
                  <div className="text-center py-10 opacity-50 space-y-1">
                    <span className="material-symbols-outlined text-3xl">inbox</span>
                    <p className="text-xs">No se encontraron actas de partidos finalizados.</p>
                  </div>
                ) : (
                  actasFiltradas.map((acta) => (
                    <div
                      key={acta.id}
                      data-theme={acta.gender}
                      className="w-full rounded-2xl p-3 min-[375px]:p-4 bg-[var(--background)] border border-[var(--border)] hover:border-[var(--primary)]/40 transition-all space-y-2.5"
                    >
                      {/* Cabecera del Acta */}
                      <div className="flex items-center justify-between text-[10px] opacity-70 border-b border-[var(--border)] pb-1.5">
                        <span className="font-semibold">
                          Cancha {acta.fieldNumber} • {acta.phase} • ID #{acta.id}
                        </span>
                        <span className="font-bold uppercase px-2 py-0.2 rounded-full bg-gray-200">
                          Finalizado {acta.finishedAt}
                        </span>
                      </div>

                      {/* Marcador del Partido */}
                      <div className="grid grid-cols-7 items-center text-center py-1">
                        <div className="col-span-3 text-left">
                          <p className="text-xs min-[375px]:text-sm font-bold truncate">
                            {acta.teamA}
                          </p>
                        </div>

                        <div className="col-span-1 font-secondary-modak text-xl min-[375px]:text-2xl text-[var(--primary)] flex items-center justify-center gap-1">
                          <span>{acta.scoreA}</span>
                          <span className="text-gray-300 font-light text-xs">:</span>
                          <span>{acta.scoreB}</span>
                        </div>

                        <div className="col-span-3 text-right">
                          <p className="text-xs min-[375px]:text-sm font-bold truncate">
                            {acta.teamB}
                          </p>
                        </div>
                      </div>

                      {/* Resumen de Eventos en el Acta */}
                      <div className="flex flex-wrap items-center gap-1 text-[9.5px]">
                        {acta.events.length === 0 ? (
                          <span className="opacity-50 italic">Sin eventos registrados</span>
                        ) : (
                          acta.events.map((ev) => (
                            <span
                              key={ev.id}
                              className="px-2 py-0.5 rounded-lg bg-white border border-[var(--border)] flex items-center gap-1 font-medium"
                            >
                              <span>{ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"}</span>
                              <span>{ev.player} ({ev.minute}&apos;)</span>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Observaciones del Supervisor */}
                      {acta.incidentsNotes && (
                        <p className="text-[10px] italic opacity-70 bg-gray-100/70 p-1.5 rounded-lg">
                          Nota supervisor: &quot;{acta.incidentsNotes}&quot;
                        </p>
                      )}

                      {/* Acciones de Edición para el Administrador */}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <span className="text-[9.5px] opacity-60">
                          Enviado por: <strong>{acta.supervisorName}</strong>
                        </span>

                        <button
                          type="button"
                          onClick={() => abrirEdicionActa(acta)}
                          className="text-[10px] font-bold px-3 py-1 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined !text-[14px]">edit_note</span>
                          Revisar / Editar Acta
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        ) : vistaActiva === "jugadores" ? (
          /* ────────────────────────────────────────────────────────── */
          /* VISTA DE JUGADORES INSCRITOS (nómina real desde Supabase)  */
          /* ────────────────────────────────────────────────────────── */
          <section className="bg-[var(--card-strong)] rounded-3xl p-4 md:p-6 border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined">groups</span>
                  Jugadores Inscritos ({players.length})
                </h2>
                <p className="text-xs opacity-60">
                  Nómina oficial por equipo, directa de la base de datos.
                </p>
              </div>
            </div>

            {players.length === 0 ? (
              <p className="text-xs text-center py-10 opacity-50">
                Aún no hay jugadores registrados en la base de datos.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {equiposConJugadores.map(({ team, jugadores }) => (
                  <div
                    key={team.id}
                    className="rounded-2xl bg-[var(--background)] border border-[var(--border)] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                      <span className="text-xs font-bold truncate">{team.name}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold text-white shrink-0 ${
                          team.category === "FEMENINO" ? "bg-[#7c3aed]" : "bg-[#233c97]"
                        }`}
                      >
                        {team.category === "FEMENINO" ? "FEM" : "MASC"} · {jugadores.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {jugadores.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-white/60"
                        >
                          <span className="truncate pr-2">{p.name}</span>
                          <span className="text-[10px] opacity-50 shrink-0">{p.document || "—"}</span>
                        </div>
                      ))}
                      {jugadores.length === 0 && (
                        <p className="text-[10px] opacity-40 italic py-1">Sin coincidencias con la búsqueda.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* ────────────────────────────────────────────────────────── */
          /* VISTA DE HISTORIAL DE CAMBIOS Y AUDITORÍA DE ADMINS        */
          /* ────────────────────────────────────────────────────────── */
          <section className="bg-[var(--card-strong)] rounded-3xl p-4 md:p-6 border border-[var(--border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined">history</span>
                  Historial de Auditoría y Cambios Realizados
                </h2>
                <p className="text-xs opacity-60">
                  Registro inalterable de modificaciones realizadas por administradores sobre actas finales.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-center py-10 opacity-50">No hay historial de cambios registrado aún.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--primary)]">{log.action}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-gray-200 font-semibold">
                          Partido #{log.matchId}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80">{log.details}</p>
                    </div>

                    <div className="text-right text-[10px] opacity-60 border-t sm:border-t-0 pt-1 sm:pt-0 border-[var(--border)]">
                      <p className="font-bold">{log.adminName} ({log.adminEmail})</p>
                      <p>{log.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* MODAL DE EDICIÓN DE ACTA FINAL POR EL ADMINISTRADOR            */}
      {/* ────────────────────────────────────────────────────────────── */}
      {actaEdicion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-4 min-[375px]:p-6 border border-[var(--border)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera: equipos, cancha y supervisor (sin "Editar Acta #") */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--primary)]">
                  {actaEdicion.teamA} <span className="opacity-40">vs</span> {actaEdicion.teamB}
                </h3>
                <p className="text-[10px] opacity-60">
                  Cancha {actaEdicion.fieldNumber} • {actaEdicion.phase} • Registrado por {actaEdicion.supervisorName}
                </p>
              </div>
              <button
                onClick={() => { setActaEdicion(null); setOpenActaPlayer(null); }}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={guardarCambiosActa} className="space-y-4">

              {/* Marcador (se ajusta solo al asignar goles a los jugadores) */}
              <div className="p-3 rounded-2xl bg-gray-50 border border-[var(--border)]">
                <div className="grid grid-cols-5 items-center gap-2">
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-semibold block truncate">{actaEdicion.teamA}</span>
                    <input
                      type="number"
                      min="0"
                      value={actaEdicion.scoreA}
                      onChange={(e) =>
                        setActaEdicion({ ...actaEdicion, scoreA: parseInt(e.target.value) || 0 })
                      }
                      className="w-16 mx-auto text-center py-1 font-bold text-lg rounded-xl border border-[var(--border)] bg-white"
                    />
                  </div>
                  <div className="col-span-1 text-center font-bold opacity-40">:</div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-semibold block truncate">{actaEdicion.teamB}</span>
                    <input
                      type="number"
                      min="0"
                      value={actaEdicion.scoreB}
                      onChange={(e) =>
                        setActaEdicion({ ...actaEdicion, scoreB: parseInt(e.target.value) || 0 })
                      }
                      className="w-16 mx-auto text-center py-1 font-bold text-lg rounded-xl border border-[var(--border)] bg-white"
                    />
                  </div>
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
                      <div className="w-8 h-8 rounded-full bg-gray-100 border border-[var(--border)] flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-black uppercase text-[var(--primary)]">{team.title[0]}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-[var(--primary)] truncate">{team.title}</h4>
                    </div>

                    <div className="space-y-2">
                      {rosterActa(team.title, team.side).length === 0 && (
                        <p className="text-[10px] text-center opacity-50 py-2">
                          Sin jugadores en la base para este equipo.
                        </p>
                      )}
                      {rosterActa(team.title, team.side).map((jugador) => {
                        const evs = eventosDeJugador(team.side, jugador);
                        const key = `${team.side}-${jugador}`;
                        const isOpen = openActaPlayer === key;
                        const expulsado = evs.some((e) => e.type === "ROJA");
                        return (
                          <div
                            key={key}
                            className={`rounded-xl border border-[var(--border)] bg-white px-2.5 py-2 flex flex-col gap-2 ${expulsado ? "opacity-50 grayscale-[0.6] bg-gray-100" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {jugador}
                                {expulsado && (
                                  <span className="ml-1.5 align-middle text-[9px] font-black tracking-wider text-red-600">
                                    🟥 EXPULSADO
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => setOpenActaPlayer(isOpen ? null : key)}
                                className="h-7 w-7 rounded-full bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0"
                              >
                                <span className={`material-symbols-outlined !text-[16px] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                                  expand_more
                                </span>
                              </button>
                            </div>

                            {/* Chips de eventos del jugador (con su minuto) */}
                            {evs.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {evs.map((ev) => (
                                  <span
                                    key={ev.id}
                                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 border border-[var(--border)] text-slate-600 select-none"
                                  >
                                    {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.minute}&apos;
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Controles +/- para agregar o quitar eventos */}
                            {isOpen && (
                              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                                {([
                                  { icon: "⚽", type: "GOL" as const },
                                  { icon: "🟨", type: "AMARILLA" as const },
                                  { icon: "🟥", type: "ROJA" as const },
                                ]).map((act) => (
                                  <div
                                    key={act.type}
                                    className="flex items-center gap-1 px-1.5 py-1 rounded-full border border-[var(--border)] bg-gray-50"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => quitarEventoJugador(act.type, team.side, jugador)}
                                      className="w-5 h-5 rounded-full bg-white hover:bg-gray-200 border border-[var(--border)] flex items-center justify-center font-bold text-xs active:scale-90 transition-transform"
                                    >
                                      <span className="leading-none mt-[-2px]">-</span>
                                    </button>
                                    <span className="text-[11px] select-none">{act.icon}</span>
                                    <button
                                      type="button"
                                      onClick={() => agregarEventoJugador(act.type, team.side, jugador)}
                                      className="w-5 h-5 rounded-full bg-white hover:bg-gray-200 border border-[var(--border)] flex items-center justify-center font-bold text-xs active:scale-90 transition-transform"
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

              {/* Eventos registrados (original) vs. actualizados (tras la edición) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-2xl bg-gray-50 border border-[var(--border)]">
                  <span className="block text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1.5">
                    Eventos registrados
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {(actas.find((a) => a.id === actaEdicion.id)?.events ?? []).length === 0 && (
                      <p className="text-[10px] opacity-40">Sin eventos.</p>
                    )}
                    {(actas.find((a) => a.id === actaEdicion.id)?.events ?? []).map((ev) => (
                      <div key={`o-${ev.id}`} className="text-[10px] text-slate-600">
                        {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.player} ({ev.minute}&apos;) · {ev.team === "A" ? actaEdicion.teamA : actaEdicion.teamB}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/15">
                  <span className="block text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider mb-1.5">
                    Eventos actualizados
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {actaEdicion.events.length === 0 && (
                      <p className="text-[10px] opacity-40">Sin eventos.</p>
                    )}
                    {actaEdicion.events.map((ev) => (
                      <div key={`u-${ev.id}`} className="text-[10px] text-slate-700">
                        {ev.type === "GOL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"} {ev.player} ({ev.minute}&apos;) · {ev.team === "A" ? actaEdicion.teamA : actaEdicion.teamB}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Incidentes */}
              <div>
                <label className="block text-[11px] font-bold opacity-70 uppercase tracking-wider mb-1">
                  Incidentes
                </label>
                <textarea
                  rows={2}
                  value={actaEdicion.incidentsNotes || ""}
                  onChange={(e) =>
                    setActaEdicion({ ...actaEdicion, incidentsNotes: e.target.value })
                  }
                  placeholder="Describe cualquier incidente del partido…"
                  className="w-full p-2 text-xs rounded-xl border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Botones de Guardar */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => { setActaEdicion(null); setOpenActaPlayer(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined !text-[16px]">save</span>
                  Guardar y registrar auditoría
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// Helper rápido para evitar warning en select de incidente
function cambiarEstadoPartidoIncidente(id: number, nuevoEstado: IncidentStatus) {
  // Manejado internamente por el estado principal
}