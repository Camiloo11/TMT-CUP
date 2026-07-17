-- ════════════════════════════════════════════════════════════════════
-- REALTIME (WEBSOCKETS) PARA LA VISTA PÚBLICA
-- ════════════════════════════════════════════════════════════════════
-- Hace 2 cosas, ambas necesarias para que el navegador reciba eventos:
--   1) Publica los cambios de matches y match_events por Realtime.
--   2) Da permiso de SOLO LECTURA al público (rol anon) sobre esas tablas.
--      ⚠️ Este era el bloqueo invisible: con RLS activo y SIN política,
--      Realtime conecta pero NO entrega ningún evento. Son datos públicos
--      del torneo (marcadores y goles), así que leerlos es seguro; escribir
--      sigue bloqueado como siempre.
--
-- Idempotente: puedes correrlo varias veces sin dañar nada.

-- ── 1) Publicación de Realtime ──────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_events'
  ) then
    alter publication supabase_realtime add table match_events;
  end if;
end $$;

-- Eventos UPDATE/DELETE con la fila completa (recomendado con RLS)
alter table matches      replica identity full;
alter table match_events replica identity full;

-- ── 2) Lectura pública (solo SELECT) ────────────────────────────────
-- Grants explícitos (en Supabase suelen existir por defecto; así no dependemos)
grant usage on schema public to anon, authenticated;
grant select on matches, match_events to anon, authenticated;

drop policy if exists "lectura publica matches" on matches;
create policy "lectura publica matches"
  on matches for select
  to anon, authenticated
  using (true);

drop policy if exists "lectura publica match_events" on match_events;
create policy "lectura publica match_events"
  on match_events for select
  to anon, authenticated
  using (true);

-- ── Verificación: deben salir matches y match_events ────────────────
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
