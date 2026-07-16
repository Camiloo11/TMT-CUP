-- ════════════════════════════════════════════════════════════════════
-- MODO PRUEBA: agenda de HOY con los nombres reales del staff
-- ════════════════════════════════════════════════════════════════════
-- Para probar la mesa de control del supervisor ANTES del torneo:
--   1) Asigna las canchas de HOY usando los nombres tal cual están en
--      la tabla profiles (así el match con la credencial es garantizado:
--      el dashboard busca la asignación por el nombre del perfil).
--   2) Mueve todos los partidos a HOY conservando su hora de Bogotá.
--
-- Es idempotente: puedes correrlo varias veces sin dañar nada.
-- ⚠️ El día real del torneo NO corras esto: usa el bloque "RESTAURAR"
--    del final para devolver los partidos al 18 de julio.

-- ── 0) ¿Quiénes están registrados? (verifica que estén sus nombres) ──
select name, role, created_at from profiles order by created_at;

-- ── 1) Asignaciones de HOY: una cancha por usuario del staff ─────────
-- El primero registrado queda en la cancha 1, el segundo en la 2, etc.
-- (máximo 4 canchas). El nombre sale de profiles, letra por letra.
with hoy as (
  select (now() at time zone 'America/Bogota')::date as d
),
staff as (
  select name, row_number() over (order by created_at) as cancha
  from profiles
)
insert into pitch_assignments (day, field_number, supervisor_name, referee_name)
select hoy.d, staff.cancha, staff.name, 'Árbitro de prueba'
from hoy, staff
where staff.cancha <= 4
on conflict (day, field_number)
do update set supervisor_name = excluded.supervisor_name,
              referee_name    = excluded.referee_name;

-- ── 2) Mover TODOS los partidos a HOY (conservando la hora local) ────
-- 'America/Bogota' es nombre de zona, no offset: sin el bug POSIX.
update matches
set scheduled_at = (
  ((now() at time zone 'America/Bogota')::date::text || ' ' ||
   to_char(scheduled_at at time zone 'America/Bogota', 'HH24:MI:SS'))::timestamp
  at time zone 'America/Bogota'
);

-- ── 3) Verificación: así queda la agenda de hoy ──────────────────────
select
  pa.field_number as cancha,
  pa.supervisor_name as supervisor,
  count(m.id) as partidos_hoy
from pitch_assignments pa
left join matches m
  on m.field_number = pa.field_number
 and (m.scheduled_at at time zone 'America/Bogota')::date = pa.day
where pa.day = (now() at time zone 'America/Bogota')::date
group by pa.field_number, pa.supervisor_name
order by pa.field_number;

select
  id,
  field_number as cancha,
  to_char(scheduled_at at time zone 'America/Bogota', 'HH12:MI AM') as hora,
  phase,
  status
from matches
order by field_number, scheduled_at
limit 12;

-- ════════════════════════════════════════════════════════════════════
-- ¿REPETIR LA PRUEBA de un partido que ya finalizaste/publicaste?
-- Descomenta, cambia el 999 por el id del partido, y corre:
-- ════════════════════════════════════════════════════════════════════
-- delete from match_events where match_id = 999;
-- delete from sanctions    where match_id = 999;
-- delete from incidents    where match_id = 999;
-- update matches set
--   status = 'PROGRAMADO', score_a = null, score_b = null,
--   waiting_started_at = null, kickoff_at = null, finished_at = null,
--   team_a_present_at = null, team_b_present_at = null,
--   published_at = null, walkover = null,
--   penalty_a = null, penalty_b = null, extra_time_min = 0
-- where id = 999;

-- ════════════════════════════════════════════════════════════════════
-- RESTAURAR: devolver todos los partidos a la fecha real del torneo
-- (18 de julio de 2026). Corre esto cuando termines de probar:
-- ════════════════════════════════════════════════════════════════════
-- update matches
-- set scheduled_at = (
--   ('2026-07-18 ' || to_char(scheduled_at at time zone 'America/Bogota', 'HH24:MI:SS'))::timestamp
--   at time zone 'America/Bogota'
-- );
