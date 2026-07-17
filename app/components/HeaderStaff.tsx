"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

// onLogout es opcional: las vistas con sesión (admin/supervisor) lo pasan
// para mostrar el botón de cerrar sesión; el login no lo necesita.
export default function HeaderSupervisor({ onLogout }: { onLogout?: () => void }) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] w-full rounded-b-2xl md:rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] font-poppins transform-gpu will-change-transform">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-1 md:py-0 flex items-center justify-between gap-2">
        
        {/* LOGO: Se mantiene protagonista y más grande que los botones */}
        <div className="flex-shrink-0 relative flex items-center justify-start w-[70px] min-[375px]:w-[85px] min-[425px]:w-[100px] md:w-[135px] lg:w-[160px]">
          <Image
            src="/assets/Logo_tMtCup.svg"
            alt="Logo oficial TMT CUP"
            width={140}
            height={140}
            className="
              object-contain
              drop-shadow-md
              w-[60px] h-[60px]
              min-[375px]:w-[75px] min-[375px]:h-[75px]
              min-[425px]:w-[85px] min-[425px]:h-[85px]
              md:w-[120px] md:h-[120px]
              lg:w-[140px] lg:h-[140px]
              transition-all duration-300
            "
            priority
          />
        </div>

        {/* CONTENEDOR DE BOTONES */}
        <div className="flex items-center justify-end flex-shrink-0 gap-1.5 min-[375px]:gap-2 sm:gap-3">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="
                bg-white/70 hover:bg-white text-[#233c97] border border-[#233c97]/25 font-bold
                
                /* TAMAÑO Y PADDING DEL BOTÓN (320 -> 375 -> 425 -> md) */
                text-[9px] min-[375px]:text-[10px] min-[425px]:text-xs md:text-xs
                px-2.5 py-1 min-[375px]:px-3 min-[375px]:py-1.5 min-[425px]:px-4 min-[425px]:py-2 md:px-5 md:py-2.5

                /* Escala reducida forzada en móviles muy pequeños */
                scale-90 min-[375px]:scale-95 min-[425px]:scale-100

                rounded-full shadow-sm hover:shadow-md
                transition-all duration-200 active:scale-90 whitespace-nowrap
              "
            >
              Cerrar sesión
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="
              bg-[#f83636] hover:bg-[#d62b2b] text-white font-bold
              
              /* TAMAÑO Y PADDING DEL BOTÓN (320 -> 375 -> 425 -> md) */
              text-[9px] min-[375px]:text-[10px] min-[425px]:text-xs md:text-xs
              px-3 py-1 min-[375px]:px-3.5 min-[375px]:py-1.5 min-[425px]:px-4.5 min-[425px]:py-2 md:px-6 md:py-2.5

              /* Escala reducida forzada en móviles muy pequeños */
              scale-90 min-[375px]:scale-95 min-[425px]:scale-100

              rounded-full shadow-md hover:shadow-lg
              transition-all duration-200 active:scale-90 whitespace-nowrap
            "
          >
            Vista Pública
          </button>
        </div>

      </div>
    </header>
  );
}