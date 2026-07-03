-- TMT-CUP: funciones RPC para operaciones que deben ser atómicas
-- (equivalentes a los antiguos prisma.$transaction).

-- Sorteo: crea los grupos A-D si no existen y reparte los equipos en ronda.
create or replace function perform_draw(team_ids integer[])
returns setof groups
language plpgsql
as $$
declare
  group_names text[] := array['A', 'B', 'C', 'D'];
  group_ids   integer[] := array[]::integer[];
  g_id        integer;
  i           integer;
begin
  for i in 1..4 loop
    select id into g_id from groups where name = group_names[i];
    if g_id is null then
      insert into groups (name, field_number) values (group_names[i], i)
        returning id into g_id;
    end if;
    group_ids := array_append(group_ids, g_id);
  end loop;

  for i in 1..array_length(team_ids, 1) loop
    update teams
      set group_id = group_ids[((i - 1) % 4) + 1]
      where id = team_ids[i];
  end loop;

  return query select * from groups where id = any (group_ids);
end;
$$;

-- Sanción W_4MIN / W_6MIN: registra la sanción y ajusta el marcador del partido.
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

-- Sanción INASISTENCIA: cada rival del grupo gana 3-0 "de oficio".
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
