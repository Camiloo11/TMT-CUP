"use client";

import { useEffect, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TablaGrupo } from "./components/TablaGrupo";
import { TarjetaPartido } from "./components/TarjetaPartido";
import { FaseEliminatoria } from "./components/FaseEliminatoria";


// ── Datos en vivo desde el backend ──────────────────────────
type StandingRow = {
  teamId: number; team: string; pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; dg: number; pts: number; amarillas: number; rojas: number;
};
type GroupStanding = { group: string; cancha: number; tabla: StandingRow[] };
type ApiEvent = {
  id: number; type: string; minute: number | null; team_id: number;
  player: { id: number; name: string } | null;
};
type ApiMatch = {
  id: number; phase: string; status: string; field_number: number; scheduled_at: string;
  team_a_id: number; team_b_id: number; score_a: number | null; score_b: number | null;
  kickoff_at: string | null; walkover: string | null;
  teamA: { name: string } | null; teamB: { name: string } | null; events?: ApiEvent[];
};

type BracketCard = {
  id: number;
  fecha: string;
  estado: "FIN" | "VIVO" | "PROXIMO";
  equipoLocal: string;
  golesLocal?: number;
  penalesLocal?: number;
  equipoVisita: string;
  golesVisita?: number;
  penalesVisita?: number;
};
type BracketData = { cuartos: BracketCard[]; semifinales: BracketCard[]; final: BracketCard | null };

// El componente FaseEliminatoria (de Simón) espera ids string y un final no nulo
function toElimCard(c: BracketCard) {
  return { ...c, id: String(c.id) };
}
const elimPlaceholder = {
  id: "por-definir",
  fecha: "Por definir",
  estado: "PROXIMO" as const,
  equipoLocal: "Por definir",
  equipoVisita: "Por definir",
};

const phaseLabels: Record<string, string> = {
  GRUPOS: "Fase de Grupos",
  CUARTOS: "Cuartos de Final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

function toTarjetaProps(m: ApiMatch) {
  const estado =
    m.status === "FINALIZADO" ? ("FINALIZADO" as const)
    : m.status === "PROGRAMADO" ? ("PROXIMO" as const)
    : ("VIVO" as const);

  const resumen = (m.events ?? [])
    .slice()
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0))
    .map((e) => ({
      minuto: `${e.minute ?? 0}'`,
      texto: e.player?.name ?? "Gol de oficio",
      tipo: (e.type === "GOL" ? "gol" : e.type === "AMARILLA" ? "amarilla" : "roja") as
        "gol" | "amarilla" | "roja",
      lado: (e.team_id === m.team_a_id ? "local" : "visitante") as "local" | "visitante",
    }));

  const minuto =
    estado === "VIVO" && m.kickoff_at
      ? `${Math.max(1, Math.floor((Date.now() - new Date(m.kickoff_at).getTime()) / 60000))}'`
      : undefined;

  return {
    liga: phaseLabels[m.phase] ?? m.phase,
    cancha: `Cancha ${m.field_number}`,
    estado,
    minuto,
    fechaHora: new Date(m.scheduled_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    equipoLocal: m.teamA?.name ?? "Equipo A",
    golesLocal: m.score_a ?? 0,
    equipoVisita: m.teamB?.name ?? "Equipo B",
    golesVisita: m.score_b ?? 0,
    resumen,
  };
}

export default function PublicLivePage() {
  // Estado compartido para controlar la navegación síncrona
  const [activeTab, setActiveTab] = useState("partidos");
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [liveMatches, setLiveMatches] = useState<ApiMatch[]>([]);
  const [bracket, setBracket] = useState<BracketData | null>(null);

  useEffect(() => {
    fetch("/api/standings").then((r) => r.json()).then(setStandings).catch(console.error);
    fetch("/api/matches").then((r) => r.json()).then(setLiveMatches).catch(console.error);
    fetch("/api/brackets").then((r) => r.json()).then(setBracket).catch(console.error);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#eef3ff] font-poppins text-[#10204c]">
      {/* Header Reutilizable Sincronizado */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenido Principal */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5 flex flex-col font-poppins">

        {/* VISTA 1: GRUPOS */}
        {activeTab === "grupos" && (
          <div className="space-y-4">
            {/* TÍTULO CON EFECTO DE LUZ CENTRADO EN POPPINS */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
                Tabla de posiciones
              </h2>
            </div>

            {standings.length === 0 ? (
              <p className="text-center text-sm text-[#10204c]/40 py-8">Aún no hay grupos conformados.</p>
            ) : (
              standings.map((g) => (
                <TablaGrupo
                  key={g.group}
                  nombreGrupo={`Grupo ${g.group}`}
                  equipos={g.tabla.map((r) => ({
                    nombre: r.team, pj: r.pj, pg: r.pg, pe: r.pe, pp: r.pp,
                    gf: r.gf, gc: r.gc, gd: r.dg, amarillas: r.amarillas, rojas: r.rojas, pts: r.pts,
                  }))}
                />
              ))
            )}
          </div>
        )}

        {/* VISTA 2: PARTIDOS */}
        {activeTab === "partidos" && (
          <div className="space-y-4">
            {/* TÍTULO CON EFECTO DE LUZ CENTRADO EN POPPINS */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
                Partidos de la fecha
              </h2>
            </div>

            {liveMatches.length === 0 ? (
              <p className="text-center text-sm text-[#10204c]/40 py-8">No hay partidos programados todavía.</p>
            ) : (
              liveMatches.map((m) => <TarjetaPartido key={m.id} {...toTarjetaProps(m)} />)
            )}
          </div>
        )}

        {/* VISTA 3: FASE FINAL */}
        {activeTab === "fixture" && (
          bracket && (bracket.semifinales.length > 0 || bracket.final) ? (
            <FaseEliminatoria
              partidosSemifinal={
                bracket.semifinales.length > 0
                  ? bracket.semifinales.map(toElimCard)
                  : [ { ...elimPlaceholder, id: "semi-1" }, { ...elimPlaceholder, id: "semi-2" } ]
              }
              partidoFinal={bracket.final ? toElimCard(bracket.final) : elimPlaceholder}
            />
          ) : (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
                  Fase eliminatoria
                </h2>
              </div>
              <div className="w-full bg-white border border-[#10204c]/5 rounded-3xl p-8 shadow-[0_4px_20px_rgba(16,32,76,0.02)] text-center">
                <p className="text-sm text-[#10204c]/50 font-semibold">
                  Las llaves se definirán al terminar la fase de grupos. 🏆
                </p>
              </div>
            </div>
          )
        )}

      </main>

      {/* Footer Reutilizable */}
      <Footer />
    </div>
  );
}