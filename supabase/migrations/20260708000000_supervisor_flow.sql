-- TMT-CUP: extensión del esquema para el flujo del supervisor (v2)
-- Soporta: modo de espera con penalizaciones W, walkover simple/doble,
-- perfiles con roles (admin/supervisor), asignación de cancha+árbitro por día,
-- incidentes disciplinarios y auditoría de quién registró cada evento.

-- ─────────────────────────────────────────────────────────────
-- 1) Nuevo estado de partido: EN_ESPERA (modo de espera / cuenta regresiva)
-- ─────────────────────────────────────────────────────────────
alter type match_status add value if not exists 'EN_ESPERA';

-- ─────────────────────────────────────────────────────────────
-- 2) Ciclo de vida del partido en la tabla matches
--    (timestamps que permiten reconstruir cronómetros si se recarga la página)
-- ─────────────────────────────────────────────────────────────
alter table matches add column if not exists waiting_started_at  timestamptz;
alter table matches add column if not exists team_a_present_at   timestamptz;
alter table matches add column if not exists team_b_present_at   timestamptz;
alter table matches add column if not exists kickoff_at          timestamptz;
alter table matches add column if not exists finished_at         timestamptz;
alter table matches add column if not exists published_at        timestamptz; -- al publicar, el supervisor pierde edición
alter table matches add column if not exists extra_time_min      integer not null default 0;

-- Walkover: null = partido normal | 'A' / 'B' = ganó ese equipo por W | 'DOBLE' = no llegó nadie
alter table matches add column if not exists walkover text
  check (walkover in ('A', 'B', 'DOBLE'));

-- ─────────────────────────────────────────────────────────────
-- 3) Perfiles (vinculados a Supabase Auth) con rol
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  role       text not null default 'SUPERVISOR' check (role in ('ADMIN', 'SUPERVISOR')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4) Asignación diaria: supervisor + árbitro fijos por cancha
--    (el público podrá ver quién supervisa y quién pita en cada cancha)
-- ─────────────────────────────────────────────────────────────
create table if not exists pitch_assignments (
  id              serial primary key,
  day             date not null default current_date,
  field_number    integer not null,
  supervisor_name text not null,
  referee_name    text not null,
  profile_id      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  unique (day, field_number)
);

-- ─────────────────────────────────────────────────────────────
-- 5) Incidentes disciplinarios (reporte rápido del supervisor)
-- ─────────────────────────────────────────────────────────────
create table if not exists incidents (
  id         serial primary key,
  match_id   integer not null references matches (id),
  type       text not null, -- 'RIÑA', 'INSULTOS', 'DAÑOS', 'OTRO'
  note       text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 6) Auditoría: quién registró cada evento del partido
-- ─────────────────────────────────────────────────────────────
alter table match_events add column if not exists created_by uuid references profiles (id);

-- ─────────────────────────────────────────────────────────────
-- 7) Fotos de jugadores (Supabase Storage guardará el archivo;
--    aquí solo vive la URL pública)
-- ─────────────────────────────────────────────────────────────
alter table players add column if not exists photo_url text;

-- ─────────────────────────────────────────────────────────────
-- 8) RLS en las tablas nuevas (mismo criterio: todo cerrado,
--    el acceso pasa por las APIs con service_role)
-- ─────────────────────────────────────────────────────────────
alter table profiles          enable row level security;
alter table pitch_assignments enable row level security;
alter table incidents         enable row level security;

create index if not exists idx_incidents_match      on incidents (match_id);
create index if not exists idx_assignments_day      on pitch_assignments (day);
create index if not exists idx_matches_field_status on matches (field_number, status);
