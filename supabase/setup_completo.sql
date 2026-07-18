-- ════════════════════════════════════════════════════════════════════
-- TMT-CUP · SETUP COMPLETO (un solo script para correr en Supabase)
-- ════════════════════════════════════════════════════════════════════
-- Pégalo COMPLETO en Supabase → SQL Editor y dale RUN. Es idempotente:
-- puedes correrlo varias veces sin dañar nada. Hace, en orden:
--   1) Pone la base al día (columnas, tablas, funciones que puedan faltar).
--   2) Carga TODOS los jugadores (los 108 + Alemania e Italia = 124).
--   3) Banderas, reset de partidos (sin fecha), árbitros y Simón admin.
--   4) Activa los websockets (Realtime) de la vista pública.
--
-- ⚠️ ANTES DE CORRER, EDITA 2 COSAS (búscalas más abajo):
--   • CORREO_DE_SIMON_AQUI  → el correo con el que entra Simón (para ADMIN).
--   • "Samuel Garzón"       → si el árbitro de Cancha 3/Final se llama distinto.
-- ════════════════════════════════════════════════════════════════════


-- ####################################################################
-- # PARTE 1 · ESQUEMA AL DÍA
-- ####################################################################
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


-- ####################################################################
-- # PARTE 2 · JUGADORES (los 108 del CSV + fix España femenino)
-- ####################################################################
-- ============================================================
-- Jugadores del torneo (CSV oficial) → tabla players
-- Relaciona cada jugador con su equipo por nombre + categoría.
-- Idempotente: no duplica si ya existe (mismo nombre + equipo).
-- ============================================================

-- Corrección: el 4º equipo femenino es España, no Colombia (error del
-- seed original). Los partidos femeninos referencian al equipo por ID,
-- así que al renombrarlo el fixture femenino queda coherente solo.
update teams set name = 'España'
where category = 'FEMENINO' and name = 'Colombia';

-- Documento (cédula) del jugador, opcional
alter table players add column if not exists document text;

