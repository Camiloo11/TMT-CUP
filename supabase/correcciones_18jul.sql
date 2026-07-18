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
