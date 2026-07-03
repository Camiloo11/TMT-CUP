-- TMT-CUP: esquema inicial (migrado desde Prisma)

create type category as enum ('MASCULINO', 'FEMENINO');
create type phase as enum ('GRUPOS', 'CUARTOS', 'SEMIFINAL', 'FINAL');
create type match_status as enum ('PROGRAMADO', 'EN_JUEGO', 'FINALIZADO');
create type event_type as enum ('GOL', 'AMARILLA', 'ROJA');
create type sanction_type as enum ('W_2MIN', 'W_4MIN', 'W_6MIN', 'INASISTENCIA');

create table groups (
  id           serial primary key,
  name         text not null,
  field_number integer not null
);

create table teams (
  id         serial primary key,
  name       text not null,
  category   category not null,
  created_at timestamptz not null default now(),
  group_id   integer references groups (id)
);

create table players (
  id         serial primary key,
  name       text not null,
  number     integer,
  created_at timestamptz not null default now(),
  team_id    integer not null references teams (id)
);

create table matches (
  id           serial primary key,
  phase        phase not null,
  status       match_status not null default 'PROGRAMADO',
  field_number integer not null,
  scheduled_at timestamptz not null,
  created_at   timestamptz not null default now(),
  team_a_id    integer not null references teams (id),
  team_b_id    integer not null references teams (id),
  score_a      integer,
  score_b      integer
);

create table match_events (
  id         serial primary key,
  type       event_type not null,
  minute     integer,
  created_at timestamptz not null default now(),
  match_id   integer not null references matches (id),
  team_id    integer not null references teams (id),
  player_id  integer references players (id)
);

create table sanctions (
  id         serial primary key,
  type       sanction_type not null,
  note       text,
  created_at timestamptz not null default now(),
  team_id    integer not null references teams (id),
  match_id   integer references matches (id)
);

create index on teams (group_id);
create index on players (team_id);
create index on matches (team_a_id);
create index on matches (team_b_id);
create index on match_events (match_id);
create index on match_events (team_id);
create index on match_events (player_id);
create index on sanctions (team_id);
create index on sanctions (match_id);

-- RLS: habilitado en todas las tablas. Las rutas de la API usan la
-- service_role key desde el servidor, que ignora RLS. No se definen
-- policies para bloquear cualquier acceso directo desde el cliente (anon key).
alter table groups enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;
alter table sanctions enable row level security;
