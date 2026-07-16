"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import HeaderSupervisor from "@/app/components/HeaderSupervisor";
import Footer from "@/app/components/Footer";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(data.user?.role === "ADMIN" ? "/panel/admin" : "/panel/supervisor");
      } else {
        setError("Credenciales incorrectas.");
      }
    } catch {
      setError("Error al conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      <HeaderSupervisor />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {/* Contenedor Card Principal */}
        <div className="flex flex-col-reverse md:flex-row bg-white rounded-3xl w-full max-w-4xl border border-[color:var(--border)] shadow-[0_20px_50px_rgba(35,60,151,0.08)] overflow-hidden my-6">
          
          {/* Lado del Formulario (Izquierda) */}
          <div className="p-8 sm:p-12 md:p-16 w-full md:w-1/2 flex flex-col justify-center">
            
            {/* Título Limpio con Poppins y Color Primario */}
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[color:var(--primary)]">
                ¡Hola, staff!
              </h2>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col space-y-5">
              
              {/* Campo Correo Electrónico */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-600">
                  Correo electrónico
                </label>
                <div className="relative flex items-center rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-4 transition-all duration-200 focus-within:border-[color:var(--primary)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(35,60,151,0.08)]">
                  <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <input
                    type="email"
                    placeholder="ejemplo@tmtcup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 w-full bg-transparent pl-3 text-sm font-medium text-[color:var(--foreground)] placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Campo Contraseña con Ojito */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-600">
                  Contraseña
                </label>
                <div className="relative flex items-center rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-4 transition-all duration-200 focus-within:border-[color:var(--primary)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(35,60,151,0.08)]">
                  <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 w-full bg-transparent pl-3 pr-2 text-sm font-medium text-[color:var(--foreground)] placeholder:text-slate-400 outline-none"
                  />
                  
                  {/* Botón para Mostrar / Ocultar */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-[color:var(--primary)] focus:outline-none transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      /* Icono Ojo Tachado (Ocultar) */
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 013.682-.763c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.092-4.092a3 3 0 11-4.243-4.243M3 3l18 18" />
                      </svg>
                    ) : (
                      /* Icono Ojo (Ver) */
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Recordarme */}
              <div className="flex items-center pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-500 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[color:var(--primary)] focus:ring-[color:var(--primary)] transition-colors"
                  />
                  Recordarme
                </label>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-[color:var(--danger)] border border-red-100 animate-fade-in">
                  {error}
                </div>
              )}

              {/* Botón de Ingresar */}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex h-12 w-auto self-start items-center justify-center rounded-full bg-[#f83636] hover:bg-[#d62b2b] text-white text-base font-bold px-8 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
              >
                {busy ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Validando...
                  </span>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>
          </div>

          {/* Lado Imagen Decorativa (Derecha) */}
          <div className="w-full md:w-1/2 min-h-[220px] md:min-h-full relative overflow-hidden bg-slate-100">
            <Image
              src="/assets/ImageLogin.png"
              alt="TMT CUP Ilustración Login"
              fill
              priority
              className="object-cover object-bottom md:object-[center_80%]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}