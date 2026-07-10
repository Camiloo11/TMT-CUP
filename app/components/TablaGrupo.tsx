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
}

export function TablaGrupo({ nombreGrupo, equipos }: TablaGrupoProps) {
  // Guardamos el índice o nombre del equipo expandido (null si ninguno lo está)
  const [equipoExpandido, setEquipoExpandido] = useState<string | null>(null);

  const toggleExpandir = (nombre: string) => {
    setEquipoExpandido(equipoExpandido === nombre ? null : nombre);
  };

  return (
    <div className="w-full bg-white border border-[#10204c]/5 rounded-3xl p-4 shadow-[0_4px_20px_rgba(16,32,76,0.02)]">
      {/* Cabecera del Grupo */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-base font-bold text-[#233c97]">{nombreGrupo}</h3>
        <span className="text-[10px] text-[#10204c]/40 font-medium">Toca un equipo para ver detalles</span>
      </div>

      {/* Tabla Principal */}
      <div className="w-full">
        {/* Encabezado Simplificado */}
        <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#10204c]/40 border-b border-gray-100 pb-2 px-2">
          <div className="w-8 text-center">Pos</div>
          <div className="flex-1 text-left pl-2">Equipo</div>
          <div className="w-10 text-center">PJ</div>
          <div className="w-12 text-center">GD</div>
          <div className="w-12 text-center font-extrabold text-[#233c97]">PTS</div>
        </div>

        {/* Lista de Equipos */}
        <div className="divide-y divide-gray-50/80">
          {equipos.map((equipo, index) => {
            const isFirst = index === 0;
            const isLast = index === equipos.length - 1;
            const isExpanded = equipoExpandido === equipo.nombre;

            return (
              <div key={equipo.nombre} className="flex flex-col">
                {/* Fila Principal */}
                <button
                  onClick={() => toggleExpandir(equipo.nombre)}
                  className={`flex items-center w-full py-3 px-2 text-xs font-semibold text-[#10204c]/80 transition-all text-left ${
                    isFirst ? "bg-[#233c97]/5 border-l-4 border-[#f7c600] rounded-r-xl" : "border-l-4 border-transparent"
                  } ${isLast ? "opacity-75 bg-gray-50/30" : ""}`}
                >
                  {/* Posición */}
                  <div className={`w-8 text-center font-bold ${isFirst ? "text-[#f7c600]" : "text-[#10204c]/40"}`}>
                    {index + 1}
                  </div>

                  {/* Nombre Equipo */}
                  <div className={`flex-1 pl-2 truncate ${isFirst ? "font-bold text-[#233c97]" : ""}`}>
                    {equipo.nombre}
                  </div>

                  {/* PJ */}
                  <div className="w-10 text-center text-[#10204c]/60">{equipo.pj}</div>

                  {/* GD */}
                  <div className="w-12 text-center font-medium">
                    <span className={equipo.gd > 0 ? "text-emerald-600" : equipo.gd < 0 ? "text-rose-500" : "text-[#10204c]/40"}>
                      {equipo.gd > 0 ? `+${equipo.gd}` : equipo.gd}
                    </span>
                  </div>

                  {/* Puntos */}
                  <div className={`w-12 text-center font-black text-sm ${isFirst ? "text-[#233c97]" : ""}`}>
                    {equipo.pts}
                  </div>
                </button>

                {/* Sub-panel de Estadísticas Expandido */}
                {isExpanded && (
                  <div className="bg-[#eef3ff]/40 px-4 py-3 text-[11px] grid grid-cols-4 gap-y-3 gap-x-2 border-l-4 border-transparent border-t border-b border-gray-100/60 animate-select-dropdown">
                    <div className="flex flex-col bg-white p-1.5 rounded-xl border border-[#10204c]/5 items-center">
                      <span className="text-[#10204c]/40 text-[9px] uppercase font-bold">Ganados</span>
                      <span className="font-bold text-emerald-600 mt-0.5">{equipo.pg}</span>
                    </div>
                    <div className="flex flex-col bg-white p-1.5 rounded-xl border border-[#10204c]/5 items-center">
                      <span className="text-[#10204c]/40 text-[9px] uppercase font-bold">Empatados</span>
                      <span className="font-bold text-gray-500 mt-0.5">{equipo.pe}</span>
                    </div>
                    <div className="flex flex-col bg-white p-1.5 rounded-xl border border-[#10204c]/5 items-center">
                      <span className="text-[#10204c]/40 text-[9px] uppercase font-bold">Perdidos</span>
                      <span className="font-bold text-rose-600 mt-0.5">{equipo.pp}</span>
                    </div>
                    <div className="flex flex-col bg-white p-1.5 rounded-xl border border-[#10204c]/5 items-center">
                      <span className="text-[#10204c]/40 text-[9px] uppercase font-bold">Goles (F/C)</span>
                      <span className="font-bold text-[#10204c]/80 mt-0.5">{equipo.gf} / {equipo.gc}</span>
                    </div>
                    
                    {/* Sección de Fair Play / Tarjetas */}
                    <div className="col-span-4 flex items-center justify-between px-1 mt-1 border-t border-dashed border-gray-200/60 pt-2">
                      <span className="text-[#10204c]/50 font-medium">Juego Limpio / Tarjetas:</span>
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1 font-bold">
                          <span>🟨</span> {equipo.amarillas}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
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