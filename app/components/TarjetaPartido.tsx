"use client";

import { useState } from "react";

interface EventoPartido {
  minuto: string;
  texto: string;
  tipo: "gol" | "amarilla" | "roja";
  lado: "local" | "visitante";
}

interface TarjetaPartidoProps {
  estado: "VIVO" | "FINALIZADO" | "PROXIMO";
  minuto?: string;
  fechaHora?: string;
  equipoLocal: string;
  logoLocal?: string;
  golesLocal?: number;
  equipoVisita: string;
  logoVisita?: string;
  golesVisita?: number;
  cancha?: string;
  resumen?: EventoPartido[];
  genero?: "masculino" | "femenino";
}

export function TarjetaPartido({
  estado,
  minuto,
  fechaHora,
  equipoLocal,
  logoLocal,
  golesLocal = 0,
  equipoVisita,
  logoVisita,
  golesVisita = 0,
  cancha,
  resumen = [],
  genero = "masculino"
}: TarjetaPartidoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mostrarResumen = estado === "VIVO" || (estado === "FINALIZADO" && isExpanded);

  const renderIconoEvento = (tipo: "gol" | "amarilla" | "roja") => {
    switch (tipo) {
      case "gol": return "⚽";
      case "amarilla": return "🟨";
      case "roja": return "🟥";
    }
  };

  const BadgeEstado = () => {
    switch (estado) {
      case "VIVO":
        return (
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold animate-pulse"
            style={{ backgroundColor: "rgba(124, 58, 237, 0.1)", color: "var(--primary)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
            En vivo {minuto && `• ${minuto}`}
          </div>
        );
      case "FINALIZADO":
        return (
          <span 
            className="px-3 py-1 rounded-full text-[10px] md:text-xs font-medium"
            style={{ backgroundColor: "rgba(22, 163, 74, 0.1)", color: "var(--success)" }}
          >
            Finalizado
          </span>
        );
      case "PROXIMO":
        return (
          <span 
            className="px-3 py-1 rounded-full text-[10px] md:text-xs font-medium"
            style={{ backgroundColor: "rgba(35, 60, 151, 0.05)", color: "var(--primary)" }}
          >
            {fechaHora || "Por definir"}
          </span>
        );
    }
  };

  return (
    <div 
      className="w-full rounded-3xl p-4 md:p-6 shadow-[0_4px_20px_rgba(16,32,76,0.02)] transition-all font-poppins"
      data-theme={genero}
      style={{ backgroundColor: "var(--card-strong)", border: "1px solid var(--border)" }}
    >
      
      {/* HEADER DE LA TARJETA (Texto de Cancha más grande y delgado) */}
      <div className="flex items-center justify-between border-b border-gray-50 pb-2 md:pb-3 mb-3 md:mb-4">
        <span className="text-xs md:text-sm font-light tracking-widest" style={{ color: "var(--foreground)", opacity: 0.5 }}>
          {cancha || "Partido"}
        </span>
        <div className="flex items-center gap-2">
          <BadgeEstado />
          
          {/* Flecha interactiva SOLO si está FINALIZADO */}
          {estado === "FINALIZADO" && (
            <button 
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 transition-transform duration-200"
              style={{ color: "var(--primary)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 md:w-4 md:h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* MARCADOR PRINCIPAL */}
      <div className="grid grid-cols-7 items-center justify-between my-2">
        {/* Local */}
        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div 
            className="w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xs md:text-base font-normal border border-gray-100 shadow-sm transition-all"
            style={{ backgroundColor: "rgba(16, 32, 76, 0.02)", color: "var(--primary)" }}
          >
            {logoLocal ? <img src={logoLocal} alt={equipoLocal} className="w-full h-full object-contain rounded-full" /> : equipoLocal.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs md:text-sm font-medium truncate max-w-full px-1" style={{ color: "var(--foreground)" }}>
            {equipoLocal}
          </span>
        </div>

        {/* Score central */}
        <div className="col-span-1 flex items-center justify-center">
          {estado === "PROXIMO" ? (
            <span className="text-xs md:text-sm font-light" style={{ color: "var(--foreground)", opacity: 0.3 }}>vs</span>
          ) : (
            <div className="font-secondary-modak flex items-baseline justify-center gap-1 tabular-nums transition-all" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 1 }}>
              <span style={{ color: "var(--primary)" }}>
                {golesLocal}
              </span>
              <span className="text-gray-300 font-light text-2xl md:text-4xl -mb-1">:</span>
              <span style={{ color: "var(--primary)" }}>
                {golesVisita}
              </span>
            </div>
          )}
        </div>

        {/* Visitante */}
        <div className="col-span-3 flex flex-col items-center text-center gap-2">
          <div 
            className="w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xs md:text-base font-normal border border-gray-100 shadow-sm transition-all"
            style={{ backgroundColor: "rgba(16, 32, 76, 0.02)", color: "var(--primary)" }}
          >
            {logoVisita ? <img src={logoVisita} alt={equipoVisita} className="w-full h-full object-contain rounded-full" /> : equipoVisita.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs md:text-sm font-medium truncate max-w-full px-1" style={{ color: "var(--foreground)" }}>
            {equipoVisita}
          </span>
        </div>
      </div>

      {/* SECCIÓN DESPLEGABLE: RESUMEN */}
      {mostrarResumen && resumen.length > 0 && (
        <div className="border-t border-gray-50 mt-4 pt-3 text-[11px] md:text-xs space-y-2 animate-select-dropdown" style={{ color: "var(--foreground)", opacity: 0.7 }}>
          {resumen.map((evento, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-4">
              {/* Eventos del Local */}
              <div className="text-left pl-1 min-h-[16px] font-light">
                {evento.lado === "local" && (
                  <span>
                    {renderIconoEvento(evento.tipo)} {evento.texto} ({evento.minuto})
                  </span>
                )}
              </div>
              {/* Eventos del Visitante */}
              <div className="text-right pr-1 min-h-[16px] font-light">
                {evento.lado === "visitante" && (
                  <span>
                    {evento.texto} ({evento.minuto}) {renderIconoEvento(evento.tipo)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}