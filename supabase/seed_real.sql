-- ============================================================
-- TMT-CUP — SEED REAL (torneo del 18 de julio de 2026)
-- Generado desde MinaMinTMTCUP.2026 (hoja HorariosDetallado + Liga Fem).
-- Correr DESPUES de reset.sql (base vacia de datos del torneo).
-- Requiere la migracion 20260716000000_full_fixture (matches.category
-- y equipos opcionales para los placeholders de fase final).
-- Zona: America/Bogota · 1er partido 2:00 PM · slots de 30 min.
-- OJO: usar el NOMBRE de zona (America/Bogota), nunca el offset '-05:00':
-- Postgres interpreta los offsets con signo POSIX invertido y las horas
-- quedan 10 horas antes (el bug de partidos "a las 4 AM").
-- ============================================================

-- 1) Grupos (A,B,C masculinos + F femenino) con su cancha fija
insert into groups (name, field_number) values
  ('A', 1), ('B', 2), ('C', 3), ('F', 4);

-- 2) Equipos masculinos (12, repartidos en A/B/C)
insert into teams (name, category, group_id)
select v.name, 'MASCULINO'::category, g.id
from (values
  ('Argentina','A'),
  ('Brasil','A'),
  ('Italia','A'),
  ('Alemania','A'),
  ('Francia','B'),
  ('Colombia','B'),
  ('España','B'),
  ('Noruega','B'),
  ('Cabo Verde','C'),
  ('Congo','C'),
  ('Inglaterra','C'),
  ('Portugal','C')
) as v(name, grp)
join groups g on g.name = v.grp;

-- 3) Equipos femeninos (4, grupo F / cancha 4)
insert into teams (name, category, group_id)
select v.name, 'FEMENINO'::category, g.id
from (values ('Colombia'), ('Francia'), ('Cabo Verde'), ('Portugal')) as v(name)
cross join (select id from groups where name = 'F') g;

-- 4) Partidos de grupos: cruces y horas EXACTOS del Excel
insert into matches (phase, status, field_number, scheduled_at, category, team_a_id, team_b_id)
select 'GRUPOS'::phase, 'PROGRAMADO'::match_status, fx.field,
       (timestamp '2026-07-18 14:00' at time zone 'America/Bogota') + (fx.jornada - 1) * interval '30 minutes',
       fx.cat::category, ha.id, aw.id
from (values
  ('MASCULINO',1,1,'Argentina','Brasil'),
  ('MASCULINO',1,2,'Italia','Alemania'),
  ('MASCULINO',1,3,'Brasil','Alemania'),
  ('MASCULINO',1,4,'Argentina','Italia'),
  ('MASCULINO',1,5,'Alemania','Argentina'),
  ('MASCULINO',1,6,'Italia','Brasil'),
  ('MASCULINO',2,1,'Francia','Colombia'),
  ('MASCULINO',2,2,'España','Noruega'),
  ('MASCULINO',2,3,'Colombia','Noruega'),
  ('MASCULINO',2,4,'Francia','España'),
  ('MASCULINO',2,5,'Francia','Noruega'),
  ('MASCULINO',2,6,'Colombia','España'),
  ('MASCULINO',3,1,'Cabo Verde','Congo'),
  ('MASCULINO',3,2,'Inglaterra','Portugal'),
  ('MASCULINO',3,3,'Congo','Portugal'),
  ('MASCULINO',3,4,'Cabo Verde','Inglaterra'),
  ('MASCULINO',3,5,'Cabo Verde','Portugal'),
  ('MASCULINO',3,6,'Congo','Inglaterra'),
  ('FEMENINO',4,1,'Colombia','Francia'),
  ('FEMENINO',4,2,'Cabo Verde','Portugal'),
  ('FEMENINO',4,3,'Portugal','Colombia'),
  ('FEMENINO',4,4,'Francia','Cabo Verde'),
  ('FEMENINO',4,5,'Colombia','Cabo Verde'),
  ('FEMENINO',4,6,'Portugal','Francia')
) as fx(cat, field, jornada, home, away)
join teams ha on ha.name = fx.home and ha.category = fx.cat::category
join teams aw on aw.name = fx.away and aw.category = fx.cat::category;

-- 5) Fase final visible desde el inicio: placeholders con equipos "por definir".
--    Se llenan SOLOS cuando terminan los grupos/semis de cada categoria.
--    Horarios del Excel: semis 5:00 y 5:30 PM · final 6:05 PM.
--    Masculino en cancha 1 (final en cancha 5) · Femenino todo en cancha 4.
insert into matches (phase, status, field_number, scheduled_at, category, team_a_id, team_b_id) values
  ('SEMIFINAL', 'PROGRAMADO', 1, (timestamp '2026-07-18 17:00' at time zone 'America/Bogota'), 'MASCULINO', null, null),
  ('SEMIFINAL', 'PROGRAMADO', 1, (timestamp '2026-07-18 17:30' at time zone 'America/Bogota'), 'MASCULINO', null, null),
  ('FINAL',     'PROGRAMADO', 5, (timestamp '2026-07-18 18:05' at time zone 'America/Bogota'), 'MASCULINO', null, null),
  ('SEMIFINAL', 'PROGRAMADO', 4, (timestamp '2026-07-18 17:00' at time zone 'America/Bogota'), 'FEMENINO',  null, null),
  ('SEMIFINAL', 'PROGRAMADO', 4, (timestamp '2026-07-18 17:30' at time zone 'America/Bogota'), 'FEMENINO',  null, null),
  ('FINAL',     'PROGRAMADO', 4, (timestamp '2026-07-18 18:05' at time zone 'America/Bogota'), 'FEMENINO',  null, null);

-- 6) Asignaciones de cancha (supervisor + arbitro) — segun Excel + ajustes
insert into pitch_assignments (day, field_number, supervisor_name, referee_name) values
  ('2026-07-18', 1, 'Ana Benavides',   'Samuel Valenzuela'),
  ('2026-07-18', 2, 'Sara Nieto',      'Kevin Aguilar'),
  ('2026-07-18', 3, 'Camila Reinoso',  'Pablo Garzón'),
  ('2026-07-18', 4, 'Stefania Álzate', 'Camila Chaparro')
on conflict (day, field_number) do nothing;
