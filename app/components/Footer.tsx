"use client";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full px-4 pb-4 mt-auto font-poppins">
      {/* Tarjeta contenedora responsiva */}
      <div className="w-full max-w-md md:max-w-5xl mx-auto bg-white/45 backdrop-blur-md border border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.06)] rounded-3xl py-6 px-6 relative mt-16 transition-all duration-300">
        
        {/* Logo maximizado intersecado - Más grande en desktop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <Image
            src="/assets/Logo_tMtCup.svg"
            alt="Logo oficial tMt Cup"
            width={160}
            height={160}
            className="object-contain drop-shadow-xl w-[100px] h-[100px] md:w-[150px] md:h-[150px]"
            priority
          />
        </div>

        {/* Contenido en columnas alineadas a los extremos - Mayor espaciado y textos más grandes en desktop */}
        <div className="grid grid-cols-2 gap-4 items-start text-sm md:text-base pt-8 md:pt-14 px-2 md:px-6">
          
          {/* Columna izquierda (Alineada a la izquierda) */}
          <div className="flex flex-col gap-4 md:gap-6 text-left">
            {/* Canales de Instagram */}
            <div className="space-y-1 md:space-y-2">
              <span className="block text-[14px] md:text-[16px] font-semibold tracking-wide text-[#10204c]/50">
                Redes sociales
              </span>
              <a
                href="https://www.instagram.com/wearetmt/"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-[#10204c]/80 hover:text-[#233c97] transition-colors"
              >
                @wearetmt
              </a>
              <a
                href="https://www.instagram.com/casa_roca/"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-[#10204c]/80 hover:text-[#233c97] transition-colors"
              >
                @casa_roca
              </a>
            </div>

            {/* Información de Comunidad */}
            <div className="space-y-1 md:space-y-2">
              <span className="block text-[14px] md:text-[16px] font-semibold tracking-wide text-[#10204c]/50">
                Comunidad
              </span>
              <a
                href="https://tmtnetwork.online/"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-[#10204c]/80 hover:text-[#233c97] transition-colors break-all"
              >
                tmtnetwork.online
              </a>
            </div>
          </div>

          {/* Columna derecha (Alineada a la derecha) */}
          <div className="flex flex-col gap-4 md:gap-6 text-right items-end">
            {/* Ubicación e Iglesia */}
            <div className="space-y-1 md:space-y-2">
              <span className="block text-[14px] md:text-[16px] font-semibold tracking-wide text-[#10204c]/50">
                Ubicación
              </span>
              <a
                href="https://casaroca.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-[#10204c]/80 hover:text-[#233c97] transition-colors"
              >
                Casa Sobre la Roca
              </a>
              <p className="text-[12px] md:text-[14px] font-normal text-[#10204c]/60 leading-tight max-w-[160px] md:max-w-[220px]">
                Cl. 102 #14-20<br />
                Usaquén, Bogotá
              </p>
            </div>
          </div>

        </div>

        {/* Separador intermedio */}
        <div className="w-full h-[1px] bg-[#10204c]/5 mt-6 mb-4 md:mt-8" />

        {/* Texto de identidad (Quiénes somos) - Más grande y legible en desktop */}
        <div className="text-center max-w-sm md:max-w-2xl mx-auto space-y-1 md:space-y-2 px-2">
          <p className="text-[12px] md:text-[14px] italic font-normal leading-relaxed text-[#233c97]">
            "Que nadie te menosprecie por ser joven. Al contrario, que los creyentes vean en ti un ejemplo a seguir en la manera de hablar, en la conducta, en amor, fe y pureza."
          </p>
          <span className="block text-[10px] md:text-[12px] font-medium text-[#10204c]/40">
            1 Timoteo 4:12
          </span>
        </div>

        {/* Pie del footer */}
        <div className="w-full h-[1px] bg-[#10204c]/5 mt-4 mb-3" />
        <div className="text-center text-[10px] md:text-[11px] font-medium text-[#10204c]/30 tracking-widest">
          © 2026 tMt Cup • Ministerio de jóvenes
        </div>

      </div>
    </footer>
  );
} 