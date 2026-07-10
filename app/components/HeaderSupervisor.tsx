"use client";

import Link from "next/link";

export default function HeaderSupervisor() {
  return (
    <header className="sticky top-0 z-50 w-full rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] overflow-hidden font-poppins">
      <div className="w-full max-w-md mx-auto px-5 py-4 flex items-center justify-between gap-4">
        
        {/* TÍTULO: AÚN MÁS GRANDE Y DELGADO */}
        <div className="flex flex-col">
          <span className="text-lg font-normal tracking-wide text-[#10204c]/80 normal-case">
            Vista de supervisor
          </span>
        </div>

        {/* BOTÓN VISTA PÚBLICA */}
        <Link
          href="/"
          className="bg-[#f83636] hover:bg-[#d62b2b] text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all text-center tracking-normal normal-case"
        >
          Vista Pública
        </Link>

      </div>
    </header>
  );
}