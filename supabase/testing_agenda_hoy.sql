-- ════════════════════════════════════════════════════════════════════
-- MODO PRUEBA: agenda de HOY con la relación real supervisor–árbitro
-- ════════════════════════════════════════════════════════════════════
-- Para probar la mesa de control del supervisor ANTES del torneo:
--   1) Asigna las 4 canchas de HOY con la pareja supervisor–árbitro REAL
--      del Excel. Si hay usuarios del staff registrados (profiles), esos
--      nombres reemplazan al supervisor de su cancha (1º registrado →
--      cancha 1, 2º → cancha 2, ...) para que el dashboard case la
--      credencial; el ÁRBITRO real de la cancha se conserva siempre.
--   2) Mueve todos los partidos a HOY conservando su hora de Bogotá.
--
-- Es idempotente: puedes correrlo varias veces sin dañar nada.
-- ⚠️ El día real del torneo NO corras esto: usa el bloque "RESTAURAR"
--    del final (los partidos vuelven al 18/07; las asignaciones reales
--    del 18/07 ya existen desde el seed).

-- ── 0) ¿Quiénes están registrados? (verifica que estén sus nombres) ──
select name, role, created_at from profiles order by created_at;

-- ── 1) Asignaciones de HOY: pareja real por cancha (Excel) ───────────
--     Cancha 1: Ana Benavides   · Árb: Samuel Valenzuela
--     Cancha 2: Sara Nieto      · Árb: Kevin Aguilar
--     Cancha 3: Camila Reinoso  · Árb: Pablo Garzón
--     Cancha 4: Stefania Álzate · Árb: Camila Chaparro
with hoy as (
  select (now() at time zone 'America/Bogota')::date as d
),
reales as (
  select * from (values
    (1, 'Ana Benavides',   'Samuel Valenzuela'),
    (2, 'Sara Nieto',      'Kevin Aguilar'),
    (3, 'Camila Reinoso',  'Pablo Garzón'),
    (4, 'Stefania Álzate', 'Camila Chaparro')
  ) as v(cancha, supervisor, arbitro)
),
staff as (
  select name, row_number() over (order by created_at) as cancha
  from profiles
)
insert into pitch_assignments (day, field_number, supervisor_name, referee_name)
select hoy.d, r.cancha, coalesce(s.name, r.supervisor), r.arbitro
from hoy, reales r
left join staff s on s.cancha = r.cancha
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
  pa.referee_name as arbitro,
  count(m.id) as partidos_hoy
from pitch_assignments pa
left join matches m
  on m.field_number = pa.field_number
 and (m.scheduled_at at time zone 'America/Bogota')::date = pa.day
where pa.day = (now() at time zone 'America/Bogota')::date
group by pa.field_number, pa.supervisor_name, pa.referee_name
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
-- RESET TOTAL DE PRUEBAS: dejar TODOS los partidos como recién
-- programados (borra goles, tarjetas, sanciones e incidentes de prueba).
-- ⚠️ SOLO para el día de pruebas — JAMÁS el día real del torneo.
-- ════════════════════════════════════════════════════════════════════
-- delete from match_events;
-- delete from sanctions;
-- delete from incidents;
-- update matches set
--   status = 'PROGRAMADO', score_a = null, score_b = null,
--   waiting_started_at = null, kickoff_at = null, finished_at = null,
--   team_a_present_at = null, team_b_present_at = null,
--   published_at = null, walkover = null,
--   penalty_a = null, penalty_b = null, extra_time_min = 0
-- where phase = 'GRUPOS';
-- -- Y los de fase final vuelven a "por definir":
-- update matches set
--   status = 'PROGRAMADO', score_a = null, score_b = null,
--   team_a_id = null, team_b_id = null,
--   waiting_started_at = null, kickoff_at = null, finished_at = null,
--   team_a_present_at = null, team_b_present_at = null,
--   published_at = null, walkover = null,
--   penalty_a = null, penalty_b = null, extra_time_min = 0
-- where phase in ('SEMIFINAL', 'FINAL');

-- ════════════════════════════════════════════════════════════════════
-- RESTAURAR: devolver todos los partidos a la fecha real del torneo
-- (18 de julio de 2026). Corre esto cuando termines de probar:
-- ════════════════════════════════════════════════════════════════════
-- update matches
-- set scheduled_at = (
--   ('2026-07-18 ' || to_char(scheduled_at at time zone 'America/Bogota', 'HH24:MI:SS'))::timestamp
--   at time zone 'America/Bogota'
-- );
