"use client";

import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TablaGrupo } from "./components/TablaGrupo";
import { TarjetaPartido } from "./components/TarjetaPartido";
import FixtureEliminatoria from "./components/FixtureEliminatoria";

// ── Datos en vivo desde el backend ──────────────────────────
type StandingRow = {
  teamId: number;
  team: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  amarillas: number;
  rojas: number;
};

type GroupStanding = {
  group: string;
  cancha: number;
  tabla: StandingRow[];
};

type ApiEvent = {
  id: number;
  type: string;
  minute: number | null;
  team_id: number;
  player: { id: number; name: string } | null;
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
  kickoff_at: string | null;
  walkover: string | null;
  teamA: { name: string } | null;
  teamB: { name: string } | null;
  events?: ApiEvent[];
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

type BracketData = {
  cuartos: BracketCard[];
  semifinales: BracketCard[];
  final: BracketCard | null;
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
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [liveMatches, setLiveMatches] = useState<ApiMatch[]>([]);
  const [bracket, setBracket] = useState<BracketData | null>(null);

  // Estados locales faltantes de navegación, control de carrusel y género activo
  const [activeIndex, setActiveIndex] = useState(0);
  const [generoMovil, setGeneroMovil] = useState<"masculino" | "femenino">("masculino");
  const carruselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/standings").then((r) => r.json()).then(setStandings).catch(console.error);
    fetch("/api/matches").then((r) => r.json()).then(setLiveMatches).catch(console.error);
    fetch("/api/brackets").then((r) => r.json()).then(setBracket).catch(console.error);
  }, []);

  // Navegación interactiva sincronizada
  const irAVista = (index: number) => {
    setActiveIndex(index);
    if (carruselRef.current) {
      const anchoSli = carruselRef.current.offsetWidth;
      carruselRef.current.scrollTo({
        left: index * anchoSli,
        behavior: "smooth"
      });
    }
  };

  const manejarScrollCarrusel = () => {
    if (carruselRef.current) {
      const { scrollLeft, offsetWidth } = carruselRef.current;
      const indexProximo = Math.round(scrollLeft / offsetWidth);
      if (indexProximo !== activeIndex) {
        setActiveIndex(indexProximo);
      }
    }
  };

  // Mapear StandingRow para adaptarlo a la interfaz Equipo que necesita TablaGrupo
  const adaptarEquipos = (filas: StandingRow[]) =>
    filas.map((f) => ({
      nombre: f.team,
      pj: f.pj,
      pg: f.pg,
      pe: f.pe,
      pp: f.pp,
      gf: f.gf,
      gc: f.gc,
      gd: f.dg, // Mapeo dinámico: la BD entrega 'dg' y la interfaz espera 'gd'
      amarillas: f.amarillas,
      rojas: f.rojas,
      pts: f.pts,
    }));

  // Separar los grupos basados en el esquema del seed (Masculinos: A, B, C | Femenino: F)
  const gruposMasculinos = standings.filter((s) => ["A", "B", "C"].includes(s.group));
  const gruposFemeninos = standings.filter((s) => s.group === "F");

  // Filtrar los partidos por el tipo de torneo de cada género
  const partidosMasculinos = liveMatches.filter((m) => m.phase !== "FINAL" && m.field_number !== 4);
  const partidosFemeninos = liveMatches.filter((m) => m.field_number === 4);

  return (
    <div 
      className="flex min-h-screen flex-col font-poppins overflow-x-hidden relative transition-colors bg-[var(--background)] md:bg-[linear-gradient(to_right,var(--background)_50%,color-mix(in_srgb,var(--primary-feminino,#7c3aed)_4%,var(--background))_50%)]" 
      style={{ color: "var(--foreground)" }}
    >
      {/* Carga externa de los iconos Material Symbols (Man y Woman) */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" 
      />

      {/* Cabecera horizontal */}
      <Header activeIndex={activeIndex} onTabChange={irAVista} />

      <main className="flex-1 w-full flex flex-col justify-start pb-28 md:pb-12">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
          
          {/* ========================================== */}
          {/* 1. MÓVIL: VISTA CARRUSEL CON BARRA DE CONTROL */}
          {/* ========================================== */}
          <div className="block md:hidden w-full max-w-md mx-auto" data-theme={generoMovil}>
            <div 
              ref={carruselRef}
              onScroll={manejarScrollCarrusel}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth h-full"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* VISTA 0: GRUPOS */}
              <div className="w-full flex-shrink-0 snap-start snap-always px-2 py-2 space-y-4">
                {(generoMovil === "masculino" ? gruposMasculinos : gruposFemeninos).map((g) => (
                  <TablaGrupo 
                    key={g.group}
                    nombreGrupo={`Grupo ${g.group}`} 
                    equipos={adaptarEquipos(g.tabla)} 
                    genero={generoMovil}
                  />
                ))}
              </div>

              {/* VISTA 1: PARTIDOS (MÓVIL) */}
              <div className="w-full flex-shrink-0 snap-start snap-always px-2 py-2 space-y-4">
                {(generoMovil === "masculino" ? partidosMasculinos : partidosFemeninos).map((m) => (
                  <TarjetaPartido 
                    key={m.id}
                    {...toTarjetaProps(m)}
                    genero={generoMovil}
                  />
                ))}
              </div>

              {/* VISTA 2: FASE FINAL */}
              <div className="w-full flex-shrink-0 snap-start snap-always px-2 py-2 space-y-4">
                <FixtureEliminatoria genero={generoMovil} />
              </div>
            </div>

            {/* BARRA FLOTANTE INTERACTIVA DE GÉNERO */}
            <div className="fixed bottom-6 right-6 z-50 p-1 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-[0_10px_25px_rgba(16,32,76,0.12)] flex items-center gap-1">
              
              {/* Botón Masculino */}
              <button
                type="button"
                onClick={() => setGeneroMovil("masculino")}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 select-none outline-none ${
                  generoMovil === "masculino"
                    ? "bg-[#233c97] text-white shadow-md scale-[1.05]"
                    : "text-[#10204c]/50 hover:text-[#10204c]"
                }`}
                aria-label="Ver torneo masculino"
              >
                <span className="material-symbols-outlined !text-[24px]">man</span>
              </button>

              {/* Botón Femenino */}
              <button
                type="button"
                onClick={() => setGeneroMovil("femenino")}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 select-none outline-none ${
                  generoMovil === "femenino"
                    ? "bg-[#7c3aed] text-white shadow-md scale-[1.05]"
                    : "text-[#10204c]/50 hover:text-[#10204c]"
                }`}
                aria-label="Ver torneo femenino"
              >
                <span className="material-symbols-outlined !text-[24px]">woman</span>
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. ESCRITORIO: PARALELO (MASCULINO | FEMENINO) */}
          {/* ========================================== */}
          <div className="hidden md:grid grid-cols-2 gap-16 items-start w-full">
            
            {/* COLUMNA IZQUIERDA: MASCULINO */}
            <div className="space-y-6 flex flex-col items-center w-full" data-theme="masculino">
              {/* Cabecera en formato Burbuja/Píldora Redondeada */}
              <div className="w-full flex justify-center mb-2">
                <div className="px-6 py-2.5 rounded-full bg-[#233c97]/5 border border-[#233c97]/15 shadow-sm flex items-center gap-2">
                  <span className="text-xl font-normal tracking-wide text-[#233c97] font-secondary-modak">
                    Torneo masculino
                  </span>
                </div>
              </div>

              {activeIndex === 0 && (
                <div className="w-full space-y-4">
                  {gruposMasculinos.map((g) => (
                    <TablaGrupo 
                      key={g.group}
                      nombreGrupo={`Grupo ${g.group}`} 
                      equipos={adaptarEquipos(g.tabla)} 
                      genero="masculino" 
                    />
                  ))}
                </div>
              )}

              {activeIndex === 1 && (
                <div className="space-y-4 w-full">
                  {partidosMasculinos.map((m) => (
                    <TarjetaPartido 
                      key={m.id}
                      {...toTarjetaProps(m)}
                      genero="masculino"
                    />
                  ))}
                </div>
              )}

              {activeIndex === 2 && (
                <div className="w-full">
                  <FixtureEliminatoria genero="masculino" />
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: FEMENINO */}
            <div className="space-y-6 flex flex-col items-center w-full" data-theme="femenino">
              {/* Cabecera en formato Burbuja/Píldora Redondeada */}
              <div className="w-full flex justify-center mb-2">
                <div className="px-6 py-2.5 rounded-full bg-[#f8f5ff] border border-[#7c3aed]/15 shadow-sm flex items-center gap-2">
                  <span className="text-xl font-normal tracking-wide text-[#7c3aed] font-secondary-modak">
                    Torneo femenino
                  </span>
                </div>
              </div>

              {activeIndex === 0 && (
                <div className="w-full space-y-4">
                  {gruposFemeninos.map((g) => (
                    <TablaGrupo 
                      key={g.group}
                      nombreGrupo={`Grupo ${g.group}`} 
                      equipos={adaptarEquipos(g.tabla)} 
                      genero="femenino" 
                    />
                  ))}
                </div>
              )}

              {activeIndex === 1 && (
                <div className="space-y-4 w-full">
                  {partidosFemeninos.map((m) => (
                    <TarjetaPartido 
                      key={m.id}
                      {...toTarjetaProps(m)}
                      genero="femenino"
                    />
                  ))}
                </div>
              )}

              {activeIndex === 2 && (
                <div className="w-full">
                  <FixtureEliminatoria genero="femenino" />
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}