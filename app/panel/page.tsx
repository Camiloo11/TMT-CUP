"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HeaderSupervisor from "@/app/components/HeaderSupervisor";
import Footer from "@/app/components/Footer";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // El API devuelve { name, role } plano; los admin van a su panel
        // y los supervisores directo a su dashboard.
        if (data.role === "ADMIN") {
          router.push("/panel/admin");
        } else {
          router.push("/panel/supervisor/dashboard");
        }
      } else {
        setError("Correo o contraseña incorrectos");
      }
    } catch (err) {
      setError("Ocurrió un error al intentar iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)]">
      <HeaderSupervisor />

      <main className="flex-1 px-4 pb-16 text-[15px] text-[color:var(--foreground)] sm:px-6 flex items-center justify-center">
        {/* Caja de ancho ajustado */}
        <div className="w-full max-w-sm flex flex-col gap-6 items-center">

          <form onSubmit={handleLogin} className="font-poppins space-y-6 w-full flex flex-col items-center animate-fade-in">
            
            <div className="w-full space-y-6 rounded-3xl border border-[#e2e8f5] bg-white p-6 shadow-[0_15px_35px_rgba(35,60,151,0.04)] mt-8">
              <div className="space-y-1 text-center">
                <label className="block text-xl font-medium tracking-wide text-[color:var(--primary)]">
                  Inicio de sesión
                </label>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo electrónico"
                  required
                  className="flex h-12 w-full rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-4 text-sm outline-none focus:border-[color:var(--primary)] focus:bg-white"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    required
                    className="flex h-12 w-full rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-4 text-sm outline-none focus:border-[color:var(--primary)] focus:bg-white pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[color:var(--primary)] transition-colors"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <p className="text-center text-sm font-medium text-[#F83636]">{error}</p>}
            </div>

            {/* Botón de ingresar: azul, estilo header, tamaño solicitado */}
            <button
              type="submit"
              disabled={busy}
              className="bg-[#233c97] hover:bg-[#1a2e7a] text-white text-xs font-bold px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 whitespace-nowrap disabled:opacity-50 w-full sm:w-auto"
            >
              {busy ? "Validando..." : "Ingresar"}
            </button>
          </form>

        </div>
      </main>

      <Footer />
    </div>
  );
}