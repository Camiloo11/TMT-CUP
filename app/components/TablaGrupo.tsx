"use client";

import { useState } from "react";

interface Equipo {
  nombre: string;
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
      className="w-full rounded-3xl p-4 md:p-6 shadow-[0_4px_20px_rgba(16,32,76,0.02)] transition-all font-poppins"
      data-theme={genero}
      style={{
        backgroundColor: "var(--card-strong)",
        border: "1px solid var(--border)"
      }}
    >
      {/* Cabecera del Grupo (Nombre del grupo en negrita) */}
      <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
        <h3 className="text-lg md:text-xl font-bold tracking-wide" style={{ color: "var(--primary)" }}>
          {nombreGrupo}
        </h3>
      </div>

      {/* Tabla Principal */}
      <div className="w-full">
        {/* Encabezado (Todo en negrita, solo las siglas en mayúscula sostenida) */}
        <div
          className="flex items-center text-xs font-bold tracking-wider pb-2 px-2 md:px-4"
          style={{
            color: "var(--foreground)",
            opacity: 0.8,
            borderBottom: "1px solid var(--border)"
          }}
        >
          <div className="w-8 md:w-12 text-center">Pos</div>
          <div className="flex-1 text-left pl-2 md:pl-4">Equipo</div>
          <div className="w-10 md:w-16 text-center">PJ</div>
          <div className="w-12 md:w-20 text-center">GD</div>
          <div className="w-12 md:w-20 text-center font-bold" style={{ color: "var(--primary)" }}>PTS</div>
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
                  className={`flex items-center w-full py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-normal transition-all text-left ${
                    isFirst ? "rounded-r-xl" : ""
                  }`}
                  style={{
                    color: "var(--foreground)",
                    opacity: isLast ? 0.75 : 1,
                    borderLeft: isFirst ? "4px solid var(--accent)" : "4px solid transparent",
                    backgroundColor: isFirst
                      ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                      : isLast
                        ? "color-mix(in srgb, var(--foreground) 3%, transparent)"
                        : "transparent"
                  }}
                >
                  {/* Posición */}
                  <div
                    className="w-8 md:w-12 text-center font-medium"
                    style={{ color: isFirst ? "var(--accent)" : "var(--foreground)", opacity: isFirst ? 1 : 0.4 }}
                  >
                    {index + 1}
                  </div>

                  {/* Nombre Equipo */}
                  <div className="flex-1 pl-2 md:pl-4 truncate" style={{ color: isFirst ? "var(--primary)" : "var(--foreground)" }}>
                    {equipo.nombre}
                  </div>

                  {/* PJ */}
                  <div className="w-10 md:w-16 text-center" style={{ opacity: 0.6 }}>{equipo.pj}</div>

                  {/* GD (Diferencia de Goles con color dinámico) */}
                  <div className="w-12 md:w-20 text-center font-medium">
                    <span style={{ color: equipo.gd > 0 ? "var(--success)" : equipo.gd < 0 ? "var(--danger)" : "var(--foreground)" }}>
                      {equipo.gd > 0 ? `+${equipo.gd}` : equipo.gd}
                    </span>
                  </div>

                  {/* Puntos */}
                  <div className="w-12 md:w-20 text-center font-bold text-sm md:text-base" style={{ color: isFirst ? "var(--primary)" : "var(--foreground)" }}>
                    {equipo.pts}
                  </div>
                </button>

                {/* Sub-panel de Estadísticas Expandido */}
                {isExpanded && (
                  <div
                    className="px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs grid grid-cols-4 gap-y-3 gap-x-3 border-l-4 border-transparent border-t border-b animate-select-dropdown"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--primary) 4%, transparent)",
                      borderColor: "var(--border)"
                    }}
                  >
                    {/* Ganados */}
                    <div
                      className="flex flex-col p-2 rounded-xl border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>ganados</span>
                      <span className="font-bold mt-0.5 animate-fade-in" style={{ color: "var(--success)" }}>{equipo.pg}</span>
                    </div>

                    {/* Empatados */}
                    <div
                      className="flex flex-col p-2 rounded-xl border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>empatados</span>
                      <span className="font-bold mt-0.5" style={{ color: "var(--foreground)", opacity: 0.7 }}>{equipo.pe}</span>
                    </div>

                    {/* Perdidos */}
                    <div
                      className="flex flex-col p-2 rounded-xl border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>perdidos</span>
                      <span className="font-bold mt-0.5 animate-fade-in" style={{ color: "var(--danger)" }}>{equipo.pp}</span>
                    </div>

                    {/* Goles Favor / Contra */}
                    <div
                      className="flex flex-col p-2 rounded-xl border items-center"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--card-strong)"
                      }}
                    >
                      <span className="text-[9px] md:text-[10px] font-normal" style={{ color: "var(--foreground)", opacity: 0.5 }}>goles (f/c)</span>
                      <span className="font-bold mt-0.5" style={{ color: "var(--foreground)" }}>{equipo.gf} / {equipo.gc}</span>
                    </div>

                    {/* Sección de Fair Play / Tarjetas */}
                    <div
                      className="col-span-4 flex items-center justify-between px-1 mt-1 border-t border-dashed pt-2"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="font-light" style={{ color: "var(--foreground)", opacity: 0.6 }}>juego limpio / tarjetas:</span>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1 font-medium">
                          <span>🟨</span> {equipo.amarillas}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
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