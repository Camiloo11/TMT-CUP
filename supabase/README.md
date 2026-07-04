# Base de datos (Supabase)

Este proyecto usa [Supabase](https://supabase.com) (Postgres administrado) como
única fuente de datos. Ya no se usa Prisma.

## Estructura

```
supabase/
  migrations/
    20260703000000_create_tables.sql    # enums, tablas, índices, RLS
    20260703000001_create_functions.sql # funciones para operaciones atómicas
```

## Aplicar las migraciones

1. Crea un proyecto en [supabase.com](https://supabase.com) (o usa el
   [Supabase CLI](https://supabase.com/docs/guides/cli) para desarrollo local).
2. Instala el CLI si no lo tienes: `pnpm dlx supabase --help`.
3. Enlaza el proyecto:
   ```bash
   pnpm dlx supabase link --project-ref <tu-project-ref>
   ```
4. Aplica las migraciones:
   ```bash
   pnpm dlx supabase db push
   ```
   O pega el contenido de cada archivo `.sql` (en orden) en el **SQL Editor**
   del dashboard de Supabase.

## Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto (ya está en
`.gitignore`) con:

```bash
SUPABASE_URL=https://<tu-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

Ambas se encuentran en **Project Settings → API** del dashboard de Supabase.

> ⚠️ La `service_role` key tiene acceso total y **bypassa RLS**. Solo debe
> usarse en el servidor (como hace `lib/supabase.ts`, usado exclusivamente
> desde route handlers de `app/api/**`). Nunca la expongas al cliente ni la
> prefijes con `NEXT_PUBLIC_`.

## Por qué RPC (funciones) para algunas operaciones

`supabase-js` no soporta transacciones multi-sentencia desde el cliente
como sí hacía `prisma.$transaction`. Para las operaciones que deben ser
atómicas (el sorteo de grupos y las sanciones que afectan marcadores/crean
partidos en cadena) se usan funciones `plpgsql` (`perform_draw`,
`apply_w_sanction`, `apply_inasistencia_sanction`) definidas en
`20260703000001_create_functions.sql` e invocadas vía `supabase.rpc(...)`.
