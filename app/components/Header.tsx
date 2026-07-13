"use client";

import Image from "next/image";

interface HeaderProps {
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export default function Header({ activeIndex, onTabChange }: HeaderProps) {
  const tabs = [
    { label: "Grupos" },
    { label: "Partidos" },
    { label: "Fixture" }
  ];

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

        {/* BARRA DE NAVEGACIÓN CORREGIDA */}
        <nav className="flex-1 flex p-1 bg-[#10204c]/[0.05] rounded-full shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)] border border-[#10204c]/[0.01] items-center gap-1">
          {tabs.map((tab, index) => {
            const isActive = activeIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onTabChange(index)}
                className={`
                  flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 select-none outline-none text-center whitespace-nowrap px-1
                  ${
                    isActive
                      ? "bg-white text-[#233c97] shadow-[0_3px_10px_rgba(16,32,76,0.12),_0_1px_2px_rgba(16,32,76,0.04)] border border-white font-extrabold scale-[1.02]"
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