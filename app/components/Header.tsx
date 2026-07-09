"use client";

import Image from "next/image";

export default function Header() {
  const tabs = [
    { id: "grupos", label: "Grupos" },
    { id: "partidos", label: "Partidos" },
    { id: "sorteos", label: "Sorteos" }
  ];

  return (
    // Usamos el color de la iglesia con opacidad y un blur de fondo envolvente
    <header className="sticky top-0 z-50 w-full bg-[color:var(--primary)]/85 backdrop-blur-md border-b border-white/10 text-white shadow-[0_4px_30px_rgba(35,60,151,0.1)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo en la parte superior izquierda */}
        <div className="flex items-center gap-2 group transition-all duration-300">
          <div className="relative">
            {/* Efecto de resplandor difuminado suave detrás del logo emulando tu código */}
            <div className="absolute inset-0 bg-[color:var(--accent)] rounded-full blur-[8px] opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
            <Image
              src="/assets/Logo_tMtCup.svg"
              alt="Logo TMT CUP"
              width={54}
              height={54}
              className="relative object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
          <span className="hidden text-xl font-bold tracking-wider text-[color:var(--accent)] sm:block">
            tMt Cup
          </span>
        </div>

        {/* Pestañas de navegación estilizadas con burbujas semi-transparentes */}
        <nav className="flex gap-1 sm:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:bg-white/15 active:scale-95 bg-black/10 text-white/90 hover:text-white"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}