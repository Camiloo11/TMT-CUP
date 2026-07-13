"use client";

import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TablaGrupo } from "./components/TablaGrupo";
import { TarjetaPartido } from "./components/TarjetaPartido";
import FixtureEliminatoria from "./components/FixtureEliminatoria";

export default function PublicLivePage() {
  const [activeIndex, setActiveIndex] = useState(1); // Inicia en partidos
  const carruselRef = useRef<HTMLDivElement>(null);
  const estaProgramandoScroll = useRef(false);

  const irAVista = (index: number) => {
    if (!carruselRef.current) return;
    estaProgramandoScroll.current = true;
    
    const anchoContenedor = carruselRef.current.clientWidth;
    carruselRef.current.scrollTo({
      left: index * anchoContenedor,
      behavior: "smooth"
    });

    setActiveIndex(index);

    setTimeout(() => {
      estaProgramandoScroll.current = false;
    }, 350);
  };

  const manejarScrollCarrusel = () => {
    if (!carruselRef.current || estaProgramandoScroll.current) return;

    const { scrollLeft, clientWidth } = carruselRef.current;
    if (clientWidth === 0) return;

    const nuevoIndice = Math.round(scrollLeft / clientWidth);
    if (nuevoIndice !== activeIndex) {
      setActiveIndex(nuevoIndice);
    }
  };

  useEffect(() => {
    const manejarResize = () => {
      if (carruselRef.current) {
        carruselRef.current.scrollLeft = activeIndex * carruselRef.current.clientWidth;
      }
    };
    window.addEventListener("resize", manejarResize);
    return () => window.removeEventListener("resize", manejarResize);
  }, [activeIndex]);

  return (
    <div className="flex min-h-screen flex-col bg-[#eef3ff] font-poppins text-[#10204c] overflow-x-hidden">
      <Header activeIndex={activeIndex} onTabChange={irAVista} />

      <main className="flex-1 w-full max-w-md mx-auto flex flex-col relative overflow-hidden">
        <div 
          ref={carruselRef}
          onScroll={manejarScrollCarrusel}
          className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth h-full"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          
          {/* VISTA 0: GRUPOS */}
          <div className="w-full flex-shrink-0 snap-start snap-always px-4 py-6 space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)]">
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

          {/* VISTA 1: PARTIDOS */}
          <div className="w-full flex-shrink-0 snap-start snap-always px-4 py-6 space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)]">
                Partidos de la fecha
              </h2>
            </div>

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

            <TarjetaPartido 
              cancha="Estadio Principal"
              estado="PROXIMO"
              fechaHora="Sáb 16:00"
              equipoLocal="Equipo Beta"
              equipoVisita="Equipo Delta"
            />
          </div>

          {/* VISTA 2: FASE FINAL */}
          <div className="w-full flex-shrink-0 snap-start snap-always px-4 py-6 overflow-y-auto">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black tracking-tight text-[#233c97] drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)]">
                Fase final
              </h2>
            </div>
            <FixtureEliminatoria />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
} 