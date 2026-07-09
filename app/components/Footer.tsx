"use client";

export default function Footer() {
  return (
    // Aplicamos el gradiente descendente de tu plantilla adaptado a la paleta institucional
    <footer className="w-full bg-gradient-to-b from-[color:var(--primary)]/80 via-[color:var(--primary)] to-[color:var(--primary)] text-white/90 border-t border-white/15 py-8 px-4 text-center mt-auto space-y-4 backdrop-blur-lg relative overflow-hidden">
      
      {/* Sutil resplandor de fondo emulando las capas absolutas desenfocadas de tu código */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-72 h-24 bg-[color:var(--accent)]/10 rounded-full blur-[40px] pointer-events-none"></div>

      {/* Contenido protegido en la capa superior (z-10) */}
      <div className="relative z-10 space-y-4">
        {/* Pasaje Bíblico con el color de acento destacado */}
        <p className="text-xs italic font-medium max-w-md mx-auto leading-relaxed text-[color:var(--accent)] drop-shadow-sm">
          "Por tanto, id, y haced discípulos a todas las naciones..."
          <span className="block not-italic text-[10px] text-white/60 mt-0.5 font-normal">Mateo 28:19</span>
        </p>

        {/* Enlaces con diseño de pastillas flotantes (pills) parecidas a las etiquetas de tu código */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
          <a 
            href="https://casasobrelaroca.org" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="rounded-full px-4 py-1.5 bg-black/20 hover:bg-black/40 border border-white/5 transition duration-200 hover:text-[color:var(--accent)]"
          >
            Sitio Web Casa Sobre la Roca
          </a>
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="rounded-full px-4 py-1.5 bg-black/20 hover:bg-black/40 border border-white/5 transition duration-200 hover:text-[color:var(--accent)]"
          >
            Instagram de tMt
          </a>
        </div>

        {/* Copyright */}
        <div className="text-[10px] font-normal text-white/40 tracking-wider">
          <p>© 2026 tMt Cup • Ministerio de Jóvenes</p>
        </div>
      </div>
    </footer>
  );
}