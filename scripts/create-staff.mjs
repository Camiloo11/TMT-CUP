// Crea una cuenta del staff (admin o supervisor) llamando a la API local.
// Requisitos: la app corriendo (pnpm dev).
//
// Uso:
//   node scripts/create-staff.mjs admin "Camilo Ustariz" admin@tmtcup.com miClave123
//   node scripts/create-staff.mjs supervisor "Ana Beltrán" cancha1@tmtcup.com clave123
//
// El PRIMER usuario debe ser 'admin' (mientras el sistema está en modo abierto).
// Para crear más cuentas después, primero inicia sesión como admin en el panel
// (este script no envía cookie de sesión, así que sólo sirve para el primer admin
//  o mientras el sistema siga en modo abierto).

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const [role, name, email, password] = process.argv.slice(2);

if (!role || !name || !email || !password) {
  console.log("Uso: node scripts/create-staff.mjs <admin|supervisor> \"Nombre\" correo clave");
  process.exit(1);
}

const res = await fetch(`${BASE}/api/auth/users`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: role.toUpperCase(), name, email, password }),
});

const data = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`❌ ${res.status}:`, data?.error ?? data);
  process.exit(1);
}
console.log(`✅ Cuenta creada: ${data.name} (${data.role}) — ${email}`);
