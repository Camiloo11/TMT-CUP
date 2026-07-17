-- ════════════════════════════════════════════════════════════════════
-- SINCRONIZACIÓN TOTAL DEL ESQUEMA — TMT CUP
-- ════════════════════════════════════════════════════════════════════
-- Pone la base de datos al día con TODAS las migraciones del repo en una
-- sola pasada. Es 100% idempotente: puedes correrlo las veces que quieras.
--
-- Úsalo cuando salga un error tipo:
--   "Could not find the 'penalty_a' column of 'matches' in the schema cache"
-- (significa que a la BD le falta alguna migración).

-- ── 1) Estado de partido EN_ESPERA (modo de espera del supervisor) ──
alter type match_status add value if not exists 'EN_ESPERA';

-- ── 2) Ciclo de vida del partido (cronómetros reconstruibles) ──
alter table matches add column if not exists waiting_started_at  timestamptz;
alter table matches add column if not exists team_a_present_at   timestamptz;
alter table matches add column if not exists team_b_present_at   timestamptz;
alter table matches add column if not exists kickoff_at          timestamptz;
alter table matches add column if not exists finished_at         timestamptz;
alter table matches add column if not exists published_at        timestamptz;
alter table matches add column if not exists extra_time_min      integer not null default 0;
alter table matches add column if not exists walkover text
  check (walkover in ('A', 'B', 'DOBLE'));

-- ── 3) Penales (desempate en fase eliminatoria) ──
-- 👈 ESTA es la columna del error "penalty_a ... schema cache"
alter table matches add column if not exists penalty_a integer;
alter table matches add column if not exists penalty_b integer;

-- ── 4) Fixture completo: fase final con equipos "por definir" ──
alter table matches alter column team_a_id drop not null;
alter table matches alter column team_b_id drop not null;
alter table matches add column if not exists category category;
update matches set category = t.category
from teams t
where matches.category is null and matches.team_a_id = t.id;

-- ── 5) Jugadores: foto, asistencia, pago y cédula ──
alter table players add column if not exists photo_url   text;
alter table players add column if not exists attended    boolean not null default false;
alter table players add column if not exists amount_paid integer not null default 0;
alter table players add column if not exists document    text;

-- ── 6) Perfiles del staff (Supabase Auth + rol) ──
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  role       text not null default 'SUPERVISOR' check (role in ('ADMIN', 'SUPERVISOR')),
  created_at timestamptz not null default now()
);

-- ── 7) Asignación diaria de cancha (supervisor + árbitro) ──
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

-- ── 8) Incidentes disciplinarios ──
create table if not exists incidents (
  id         serial primary key,
  match_id   integer not null references matches (id),
  type       text not null,
  note       text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ── 9) Auditoría de eventos ──
alter table match_events add column if not exists created_by uuid references profiles (id);

-- ── 10) RLS e índices ──
alter table profiles          enable row level security;
alter table pitch_assignments enable row level security;
alter table incidents         enable row level security;
create index if not exists idx_incidents_match      on incidents (match_id);
create index if not exists idx_assignments_day      on pitch_assignments (day);
create index if not exists idx_matches_field_status on matches (field_number, status);

-- ── 11) RPCs atómicas de sanciones ──
create or replace function apply_w_sanction(
  p_team_id  integer,
  p_match_id integer,
  p_type     sanction_type,
  p_note     text
)
returns sanctions
language plpgsql
as $$
declare
  m            matches;
  sancionado_a boolean;
  score_rival  integer;
  new_sanction sanctions;
begin
  select * into m from matches where id = p_match_id;
  if not found then
    raise exception 'Partido no encontrado';
  end if;
  if m.team_a_id <> p_team_id and m.team_b_id <> p_team_id then
    raise exception 'Ese equipo no juega ese partido';
  end if;

  sancionado_a := (m.team_a_id = p_team_id);
  score_rival := case when p_type = 'W_4MIN' then 1 else 3 end;

  insert into sanctions (team_id, match_id, type, note)
    values (p_team_id, p_match_id, p_type, p_note)
    returning * into new_sanction;

  update matches
    set score_a = case when sancionado_a then 0 else score_rival end,
        score_b = case when sancionado_a then score_rival else 0 end,
        status  = case when p_type = 'W_6MIN' then 'FINALIZADO' else 'EN_JUEGO' end
    where id = p_match_id;

  return new_sanction;
end;
$$;

create or replace function apply_inasistencia_sanction(
  p_team_id integer,
  p_note    text
)
returns sanctions
language plpgsql
as $$
declare
  v_group_id   integer;
  rival        teams;
  new_sanction sanctions;
begin
  select group_id into v_group_id from teams where id = p_team_id;
  if v_group_id is null then
    raise exception 'El equipo no existe o no tiene grupo asignado';
  end if;

  insert into sanctions (team_id, type, note)
    values (p_team_id, 'INASISTENCIA', p_note)
    returning * into new_sanction;

  for rival in select * from teams where group_id = v_group_id and id <> p_team_id loop
    insert into matches (phase, status, field_number, scheduled_at, team_a_id, team_b_id, score_a, score_b)
      values ('GRUPOS', 'FINALIZADO', 0, now(), rival.id, p_team_id, 3, 0);
  end loop;

  return new_sanction;
end;
$$;

-- ── Verificación final: las columnas críticas deben existir ──
select
  count(*) filter (where column_name = 'penalty_a')      as penalty_a,
  count(*) filter (where column_name = 'penalty_b')      as penalty_b,
  count(*) filter (where column_name = 'extra_time_min') as extra_time,
  count(*) filter (where column_name = 'category')       as category,
  count(*) filter (where column_name = 'published_at')   as published_at
from information_schema.columns
where table_name = 'matches';