insert into players (name, document, team_id)
select v.name, nullif(v.document,''), t.id
from (values
  ('Martin Rosero', '1014994369', 'Argentina', 'MASCULINO'),
  ('Daniel mogollón', '1033104036', 'Argentina', 'MASCULINO'),
  ('Tomás Castro', '1025462263', 'Argentina', 'MASCULINO'),
  ('Josué pinzón', '1014868342', 'Argentina', 'MASCULINO'),
  ('Andrés Marin', '1014865950', 'Argentina', 'MASCULINO'),
  ('Carlos Eduardo Velandia', '1023303921', 'Argentina', 'MASCULINO'),
  ('Jeronimo Ladino', '1013266362', 'Argentina', 'MASCULINO'),
  ('Martin Castro', '1013268257', 'Argentina', 'MASCULINO'),
  ('Daniel Rubiano', '1147485653', 'Noruega', 'MASCULINO'),
  ('Matias Zuniga', '1141518372', 'Noruega', 'MASCULINO'),
  ('Jose Liviston Moreno', '077632520', 'Noruega', 'MASCULINO'),
  ('Rubén Dario Rivera Chávez', '1000719354', 'Noruega', 'MASCULINO'),
  ('Samuel Vargas Pico', '1019764967', 'Noruega', 'MASCULINO'),
  ('Mateo Cañon Garzon', '1014991740', 'Noruega', 'MASCULINO'),
  ('William Ramirez', '', 'Noruega', 'MASCULINO'),
  ('Daniel Rodriguez', '', 'Noruega', 'MASCULINO'),
  ('Emmanuel Gaviria', '1016953393', 'Francia', 'MASCULINO'),
  ('Jacobo Antolinez', '1014867960', 'Francia', 'MASCULINO'),
  ('Juanjose Ospina', '1188213876', 'Francia', 'MASCULINO'),
  ('Juan José davila', '1033107586', 'Francia', 'MASCULINO'),
  ('Javier Hernández', '', 'Francia', 'MASCULINO'),
  ('Santiago moreno', '1014736430', 'Francia', 'MASCULINO'),
  ('Juan José ramos', '1044625674', 'Francia', 'MASCULINO'),
  ('Andres Meriño', '1108254068', 'España', 'MASCULINO'),
  ('Jhonathan David Anave Rojas', 'CC 101610', 'España', 'MASCULINO'),
  ('Samuel García Rojas', '1141518737', 'España', 'MASCULINO'),
  ('Freddy andres joya', '1015423159', 'España', 'MASCULINO'),
  ('Cristian Felipe Joya', '1015457293', 'España', 'MASCULINO'),
  ('Jorge Andrés Gutiérrez', '1000940199', 'España', 'MASCULINO'),
  ('David Padilla', '1023083650', 'España', 'MASCULINO'),
  ('Adrián joya', '1015481992', 'España', 'MASCULINO'),
  ('Darwin', '1000256251', 'Cabo Verde', 'MASCULINO'),
  ('Kevin', '1000219120', 'Cabo Verde', 'MASCULINO'),
  ('Lucho', '1014225188', 'Cabo Verde', 'MASCULINO'),
  ('Mateo G', '1001200648', 'Cabo Verde', 'MASCULINO'),
  ('Edson', '1090445395', 'Cabo Verde', 'MASCULINO'),
  ('Mateo C', '1031640880', 'Cabo Verde', 'MASCULINO'),
  ('Miguel', '1013100884', 'Cabo Verde', 'MASCULINO'),
  ('Sebastián', '1000708376', 'Cabo Verde', 'MASCULINO'),
  ('Daniel Galvis', '1082852390', 'Inglaterra', 'MASCULINO'),
  ('Samuel Rodríguez Mayorga', '1013036255', 'Inglaterra', 'MASCULINO'),
  ('David Pulido', '1022433889', 'Inglaterra', 'MASCULINO'),
  ('Luis Alejandro Cruz', '1001204075', 'Inglaterra', 'MASCULINO'),
  ('Martín Restrepo', '1013010829', 'Inglaterra', 'MASCULINO'),
  ('Antonio Becerra', '1000242210', 'Inglaterra', 'MASCULINO'),
  ('Andres Felipe Venegas', '1022433787', 'Inglaterra', 'MASCULINO'),
  ('Duvan Felipe Hernández Lamprea', 'CC 1000384406', 'Inglaterra', 'MASCULINO'),
  ('Federico Garcia-Herreros', '', 'Congo', 'MASCULINO'),
  ('Dario Llanos', '', 'Congo', 'MASCULINO'),
  ('Tomas Pachon', '', 'Congo', 'MASCULINO'),
  ('Juan David Gomez', '', 'Congo', 'MASCULINO'),
  ('Emanuel Montes', '', 'Congo', 'MASCULINO'),
  ('David Alvares', '', 'Congo', 'MASCULINO'),
  ('Mateo Monroy', '', 'Congo', 'MASCULINO'),
  ('Santiago Castro', '', 'Congo', 'MASCULINO'),
  ('Simón Paipa', '1034397944', 'Congo', 'MASCULINO'),
  ('Santiago Chaves', '', 'Colombia', 'MASCULINO'),
  ('Cesar Ávila', '', 'Colombia', 'MASCULINO'),
  ('David Hoyos', '', 'Colombia', 'MASCULINO'),
  ('Stevan Felix', '1013610947', 'Colombia', 'MASCULINO'),
  ('Juan Vélez', '1147485182', 'Colombia', 'MASCULINO'),
  ('Ángel', '1193589859', 'Colombia', 'MASCULINO'),
  ('Santiago Moya Ávila', '1001297849', 'Brasil', 'MASCULINO'),
  ('Juan David Ávila', '1016712165', 'Brasil', 'MASCULINO'),
  ('Nicolás Ávila Heredia', '1011104214', 'Brasil', 'MASCULINO'),
  ('Jorge Andrés Moya Ávila', '1018490838', 'Brasil', 'MASCULINO'),
  ('Omar Andrés Rodríguez', '1034576557', 'Brasil', 'MASCULINO'),
  ('Miguel Ángel Gómez Carrillo', '1000241497', 'Brasil', 'MASCULINO'),
  ('Miguel Ángel Ballen Díaz', '1028868851', 'Brasil', 'MASCULINO'),
  ('Jorge Diego Ávila Velandia', '79739075', 'Brasil', 'MASCULINO'),
  ('Dylan Benavides Bermúdez', '1000035815', 'Brasil', 'MASCULINO'),
  ('Luis Francisco Gómez García', '1019903635', 'Portugal', 'MASCULINO'),
  ('Emilio Sicard Rebellón', '1141515284', 'Portugal', 'MASCULINO'),
  ('Juan Camilo Toro Gutiérrez', '1109550501', 'Portugal', 'MASCULINO'),
  ('Andrés Santiago Sánchez', '1025548584', 'Portugal', 'MASCULINO'),
  ('Samuel Medina', '1027288576', 'Portugal', 'MASCULINO'),
  ('Santiago Triana López', '1023391290', 'Portugal', 'MASCULINO'),
  ('Federico Sandoval Venegas', '1014875875', 'Portugal', 'MASCULINO'),
  ('David Andrés Sotelo Peña', '1013013645', 'Portugal', 'MASCULINO'),
  ('Santiago Baez', '1097499521', 'Portugal', 'MASCULINO'),
  ('Zulamy Sarmiento', '', 'España', 'FEMENINO'),
  ('Gabriela Agudelo', '', 'España', 'FEMENINO'),
  ('Sofia Herrera', '', 'España', 'FEMENINO'),
  ('Juliana Prieto', '', 'España', 'FEMENINO'),
  ('Ana', '', 'España', 'FEMENINO'),
  ('Valentina Varon', '', 'España', 'FEMENINO'),
  ('Ana León', '1013037016', 'Francia', 'FEMENINO'),
  ('Karol Rueda', '1007662404', 'Francia', 'FEMENINO'),
  ('Maria Fernanda Carrillo', '1014666789', 'Francia', 'FEMENINO'),
  ('Gabriela Diaz', '1021396834', 'Francia', 'FEMENINO'),
  ('Manuela Franco', '1032877408', 'Francia', 'FEMENINO'),
  ('María Paula Garzón', '1027283273', 'Francia', 'FEMENINO'),
  ('Sara Daniela Suárez Pinz', '', 'Portugal', 'FEMENINO'),
  ('Katherine Ruiz García', '', 'Portugal', 'FEMENINO'),
  ('María Alejandra Villabon P', '', 'Portugal', 'FEMENINO'),
  ('Ana Lizeth Ardila Ramos', '', 'Portugal', 'FEMENINO'),
  ('Laura Camila Raigoso Am', '', 'Portugal', 'FEMENINO'),
  ('Maríajosé Ángel Granados', '', 'Portugal', 'FEMENINO'),
  ('Daira Isabella Morales Ber', '', 'Portugal', 'FEMENINO'),
  ('Laura Martínez', '', 'Portugal', 'FEMENINO'),
  ('Salomé Paipa', '', 'Cabo Verde', 'FEMENINO'),
  ('Naarai Juliana Rozo', '', 'Cabo Verde', 'FEMENINO'),
  ('Sofía Hernández Díaz', '', 'Cabo Verde', 'FEMENINO'),
  ('Juliana Osorio Moreno', '', 'Cabo Verde', 'FEMENINO'),
  ('Emilia Zúñiga Carvajal', '', 'Cabo Verde', 'FEMENINO'),
  ('Paloma Díaz Robles', '', 'Cabo Verde', 'FEMENINO'),
  ('Jennifer Chavarro', '', 'Cabo Verde', 'FEMENINO'),
  ('Silvana González', '', 'Cabo Verde', 'FEMENINO')
) as v(name, document, team, category)
join teams t on t.name = v.team and t.category = v.category::category
where not exists (
  select 1 from players p where p.name = v.name and p.team_id = t.id
);

