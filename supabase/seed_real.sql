-- ============================================================
-- TMT-CUP — SEED REAL (torneo del 18 de julio de 2026)
-- Generado desde MinaMinTMTCUP.2026 (hoja HorariosDetallado + Liga Fem).
-- Correr DESPUES de reset.sql (base vacia de datos del torneo).
-- Zona: Bogota (-05:00) · 1er partido 14:00 (2:00 PM) · slots de 30 min.
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
insert into matches (phase, status, field_number, scheduled_at, team_a_id, team_b_id)
select 'GRUPOS'::phase, 'PROGRAMADO'::match_status, fx.field,
       (timestamp '2026-07-18 14:00' at time zone '-05:00') + (fx.jornada - 1) * interval '30 minutes',
       ha.id, aw.id
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

-- 5) Asignaciones de cancha (supervisor + arbitro) — segun Excel + ajustes
insert into pitch_assignments (day, field_number, supervisor_name, referee_name) values
  ('2026-07-18', 1, 'Ana Benavides',   'Samuel Valenzuela'),
  ('2026-07-18', 2, 'Sara Nieto',      'Kevin Aguilar'),
  ('2026-07-18', 3, 'Camila Reinoso',  'Pablo Garzón'),
  ('2026-07-18', 4, 'Stefania Álzate', 'Camila Chaparro')
on conflict (day, field_number) do nothing;
