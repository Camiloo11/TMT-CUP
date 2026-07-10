interface Equipo {
  nombre: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  gd: number; // Puede ser un string o número, ej: "+5" o "-1"
  amarillas: number;
  rojas: number;
  pts: number;
}

interface TablaGrupoProps {
  nombreGrupo: string; // Ej: "Grupo A", "Grupo B"
  equipos: Equipo[];
}

export function TablaGrupo({ nombreGrupo, equipos }: TablaGrupoProps) {
  return (
    <div className="w-full bg-white border border-[#10204c]/5 rounded-3xl p-4 shadow-[0_4px_20px_rgba(16,32,76,0.02)]">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-bold text-[#233c97]">{nombreGrupo}</h3>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-left border-collapse min-w-[340px] align-middle">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-[#10204c]/40 border-b border-gray-100">
              <th className="py-2 pl-1 text-left align-middle">Equipo</th>
              <th className="py-2 text-center w-7 align-middle">pj</th>
              <th className="py-2 text-center w-7 text-emerald-600 align-middle">pg</th>
              <th className="py-2 text-center w-7 text-gray-500 align-middle">pe</th>
              <th className="py-2 text-center w-7 text-rose-600 align-middle">pp</th>
              <th className="py-2 text-center w-7 align-middle">gf</th>
              <th className="py-2 text-center w-7 align-middle">gc</th>
              <th className="py-2 text-center w-7 align-middle">gd</th>
              <th className="py-2 text-center w-6 text-amber-500 align-middle">🟨</th>
              <th className="py-2 text-center w-6 text-red-500 align-middle">🟥</th>
              <th className="py-2 text-center w-8 font-extrabold text-[#233c97] bg-[#233c97]/5 rounded-t-xl align-middle">pts</th>
            </tr>
          </thead>
          <tbody className="text-xs font-semibold text-[#10204c]/80 divide-y divide-gray-50/60">
            {equipos.map((equipo, index) => {
              const isFirst = index === 0;
              const isLast = index === equipos.length - 1;

              return (
                <tr 
                  key={equipo.nombre} 
                  className={`align-middle ${
                    isFirst ? "bg-[#233c97]/5 border-l-4 border-[#f7c600]" : "border-l-4 border-transparent"
                  } ${isLast ? "opacity-60 bg-gray-50/50" : ""}`}
                >
                  <td className={`py-2 pl-2 align-middle ${isFirst ? "font-bold text-[#233c97] rounded-tl-xl" : ""} ${isLast ? "text-[#10204c]/70 rounded-bl-xl" : ""}`}>
                    {equipo.nombre}
                  </td>
                  <td className="py-2 text-center align-middle">{equipo.pj}</td>
                  <td className="py-2 text-center text-emerald-600 align-middle font-bold">{equipo.pg}</td>
                  <td className="py-2 text-center text-gray-400 align-middle">{equipo.pe}</td>
                  <td className="py-2 text-center text-rose-600 align-middle">{equipo.pp}</td>
                  <td className="py-2 text-center align-middle">{equipo.gf}</td>
                  <td className="py-2 text-center align-middle">{equipo.gc}</td>
                  <td className="py-2 text-center font-medium align-middle class">
                    <span className={Number(equipo.gd) > 0 ? "text-emerald-600" : Number(equipo.gd) < 0 ? "text-rose-500" : ""}>
                      {Number(equipo.gd) > 0 ? `+${equipo.gd}` : equipo.gd}
                    </span>
                  </td>
                  <td className="py-2 text-center text-[11px] text-[#10204c]/60 align-middle">{equipo.amarillas}</td>
                  <td className="py-2 text-center text-[11px] text-[#10204c]/60 align-middle">{equipo.rojas}</td>
                  <td className={`py-2 text-center font-extrabold align-middle ${
                    isFirst ? "text-[#233c97] bg-[#233c97]/5" : isLast ? "text-[#10204c]/60 bg-gray-100/50 rounded-br-xl" : "bg-[#233c97]/5"
                  }`}>
                    {equipo.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}