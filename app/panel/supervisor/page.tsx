"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderSupervisor from "@/app/components/HeaderSupervisor";
import Footer from "@/app/components/Footer";

type SupervisorName = "Ana Beltrán" | "Mario Silva" | "Sofía Ramos" | "Diego Costa";
const supervisors: SupervisorName[] = ["Ana Beltrán", "Mario Silva", "Sofía Ramos", "Diego Costa"];

export default function ConfigPage() {
  const router = useRouter();
  const [supervisor, setSupervisor] = useState<SupervisorName | "">("");
  const [supervisorMenuOpen, setSupervisorMenuOpen] = useState(false);
  const supervisorSelectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleDocumentMouseDown(event: MouseEvent) {
      if (!supervisorSelectRef.current) return;
      if (!supervisorSelectRef.current.contains(event.target as Node)) {
        setSupervisorMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  const handleIngresar = () => {
    if (!supervisor) return;
    router.push(`/panel/supervisor/dashboard?name=${encodeURIComponent(supervisor)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      <HeaderSupervisor />

      <main className="flex-1 px-4 pb-16 text-[15px] text-[color:var(--foreground)] sm:px-6 flex items-center justify-center">
        <div className="w-full max-w-md flex flex-col gap-6 sm:max-w-lg items-center">

          <section className="font-poppins space-y-6 w-full flex flex-col items-center animate-fade-in">
            <div className="flex justify-center pt-2">
              <Image
                src="/assets/Logo_tMtCup.svg"
                alt="Logo TMT CUP"
                width={260}
                height={260}
                className="object-contain drop-shadow-[0_12px_24px_rgba(35,60,151,0.08)] sm:h-72 sm:w-72"
                priority
              />
            </div>

            <div className="w-full space-y-6 rounded-3xl border border-[#e2e8f5] bg-white p-6 shadow-[0_15px_35px_rgba(35,60,151,0.04)]">
              <div className="space-y-1 text-center">
                <label className="block text-xl sm:text-2xl font-medium tracking-wide text-[color:var(--primary)]" htmlFor="supervisor-select">
                  Selecciona tu perfil
                </label>
                <p className="text-xs sm:text-sm text-slate-400 font-normal">
                  Elige tu nombre para acceder a la mesa de control
                </p>
              </div>

              <div className="relative" ref={supervisorSelectRef}>
                <button
                  id="supervisor-select"
                  type="button"
                  onClick={() => setSupervisorMenuOpen(!supervisorMenuOpen)}
                  className="flex h-14 w-full items-center justify-between gap-4 rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-4 text-left text-sm font-medium text-[color:var(--foreground)] outline-none transition-all duration-200 focus:border-[color:var(--primary)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(35,60,151,0.08)]"
                >
                  <span className={supervisor ? "text-[color:var(--foreground)] font-normal" : "text-slate-400"}>
                    {supervisor || "Elige tu nombre..."}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${supervisorMenuOpen ? "rotate-180 text-[color:var(--primary)]" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {supervisorMenuOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-52 overflow-y-auto rounded-2xl border border-[#e2e8f5] bg-white p-1.5 shadow-[0_15px_30px_rgba(35,60,151,0.1)]">
                    {supervisors.map((name) => {
                      const isSelected = supervisor === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSupervisor(name);
                            setSupervisorMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${isSelected ? "bg-[#eef3ff] text-[color:var(--primary)] font-normal" : "bg-white text-slate-600 hover:bg-[#f8fafc]"}`}
                        >
                          <span>{name}</span>
                          {isSelected && (
                            <svg className="h-4 w-4 text-[color:var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {supervisor && (
                <div className="flex flex-nowrap justify-center gap-3 pt-1">
                  <div className="w-auto flex-1 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] px-3 py-2.5 text-center min-w-0">
                    <p className="text-[11px] font-medium text-slate-400 normal-case truncate">Árbitro central</p>
                    <p className="mt-0.5 text-[14px] font-medium text-slate-600 truncate">Carlos Molina</p>
                  </div>
                  <div className="w-auto flex-1 rounded-xl border border-[#f1f5f9] bg-[#f8fafc] px-3 py-2.5 text-center min-w-0">
                    <p className="text-[11px] font-medium text-slate-400 normal-case truncate">Cancha asignada</p>
                    <p className="mt-0.5 text-[14px] font-medium text-slate-600 truncate">Cancha 1</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-1 w-full">
              <button
                type="button"
                disabled={!supervisor}
                onClick={handleIngresar}
                className="inline-flex h-12 w-auto items-center justify-center rounded-2xl bg-[color:var(--primary)] px-8 text-base font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
              >
                Ingresar al panel
              </button>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}