"use client";

import Header from "./components/Header";
import Footer from "./components/Footer";

export default function PublicLivePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      {/* Header Reutilizable */}
      <Header />

      {/* Contenido Principal de la Congregación */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full space-y-6 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider animate-pulse">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            En Vivo ⚽
          </span>
          <h1 className="text-3xl font-bold text-[color:var(--primary)] tracking-tight">
            Torneo Relámpago tMt Cup
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Sigue los resultados, partidos y tablas de posiciones de nuestra iglesia en tiempo real.
          </p>
        </div>

        {/* Bloque Contenedor Base */}
        <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-white p-8 shadow-sm text-center text-slate-400 font-medium">
          Selecciona una opción del menú superior para explorar el estado del torneo.
        </div>
      </main>

      {/* Footer Reutilizable */}
      <Footer />
    </div>
  );
}