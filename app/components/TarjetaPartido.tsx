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
  minuto?: string; // Ej: "45'" o "MT"
  fechaHora?: string; // Ej: "18:00" o "Sáb 16:00"
  equipoLocal: string;
  logoLocal?: string;
  golesLocal?: number;
  equipoVisita: string;
  logoVisita?: string;
  golesVisita?: number;
  cancha?: string;
  resumen?: EventoPartido[]; // Lista opcional de incidencias
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
  resumen = []
}: TarjetaPartidoProps) {
  // Estado para controlar el despliegue en partidos finalizados
  const [isExpanded, setIsExpanded] = useState(false);

  // Determinar si se debe mostrar el resumen según el estado actual
  const mostrarResumen = estado === "VIVO" || (estado === "FINALIZADO" && isExpanded);

  // Icono para cada tipo de evento del resumen
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
          <div className="flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            En vivo {minuto && `• ${minuto}`}
          </div>
        );
      case "FINALIZADO":
        return (
          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Finalizado
          </span>
        );
      case "PROXIMO":
        return (
          <span className="bg-[#233c97]/5 text-[#233c97] px-2 py-0.5 rounded-full text-[10px] font-bold">
            {fechaHora || "Por definir"}
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-white border border-[#10204c]/5 rounded-2xl p-4 shadow-[0_4px_20px_rgba(16,32,76,0.02)] transition-all">
      
      {/* HEADER DE LA TARJETA */}
      <div className="flex items-center justify-between border-b border-gray-50 pb-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#10204c]/40">
          {cancha || "Partido"}
        </span>
        <div className="flex items-center gap-2">
          <BadgeEstado />
          
          {/* Mostrar la flechita interactiva SOLO si está FINALIZADO */}
          {estado === "FINALIZADO" && (
            <button 
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-[#10204c]/40 hover:text-[#233c97] transition-transform duration-200"
              style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* MARCADOR PRINCIPAL */}
      <div className="grid grid-cols-7 items-center justify-between my-1">
        {/* Local */}
        <div className="col-span-3 flex flex-col items-center text-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-[#10204c]/[0.02] flex items-center justify-center text-xs font-bold text-[#233c97] border border-gray-100 shadow-sm">
            {logoLocal ? <img src={logoLocal} alt={equipoLocal} className="w-full h-full object-contain" /> : equipoLocal.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-[#10204c]/80 truncate max-w-full px-1">
            {equipoLocal}
          </span>
        </div>

        {/* Score central */}
        <div className="col-span-1 flex items-center justify-center">
          {estado === "PROXIMO" ? (
            <span className="text-xs font-bold text-[#10204c]/30">vs</span>
          ) : (
            <div className="font-secondary-modak flex items-baseline justify-center gap-1 tabular-nums" style={{ fontSize: '3rem', lineHeight: 1 }}>
              <span className={estado === "VIVO" ? "text-rose-600" : "text-[#233c97]"}>
                {golesLocal}
              </span>
              <span className="text-gray-300 font-light text-3xl -mb-1">:</span>
              <span className={estado === "VIVO" ? "text-rose-600" : "text-[#233c97]"}>
                {golesVisita}
              </span>
            </div>
          )}
        </div>

        {/* Visitante */}
        <div className="col-span-3 flex flex-col items-center text-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-[#10204c]/[0.02] flex items-center justify-center text-xs font-bold text-[#233c97] border border-gray-100 shadow-sm">
            {logoVisita ? <img src={logoVisita} alt={equipoVisita} className="w-full h-full object-contain" /> : equipoVisita.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-[#10204c]/80 truncate max-w-full px-1">
            {equipoVisita}
          </span>
        </div>
      </div>

      {/* SECCIÓN DESPLEGABLE: RESUMEN / INCIDENCIAS */}
      {mostrarResumen && resumen.length > 0 && (
        <div className="border-t border-gray-50 mt-3 pt-3 text-[11px] text-[#10204c]/60 space-y-1.5 animate-select-dropdown">
          {resumen.map((evento, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-4">
              {/* Eventos del Local */}
              <div className="text-left pl-1 min-h-[16px]">
                {evento.lado === "local" && (
                  <span>
                    {renderIconoEvento(evento.tipo)} {evento.texto} ({evento.minuto})
                  </span>
                )}
              </div>
              {/* Eventos del Visitante */}
              <div className="text-right pr-1 min-h-[16px]">
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