"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";

// ─── Cliente HTTP mínimo ─────────────────────────────────────
async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? `Error ${res.status}`);
  }
  return data as T;
}

type Team = { id: number; name: string; category: "MASCULINO" | "FEMENINO"; group_id: number | null };
type Player = { id: number; name: string; number: number | null; team: { id: number; name: string } | null };
type Assignment = { id: number; day: string; field_number: number; supervisor_name: string; referee_name: string };
type StatsResp = { goleadores: Array<{ player: string; team: string; goles: number }> };

type Section = "equipos" | "jugadores" | "staff" | "sorteo" | "fixture";

export default function AdminPage() {
  const [auth, setAuth] = useState<"checking" | "authed" | "denied">("checking");
  const [section, setSection] = useState<Section>("equipos");
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: { role: string } | null }) => {
        setAuth(d.user?.role === "ADMIN" ? "authed" : "denied");
      })
      .catch(() => setAuth("denied"));
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  if (auth === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-[#233c97]">
        <p className="text-sm font-semibold">Cargando...</p>
      </div>
    );
  }
  if (auth === "denied") {
    return (
      <div className="flex min-h-screen flex-col bg-[#eef3ff]">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-sm rounded-[1.8rem] border border-[#F83636]/30 bg-white p-6 text-center shadow">
            <h1 className="text-xl font-bold text-[#F83636]">Solo administradores</h1>
            <p className="mt-2 text-sm text-slate-600">Inicia sesión como admin en el panel del supervisor.</p>
            <a href="/panel/supervisor" className="mt-4 inline-block rounded-full bg-[#233c97] px-5 py-2 text-sm font-semibold text-white">Ir al login</a>
          </div>
        </main>
      </div>
    );
  }

  const tabs: Array<{ id: Section; label: string }> = [
    { id: "equipos", label: "Equipos" },
    { id: "jugadores", label: "Jugadores" },
    { id: "staff", label: "Staff" },
    { id: "sorteo", label: "Sorteo" },
    { id: "fixture", label: "Fixture" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#eef3ff] font-poppins text-[#10204c]">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 space-y-5">
        <h1 className="text-3xl font-black tracking-tight text-[#233c97] text-center drop-shadow-[0_2px_8px_rgba(247,198,0,0.4)]">
          Panel de administración
        </h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                section === t.id ? "bg-[#233c97] text-white shadow" : "bg-white text-[#233c97] border border-[#233c97]/20"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {flash && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              flash.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-[#F83636]/10 text-[#F83636]"
            }`}
          >
            {flash.msg}
          </div>
        )}

        {section === "equipos" && <TeamsSection onFlash={setFlash} />}
        {section === "jugadores" && <PlayersSection onFlash={setFlash} />}
        {section === "staff" && <StaffSection onFlash={setFlash} />}
        {section === "sorteo" && <DrawSection onFlash={setFlash} />}
        {section === "fixture" && <FixtureSection onFlash={setFlash} />}
      </main>
    </div>
  );
}

type FlashProp = { onFlash: (f: { tone: "ok" | "err"; msg: string }) => void };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white border border-[#10204c]/5 shadow p-5 space-y-4">
      <h2 className="text-lg font-bold text-[#233c97]">{title}</h2>
      {children}
    </section>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 w-full rounded-xl border-2 border-[#c9d1f0] bg-[#f9fbff] px-4 text-sm outline-none focus:border-[#233c97] focus:bg-white"
    />
  );
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="h-11 rounded-xl bg-[#233c97] px-5 text-sm font-semibold text-white shadow transition active:scale-[0.98] disabled:opacity-50"
    />
  );
}

// ─── EQUIPOS ────────────────────────────────────────────────
function TeamsSection({ onFlash }: FlashProp) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"MASCULINO" | "FEMENINO">("MASCULINO");
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setTeams(await api<Team[]>("/api/teams")); } catch (e) { console.error(e); }
  }
  useEffect(() => { void load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/teams", { method: "POST", body: JSON.stringify({ name, category }) });
      setName("");
      onFlash({ tone: "ok", msg: `Equipo "${name}" creado` });
      await load();
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally { setBusy(false); }
  }

  const masc = teams.filter((t) => t.category === "MASCULINO");
  const fem = teams.filter((t) => t.category === "FEMENINO");

  return (
    <Card title="Equipos">
      <form onSubmit={create} className="space-y-3">
        <TextInput placeholder="Nombre del equipo" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex gap-2">
          {(["MASCULINO", "FEMENINO"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold border-2 ${
                category === c ? "bg-[#F7C600] border-[#F7C600] text-[#10204c]" : "bg-white border-[#c9d1f0] text-slate-500"
              }`}
            >{c}</button>
          ))}
        </div>
        <PrimaryBtn type="submit" disabled={busy}>{busy ? "Guardando..." : "Crear equipo"}</PrimaryBtn>
      </form>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500 mb-2">Masculino ({masc.length})</p>
          <ul className="space-y-1 text-sm">{masc.map((t) => <li key={t.id} className="rounded-lg bg-slate-50 px-3 py-1.5">{t.name}</li>)}</ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500 mb-2">Femenino ({fem.length})</p>
          <ul className="space-y-1 text-sm">{fem.map((t) => <li key={t.id} className="rounded-lg bg-slate-50 px-3 py-1.5">{t.name}</li>)}</ul>
        </div>
      </div>
    </Card>
  );
}

