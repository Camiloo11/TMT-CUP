-- ============================================================
-- UPGRADE para una base YA sembrada con el seed anterior.
-- Correr UNA vez en Supabase → SQL Editor (es seguro repetirlo).
-- Hace 4 cosas:
--   1) Esquema: equipos opcionales en matches + columna category.
--   2) Arregla las HORAS: el seed viejo las guardó 10 horas antes
--      (bug del offset '-05:00' con signo POSIX invertido → los
--      partidos salian a las 4 AM en vez de 2 PM).
--   3) Rellena la categoria de los partidos existentes.
--   4) Crea los placeholders de fase final (semis + finales) si faltan.
-- ============================================================

-- 1) Esquema
alter table matches alter column team_a_id drop not null;
alter table matches alter column team_b_id drop not null;
alter table matches add column if not exists category category;

-- 2) Horas: corre solo sobre partidos "de madrugada" (los del bug).
--    Tras corregirse quedan en la tarde, asi que repetir esto no daña nada.
update matches
set scheduled_at = scheduled_at + interval '10 hours'
where extract(hour from scheduled_at at time zone 'America/Bogota') < 12;

-- 3) Categoria de los partidos existentes (derivada de su equipo A)
update matches set category = t.category
from teams t
where matches.category is null and matches.team_a_id = t.id;

-- 4) Placeholders de fase final (solo si aun no existen semifinales)
insert into matches (phase, status, field_number, scheduled_at, category, team_a_id, team_b_id)
select v.phase::phase, 'PROGRAMADO'::match_status, v.field,
       (timestamp '2026-07-18 00:00' at time zone 'America/Bogota') + v.hora,
       v.cat::category, null, null
from (values
  ('SEMIFINAL', 1, interval '17 hours',            'MASCULINO'),
  ('SEMIFINAL', 1, interval '17 hours 30 minutes', 'MASCULINO'),
  ('FINAL',     5, interval '18 hours 5 minutes',  'MASCULINO'),
  ('SEMIFINAL', 4, interval '17 hours',            'FEMENINO'),
  ('SEMIFINAL', 4, interval '17 hours 30 minutes', 'FEMENINO'),
  ('FINAL',     4, interval '18 hours 5 minutes',  'FEMENINO')
) as v(phase, field, hora, cat)
where not exists (select 1 from matches where phase = 'SEMIFINAL');

-- Verificacion rapida: todas las horas deben salir en la TARDE (PM)
select phase, category, field_number as cancha,
       to_char(scheduled_at at time zone 'America/Bogota', 'HH12:MI AM') as hora_bogota,
       coalesce((select name from teams where id = team_a_id), 'Por definir') as equipo_a,
       coalesce((select name from teams where id = team_b_id), 'Por definir') as equipo_b
from matches
order by scheduled_at, field_number;
