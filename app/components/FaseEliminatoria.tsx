"use client";

interface PartidoEliminatoria {
  id: string;
  fecha: string;
  estado: "FIN" | "VIVO" | "PROXIMO";
  equipoLocal: string;
  golesLocal?: number;
  penalesLocal?: number;
  equipoVisita: string;
  golesVisita?: number;
  penalesVisita?: number;
}

interface FaseEliminatoriaProps {
  partidosSemifinal: PartidoEliminatoria[];
  partidoFinal: PartidoEliminatoria;
}

export function FaseEliminatoria({ partidosSemifinal, partidoFinal }: FaseEliminatoriaProps) {
  return (
    <div className="space-y-4 flex-1 flex flex-col w-full min-w-0">
      {/* Título con efecto de luz centrado */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
          Fase eliminatoria
        </h2>
        <p className="text-[10px] text-[#10204c]/40 font-bold uppercase tracking-widest mt-1">
          ← Desliza para ver las rondas →
        </p>
      </div>
      
      {/* Contenedor del Bracket con Scroll Horizontal y Snap */}
      <div className="w-full bg-white border border-[#10204c]/5 rounded-3xl p-4 shadow-[0_4px_20px_rgba(16,32,76,0.02)] flex-1 flex flex-col justify-center font-poppins overflow-x-auto snap-x snap-mandatory scrollbar-none">
        
        <div className="flex w-[200%] md:w-full grid-cols-1 md:grid md:grid-cols-2 gap-x-6 items-center relative flex-1 py-2">
          
          {/* FASE 1: SEMIFINALES */}
          <div className="w-1/2 md:w-full shrink-0 snap-center px-2 space-y-6 flex flex-col justify-around h-full border-r border-dashed border-gray-100 md:border-none pr-6 md:pr-0">
            <div className="text-center text-[10px] font-black uppercase tracking-wider text-[#10204c]/40 border-b border-gray-50 pb-2 mb-2">
              Semifinales
            </div>

            {partidosSemifinal.map((partido) => {
              const localGano = (partido.golesLocal ?? 0) > (partido.golesVisita ?? 0) || (partido.penalesLocal ?? 0) > (partido.penalesVisita ?? 0);
              const visitaGano = (partido.golesVisita ?? 0) > (partido.golesLocal ?? 0) || (partido.penalesVisita ?? 0) > (partido.penalesLocal ?? 0);

              return (
                <div key={partido.id} className="bg-[#10204c]/[0.03] border border-[#10204c]/10 rounded-xl overflow-hidden shadow-sm">
                  <div className="text-[9px] font-semibold text-[#10204c]/40 px-2.5 py-1 bg-[#10204c]/[0.02] border-b border-[#10204c]/5 flex justify-between">
                    <span>{partido.fecha}</span>
                    <span className={`font-bold ${partido.estado === 'VIVO' ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                      {partido.estado === 'VIVO' ? 'En vivo' : 'Fin'}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs font-poppins">
                    {/* Local */}
                    <div className={`flex justify-between items-center ${localGano ? "font-bold text-[#10204c]/90" : "font-medium text-[#10204c]/40"}`}>
                      <span className="truncate">{partido.equipoLocal}</span>
                      <span className={localGano && partido.estado !== 'PROXIMO' ? "text-[#233c97] font-black" : ""}>
                        {partido.golesLocal} {partido.penalesLocal !== undefined && <span className="text-[10px] opacity-60">({partido.penalesLocal})</span>}
                      </span>
                    </div>
                    {/* Visitante */}
                    <div className={`flex justify-between items-center border-t border-[#10204c]/5 pt-1 ${visitaGano ? "font-bold text-[#10204c]/90" : "font-medium text-[#10204c]/40"}`}>
                      <span className="truncate">{partido.equipoVisita}</span>
                      <span className={visitaGano && partido.estado !== 'PROXIMO' ? "text-[#233c97] font-black" : ""}>
                        {partido.golesVisita} {partido.penalesVisita !== undefined && <span className="text-[10px] opacity-60">({partido.penalesVisita})</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FASE 2: GRAN FINAL */}
          <div className="w-1/2 md:w-full shrink-0 snap-center px-2 flex flex-col justify-center h-full pl-6 md:pl-0">
            <div className="text-center text-[10px] font-black uppercase tracking-wider text-amber-600 border-b border-gray-50 pb-2 mb-6">
              Gran Final
            </div>

            <div className="bg-gradient-to-br from-amber-500/[0.02] to-amber-500/[0.06] border-2 border-[#f7c600]/30 rounded-2xl overflow-hidden shadow-md">
              <div className="text-[9px] font-bold text-amber-600 px-2.5 py-1 bg-[#f7c600]/10 border-b border-[#f7c600]/10 flex justify-between items-center">
                <span>{partidoFinal.estado === 'PROXIMO' ? 'Próximamente' : 'Partido decisivo'}</span>
                {partidoFinal.estado === 'PROXIMO' && (
                  <span className="bg-[#f7c600] text-[#10204c] px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Hoy</span>
                )}
              </div>
              <div className="p-4 space-y-2 text-xs font-extrabold text-[#10204c] font-poppins">
                <div className="flex justify-between items-center gap-1">
                  <span className="truncate flex items-center gap-1">🏆 {partidoFinal.equipoLocal}</span>
                  <span className="text-gray-300 font-normal">{partidoFinal.estado === 'PROXIMO' ? '—' : partidoFinal.golesLocal}</span>
                </div>
                <div className="flex justify-between items-center gap-1 border-t border-gray-100 pt-2">
                  <span className="truncate flex items-center gap-1">🏆 {partidoFinal.equipoVisita}</span>
                  <span className="text-gray-300 font-normal">{partidoFinal.estado === 'PROXIMO' ? '—' : partidoFinal.golesVisita}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}