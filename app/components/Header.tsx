"use client";

import { useState } from "react";
import Image from "next/image";

export default function LayoutPrueba() {
  const [activeTab, setActiveTab] = useState("partidos");

  const tabs = [
    { id: "grupos", label: "Grupos" },
    { id: "partidos", label: "Partidos" },
    { id: "sorteos", label: "Sorteos" }
  ];

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <header className="sticky top-0 z-50 w-full rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] overflow-hidden font-poppins">
      <div className="w-full max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <div className="flex-shrink-0 relative flex items-center justify-center">
          <Image
            src="/assets/Logo_tMtCup.svg"
            alt="Logo oficial TMT CUP"
            width={74}
            height={74}
            className="object-contain drop-shadow-md"
            priority
          />
        </div>

        {/* BARRA DE NAVEGACIÓN (Pista Hundida) */}
        <nav className="relative flex-1 grid grid-cols-3 p-1 bg-[#10204c]/[0.05] rounded-full shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)] border border-[#10204c]/[0.01]">
          
          {/* INDICADOR DESLIZANTE SÓLIDO (Píldora Limpia) */}
          <div
            className="absolute top-1 bottom-1 left-1 bg-white rounded-full border border-white shadow-[0_3px_10px_rgba(16,32,76,0.12),_0_1px_2px_rgba(16,32,76,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{
              width: "calc(33.3333% - 5px)",
              transform: `translateX(calc(${activeIndex} * (100% + 2.5px)))`
            }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative py-2 text-xs font-bold rounded-full transition-all duration-200 select-none outline-none text-center z-10
                  ${
                    isActive
                      ? "text-[#233c97] font-extrabold scale-[1.02]"
                      : "text-[#10204c]/50 hover:text-[#10204c]/80"
                  }
                  active:scale-[0.96] transition-transform
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}