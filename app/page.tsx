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

  useEffect(() => {
    fetch("/api/standings").then((r) => r.json()).then(setStandings).catch(console.error);
    fetch("/api/matches").then((r) => r.json()).then(setLiveMatches).catch(console.error);
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
          <div className="space-y-4 flex-1 flex flex-col">
            {/* TÍTULO CON EFECTO DE LUZ CENTRADO EN POPPINS */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
                Fase eliminatoria
              </h2>
            </div>
            
            {/* Contenedor del Bracket en Poppins */}
            <div className="w-full bg-white border border-[#10204c]/5 rounded-3xl p-4 shadow-[0_4px_20px_rgba(16,32,76,0.02)] flex-1 flex flex-col justify-center font-poppins">
              
              {/* Encabezados de las Rondas */}
              <div className="grid grid-cols-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#10204c]/40 border-b border-gray-50 pb-2 mb-4 font-poppins">
                <div>Semifinales</div>
                <div>Gran Final</div>
              </div>

              {/* El Árbol Gráfico */}
              <div className="grid grid-cols-2 gap-x-3 items-center relative flex-1 py-4 font-poppins">
                
                {/* COLUMNA 1: SEMIFINALES */}
                <div className="space-y-8 relative z-10 flex flex-col justify-around h-full">
                  {/* Semifinal 1 */}
                  <div className="relative group">
                    <div className="absolute -right-3 top-1/2 w-3.5 h-[1px] bg-[#10204c]/10" />
                    <div className="absolute -right-3 top-1/2 h-[54px] w-[1px] bg-[#10204c]/10" />
                    
                    <div className="bg-[#10204c]/[0.03] border border-[#10204c]/10 rounded-xl overflow-hidden shadow-sm">
                      <div className="text-[9px] font-semibold text-[#10204c]/40 px-2.5 py-1 bg-[#10204c]/[0.02] border-b border-[#10204c]/5 flex justify-between">
                        <span>Sáb, 18/7</span>
                        <span className="font-bold text-emerald-600">Fin</span>
                      </div>
                      <div className="p-2 space-y-1.5 text-xs font-bold text-[#10204c]/90">
                        <div className="flex justify-between items-center">
                          <span className="truncate">Equipo Alpha</span>
                          <span className="text-[#233c97] font-black">3</span>
                        </div>
                        <div className="flex justify-between items-center font-medium text-[#10204c]/40 border-t border-[#10204c]/5 pt-1">
                          <span className="truncate">Equipo Beta</span>
                          <span>1</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Semifinal 2 */}
                  <div className="relative group">
                    <div className="absolute -right-3 top-1/2 w-3.5 h-[1px] bg-[#10204c]/10" />
                    <div className="absolute -right-3 top-1/2 bottom-1/2 h-[54px] -translate-y-full w-[1px] bg-[#10204c]/10" />

                    <div className="bg-[#10204c]/[0.03] border border-[#10204c]/10 rounded-xl overflow-hidden shadow-sm">
                      <div className="text-[9px] font-semibold text-[#10204c]/40 px-2.5 py-1 bg-[#10204c]/[0.02] border-b border-[#10204c]/5 flex justify-between">
                        <span>Sáb, 19/3</span>
                        <span className="font-bold text-emerald-600">Fin</span>
                      </div>
                      <div className="p-2 space-y-1.5 text-xs font-medium text-[#10204c]/40">
                        <div className="flex justify-between items-center">
                          <span className="truncate">Equipo Éxodo</span>
                          <span>2 <span className="text-[10px] text-[#10204c]/30">(3)</span></span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-[#10204c]/90 border-t border-[#10204c]/5 pt-1">
                          <span className="truncate">Equipo Omega</span>
                          <span className="text-[#233c97] font-black">2 <span className="text-[10px] text-[#233c97]/60">(4)</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 2: GRAN FINAL */}
                <div className="relative z-10 flex flex-col justify-center h-full pl-0.5">
                  <div className="absolute -left-[11px] top-1/2 w-2.5 h-[1px] bg-[#10204c]/10" />

                  <div className="bg-gradient-to-br from-amber-500/[0.02] to-amber-500/[0.06] border-2 border-[#f7c600]/30 rounded-2xl overflow-hidden shadow-md relative">
                    <div className="text-[9px] font-bold text-amber-600 px-2.5 py-1 bg-[#f7c600]/10 border-b border-[#f7c600]/10 flex justify-between items-center">
                      <span>Próximamente</span>
                      <span className="bg-[#f7c600] text-[#10204c] px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Hoy</span>
                    </div>
                    <div className="p-3.5 space-y-2 text-xs font-extrabold text-[#10204c]">
                      <div className="flex justify-between items-center gap-1">
                        <span className="truncate flex items-center gap-1">🏆 Equipo Alpha</span>
                        <span className="text-gray-300 font-normal">—</span>
                      </div>
                      <div className="flex justify-between items-center gap-1 border-t border-gray-100 pt-2">
                        <span className="truncate flex items-center gap-1">🏆 Equipo Omega</span>
                        <span className="text-gray-300 font-normal">—</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer Reutilizable */}
      <Footer />
    </div>
  );
}