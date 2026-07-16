"use client";

import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { TablaGrupo } from "./components/TablaGrupo";
import { TarjetaPartido } from "./components/TarjetaPartido";
import FixtureEliminatoria from "./components/FixtureEliminatoria";

export default function PublicLivePage() {
  const [activeIndex, setActiveIndex] = useState(1); // 0: Grupos, 1: Partidos, 2: Fase final
  const [generoMovil, setGeneroMovil] = useState<"masculino" | "femenino">("masculino");
  
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

  // --- DATOS MOCK DE AMBOS TORNEOS ---
  const equiposMasculino = [
    { nombre: "Equipo Alpha", pj: 3, pg: 3, pe: 0, pp: 0, gf: 8, gc: 3, gd: 5, amarillas: 2, rojas: 0, pts: 9 },
    { nombre: "Equipo Omega", pj: 3, pg: 2, pe: 0, pp: 1, gf: 5, gc: 3, gd: 2, amarillas: 4, rojas: 1, pts: 6 },
    { nombre: "Equipo Éxodo", pj: 3, pg: 1, pe: 1, pp: 1, gf: 4, gc: 5, gd: -1, amarillas: 1, rojas: 0, pts: 4 },
    { nombre: "Equipo Génesis", pj: 3, pg: 0, pe: 0, pp: 3, gf: 1, gc: 7, gd: -6, amarillas: 5, rojas: 2, pts: 0 },
  ];

  const equiposFemenino = [
    { nombre: "Atenas FC", pj: 3, pg: 2, pe: 1, pp: 0, gf: 7, gc: 2, gd: 5, amarillas: 1, rojas: 0, pts: 7 },
    { nombre: "Esparta Fem", pj: 3, pg: 2, pe: 0, pp: 1, gf: 6, gc: 4, gd: 2, amarillas: 3, rojas: 0, pts: 6 },
    { nombre: "Valquirias", pj: 3, pg: 1, pe: 1, pp: 1, gf: 4, gc: 4, gd: 0, amarillas: 2, rojas: 1, pts: 4 },
    { nombre: "Amazonas", pj: 3, pg: 0, pe: 0, pp: 3, gf: 2, gc: 9, gd: -7, amarillas: 4, rojas: 1, pts: 0 },
  ];

  return (
    <div 
      className="flex min-h-screen flex-col font-poppins overflow-x-hidden relative transition-colors bg-[var(--background)] md:bg-[linear-gradient(to_right,var(--background)_50%,color-mix(in_srgb,var(--primary-feminino,#7c3aed)_4%,var(--background))_50%)]" 
      style={{ color: "var(--foreground)" }}
    >
      {/* Carga externa de los iconos Material Symbols (Man y Woman) */}
      <link 
        rel="stylesheet" 
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" 
      />

      {/* Cabecera horizontal */}
      <Header activeIndex={activeIndex} onTabChange={irAVista} />

      <main className="flex-1 w-full flex flex-col justify-start pb-28 md:pb-12">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
          
          {/* ========================================== */}
          {/* 1. MÓVIL: VISTA CARRUSEL CON BARRA DE CONTROL */}
          {/* ========================================== */}
          <div className="block md:hidden w-full max-w-md mx-auto" data-theme={generoMovil}>
            <div 
              ref={carruselRef}
              onScroll={manejarScrollCarrusel}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth h-full"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* VISTA 0: GRUPOS */}
              <div className="w-full flex-shrink-0 snap-start snap-always px-2 py-2 space-y-4">
                <TablaGrupo 
                  nombreGrupo="Grupo A" 
                  equipos={generoMovil === "masculino" ? equiposMasculino : equiposFemenino} 
                  genero={generoMovil}
                />
              </div>

              {/* VISTA 1: PARTIDOS (MÓVIL) */}
              <div className="w-full flex-shrink-0 snap-start snap-always px-2 py-2 space-y-4">
                {generoMovil === "masculino" ? (
                  <>
                    <TarjetaPartido 
                      cancha="Cancha 1"
                      estado="VIVO"
                      minuto="72'"
                      equipoLocal="Equipo Alpha"
                      golesLocal={2}
                      equipoVisita="Equipo Omega"
                      golesVisita={1}
                      genero="masculino"
                      resumen={[
                        { minuto: "12'", texto: "Mateo S.", tipo: "gol", lado: "local" },
                        { minuto: "18'", texto: "Juan D.", tipo: "gol", lado: "visitante" },
                        { minuto: "60'", texto: "Carlos M.", tipo: "amarilla", lado: "local" },
                      ]}
                    />
                    <TarjetaPartido 
                      cancha="Cancha 3"
                      estado="FINALIZADO"
                      equipoLocal="Equipo Éxodo"
                      golesLocal={1}
                      equipoVisita="Equipo Génesis"
                      golesVisita={2}
                      genero="masculino"
                      resumen={[
                        { minuto: "30'", texto: "Lucas V.", tipo: "gol", lado: "local" },
                        { minuto: "55'", texto: "Esteban F.", tipo: "gol", lado: "visitante" },
                        { minuto: "89'", texto: "Andrés P.", tipo: "gol", lado: "visitante" },
                      ]}
                    />
                    <TarjetaPartido 
                      cancha="Estadio Principal"
                      estado="PROXIMO"
                      fechaHora="Sáb 16:00"
                      equipoLocal="Equipo Beta"
                      equipoVisita="Equipo Delta"
                      genero="masculino"
                    />
                  </>
                ) : (
                  <>
                    <TarjetaPartido 
                      cancha="Cancha 2"
                      estado="VIVO"
                      minuto="40'"
                      equipoLocal="Atenas FC"
                      golesLocal={1}
                      equipoVisita="Valquirias"
                      golesVisita={1}
                      genero="femenino"
                      resumen={[
                        { minuto: "15'", texto: "Sofía M.", tipo: "gol", lado: "local" },
                        { minuto: "31'", texto: "Valeria G.", tipo: "gol", lado: "visitante" },
                      ]}
                    />
                    <TarjetaPartido 
                      cancha="Cancha 1"
                      estado="FINALIZADO"
                      equipoLocal="Esparta Fem"
                      golesLocal={3}
                      equipoVisita="Amazonas"
                      golesVisita={0}
                      genero="femenino"
                      resumen={[
                        { minuto: "08'", texto: "Camila R.", tipo: "gol", lado: "local" },
                        { minuto: "22'", texto: "Lucía P.", tipo: "amarilla", lado: "visitante" },
                        { minuto: "44'", texto: "Camila R.", tipo: "gol", lado: "local" },
                      ]}
                    />
                    <TarjetaPartido 
                      cancha="Cancha 1"
                      estado="PROXIMO"
                      fechaHora="Dom 10:00"
                      equipoLocal="Esparta Fem"
                      equipoVisita="Amazonas"
                      genero="femenino"
                    />
                  </>
                )}
              </div>

              {/* VISTA 2: FASE FINAL */}
              <div className="w-full flex-shrink-0 snap-start snap-always px-2 py-2 space-y-4">
                <FixtureEliminatoria genero={generoMovil} />
              </div>
            </div>

            {/* BARRA FLOTANTE INTERACTIVA DE GÉNERO */}
            <div className="fixed bottom-6 right-6 z-50 p-1 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-[0_10px_25px_rgba(16,32,76,0.12)] flex items-center gap-1">
              
              {/* Botón Masculino */}
              <button
                type="button"
                onClick={() => setGeneroMovil("masculino")}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 select-none outline-none ${
                  generoMovil === "masculino"
                    ? "bg-[#233c97] text-white shadow-md scale-[1.05]"
                    : "text-[#10204c]/50 hover:text-[#10204c]"
                }`}
                aria-label="Ver torneo masculino"
              >
                <span className="material-symbols-outlined !text-[24px]">man</span>
              </button>

              {/* Botón Femenino */}
              <button
                type="button"
                onClick={() => setGeneroMovil("femenino")}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 select-none outline-none ${
                  generoMovil === "femenino"
                    ? "bg-[#7c3aed] text-white shadow-md scale-[1.05]"
                    : "text-[#10204c]/50 hover:text-[#10204c]"
                }`}
                aria-label="Ver torneo femenino"
              >
                <span className="material-symbols-outlined !text-[24px]">woman</span>
              </button>
            </div>
          </div>

          {/* ========================================== */}
          {/* 2. ESCRITORIO: PARALELO (MASCULINO | FEMENINO) */}
          {/* ========================================== */}
          <div className="hidden md:grid grid-cols-2 gap-16 items-start w-full">
            
            {/* COLUMNA IZQUIERDA: MASCULINO */}
            <div className="space-y-6 flex flex-col items-center w-full" data-theme="masculino">
              {/* Cabecera en formato Burbuja/Píldora Redondeada */}
              <div className="w-full flex justify-center mb-2">
                <div className="px-6 py-2.5 rounded-full bg-[#233c97]/5 border border-[#233c97]/15 shadow-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#233c97] !text-[40px]">man</span>
                  <span className="text-xl font-medium tracking-wide text-[#233c97] font-poppins">
                    Torneo masculino
                  </span>
                </div>
              </div>

              {activeIndex === 0 && (
                <div className="w-full">
                  <TablaGrupo nombreGrupo="Grupo A" equipos={equiposMasculino} genero="masculino" />
                </div>
              )}

              {activeIndex === 1 && (
                <div className="space-y-4 w-full">
                  <TarjetaPartido 
                    cancha="Cancha 1"
                    estado="VIVO"
                    minuto="72'"
                    equipoLocal="Equipo Alpha"
                    golesLocal={2}
                    equipoVisita="Equipo Omega"
                    golesVisita={1}
                    genero="masculino"
                    resumen={[
                      { minuto: "12'", texto: "Mateo S.", tipo: "gol", lado: "local" },
                      { minuto: "18'", texto: "Juan D.", tipo: "gol", lado: "visitante" },
                      { minuto: "60'", texto: "Carlos M.", tipo: "amarilla", lado: "local" },
                    ]}
                  />
                  
                  <TarjetaPartido 
                    cancha="Cancha 3"
                    estado="FINALIZADO"
                    equipoLocal="Equipo Éxodo"
                    golesLocal={1}
                    equipoVisita="Equipo Génesis"
                    golesVisita={2}
                    genero="masculino"
                    resumen={[
                      { minuto: "30'", texto: "Lucas V.", tipo: "gol", lado: "local" },
                      { minuto: "55'", texto: "Esteban F.", tipo: "gol", lado: "visitante" },
                      { minuto: "89'", texto: "Andrés P.", tipo: "gol", lado: "visitante" },
                    ]}
                  />

                  <TarjetaPartido 
                    cancha="Estadio Principal"
                    estado="PROXIMO"
                    fechaHora="Sáb 16:00"
                    equipoLocal="Equipo Beta"
                    equipoVisita="Equipo Delta"
                    genero="masculino"
                  />
                </div>
              )}

              {activeIndex === 2 && (
                <div className="w-full">
                  <FixtureEliminatoria genero="masculino" />
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: FEMENINO */}
            <div className="space-y-6 flex flex-col items-center w-full" data-theme="femenino">
              {/* Cabecera en formato Burbuja/Píldora Redondeada */}
              <div className="w-full flex justify-center mb-2">
                <div className="px-6 py-2.5 rounded-full bg-[#f8f5ff] border border-[#7c3aed]/15 shadow-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#7c3aed] !text-[40px]">woman</span>
                  <span className="text-xl font-medium tracking-wide text-[#7c3aed] font-poppins">
                    Torneo femenino
                  </span>
                </div>
              </div>

              {activeIndex === 0 && (
                <div className="w-full">
                  <TablaGrupo nombreGrupo="Grupo A" equipos={equiposFemenino} genero="femenino" />
                </div>
              )}

              {activeIndex === 1 && (
                <div className="space-y-4 w-full">
                  <TarjetaPartido 
                    cancha="Cancha 2"
                    estado="VIVO"
                    minuto="40'"
                    equipoLocal="Atenas FC"
                    golesLocal={1}
                    equipoVisita="Valquirias"
                    golesVisita={1}
                    genero="femenino"
                    resumen={[
                      { minuto: "15'", texto: "Sofía M.", tipo: "gol", lado: "local" },
                      { minuto: "31'", texto: "Valeria G.", tipo: "gol", lado: "visitante" },
                    ]}
                  />
                  
                  <TarjetaPartido 
                    cancha="Cancha 1"
                    estado="FINALIZADO"
                    equipoLocal="Esparta Fem"
                    golesLocal={3}
                    equipoVisita="Amazonas"
                    golesVisita={0}
                    genero="femenino"
                    resumen={[
                      { minuto: "08'", texto: "Camila R.", tipo: "gol", lado: "local" },
                      { minuto: "22'", texto: "Lucía P.", tipo: "amarilla", lado: "visitante" },
                      { minuto: "44'", texto: "Camila R.", tipo: "gol", lado: "local" },
                    ]}
                  />

                  <TarjetaPartido 
                    cancha="Estadio Principal"
                    estado="PROXIMO"
                    fechaHora="Dom 10:00"
                    equipoLocal="Atenas FC"
                    equipoVisita="Esparta Fem"
                    genero="femenino"
                  />
                </div>
              )}

              {activeIndex === 2 && (
                <div className="w-full">
                  <FixtureEliminatoria genero="femenino" />
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}