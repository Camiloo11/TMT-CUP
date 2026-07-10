-- TMT-CUP: BORRA TODOS LOS DATOS (deja el esquema intacto).
-- Úsalo para arrancar de cero antes de cargar los datos reales del torneo.
-- ⚠️ Irreversible: equipos, jugadores, partidos, eventos, sanciones, todo.

truncate table
  match_events,
  incidents,
  sanctions,
  matches,
  players,
  teams,
  pitch_assignments,
  groups
restart identity cascade;
