"use client";

// Bloques de la vista de RESUMEN del supervisor (sección, fila y vacío).
// Extraídos de page.tsx sin cambios de estilo.

export function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.6rem] border-2 border-white/40 bg-white/45 backdrop-blur-md p-4 shadow-[0_8px_24px_rgba(16,32,76,0.06)]">
      {/* Título de sección más grande y delgado */}
      <h3 className="text-lg font-light text-[#10204c] tracking-wide">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

export function SummaryRow({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <div className="flex items-center justify-between bg-white/70 p-3 rounded-xl border border-slate-100 shadow-xs text-sm">
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-bold text-[#10204c] truncate">{primary}</p>
        <p className="text-xs text-[#10204c]/65 truncate">{secondary}</p>
      </div>
      <span className="text-xs font-bold text-[#10204c] bg-[#10204c]/5 px-3 py-1 rounded-full whitespace-nowrap shrink-0">{accent}</span>
    </div>
  );
}

export function SummaryEmpty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-[#10204c]/50 italic p-2">{children}</div>;
}