-- Verificación: jugadores por equipo
select t.category, t.name as equipo, count(p.id) as jugadores
from teams t left join players p on p.team_id = t.id
group by t.category, t.name order by t.category, t.name;


-- ####################################################################
-- # PARTE 3 · CORRECCIONES (banderas, Alemania/Italia, reset, árbitros, Simón admin)
-- ####################################################################
-- ════════════════════════════════════════════════════════════════════
-- CORRECCIONES TMT-CUP — lote 18/jul
-- ════════════════════════════════════════════════════════════════════
-- Un solo script, idempotente (puedes correrlo varias veces sin dañar
-- nada). Hace, en orden:
--   0) Blindaje de columnas que puedan faltar (por si no corriste sync).
--   1) Banderas de equipos (emoji) guardadas en la tabla teams.
--   2) Jugadores faltantes de Alemania e Italia (sin dinero, solo roster).
--   3) Reset de partidos (marcadores/eventos/estado) SIN tocar fechas.
--   4) Supervisores + árbitros correctos por cancha (grupos, semis, final).
--   5) Poner a Simón como ADMIN (ver el bloque, hay que poner su correo).
--   6) Verificaciones finales.
--
-- OJO nombres: el árbitro de la Cancha 3 y la Final masc lo dejé como
-- «Samuel Garzón» (el Excel dice «S. Garzón»; antes estaba mal «Pablo
-- Garzón»). Si su nombre real es otro, cámbialo en el bloque 4.
-- ════════════════════════════════════════════════════════════════════


