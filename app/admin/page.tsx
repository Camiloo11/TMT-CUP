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
type Player = { id: number; name: string; number: number | null; photo_url: string | null; attended: boolean; amount_paid: number; team: { id: number; name: string } | null };
type Assignment = { id: number; day: string; field_number: number; supervisor_name: string; referee_name: string };
type StatsResp = { goleadores: Array<{ player: string; team: string; goles: number }> };

type Section = "equipos" | "jugadores" | "asistencia" | "staff" | "sorteo" | "fixture" | "final";

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
    { id: "asistencia", label: "Asistencia" },
    { id: "staff", label: "Staff" },
    { id: "sorteo", label: "Sorteo" },
    { id: "fixture", label: "Fixture" },
    { id: "final", label: "Fase Final" },
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
        {section === "asistencia" && <AttendanceSection onFlash={setFlash} />}
        {section === "staff" && <StaffSection onFlash={setFlash} />}
        {section === "sorteo" && <DrawSection onFlash={setFlash} />}
        {section === "fixture" && <FixtureSection onFlash={setFlash} />}
        {section === "final" && <FinalPhaseSection onFlash={setFlash} />}
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

  async function remove(t: Team) {
    if (!window.confirm(`¿Borrar el equipo "${t.name}" y sus jugadores?`)) return;
    try {
      await api(`/api/teams/${t.id}`, { method: "DELETE" });
      onFlash({ tone: "ok", msg: `Equipo "${t.name}" borrado` });
      await load();
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    }
  }

  async function rename(t: Team) {
    const next = window.prompt("Nuevo nombre del equipo:", t.name);
    if (next === null) return;
    const name = next.trim();
    if (!name || name === t.name) return;
    try {
      await api(`/api/teams/${t.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      onFlash({ tone: "ok", msg: "Equipo actualizado" });
      await load();
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    }
  }

  const masc = teams.filter((t) => t.category === "MASCULINO");
  const fem = teams.filter((t) => t.category === "FEMENINO");

  const teamRow = (t: Team) => (
    <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
      <span className="truncate">{t.name}</span>
      <span className="flex shrink-0 gap-1.5 text-xs">
        <button type="button" onClick={() => void rename(t)} title="Renombrar" className="text-slate-400 hover:text-[#233c97]">✎</button>
        <button type="button" onClick={() => void remove(t)} title="Borrar" className="text-slate-400 hover:text-[#f83636]">✕</button>
      </span>
    </li>
  );

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
          <ul className="space-y-1 text-sm">{masc.map(teamRow)}</ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500 mb-2">Femenino ({fem.length})</p>
          <ul className="space-y-1 text-sm">{fem.map(teamRow)}</ul>
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
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null);

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

  async function remove(p: Player) {
    if (!window.confirm(`¿Borrar al jugador "${p.name}"?`)) return;
    try {
      await api(`/api/players/${p.id}`, { method: "DELETE" });
      onFlash({ tone: "ok", msg: `Jugador "${p.name}" borrado` });
      setPlayers(await api<Player[]>("/api/players"));
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    }
  }

  async function rename(p: Player) {
    const next = window.prompt("Nuevo nombre del jugador:", p.name);
    if (next === null) return;
    const value = next.trim();
    if (!value || value === p.name) return;
    try {
      await api(`/api/players/${p.id}`, { method: "PATCH", body: JSON.stringify({ name: value }) });
      onFlash({ tone: "ok", msg: "Jugador actualizado" });
      setPlayers(await api<Player[]>("/api/players"));
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    }
  }

  async function uploadPhoto(p: Player, file: File) {
    setPhotoBusyId(p.id);
    try {
      // Quita el fondo EN EL NAVEGADOR antes de subir (import dinámico para
      // no cargar el modelo hasta que de verdad se use). Si falla, sube la
      // foto original para no dejar al admin sin poder cargar nada.
      let toUpload: Blob = file;
      let filename = file.name;
      try {
        const { removeBackground } = await import("@imgly/background-removal");
        toUpload = await removeBackground(file);
        filename = "foto.png"; // el recorte sale como PNG transparente
      } catch (bgErr) {
        console.error("No se pudo quitar el fondo, se sube el original:", bgErr);
        onFlash({ tone: "err", msg: "No se pudo quitar el fondo; se subió la foto original." });
      }

      const body = new FormData();
      body.append("file", new File([toUpload], filename, { type: toUpload.type || file.type }));
      const r = await fetch(`/api/players/${p.id}/photo`, { method: "POST", body });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo subir");
      onFlash({ tone: "ok", msg: `Foto de "${p.name}" actualizada` });
      setPlayers(await api<Player[]>("/api/players"));
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally {
      setPhotoBusyId(null);
    }
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
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="h-7 w-7 shrink-0 rounded-full bg-slate-200 bg-cover bg-center"
                  style={p.photo_url ? { backgroundImage: `url(${p.photo_url})` } : undefined}
                />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-slate-500">{p.team?.name ?? "—"}</span>
                {photoBusyId === p.id ? (
                  <span title="Quitando el fondo y subiendo..." className="animate-pulse text-xs">⏳</span>
                ) : (
                  <label
                    title="Subir foto (le quita el fondo automáticamente)"
                    className={`text-xs text-slate-400 hover:text-[#233c97] ${photoBusyId !== null ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  >
                    📷
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={photoBusyId !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadPhoto(p, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                <button type="button" onClick={() => void rename(p)} title="Renombrar" className="text-xs text-slate-400 hover:text-[#233c97]">✎</button>
                <button type="button" onClick={() => void remove(p)} title="Borrar" className="text-xs text-slate-400 hover:text-[#f83636]">✕</button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// ─── ASISTENCIA Y PAGOS (check-in del día) ──────────────────
const PRICE_FULL = 160000; // inscripción completa (COP)
const DEPOSIT = 100000;    // abono típico (COP)

function cop(n: number) {
  return "$" + n.toLocaleString("es-CO");
}

function AttendanceSection({ onFlash }: FlashProp) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api<Player[]>("/api/players"), api<Team[]>("/api/teams")])
      .then(([p, t]) => {
        setPlayers(p);
        setTeams(t);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  async function patch(p: Player, body: { attended?: boolean; amountPaid?: number }) {
    try {
      await api(`/api/players/${p.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setPlayers((cur) =>
        cur.map((x) =>
          x.id === p.id
            ? {
                ...x,
                ...(body.attended !== undefined ? { attended: body.attended } : {}),
                ...(body.amountPaid !== undefined ? { amount_paid: body.amountPaid } : {}),
              }
            : x,
        ),
      );
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    }
  }

  function setAmount(p: Player) {
    const raw = window.prompt("Monto pagado (COP):", String(p.amount_paid));
    if (raw === null) return;
    const n = Number(raw.replace(/\D/g, ""));
    if (!Number.isNaN(n)) void patch(p, { amountPaid: n });
  }

  const shown = teamFilter ? players.filter((p) => p.team?.id === teamFilter) : players;
  const present = shown.filter((p) => p.attended).length;
  const collected = shown.reduce((s, p) => s + p.amount_paid, 0);
  const pending = shown.reduce((s, p) => s + Math.max(0, PRICE_FULL - p.amount_paid), 0);

  function payInfo(paid: number) {
    if (paid <= 0) return { label: "Sin pago", cls: "bg-[#F83636]/10 text-[#F83636]" };
    if (paid < PRICE_FULL)
      return { label: `Abono · debe ${cop(PRICE_FULL - paid)}`, cls: "bg-[#F7C600]/25 text-[#8d6b00]" };
    return { label: "Completo", cls: "bg-emerald-500/10 text-emerald-700" };
  }

  return (
    <Card title="Asistencia y pagos">
      {loading ? (
        <p className="text-sm text-slate-500">Cargando jugadores...</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay jugadores inscritos.</p>
      ) : (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#eef3ff] px-2 py-3">
              <p className="text-xs font-semibold text-slate-500">Presentes</p>
              <p className="text-lg font-black text-[#233c97]">{present}/{shown.length}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 px-2 py-3">
              <p className="text-xs font-semibold text-slate-500">Recaudado</p>
              <p className="text-lg font-black text-emerald-700">{cop(collected)}</p>
            </div>
            <div className="rounded-xl bg-[#F83636]/10 px-2 py-3">
              <p className="text-xs font-semibold text-slate-500">Pendiente</p>
              <p className="text-lg font-black text-[#F83636]">{cop(pending)}</p>
            </div>
          </div>

          {/* Filtro por equipo */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value ? Number(e.target.value) : "")}
            className="h-11 w-full rounded-xl border-2 border-[#c9d1f0] bg-[#f9fbff] px-4 text-sm outline-none focus:border-[#233c97]"
          >
            <option value="">Todos los equipos ({players.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
            ))}
          </select>

          {/* Lista */}
          <ul className="space-y-2">
            {shown.map((p) => {
              const info = payInfo(p.amount_paid);
              return (
                <li key={p.id} className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.team?.name ?? "—"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void patch(p, { attended: !p.attended })}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        p.attended ? "bg-emerald-500 text-white" : "border border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      {p.attended ? "✓ Presente" : "Ausente"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.cls}`}>{info.label}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void patch(p, { amountPaid: DEPOSIT })} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#233c97] border border-[#233c97]/20">Abono</button>
                      <button type="button" onClick={() => void patch(p, { amountPaid: PRICE_FULL })} className="rounded-full bg-[#233c97] px-2.5 py-1 text-xs font-bold text-white">Completo</button>
                      <button type="button" onClick={() => setAmount(p)} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 border border-slate-300">Otro</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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

// ─── FASE FINAL (semifinales + final por categoría) ─────────
function FinalPhaseSection({ onFlash }: FlashProp) {
  const [busy, setBusy] = useState<string | null>(null);

  async function gen(stage: "SEMIFINAL" | "FINAL", category: "MASCULINO" | "FEMENINO", label: string) {
    if (!window.confirm(`¿Generar ${label}?`)) return;
    setBusy(`${stage}-${category}`);
    try {
      const r = await api<{ created: number }>("/api/brackets/generate", {
        method: "POST",
        body: JSON.stringify({ stage, category }),
      });
      onFlash({ tone: "ok", msg: `${label}: ${r.created} partido(s) creado(s).` });
    } catch (err) {
      onFlash({ tone: "err", msg: err instanceof Error ? err.message : "Error" });
    } finally {
      setBusy(null);
    }
  }

  function block(category: "MASCULINO" | "FEMENINO", title: string) {
    const semiKey = `SEMIFINAL-${category}`;
    const finalKey = `FINAL-${category}`;
    return (
      <div className="rounded-2xl border border-[#c9d1f0] bg-white p-4 space-y-2">
        <p className="text-sm font-bold text-[#233c97]">{title}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => gen("SEMIFINAL", category, `Semifinales ${title}`)}
            className="h-11 rounded-xl bg-[#233c97] text-sm font-bold text-white disabled:opacity-50"
          >
            {busy === semiKey ? "..." : "Semifinales"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => gen("FINAL", category, `Final ${title}`)}
            className="h-11 rounded-xl bg-[#F7C600] text-sm font-bold text-[#10204c] disabled:opacity-50"
          >
            {busy === finalKey ? "..." : "Final"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card title="Fase Final">
      <div className="rounded-2xl bg-[#eef3ff] p-3 text-sm text-slate-600 space-y-1">
        <p><strong>Orden:</strong> primero <strong>Semifinales</strong> (cuando TODOS los partidos de grupos de esa categoría estén finalizados), y después la <strong>Final</strong> (cuando ambas semifinales tengan ganador).</p>
        <p className="text-xs text-slate-500">Masculino: SF1 = 1°A vs mejor 2° · SF2 = 1°B vs 1°C. Femenino: SF1 = 1° vs 4° · SF2 = 2° vs 3°.</p>
      </div>
      {block("MASCULINO", "Masculino")}
      {block("FEMENINO", "Femenino")}
    </Card>
  );
}
