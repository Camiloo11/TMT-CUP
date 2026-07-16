"use client";

interface FixtureEliminatoriaProps {
  genero?: "masculino" | "femenino";
}

export default function FixtureEliminatoria({ genero = "masculino" }: FixtureEliminatoriaProps) {
  const esFemenino = genero === "femenino";

  const equipos = esFemenino 
    ? { semi1_1: "Atenas FC", semi1_2: "Esparta Fem", semi2_1: "Valquirias", semi2_2: "Amazonas", final_1: "Atenas FC", final_2: "Valquirias" }
    : { semi1_1: "Equipo Alpha", semi1_2: "Equipo Beta", semi2_1: "Equipo Éxodo", semi2_2: "Equipo Omega", final_1: "Alpha", final_2: "Omega" };

  return (
    <div className="space-y-4 flex-1 flex flex-col w-full" data-theme={genero}>
      {/* Contenedor Principal: Ahora más ancho y espacioso en escritorio */}
      <div 
        className="w-full max-w-2xl md:max-w-4xl mx-auto rounded-3xl p-6 md:p-12 shadow-[0_4px_20px_rgba(16,32,76,0.02)] flex-1 flex flex-col justify-center font-poppins"
        style={{ 
          backgroundColor: "var(--card-strong)", 
          border: "1px solid var(--border)" 
        }}
      >
        {/* Encabezados de las Rondas (Textos más grandes en md:) */}
        <div 
          className="grid grid-cols-2 text-center text-sm md:text-lg font-light tracking-wide pb-2 mb-6 md:mb-10"
          style={{ 
            color: "var(--foreground)", 
            opacity: 0.6, 
            borderBottom: "1px solid var(--border)" 
          }}
        >
          <div>Semifinales</div>
          <div>Gran Final</div>
        </div>

        {/* El Árbol Gráfico: Mayor separación en md: */}
        <div className="grid grid-cols-2 gap-x-8 md:gap-x-20 items-center relative flex-1 py-2">

          {/* COLUMNA 1: SEMIFINALES */}
          <div className="space-y-6 md:space-y-16 relative z-10 flex flex-col justify-center h-full">
            
            {/* Semifinal 1 */}
            <div className="relative w-full max-w-[200px] md:max-w-[280px] mx-auto">
              {/* Conector horizontal y vertical adaptados a escritorio */}
              <div className="absolute -right-4 md:-right-10 top-1/2 w-4 md:w-10 h-[1px]" style={{ backgroundColor: "var(--border)" }} />
              <div className="absolute -right-4 md:-right-10 top-1/2 h-[56px] md:h-[95px] w-[1px]" style={{ backgroundColor: "var(--border)" }} />

              <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: "rgba(16, 32, 76, 0.03)", border: "1px solid var(--border)" }}>
                <div 
                  className="text-[9px] md:text-[12px] font-light px-2.5 py-1 md:py-2 flex justify-between"
                  style={{ 
                    color: "var(--foreground)", 
                    opacity: 0.6, 
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "rgba(16, 32, 76, 0.01)" 
                  }}
                >
                  <span>Sáb, 18/7</span>
                  <span className="font-semibold" style={{ color: "var(--success)" }}>Fin</span>
                </div>
                <div className="p-2.5 md:p-4 space-y-1.5 text-xs md:text-base font-normal" style={{ color: "var(--foreground)" }}>
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate font-semibold">{equipos.semi1_1}</span>
                    <span className="font-bold" style={{ color: "var(--primary)" }}>3</span>
                  </div>
                  <div className="flex justify-between items-center font-light pt-1.5 md:pt-2.5" style={{ opacity: 0.6, borderTop: "1px solid var(--border)" }}>
                    <span className="truncate">{equipos.semi1_2}</span>
                    <span>1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Semifinal 2 */}
            <div className="relative w-full max-w-[200px] md:max-w-[280px] mx-auto">
              {/* Conector horizontal y vertical adaptados a escritorio */}
              <div className="absolute -right-4 md:-right-10 top-1/2 w-4 md:w-10 h-[1px]" style={{ backgroundColor: "var(--border)" }} />
              <div className="absolute -right-4 md:-right-10 top-1/2 bottom-1/2 h-[56px] md:h-[95px] -translate-y-full w-[1px]" style={{ backgroundColor: "var(--border)" }} />

              <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: "rgba(16, 32, 76, 0.03)", border: "1px solid var(--border)" }}>
                <div 
                  className="text-[9px] md:text-[12px] font-light px-2.5 py-1 md:py-2 flex justify-between"
                  style={{ 
                    color: "var(--foreground)", 
                    opacity: 0.6, 
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "rgba(16, 32, 76, 0.01)" 
                  }}
                >
                  <span>Sáb, 19/7</span>
                  <span className="font-semibold" style={{ color: "var(--success)" }}>Fin</span>
                </div>
                <div className="p-2.5 md:p-4 space-y-1.5 text-xs md:text-base font-light" style={{ color: "var(--foreground)" }}>
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate">{equipos.semi2_1}</span>
                    <span className="whitespace-nowrap">2 <span className="text-[9px] md:text-[11px]" style={{ opacity: 0.5 }}>(3)</span></span>
                  </div>
                  <div className="flex justify-between items-center font-semibold pt-1.5 md:pt-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="truncate">{equipos.semi2_2}</span>
                    <span className="font-bold whitespace-nowrap" style={{ color: "var(--primary)" }}>
                      2 <span className="text-[9px] md:text-[11px]" style={{ opacity: 0.6 }}>(4)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: GRAN FINAL */}
          <div className="relative z-10 flex flex-col justify-center h-full">
            <div className="relative w-full max-w-[200px] md:max-w-[280px] mx-auto">
              {/* Conector horizontal izquierdo adaptado a escritorio */}
              <div className="absolute -left-4 md:-left-10 top-1/2 w-4 md:w-10 h-[1px]" style={{ backgroundColor: "var(--border)" }} />

              <div 
                className="border-2 rounded-2xl overflow-hidden shadow-md" 
                style={{ 
                  background: "linear-gradient(to bottom right, color-mix(in srgb, var(--accent) 2%, transparent), color-mix(in srgb, var(--primary) 6%, transparent))",
                  borderColor: "var(--accent)"
                }}
              >
                <div 
                  className="text-[9px] md:text-[12px] font-semibold px-2.5 py-1 md:py-2 flex justify-between items-center"
                  style={{ 
                    color: "var(--primary)", 
                    backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    borderBottom: "1px solid var(--accent)"
                  }}
                >
                  <span>Próximamente</span>
                  <span 
                    className="px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold"
                    style={{ backgroundColor: "var(--accent)", color: "var(--card-strong)" }}
                  >
                    Hoy
                  </span>
                </div>
                <div className="p-3 md:p-5 space-y-2 text-xs md:text-base font-normal" style={{ color: "var(--foreground)" }}>
                  <div className="flex justify-between items-center gap-1.5">
                    <span className="truncate flex items-center gap-1.5 font-semibold">🏆 {equipos.final_1}</span>
                    <span className="font-normal" style={{ opacity: 0.3 }}>—</span>
                  </div>
                  <div className="flex justify-between items-center gap-1.5 pt-2 md:pt-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="truncate flex items-center gap-1.5 font-semibold">🏆 {equipos.final_2}</span>
                    <span className="font-normal" style={{ opacity: 0.3 }}>—</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}