-- TMT-CUP: datos de prueba para desarrollo (NO correr en producción)
-- Crea los 4 grupos, 16 equipos masculinos con 5 jugadores cada uno,
-- 2 equipos femeninos, asignaciones de cancha y algunos partidos.

-- Grupos A-D (canchas 1-4)
insert into groups (name, field_number)
select g.name, g.fn from (values ('A', 1), ('B', 2), ('C', 3), ('D', 4)) as g(name, fn)
where not exists (select 1 from groups where groups.name = g.name);

-- 16 equipos masculinos repartidos en los grupos
with team_names as (
  select * from (values
    ('Brasil', 'A'), ('Argentina', 'A'), ('Francia', 'A'), ('Japón', 'A'),
    ('Alemania', 'B'), ('España', 'B'), ('México', 'B'), ('Nigeria', 'B'),
    ('Italia', 'C'), ('Portugal', 'C'), ('Colombia', 'C'), ('Corea', 'C'),
    ('Inglaterra', 'D'), ('Uruguay', 'D'), ('Ghana', 'D'), ('Croacia', 'D')
  ) as t(name, group_name)
)
insert into teams (name, category, group_id)
select tn.name, 'MASCULINO', g.id
from team_names tn
join groups g on g.name = tn.group_name
where not exists (select 1 from teams where teams.name = tn.name);

-- 2 equipos femeninos (sin grupo: todos contra todos)
insert into teams (name, category)
select v.name, 'FEMENINO' from (values ('Leonas'), ('Águilas')) as v(name)
where not exists (select 1 from teams where teams.name = v.name);

-- 5 jugadores por equipo masculino (nombres genéricos de prueba)
insert into players (name, team_id)
select 'Jugador ' || n || ' ' || t.name, t.id
from teams t cross join generate_series(1, 5) as n
where t.category = 'MASCULINO'
  and not exists (select 1 from players p where p.team_id = t.id);

-- Asignaciones de hoy: supervisor + árbitro por cancha
insert into pitch_assignments (day, field_number, supervisor_name, referee_name)
select current_date, v.fn, v.sup, v.ref
from (values
  (1, 'Ana Beltrán', 'Carlos Molina'),
  (2, 'Mario Silva', 'Julián Ortiz'),
  (3, 'Sofía Ramos', 'Pedro Nieto'),
  (4, 'Diego Costa', 'Luis Vargas')
) as v(fn, sup, ref)
on conflict (day, field_number) do nothing;

-- Fixture del grupo A (cancha 1): todos contra todos, cada 30 min desde las 8:00 de hoy
with a_teams as (
  select t.id, row_number() over (order by t.id) as rn
  from teams t join groups g on g.id = t.group_id
  where g.name = 'A'
)
insert into matches (phase, status, field_number, scheduled_at, team_a_id, team_b_id)
select 'GRUPOS', 'PROGRAMADO', 1,
       current_date + time '08:00' + (interval '30 minutes' * (row_number() over () - 1)),
       t1.id, t2.id
from a_teams t1
join a_teams t2 on t1.rn < t2.rn
where not exists (select 1 from matches);
