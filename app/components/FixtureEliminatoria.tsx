"use client";

export default function FixtureEliminatoria() {
  return (
    <div className="space-y-4 flex-1 flex flex-col w-full">
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
  );
}