"use client";

import { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TablaGrupo } from "./components/TablaGrupo";
import { TarjetaPartido } from "./components/TarjetaPartido";
import FixtureEliminatoria from "./components/FixtureEliminatoria";

export default function PublicLivePage() {
  // Estado compartido para controlar la navegación síncrona
  const [activeTab, setActiveTab] = useState("partidos");

  return (
    <div className="flex min-h-screen flex-col bg-[#eef3ff] font-poppins text-[#10204c]">
      {/* Header Reutilizable Sincronizado */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenido Principal */}
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5 flex flex-col font-poppins">

        {/* VISTA 1: GRUPOS */}
        {activeTab === "grupos" && (
          <div className="space-y-4">
            {/* TÍTULO CON EFECTO DE LUZ CENTRADO EN POPPINS */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
                Tabla de posiciones
              </h2>
            </div>

            <TablaGrupo 
              nombreGrupo="Grupo A" 
              equipos={[
                { nombre: "Equipo Alpha", pj: 3, pg: 3, pe: 0, pp: 0, gf: 8, gc: 3, gd: 5, amarillas: 2, rojas: 0, pts: 9 },
                { nombre: "Equipo Omega", pj: 3, pg: 2, pe: 0, pp: 1, gf: 5, gc: 3, gd: 2, amarillas: 4, rojas: 1, pts: 6 },
                { nombre: "Equipo Éxodo", pj: 3, pg: 1, pe: 1, pp: 1, gf: 4, gc: 5, gd: -1, amarillas: 1, rojas: 0, pts: 4 },
                { nombre: "Equipo Génesis", pj: 3, pg: 0, pe: 0, pp: 3, gf: 1, gc: 7, gd: -6, amarillas: 5, rojas: 2, pts: 0 },
              ]}
            />
          </div>
        )}

        {/* VISTA 2: PARTIDOS */}
        {activeTab === "partidos" && (
          <div className="space-y-4">
            {/* TÍTULO CON EFECTO DE LUZ CENTRADO EN POPPINS */}
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] sm:text-3xl drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)] font-poppins">
                Partidos de la fecha
              </h2>
            </div>

            {/* 1. Partido En Vivo */}
            <TarjetaPartido 
              cancha="Cancha 1"
              estado="VIVO"
              minuto="72'"
              equipoLocal="Equipo Alpha"
              golesLocal={2}
              equipoVisita="Equipo Omega"
              golesVisita={1}
              resumen={[
                { minuto: "12'", texto: "Mateo S.", tipo: "gol", lado: "local" },
                { minuto: "18'", texto: "Juan D.", tipo: "gol", lado: "visitante" },
                { minuto: "24'", texto: "Lucas G.", tipo: "gol", lado: "local" },
                { minuto: "35'", texto: "Andrés M.", tipo: "amarilla", lado: "visitante" },
              ]}
            />

            {/* 2. Partido Finalizado */}
            <TarjetaPartido 
              cancha="Cancha 2"
              estado="FINALIZADO"
              equipoLocal="Equipo Éxodo"
              golesLocal={0}
              equipoVisita="Equipo Génesis"
              golesVisita={2}
              resumen={[
                { minuto: "40'", texto: "Carlos R.", tipo: "gol", lado: "visitante" },
                { minuto: "44'", texto: "Luis P.", tipo: "roja", lado: "local" },
              ]}
            />

            {/* 3. Partido Próximo */}
            <TarjetaPartido 
              cancha="Estadio Principal"
              estado="PROXIMO"
              fechaHora="Sáb 16:00"
              equipoLocal="Equipo Beta"
              equipoVisita="Equipo Delta"
            />
          </div>
        )}

        {/* VISTA 3: FASE FINAL LLAMADA DESDE COMPONENTE */}
        {activeTab === "fixture" && <FixtureEliminatoria />}

      </main>

      {/* Footer Reutilizable */}
      <Footer />
    </div>
  );
}