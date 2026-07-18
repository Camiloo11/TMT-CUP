"use client";

import { teamFlagSrc } from "@/lib/flags";

// Tarjeta de un partido de fase final (lo que entrega /api/brackets)
type BracketCard = {
  fecha: string;
  estado: "FIN" | "VIVO" | "PROXIMO";
  equipoLocal: string | null;
  flagLocal: string | null;
  golesLocal?: number;
  penalesLocal?: number;
  equipoVisita: string | null;
  flagVisita: string | null;
  golesVisita?: number;
  penalesVisita?: number;
};

interface FixtureEliminatoriaProps {
  genero?: "masculino" | "femenino";
  // Semifinales (0 y 1) + final de la categoría; llega desde la página pública.
  bracket?: { semifinales: BracketCard[]; final: BracketCard | null };
}

export default function FixtureEliminatoria({ genero = "masculino", bracket }: FixtureEliminatoriaProps) {
  const sf1 = bracket?.semifinales?.[0];
  const sf2 = bracket?.semifinales?.[1];
  const fin = bracket?.final ?? null;

  // Nombre con bandera (imagen local, se ve en todos los navegadores);
  // si el equipo aún no está definido → "Semifinalista N"/"Finalista N"
  const nombre = (name?: string | null, _flag?: string | null, placeholder?: string) => {
    if (!name) return <>{placeholder ?? "Por definir"}</>;
    const src = teamFlagSrc(name);
    return (
      <>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="inline-block h-[0.9em] w-auto rounded-[2px] mr-1 align-[-0.08em] shadow-sm" />
        )}
        {name}
      </>
    );
  };
  // Marcador: "—" si no hay goles; agrega los penales entre paréntesis si existen
  const marcador = (g?: number, p?: number) =>
    g == null ? "—" : p != null ? `${g} (${p})` : `${g}`;
  const estadoTxt = (e?: "FIN" | "VIVO" | "PROXIMO") =>
    e === "FIN" ? "Fin" : e === "VIVO" ? "En vivo" : "Próximo";

  const equipos = {
    semi1_1: nombre(sf1?.equipoLocal, sf1?.flagLocal, "Semifinalista 1"),
    semi1_2: nombre(sf1?.equipoVisita, sf1?.flagVisita, "Semifinalista 2"),
    semi2_1: nombre(sf2?.equipoLocal, sf2?.flagLocal, "Semifinalista 3"),
    semi2_2: nombre(sf2?.equipoVisita, sf2?.flagVisita, "Semifinalista 4"),
    final_1: nombre(fin?.equipoLocal, fin?.flagLocal, "Finalista 1"),
    final_2: nombre(fin?.equipoVisita, fin?.flagVisita, "Finalista 2"),
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col w-full" data-theme={genero}>
      {/* Contenedor Principal */}
      <div 
        className="w-full max-w-2xl md:max-w-4xl mx-auto rounded-2xl min-[375px]:rounded-3xl p-2 min-[375px]:p-4 md:p-12 shadow-[0_4px_20px_rgba(16,32,76,0.02)] flex-1 flex flex-col justify-center font-poppins"
        style={{ 
          backgroundColor: "var(--card-strong)", 
          border: "1px solid var(--border)" 
        }}
      >
        {/* Encabezados de las Rondas */}
        <div 
          className="grid grid-cols-2 text-center text-[10px] min-[375px]:text-xs md:text-lg font-light tracking-wide pb-1.5 mb-3 min-[375px]:mb-6 md:mb-10"
          style={{ 
            color: "var(--foreground)", 
            opacity: 0.6, 
            borderBottom: "1px solid var(--border)" 
          }}
        >
          <div>Semifinales</div>
          <div>Gran Final</div>
        </div>

        {/* El Árbol Gráfico */}
        <div className="grid grid-cols-2 gap-x-2.5 min-[375px]:gap-x-4 md:gap-x-20 items-center relative flex-1 py-1">

          {/* COLUMNA 1: SEMIFINALES */}
          <div className="space-y-3 min-[375px]:space-y-5 md:space-y-16 relative z-10 flex flex-col justify-center h-full">
            
            {/* Semifinal 1 */}
            <div className="relative w-full max-w-[135px] min-[375px]:max-w-[170px] md:max-w-[280px] mx-auto">
              {/* Conectores */}
              <div className="absolute -right-2 min-[375px]:-right-3 md:-right-10 top-1/2 w-2 min-[375px]:w-3 md:w-10 h-[1px]" style={{ backgroundColor: "var(--border)" }} />
              <div className="absolute -right-2 min-[375px]:-right-3 md:-right-10 top-1/2 h-[38px] min-[375px]:h-[48px] md:h-[95px] w-[1px]" style={{ backgroundColor: "var(--border)" }} />

              <div className="rounded-lg min-[375px]:rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: "rgba(16, 32, 76, 0.03)", border: "1px solid var(--border)" }}>
                <div 
                  className="text-[8px] min-[375px]:text-[9px] md:text-[12px] font-light px-1.5 min-[375px]:px-2 py-0.5 md:py-2 flex justify-between"
                  style={{ 
                    color: "var(--foreground)", 
                    opacity: 0.6, 
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "rgba(16, 32, 76, 0.01)" 
                  }}
                >
                  <span>{sf1?.fecha ?? "Por definir"}</span>
                  <span className="font-semibold" style={{ color: "var(--success)" }}>{estadoTxt(sf1?.estado)}</span>
                </div>
                <div className="p-1.5 min-[375px]:p-2 md:p-4 space-y-1 text-[9px] min-[375px]:text-xs md:text-base font-normal" style={{ color: "var(--foreground)" }}>
                  <div className="flex justify-between items-center gap-1">
                    <span className="truncate tracking-tighter min-[375px]:tracking-normal font-semibold">{equipos.semi1_1}</span>
                    <span className="font-bold text-[9px] min-[375px]:text-xs" style={{ color: "var(--primary)" }}>{marcador(sf1?.golesLocal, sf1?.penalesLocal)}</span>
                  </div>
                  <div className="flex justify-between items-center font-light pt-1 md:pt-2.5" style={{ opacity: 0.6, borderTop: "1px solid var(--border)" }}>
                    <span className="truncate tracking-tighter min-[375px]:tracking-normal">{equipos.semi1_2}</span>
                    <span className="text-[9px] min-[375px]:text-xs">{marcador(sf1?.golesVisita, sf1?.penalesVisita)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Semifinal 2 */}
            <div className="relative w-full max-w-[135px] min-[375px]:max-w-[170px] md:max-w-[280px] mx-auto">
              {/* Conectores */}
              <div className="absolute -right-2 min-[375px]:-right-3 md:-right-10 top-1/2 w-2 min-[375px]:w-3 md:w-10 h-[1px]" style={{ backgroundColor: "var(--border)" }} />
              <div className="absolute -right-2 min-[375px]:-right-3 md:-right-10 top-1/2 bottom-1/2 h-[38px] min-[375px]:h-[48px] md:h-[95px] -translate-y-full w-[1px]" style={{ backgroundColor: "var(--border)" }} />

              <div className="rounded-lg min-[375px]:rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: "rgba(16, 32, 76, 0.03)", border: "1px solid var(--border)" }}>
                <div 
                  className="text-[8px] min-[375px]:text-[9px] md:text-[12px] font-light px-1.5 min-[375px]:px-2 py-0.5 md:py-2 flex justify-between"
                  style={{ 
                    color: "var(--foreground)", 
                    opacity: 0.6, 
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "rgba(16, 32, 76, 0.01)" 
                  }}
                >
                  <span>{sf2?.fecha ?? "Por definir"}</span>
                  <span className="font-semibold" style={{ color: "var(--success)" }}>{estadoTxt(sf2?.estado)}</span>
                </div>
                <div className="p-1.5 min-[375px]:p-2 md:p-4 space-y-1 text-[9px] min-[375px]:text-xs md:text-base font-light" style={{ color: "var(--foreground)" }}>
                  <div className="flex justify-between items-center gap-1">
                    <span className="truncate tracking-tighter min-[375px]:tracking-normal">{equipos.semi2_1}</span>
                    <span className="whitespace-nowrap text-[8px] min-[375px]:text-[10px]">{marcador(sf2?.golesLocal, sf2?.penalesLocal)}</span>
                  </div>
                  <div className="flex justify-between items-center font-semibold pt-1 md:pt-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="truncate tracking-tighter min-[375px]:tracking-normal">{equipos.semi2_2}</span>
                    <span className="font-bold whitespace-nowrap text-[8px] min-[375px]:text-[10px]" style={{ color: "var(--primary)" }}>
                      {marcador(sf2?.golesVisita, sf2?.penalesVisita)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: GRAN FINAL */}
          <div className="relative z-10 flex flex-col justify-center h-full">
            <div className="relative w-full max-w-[135px] min-[375px]:max-w-[170px] md:max-w-[280px] mx-auto">
              {/* Conector */}
              <div className="absolute -left-2 min-[375px]:-left-3 md:-left-10 top-1/2 w-2 min-[375px]:w-3 md:w-10 h-[1px]" style={{ backgroundColor: "var(--border)" }} />

              <div 
                className="border min-[375px]:border-2 rounded-xl min-[375px]:rounded-2xl overflow-hidden shadow-md" 
                style={{ 
                  background: "linear-gradient(to bottom right, color-mix(in srgb, var(--accent) 2%, transparent), color-mix(in srgb, var(--primary) 6%, transparent))",
                  borderColor: "var(--accent)"
                }}
              >
                <div 
                  className="text-[8px] min-[375px]:text-[9px] md:text-[12px] font-semibold px-1.5 min-[375px]:px-2.5 py-0.5 md:py-2 flex justify-between items-center"
                  style={{ 
                    color: "var(--primary)", 
                    backgroundColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                    borderBottom: "1px solid var(--accent)"
                  }}
                >
                  <span className="truncate">{fin?.fecha ?? "Próximamente"}</span>
                  <span
                    className="px-1 py-0.2 rounded text-[7px] min-[375px]:text-[8px] md:text-[10px] font-bold"
                    style={{ backgroundColor: "var(--accent)", color: "var(--card-strong)" }}
                  >
                    {fin ? estadoTxt(fin.estado) : "Hoy"}
                  </span>
                </div>
                <div className="p-1.5 min-[375px]:p-3 md:p-5 space-y-1.5 text-[9px] min-[375px]:text-xs md:text-base font-normal" style={{ color: "var(--foreground)" }}>
                  <div className="flex justify-between items-center gap-1">
                    <span className="truncate flex items-center gap-0.5 font-semibold tracking-tighter min-[375px]:tracking-normal">🏆 {equipos.final_1}</span>
                    <span className="font-normal" style={{ opacity: 0.3 }}>{marcador(fin?.golesLocal, fin?.penalesLocal)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-1 pt-1 min-[375px]:pt-2 md:pt-3.5" style={{ borderTop: "1px solid var(--border)" }}>
                    <span className="truncate flex items-center gap-0.5 font-semibold tracking-tighter min-[375px]:tracking-normal">🏆 {equipos.final_2}</span>
                    <span className="font-normal" style={{ opacity: 0.3 }}>{marcador(fin?.golesVisita, fin?.penalesVisita)}</span>
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