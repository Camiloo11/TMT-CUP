"use client";

import { useState } from "react";

interface Equipo {
  nombre: string;
  bandera?: string; // ruta del SVG local de la bandera (/flags/xx.svg)
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  gd: number;
  amarillas: number;
  rojas: number;
  pts: number;
}

interface TablaGrupoProps {
  nombreGrupo: string;
  equipos: Equipo[];
  genero?: "masculino" | "femenino";
}

export function TablaGrupo({ nombreGrupo, equipos, genero = "masculino" }: TablaGrupoProps) {
  const [equipoExpandido, setEquipoExpandido] = useState<string | null>(null);

  const toggleExpandir = (nombre: string) => {
    setEquipoExpandido(equipoExpandido === nombre ? null : nombre);
  };

  return (
    <div
      className="w-full rounded-2xl min-[375px]:rounded-3xl p-2 min-[375px]:p-4 md:p-6 shadow-[0_4px_20px_rgba(16,32,76,0.02)] transition-all font-poppins"
      data-theme={genero}
      style={{
        backgroundColor: "var(--card-strong)",
        border: "1px solid var(--border)"
      }}
    >
      {/* Cabecera del Grupo */}
      <div className="flex items-center justify-between mb-2 min-[375px]:mb-4 md:mb-6 px-0.5">
        <h3 className="text-xs min-[375px]:text-lg md:text-xl font-medium tracking-wide" style={{ color: "var(--primary)" }}>
          {nombreGrupo}
        </h3>
      </div>

      {/* Tabla Principal */}
      <div className="w-full overflow-x-auto">
        {/* Encabezado */}
        <div
          className="flex items-center text-[8.5px] min-[375px]:text-xs sm:text-xs md:text-sm font-bold tracking-wider pb-2 px-1 min-[375px]:px-2 md:px-4"
          style={{
            color: "var(--foreground)",
            opacity: 0.8,
            borderBottom: "1px solid var(--border)"
          }}
        >
          <div className="w-5 sm:w-8 md:w-10 text-center flex-shrink-0 font-light">Pos</div>
          <div className="flex-1 min-w-[90px] sm:min-w-[120px] text-left pl-1.5 sm:pl-3 font-light">Equipo</div>
          <div className="w-6 sm:w-10 md:w-12 text-center flex-shrink-0 font-light">PJ</div>
          <div className="w-8 sm:w-12 md:w-14 text-center flex-shrink-0 font-light">GD</div>
          <div className="w-8 sm:w-12 md:w-14 text-center font-semibold flex-shrink-0" style={{ color: "var(--primary)" }}>PTS</div>
        </div>

        {/* Lista de Equipos */}
        <div
          className="divide-y"
          style={{
            borderBottom: "1px solid var(--border)",
            borderColor: "var(--border)"
          }}
        >
          {equipos.map((equipo, index) => {
            const isFirst = index === 0;
            const isLast = index === equipos.length - 1;
            const isExpanded = equipoExpandido === equipo.nombre;

            return (
              <div key={equipo.nombre} className="flex flex-col">
                {/* Fila Principal */}
                <button
                  type="button"
                  onClick={() => toggleExpandir(equipo.nombre)}
                  className={`flex items-center w-full py-2 sm:py-3 md:py-3.5 px-1 min-[375px]:px-2 md:px-4 text-left transition-all ${isFirst ? "rounded-r-lg" : ""
                    }`}
                  style={{
                    color: "var(--foreground)",
                    opacity: isLast ? 0.75 : 1,
                    borderLeft: isFirst ? "3px solid var(--accent)" : "3px solid transparent",
                    backgroundColor: isFirst
                      ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                      : isLast
                        ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
                        : "transparent"
                  }}
                >
                  {/* Posición */}
                  <div
                    className="w-5 sm:w-8 md:w-10 text-center font-medium text-[8.5px] min-[375px]:text-xs md:text-sm flex-shrink-0"
                    style={{ color: isFirst ? "var(--accent)" : "var(--foreground)", opacity: isFirst ? 1 : 0.4 }}
                  >
                    {index + 1}
                  </div>

                  {/* Nombre Equipo / País */}
                  <div
                    className="flex-1 min-w-[90px] sm:min-w-[120px] pl-1.5 sm:pl-3 truncate text-[8.5px] min-[375px]:text-xs sm:text-sm md:text-base font-medium tracking-tighter min-[375px]:tracking-normal"
                    style={{ color: isFirst ? "var(--primary)" : "var(--foreground)" }}
                  >
                    {equipo.bandera && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={equipo.bandera} alt="" className="inline-block h-[0.9em] w-auto rounded-[2px] mr-1.5 align-[-0.08em] shadow-sm" />
                    )}
                    {equipo.nombre}
                  </div>

                  {/* PJ */}
                  <div className="w-6 sm:w-10 md:w-12 text-center text-[8.5px] min-[375px]:text-xs md:text-sm flex-shrink-0" style={{ opacity: 0.6 }}>
                    {equipo.pj}
                  </div>

                  {/* GD */}
                  <div className="w-8 sm:w-12 md:w-14 text-center font-medium text-[8.5px] min-[375px]:text-xs md:text-sm flex-shrink-0">
                    <span style={{ color: equipo.gd > 0 ? "var(--success)" : equipo.gd < 0 ? "var(--danger)" : "var(--foreground)" }}>
                      {equipo.gd > 0 ? `+${equipo.gd}` : equipo.gd}
                    </span>
                  </div>

                  {/* Puntos */}
                  <div className="w-8 sm:w-12 md:w-14 text-center font-bold text-[10px] min-[375px]:text-sm md:text-base flex-shrink-0" style={{ color: isFirst ? "var(--primary)" : "var(--foreground)" }}>
                    {equipo.pts}
                  </div>
                </button>

                {/* Sub-panel de Estadísticas Expandido */}
                {isExpanded && (
                  <div
                    className="px-2 min-[375px]:px-4 md:px-6 py-2 min-[375px]:py-3 md:py-4 text-[8.5px] min-[375px]:text-[11px] md:text-xs grid grid-cols-2 min-[375px]:grid-cols-4 gap-1.5 min-[375px]:gap-2 md:gap-3 border-l-4 border-transparent border-t border-b animate-select-dropdown"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--primary) 4%, transparent)",
                      borderColor: "var(--border)"
                    }}
                  >
                    {/* Ganados */}
                    <div
                      className="flex flex-col p-1 rounded-lg border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[7.5px] min-[375px]:text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>Ganados</span>
                      <span className="font-bold mt-0.5 animate-fade-in" style={{ color: "var(--success)" }}>{equipo.pg}</span>
                    </div>

                    {/* Empatados */}
                    <div
                      className="flex flex-col p-1 rounded-lg border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[7.5px] min-[375px]:text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>Empatados</span>
                      <span className="font-bold mt-0.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>{equipo.pe}</span>
                    </div>

                    {/* Perdidos */}
                    <div
                      className="flex flex-col p-1 rounded-lg border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[7.5px] min-[375px]:text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>Perdidos</span>
                      <span className="font-bold mt-0.5 animate-fade-in" style={{ color: "var(--danger)" }}>{equipo.pp}</span>
                    </div>

                    {/* Goles Favor / Contra */}
                    <div
                      className="flex flex-col p-1 rounded-lg border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[7.5px] min-[375px]:text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>Goles (f/c)</span>
                      <span className="font-bold mt-0.5" style={{ color: "var(--foreground)" }}>{equipo.gf} / {equipo.gc}</span>
                    </div>

                    {/* Sección de Fair Play / Tarjetas */}
                    <div
                      className="col-span-2 min-[375px]:col-span-4 flex items-center justify-between px-1 mt-0.5 border-t border-dashed pt-1.5"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="font-light text-[7.5px] min-[375px]:text-[10px]" style={{ color: "var(--foreground)", opacity: 0.6 }}>Juego limpio / Tarjetas:</span>
                      <div className="flex gap-2 min-[375px]:gap-4 text-[8.5px] min-[375px]:text-xs">
                        <span className="flex items-center gap-0.5 font-medium">
                          <span>🟨</span> {equipo.amarillas}
                        </span>
                        <span className="flex items-center gap-0.5 font-medium">
                          <span>🟥</span> {equipo.rojas}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}