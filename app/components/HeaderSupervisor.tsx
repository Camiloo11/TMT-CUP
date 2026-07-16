"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HeaderSupervisor() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full rounded-b-3xl bg-white/45 backdrop-blur-md border-b-2 border-white/40 shadow-[0_10px_30px_rgba(16,32,76,0.15),_0_1px_3px_rgba(16,32,76,0.1)] font-poppins">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-0 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <div className="flex-shrink-0 relative flex items-center justify-start w-[110px] md:w-[160px]">
          <Image
            src="/assets/Logo_tMtCup.svg"
            alt="Logo oficial TMT CUP"
            width={140}
            height={140}
            className="object-contain drop-shadow-md w-[95px] h-[95px] md:w-[140px] md:h-[140px] transition-all duration-300"
            priority
          />
        </div>

        {/* BOTÓN VISTA PÚBLICA */}
        <div className="flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="bg-[#f83636] hover:bg-[#d62b2b] text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap"
          >
            Vista Pública
          </button>
        </div>

      </div>
    </header>
  );
}