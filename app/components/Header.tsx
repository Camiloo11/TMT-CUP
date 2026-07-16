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
    { label: "Fixture" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] w-full rounded-b-2xl md:rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] font-poppins transform-gpu will-change-transform">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-1 md:py-0 flex items-center justify-between gap-2 sm:gap-4">

        {/* LOGO */}
        <div className="flex-shrink-0 relative flex items-center justify-start w-[60px] min-[375px]:w-[90px] min-[425px]:w-[90px] md:w-[135px] lg:w-[160px]">
          <Image
            src="/assets/Logo_tMtCup.svg"
            alt="Logo oficial TMT CUP"
            width={140}
            height={140}
            className="
              object-contain
              drop-shadow-md
              w-[55px] h-[55px]
              min-[375px]:w-[80px] min-[375px]:h-[80px]
              min-[425px]:w-[80px] min-[425px]:h-[80px]
              md:w-[120px] md:h-[120px]
              lg:w-[140px] lg:h-[140px]
              transition-all duration-300
            "
            priority
          />
        </div>

        {/* BARRA DE NAVEGACIÓN */}
        <nav className="flex-1 max-w-[210px] min-[375px]:max-w-[250px] min-[425px]:max-w-[290px] md:max-w-md mx-auto">
          <div className="grid grid-cols-3 rounded-full p-1 bg-[#10204c]/[0.05] border border-[#10204c]/[0.04] shadow-[inset_0_2px_4px_rgba(16,32,76,0.06)]">
            {tabs.map((tab, index) => {
              const isActive = activeIndex === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onTabChange(index)}
                  className={`
                    flex items-center justify-center
                    h-8
                    min-[375px]:h-9
                    md:h-10
                    rounded-full

                    text-[9px]
                    min-[375px]:text-[10px]
                    min-[425px]:text-xs
                    md:text-sm

                    font-semibold
                    leading-none
                    transition-all
                    duration-200
                    outline-none
                    select-none
                    active:scale-[0.97]
                    whitespace-nowrap

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
        <div className="hidden lg:flex items-center justify-end flex-shrink-0">
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