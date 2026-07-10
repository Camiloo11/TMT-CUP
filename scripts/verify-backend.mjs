// Verificador end-to-end del backend TMT-CUP.
// Requisitos: la app corriendo (pnpm dev) y la base con el seed cargado.
// Uso:  node scripts/verify-backend.mjs
//
// Simula la jornada completa de un supervisor sobre el primer partido
// PROGRAMADO de la cancha 1: espera → presencia → kickoff → gol →
// tarjeta → deshacer tarjeta → finalizar → publicar → standings.

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

async function step(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ ${name}`);
    passed++;
    return result;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   → ${err.message}`);
    failed++;
    return null;
  }
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

console.log(`\n🔍 Verificando backend en ${BASE}\n`);

// ── Lecturas básicas ──
const teams = await step("GET /api/teams (equipos con jugadores)", async () => {
  const t = await call("GET", "/api/teams");
  if (!Array.isArray(t) || t.length === 0) throw new Error("Sin equipos: ¿corriste el seed.sql?");
  return t;
});

await step("GET /api/agenda (asignaciones del día)", async () => {
  const a = await call("GET", "/api/agenda");
  if (!Array.isArray(a)) throw new Error("Respuesta inesperada");
  if (a.length === 0) throw new Error("Sin asignaciones hoy: el seed crea asignaciones para HOY; ¿lo corriste hoy?");
  return a;
});

const agenda = await step("GET /api/agenda?field=1 (agenda cancha 1)", async () => {
  const a = await call("GET", "/api/agenda?field=1");
  if (!a.matches) throw new Error("Sin lista de partidos");
  return a;
});

// ── Ciclo de vida de un partido ──
const target = agenda?.matches?.find((m) => m.status === "PROGRAMADO");
if (!target) {
  console.log("⚠️  No hay partidos PROGRAMADOS hoy en cancha 1 (¿ya corriste el script antes?).");
  console.log("   Puedes reiniciar datos borrando matches en Supabase y recorriendo el seed.");
} else {
  const id = target.id;
  console.log(`\n🎬 Simulando partido #${id}: ${target.teamA.name} vs ${target.teamB.name}\n`);

  await step("lifecycle: start_waiting", () =>
    call("POST", `/api/matches/${id}/lifecycle`, { action: "start_waiting" }));

  await step("lifecycle: team_present A (a tiempo, sin sanción)", async () => {
    const r = await call("POST", `/api/matches/${id}/lifecycle`, { action: "team_present", team: "A" });
    if (r.applied_sanction) throw new Error(`Sanción inesperada: ${r.applied_sanction}`);
    return r;
  });

  await step("lifecycle: team_present B", () =>
    call("POST", `/api/matches/${id}/lifecycle`, { action: "team_present", team: "B" }));

  await step("lifecycle: kickoff → EN_JUEGO", async () => {
    const r = await call("POST", `/api/matches/${id}/lifecycle`, { action: "kickoff" });
    if (r.status !== "EN_JUEGO") throw new Error(`Estado: ${r.status}`);
    return r;
  });

  const detail = await step("GET /api/matches/[id] (detalle con plantillas)", async () => {
    const d = await call("GET", `/api/matches/${id}`);
    if (!d.teamA?.players?.length) throw new Error("Plantilla A vacía");
    return d;
  });

  const scorer = detail?.teamA?.players?.[0];
  let goalEvent = null;
  if (scorer) {
    goalEvent = await step(`POST evento GOL (${scorer.name})`, () =>
      call("POST", `/api/matches/${id}/events`, {
        type: "GOL", teamId: detail.teamA.id, playerId: scorer.id, minute: 10,
      }));

    await step("marcador recalculado (1-0)", async () => {
      const d = await call("GET", `/api/matches/${id}`);
      if (d.score_a !== 1 || d.score_b !== 0) throw new Error(`Marcador: ${d.score_a}-${d.score_b}`);
      return d;
    });

    const card = await step("POST evento AMARILLA", () =>
      call("POST", `/api/matches/${id}/events`, {
        type: "AMARILLA", teamId: detail.teamB.id, playerId: detail.teamB.players[0].id, minute: 12,
      }));

    if (card) {
      await step("DELETE evento (deshacer amarilla en caliente)", () =>
        call("DELETE", `/api/matches/${id}/events/${card.id}`));
    }
  }

  await step("lifecycle: finish → FINALIZADO", async () => {
    const r = await call("POST", `/api/matches/${id}/lifecycle`, { action: "finish", extraTimeMin: 1 });
    if (r.status !== "FINALIZADO") throw new Error(`Estado: ${r.status}`);
    return r;
  });

  await step("lifecycle: publish (acta bloqueada)", () =>
    call("POST", `/api/matches/${id}/lifecycle`, { action: "publish" }));

  await step("bloqueo post-publicación (agregar evento debe FALLAR)", async () => {
    try {
      await call("POST", `/api/matches/${id}/events`, {
        type: "GOL", teamId: detail.teamA.id, minute: 20,
      });
    } catch {
      return true; // el rechazo es el comportamiento correcto
    }
    throw new Error("¡Se pudo agregar un evento después de publicar!");
  });
}

// ── Standings con datos reales ──
await step("GET /api/standings (tabla calculada)", async () => {
  const s = await call("GET", "/api/standings");
  if (!Array.isArray(s) || !s[0]?.tabla) throw new Error("Formato inesperado");
  return s;
});

console.log(`\n${"─".repeat(40)}`);
console.log(`Resultado: ${passed} ✅  |  ${failed} ❌`);
process.exit(failed > 0 ? 1 : 0);
