-- ════════════════════════════════════════════════════════════════════
-- MEJORAS FINALES (admin conectado + tMt + deuda por equipo)
-- ════════════════════════════════════════════════════════════════════
-- Idempotente. Hace 3 cosas:
--   1) Tabla audit_logs: historial real de ediciones de actas del admin.
--   2) players.tmt_status: respuesta a "¿Hace parte de tMt?" del registro.
--      (asistencia = players.attended, que ya existía)
--   3) teams.debt / teams.debt_paid: deuda de inscripción por equipo,
--      con los valores REALES de la hoja "Control" del Excel de registro.

-- ── 1) Historial de auditoría (ediciones de actas por el admin) ─────
create table if not exists audit_logs (
  id         serial primary key,
  admin_name text not null default 'Admin',
  action     text not null,
  details    text not null default '',
  match_id   integer references matches (id),
  gender     text,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
create index if not exists idx_audit_match on audit_logs (match_id);

-- ── 2) ¿Hace parte de tMt? (por jugador) ────────────────────────────
--   SI · NO_QUIERE (no, pero quiere hacer parte) · NO_INTERESADO · NO_ASISTIO
alter table players add column if not exists tmt_status text
  check (tmt_status in ('SI', 'NO_QUIERE', 'NO_INTERESADO', 'NO_ASISTIO'));

-- ── 3) Deuda de inscripción por equipo ──────────────────────────────
alter table teams add column if not exists debt      integer not null default 0;
alter table teams add column if not exists debt_paid boolean not null default false;

-- Valores reales (hoja Control · columna "Pendiente"), en COP:
update teams t set debt = v.debt, debt_paid = (v.debt = 0)
from (values
  ('Alemania',   'MASCULINO', 60000),
  ('Argentina',  'MASCULINO', 0),
  ('Brasil',     'MASCULINO', 60000),
  ('Cabo Verde', 'MASCULINO', 60000),
  ('Colombia',   'MASCULINO', 60000),
  ('Congo',      'MASCULINO', 0),
  ('España',     'MASCULINO', 0),
  ('Francia',    'MASCULINO', 0),
  ('Inglaterra', 'MASCULINO', 0),
  ('Italia',     'MASCULINO', 60000),
  ('Noruega',    'MASCULINO', 0),
  ('Portugal',   'MASCULINO', 0),
  ('Cabo Verde', 'FEMENINO',  30000),
  ('España',     'FEMENINO',  140000),
  ('Francia',    'FEMENINO',  0),
  ('Portugal',   'FEMENINO',  0)
) as v(name, category, debt)
where t.name = v.name and t.category = v.category::category
  and t.debt_paid = false; -- no pisa deudas ya marcadas como saldadas en la app

-- ── Verificación ────────────────────────────────────────────────────
select t.category, t.name, t.debt, t.debt_paid
from teams t order by t.category, t.name;