-- ── 0) Blindaje: columnas que este script necesita ──────────────────
alter table teams   add column if not exists flag text;
alter table players add column if not exists document text;
alter table matches add column if not exists penalty_a          integer;
alter table matches add column if not exists penalty_b          integer;
alter table matches add column if not exists walkover           text;
alter table matches add column if not exists extra_time_min     integer not null default 0;
alter table matches add column if not exists waiting_started_at timestamptz;
alter table matches add column if not exists team_a_present_at  timestamptz;
alter table matches add column if not exists team_b_present_at  timestamptz;
alter table matches add column if not exists kickoff_at         timestamptz;
alter table matches add column if not exists finished_at        timestamptz;
alter table matches add column if not exists published_at       timestamptz;


-- ── 1) Banderas (emoji) por equipo ──────────────────────────────────
-- El femenino usa los mismos países, así que el nombre basta.
update teams t set flag = v.flag
from (values
  ('Argentina','🇦🇷'), ('Brasil','🇧🇷'), ('Italia','🇮🇹'), ('Alemania','🇩🇪'),
  ('Francia','🇫🇷'), ('Colombia','🇨🇴'), ('España','🇪🇸'), ('Noruega','🇳🇴'),
  ('Cabo Verde','🇨🇻'), ('Congo','🇨🇬'), ('Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿'), ('Portugal','🇵🇹')
) as v(name, flag)
where t.name = v.name;


-- ── 2) Jugadores faltantes: Alemania e Italia (masculino) ───────────
-- Solo nombre + cédula (document). Sin pagos ni dinero. No duplica.
insert into players (name, document, team_id)
select v.name, nullif(v.document, ''), t.id
from (values
  ('Santiago Velasco Rojas', '1141515282', 'Alemania', 'MASCULINO'),
  ('Andrés Felipe Zuluaga Rojas', '1020111313', 'Alemania', 'MASCULINO'),
  ('Samuel Velasco Rojas', '1025066514', 'Alemania', 'MASCULINO'),
  ('Samuel Ernesto Garrido', '1145924525', 'Alemania', 'MASCULINO'),
  ('Juan David Ruiz Terreros', '1000288655', 'Alemania', 'MASCULINO'),
  ('Mateo Alarcón Peña', '1000973622', 'Alemania', 'MASCULINO'),
  ('Andrés Camilo Lucero Salazar', '110964016', 'Alemania', 'MASCULINO'),
  ('Juan José Ruiz Garzón', '', 'Alemania', 'MASCULINO'),
  ('Daniel Felipe Bernal Rodríguez', '1014877983', 'Italia', 'MASCULINO'),
  ('Ricardo Alarcón Molina', '1014242956', 'Italia', 'MASCULINO'),
  ('David Santiago Uribe Cardenas', '1027531661', 'Italia', 'MASCULINO'),
  ('David Cohen De los Reyes', '1014879310', 'Italia', 'MASCULINO'),
  ('Juan Cohen De los Reyes', '1014879311', 'Italia', 'MASCULINO'),
  ('Samuel Castellanos Carrero', '1013014428', 'Italia', 'MASCULINO'),
  ('Cristian Moisés Díaz Díaz', '1021635786', 'Italia', 'MASCULINO'),
  ('Juan David Peláez Basto', '1000730206', 'Italia', 'MASCULINO')
) as v(name, document, team, category)
join teams t on t.name = v.team and t.category = v.category::category
where not exists (
  select 1 from players p
  where p.team_id = t.id and lower(p.name) = lower(v.name)
);


-- ── 3) Reset de partidos (SIN tocar fechas) ─────────────────────────
-- Borra eventos/sanciones/incidentes y deja todos los partidos en
-- PROGRAMADO, sin marcador. La fase final vuelve a "por definir".
delete from match_events;
delete from sanctions;
delete from incidents;

update matches set
  status             = 'PROGRAMADO',
  score_a            = null,
  score_b            = null,
  penalty_a          = null,
  penalty_b          = null,
  walkover           = null,
  extra_time_min     = 0,
  waiting_started_at = null,
  team_a_present_at  = null,
  team_b_present_at  = null,
  kickoff_at         = null,
  finished_at        = null,
  published_at       = null;

-- La fase final se vuelve a vaciar (equipos "por definir")
update matches set team_a_id = null, team_b_id = null
where phase in ('CUARTOS', 'SEMIFINAL', 'FINAL');


