"use client";

import { useEffect, useState } from "react";

interface ControlAlertPopupProps {
  text: string;
  tone: string;
  isCritical: boolean;
  homeTeam: string;
  awayTeam: string;
  presence: { home: boolean; away: boolean };
}

export default function ControlAlertPopup({
  text,
  tone,
  isCritical,
  homeTeam,
  awayTeam,
  presence,
}: ControlAlertPopupProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- animación temporizada de entrada/salida del popup */
  useEffect(() => {
    if (isCritical) {
      setShouldRender(true);
      const animTimeout = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(animTimeout);
    }

    const entryTimeout = setTimeout(() => setShouldRender(true), 1500);
    const entryAnimTimeout = setTimeout(() => setIsAnimating(true), 1550);
    const exitAnimTimeout = setTimeout(() => setIsAnimating(false), 11500);
    const exitTimeout = setTimeout(() => setShouldRender(false), 12000);

    return () => {
      clearTimeout(entryTimeout);
      clearTimeout(entryAnimTimeout);
      clearTimeout(exitAnimTimeout);
      clearTimeout(exitTimeout);
    };
  }, [isCritical, text]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!shouldRender) return null;

  const penalizationTeam = !presence.home ? homeTeam : awayTeam;

  return (
    /* ANCLAJE FIXED: SIEMPRE EN LA PARTE INFERIOR DE LA PANTALLA FIJA */
    <div
      className={`fixed bottom-6 inset-x-4 z-50 mx-auto max-w-sm transform transition-all duration-500 ease-out ${
        isAnimating
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-4 pointer-events-none"
      }`}
    >
      {/* DISEÑO MEJORADO: CRISTALIZADO ULTRA-ELEGANTE CON BORDE INDICADOR IZQUIERDO */}
      <div
        className={`rounded-2xl bg-white/75 backdrop-blur-xl border border-white/40 shadow-[0_15px_35px_rgba(16,32,76,0.12)] p-4 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 ${
          isCritical
            ? "before:bg-red-500 text-[#10204c]"
            : "before:bg-amber-500 text-[#10204c]"
        } ${tone}`}
      >
        {/* Encabezado limpio sin emojis chillones */}
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#10204c]/40 pl-1.5">
          Alerta de Control
        </div>

        {/* Cuerpo del texto */}
        <p className="text-xs font-medium leading-relaxed text-[#10204c]/80 pl-1.5">
          {text}
        </p>

        {/* Sanción sutil integrada en el diseño */}
        <div className="mt-1 pl-1.5">
          <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md ${
            isCritical
              ? "bg-red-50 text-red-700 border border-red-100"
              : "bg-amber-50 text-amber-800 border border-amber-100"
          }`}>
            Sanción aplicable a: <span className="font-black">{penalizationTeam}</span>
          </span>
        </div>

      </div>
    </div>
  );
}
