// Crea (o repara) las cuentas del staff del torneo de una sola vez.
// Usa la service_role key directamente, así que NO necesita la app corriendo.
//
// Uso (Windows/PowerShell o cualquier terminal), desde la raíz del proyecto:
//   node --env-file=.env.local scripts/seed-staff.mjs
// (si tu Node no soporta --env-file, el script igual intenta leer .env.local)
//
// Es idempotente: si una cuenta ya existe, no la duplica; solo asegura su perfil.
// Al final imprime la tabla de credenciales para repartir.
//
// ⚠️ Los nombres de los SUPERVISORES deben coincidir EXACTO con el
//    supervisor_name de pitch_assignments (seed_real.sql) para que la
//    auto-selección del panel funcione. No los cambies a la ligera.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ── Carga de variables de entorno (.env.local como respaldo) ──
function loadEnv() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* sin .env.local: usará lo que haya en el entorno */
  }
}
loadEnv();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (revisa .env.local).");
  process.exit(1);
}

// ── El staff. Puedes editar correos y contraseñas antes de correr. ──
const STAFF = [
  // Supervisores de cancha (nombre EXACTO al de pitch_assignments)
  { role: "SUPERVISOR", name: "Ana Benavides",   email: "ana.benavides@tmtcup.com",  password: "Benavides26" },
  { role: "SUPERVISOR", name: "Sara Nieto",      email: "sara.nieto@tmtcup.com",     password: "Nieto26" },
  { role: "SUPERVISOR", name: "Camila Reinoso",  email: "camila.reinoso@tmtcup.com", password: "Reinoso26" },
  { role: "SUPERVISOR", name: "Stefania Álzate", email: "stefania.alzate@tmtcup.com", password: "Alzate26" },
  // Supervisores extra (relevo / apoyo)
  { role: "SUPERVISOR", name: "Sara Rojas",      email: "sara.rojas@tmtcup.com",     password: "Rojas26" },
  { role: "SUPERVISOR", name: "Samuel Sánchez",  email: "samuel.sanchez@tmtcup.com", password: "Sanchez26" },
  // Administradores (control total)
  // ⚠️ Camilo ya existe (camilo@tmtcup.com); aquí solo se asegura su rol ADMIN.
  //    Para Simón, cambia el correo/clave placeholder por los reales.
  { role: "ADMIN", name: "Camilo Ustariz",   email: "camilo@tmtcup.com",           password: "tmt2026admin" },
  { role: "ADMIN", name: "Simón",            email: "simon@tmtcup.com",            password: "Simon26" },
  { role: "ADMIN", name: "Gabriela Solano",  email: "gabriela.solano@tmtcup.com",  password: "Solano26" },
  { role: "ADMIN", name: "Josué Gutiérrez",  email: "josue.gutierrez@tmtcup.com",  password: "Gutierrez26" },
  { role: "ADMIN", name: "Jimena Cely",      email: "jimena.cely@tmtcup.com",      password: "Cely26" },
  { role: "ADMIN", name: "Dayanna",          email: "dayanna@tmtcup.com",          password: "Dayanna26" },
];

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// Busca un usuario ya existente por correo (paginando la lista de Auth)
async function findUserId(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) break; // última página
  }
  return null;
}

const results = [];
for (const s of STAFF) {
  try {
    let userId;
    const { data, error } = await supabase.auth.admin.createUser({
      email: s.email,
      password: s.password,
      email_confirm: true,
    });
    if (error) {
      // Probablemente ya existe: reutiliza su id
      userId = await findUserId(s.email);
      if (!userId) throw new Error(error.message);
      console.log(`• ${s.name}: ya existía, aseguro el perfil.`);
    } else {
      userId = data.user.id;
      console.log(`✓ ${s.name}: cuenta creada.`);
    }

    // Perfil (upsert por id): fija nombre + rol
    const { error: pErr } = await supabase
      .from("profiles")
      .upsert({ id: userId, name: s.name, role: s.role }, { onConflict: "id" });
    if (pErr) throw new Error(pErr.message);

    results.push({ ...s, ok: true });
  } catch (e) {
    console.error(`✗ ${s.name}: ${e.message}`);
    results.push({ ...s, ok: false });
  }
}

// ── Tabla de credenciales para repartir ──
console.log("\n===== CREDENCIALES DEL STAFF (repartir a cada persona) =====");
console.log("ROL".padEnd(11), "NOMBRE".padEnd(20), "CORREO".padEnd(32), "CONTRASEÑA");
for (const r of results) {
  if (!r.ok) continue;
  console.log(r.role.padEnd(11), r.name.padEnd(20), r.email.padEnd(32), r.password);
}
const okCount = results.filter((r) => r.ok).length;
console.log(`\n✅ ${okCount}/${STAFF.length} cuentas listas.`);