-- ── 4) Supervisores + árbitros por cancha (Excel MinaMin) ───────────
--   Cancha 1  Grupo A + Semifinal masc : Ana Benavides    / Samuel Valenzuela
--   Cancha 2  Grupo B                   : Sara Nieto       / Kevin Aguilar
--   Cancha 3  Grupo C                   : Camila Reinoso   / Samuel Garzón
--   Cancha 4  Femenino (todas las fases): Estefanía Álzate / Camila Chaparro
--   Cancha 5  Final masculina           : Camila Reinoso   / Samuel Garzón
-- Se aplica a TODOS los días que tengan partidos (por si moviste fechas).
insert into pitch_assignments (day, field_number, supervisor_name, referee_name)
select d.day, v.field, v.sup, v.ref
from (
  select distinct (scheduled_at at time zone 'America/Bogota')::date as day
  from matches
) d
cross join (values
  (1, 'Ana Benavides',    'Samuel Valenzuela'),
  (2, 'Sara Nieto',       'Kevin Aguilar'),
  (3, 'Camila Reinoso',   'Samuel Garzón'),
  (4, 'Estefanía Álzate', 'Camila Chaparro'),
  (5, 'Camila Reinoso',   'Samuel Garzón')
) as v(field, sup, ref)
on conflict (day, field_number)
do update set supervisor_name = excluded.supervisor_name,
              referee_name    = excluded.referee_name;


-- ── 5) Simón como ADMIN ─────────────────────────────────────────────
-- Primero mira los perfiles y correos (ejecuta esta línea y busca a Simón):
--     select p.id, p.name, p.role, u.email
--     from profiles p join auth.users u on u.id = p.id
--     order by p.created_at;
--
-- Luego pon su correo aquí abajo y ejecuta:
update profiles set role = 'ADMIN'
where id = (
  select id from auth.users
  where lower(email) = lower('CORREO_DE_SIMON_AQUI')
);


-- ── 6) Verificaciones ───────────────────────────────────────────────
-- a) Jugadores por equipo (todos deben tener 8, femenino 6-8):
select t.category, t.name as equipo, t.flag, count(p.id) as jugadores
from teams t left join players p on p.team_id = t.id
group by t.category, t.name, t.flag
order by t.category, t.name;

-- b) Asignaciones por cancha:
select day, field_number as cancha, supervisor_name, referee_name
from pitch_assignments order by day, field_number;

-- c) Estado de los partidos (todos PROGRAMADO, fase final "Por definir"):
select phase, status,
       coalesce((select name from teams where id = team_a_id), 'Por definir') as equipo_a,
       coalesce((select name from teams where id = team_b_id), 'Por definir') as equipo_b,
       score_a, score_b
from matches order by scheduled_at, field_number;


-- ####################################################################
-- # PARTE 4 · WEBSOCKETS / REALTIME (vista pública)
-- ####################################################################
-- ════════════════════════════════════════════════════════════════════
-- REALTIME (WEBSOCKETS) PARA LA VISTA PÚBLICA
-- ════════════════════════════════════════════════════════════════════
-- Hace 2 cosas, ambas necesarias para que el navegador reciba eventos:
--   1) Publica los cambios de matches y match_events por Realtime.
--   2) Da permiso de SOLO LECTURA al público (rol anon) sobre esas tablas.
--      ⚠️ Este era el bloqueo invisible: con RLS activo y SIN política,
--      Realtime conecta pero NO entrega ningún evento. Son datos públicos
--      del torneo (marcadores y goles), así que leerlos es seguro; escribir
--      sigue bloqueado como siempre.
--
-- Idempotente: puedes correrlo varias veces sin dañar nada.

-- ── 1) Publicación de Realtime ──────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_events'
  ) then
    alter publication supabase_realtime add table match_events;
  end if;
end $$;

-- Eventos UPDATE/DELETE con la fila completa (recomendado con RLS)
alter table matches      replica identity full;
alter table match_events replica identity full;

-- ── 2) Lectura pública (solo SELECT) ────────────────────────────────
-- Grants explícitos (en Supabase suelen existir por defecto; así no dependemos)
grant usage on schema public to anon, authenticated;
grant select on matches, match_events to anon, authenticated;

drop policy if exists "lectura publica matches" on matches;
create policy "lectura publica matches"
  on matches for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura publica match_events" on match_events;
create policy "lectura publica match_events"
  on match_events for select
  to anon, authenticated
  using (true);

-- ── Verificación: deben salir matches y match_events ────────────────
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