// ─── JUGADORES ──────────────────────────────────────────────
function PlayersSection({ onFlash }: FlashProp) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamId, setTeamId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Team[]>("/api/teams").then(setTeams).catch(console.error);
    api<Player[]>("/api/players").then(setPlayers).catch(console.error);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setBusy(true);
    try {
      await api("/api/players", {
        method: "POST",
        body: JSON.stringify({
          teamId,
          name,
          number: number ? Number(number) : undefined,
        }),
      });
      setName(""); setNumber("");
      onFlash({ tone: "ok", msg: `Jugador "${name}" inscrito` });
      setPlayers(await api<Player[]>("/api/players"));
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally { setBusy(false); }
  }

  return (
    <Card title="Inscripción de jugadores">
      {teams.length === 0 ? (
        <p className="text-sm text-slate-500">Primero crea equipos en la pestaña anterior.</p>
      ) : (
        <form onSubmit={create} className="space-y-3">
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : "")}
            required
            className="h-11 w-full rounded-xl border-2 border-[#c9d1f0] bg-[#f9fbff] px-4 text-sm outline-none focus:border-[#233c97]"
          >
            <option value="">Selecciona un equipo...</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
          </select>
          <TextInput placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextInput placeholder="Número (opcional)" type="number" value={number} onChange={(e) => setNumber(e.target.value)} />
          <PrimaryBtn type="submit" disabled={busy}>{busy ? "Guardando..." : "Inscribir jugador"}</PrimaryBtn>
        </form>
      )}

      <div className="pt-2">
        <p className="text-xs font-bold uppercase text-slate-500 mb-2">Últimos inscritos ({players.length})</p>
        <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
          {players.slice(-20).reverse().map((p) => (
            <li key={p.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5">
              <span>{p.name}</span>
              <span className="text-slate-500">{p.team?.name ?? "—"}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// ─── STAFF (supervisores + asignaciones) ────────────────────
function StaffSection({ onFlash }: FlashProp) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  // Supervisor account
  const [supName, setSupName] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPass, setSupPass] = useState("");
  const [supBusy, setSupBusy] = useState(false);
  // Assignment
  const [field, setField] = useState<number>(1);
  const [assignSup, setAssignSup] = useState("");
  const [assignRef, setAssignRef] = useState("");
  const [asBusy, setAsBusy] = useState(false);

  async function loadAs() { try { setAssignments(await api<Assignment[]>("/api/agenda")); } catch (e) { console.error(e); } }
  useEffect(() => { void loadAs(); }, []);

  async function createSup(e: React.FormEvent) {
    e.preventDefault();
    setSupBusy(true);
    try {
      await api("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ role: "SUPERVISOR", name: supName, email: supEmail, password: supPass }),
      });
      onFlash({ tone: "ok", msg: `Cuenta de ${supName} creada` });
      setSupName(""); setSupEmail(""); setSupPass("");
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally { setSupBusy(false); }
  }

  async function createAssign(e: React.FormEvent) {
    e.preventDefault();
    setAsBusy(true);
    try {
      await api("/api/assignments", {
        method: "POST",
        body: JSON.stringify({ fieldNumber: field, supervisorName: assignSup, refereeName: assignRef }),
      });
      onFlash({ tone: "ok", msg: `Cancha ${field}: ${assignSup} + ${assignRef}` });
      setAssignSup(""); setAssignRef("");
      await loadAs();
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally { setAsBusy(false); }
  }

  return (
    <div className="space-y-5">
      <Card title="Crear cuenta de supervisor">
        <form onSubmit={createSup} className="space-y-3">
          <TextInput placeholder="Nombre (ej: Ana Beltrán)" value={supName} onChange={(e) => setSupName(e.target.value)} required />
          <TextInput placeholder="Correo" type="email" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} required />
          <TextInput placeholder="Contraseña (mín. 6 caracteres)" type="password" value={supPass} onChange={(e) => setSupPass(e.target.value)} required minLength={6} />
          <PrimaryBtn type="submit" disabled={supBusy}>{supBusy ? "Creando..." : "Crear supervisor"}</PrimaryBtn>
        </form>
      </Card>

      <Card title="Asignación de canchas (hoy)">
        <form onSubmit={createAssign} className="space-y-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setField(f)}
                className={`flex-1 h-11 rounded-xl font-bold border-2 ${
                  field === f ? "bg-[#F7C600] border-[#F7C600] text-[#10204c]" : "bg-white border-[#c9d1f0] text-slate-500"
                }`}
              >Cancha {f}</button>
            ))}
          </div>
          <TextInput placeholder="Nombre del supervisor" value={assignSup} onChange={(e) => setAssignSup(e.target.value)} required />
          <TextInput placeholder="Nombre del árbitro" value={assignRef} onChange={(e) => setAssignRef(e.target.value)} required />
          <PrimaryBtn type="submit" disabled={asBusy}>{asBusy ? "Guardando..." : "Asignar"}</PrimaryBtn>
        </form>

        {assignments.length > 0 && (
          <ul className="space-y-1 text-sm pt-2">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-lg bg-slate-50 px-3 py-1.5 flex justify-between">
                <span className="font-semibold">Cancha {a.field_number}</span>
                <span className="text-slate-600">{a.supervisor_name} · {a.referee_name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ─── SORTEO ─────────────────────────────────────────────────
function DrawSection({ onFlash }: FlashProp) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm("¿Ejecutar el sorteo? Los equipos masculinos se repartirán en los grupos A-D.")) return;
    setBusy(true);
    try {
      await api("/api/draw", { method: "POST" });
      onFlash({ tone: "ok", msg: "Sorteo realizado. Revisa la tabla de posiciones." });
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally { setBusy(false); }
  }

  return (
    <Card title="Sorteo de grupos">
      <p className="text-sm text-slate-600">
        Reparte aleatoriamente los equipos masculinos en los 4 grupos (A, B, C, D).
        Cada grupo queda asociado a su cancha fija.
      </p>
      <PrimaryBtn onClick={run} disabled={busy}>{busy ? "Sorteando..." : "🎲 Realizar sorteo"}</PrimaryBtn>
    </Card>
  );
}

// ─── FIXTURE ────────────────────────────────────────────────
function FixtureSection({ onFlash }: FlashProp) {
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm("¿Generar el calendario de la fase de grupos? Necesita que ya se haya hecho el sorteo.")) return;
    setBusy(true);
    try {
      await api("/api/fixtures/generate", {
        method: "POST",
        body: JSON.stringify({ day, startTime }),
      });
      onFlash({ tone: "ok", msg: "Fixture generado. Los partidos ya aparecen en la vista pública." });
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally { setBusy(false); }
  }

  return (
    <Card title="Generar fixture de grupos">
      <p className="text-sm text-slate-600">
        Todos contra todos dentro de cada grupo. Partidos cada 30 min (26 de juego + 4 de rotación).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TextInput type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </div>
      <PrimaryBtn onClick={run} disabled={busy}>{busy ? "Generando..." : "📅 Generar fixture"}</PrimaryBtn>
    </Card>
  );
}
