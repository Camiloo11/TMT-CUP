"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

interface HeaderProps {
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export default function Header({ activeIndex, onTabChange }: HeaderProps) {
  const router = useRouter();
  const tabs = [
    { label: "Grupos" },
    { label: "Partidos" },
    { label: "Fixture" }
  ];

  return (
    <header className="sticky top-0 z-50 w-full rounded-b-2xl md:rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] font-poppins">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-8 py-1 md:py-0 flex items-center justify-between gap-1 sm:gap-4">
        
        {/* LOGO - Ajustado para que no robe espacio en 320px */}
        <div className="flex-shrink-0 relative flex items-center justify-start w-[60px] xs:w-[75px] sm:w-[95px] md:w-[160px]">
          <Image
            src="/assets/Logo_tMtCup.svg"
            alt="Logo oficial TMT CUP"
            width={140}
            height={140}
            className="object-contain drop-shadow-md w-[55px] h-[55px] xs:w-[70px] xs:h-[70px] sm:w-[85px] sm:h-[85px] md:w-[140px] md:h-[140px] transition-all duration-300"
            priority
          />
        </div>

        {/* BARRA DE NAVEGACIÓN - Textos ultra pequeños para 320px */}
        <nav className="flex-1 max-w-[210px] min-[375px]:max-w-[250px] sm:max-w-xs md:max-w-md mx-auto">
          <div className="grid grid-cols-3 p-0.5 sm:p-1 rounded-full bg-[#10204c]/[0.05] border border-[#10204c]/[0.04] shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)]">
            {tabs.map((tab, index) => {
              const isActive = activeIndex === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onTabChange(index)}
                  className={`
                    h-7 min-[375px]:h-8 sm:h-9 md:h-10
                    rounded-full
                    text-[10px] min-[375px]:text-xs md:text-sm
                    tracking-tight min-[375px]:tracking-normal
                    font-semibold
                    transition-all
                    duration-200
                    select-none
                    outline-none
                    px-0.5 min-[375px]:px-1
                    truncate
                    active:scale-[0.97]
                    ${
                      isActive
                        ? "bg-white text-[#233c97] shadow-[0_3px_10px_rgba(16,32,76,0.12),_0_1px_2px_rgba(16,32,76,0.04)] font-bold"
                        : "text-[#10204c]/55 hover:text-[#10204c]/85"
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* BOTÓN DE INICIO DE SESIÓN */}
        <div className="hidden md:flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push("/panel")}
            className="bg-[#f83636] hover:bg-[#d62b2b] text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap"
          >
            Iniciar Sesión
          </button>
        </div>

      </div>
    </header>
  );
}