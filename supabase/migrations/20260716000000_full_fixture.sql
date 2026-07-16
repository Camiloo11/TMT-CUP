-- Fixture completo del torneo:
--   1) Los partidos de fase final existen desde el inicio con equipos
--      "por definir" → team_a_id/team_b_id pasan a ser opcionales.
--   2) Los placeholders no tienen equipos, así que necesitan su categoría
--      explícita → nueva columna matches.category (se rellena sola para
--      los partidos existentes a partir de su equipo A).
alter table matches alter column team_a_id drop not null;
alter table matches alter column team_b_id drop not null;

alter table matches add column if not exists category category;

update matches set category = t.category
from teams t
where matches.category is null and matches.team_a_id = t.id;
