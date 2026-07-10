# Supabase online

Este proyecto usa Supabase como base de datos administrada. Para que el backend
funcione en el entorno online, hay que crear el proyecto, aplicar las
migraciones y configurar las variables de entorno.

## Paso a paso

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `service_role` key
3. En la raíz del proyecto crea `.env.local` con:

```bash
SUPABASE_URL=https://<tu-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

4. Aplica el esquema SQL en este orden:
   - `migrations/20260703000000_create_tables.sql`
   - `migrations/20260703000001_create_functions.sql`
5. Si prefieres usar el CLI, enlaza el proyecto y sube las migraciones:

```bash
pnpm dlx supabase link --project-ref <tu-project-ref>
pnpm dlx supabase db push
```

## Importante

- La `service_role` key solo debe usarse en servidor.
- No la agregues con `NEXT_PUBLIC_`.
- `lib/supabase.ts` ya crea el cliente server-side que usan las rutas de `app/api/**`.

## Qué crea la base

- Tablas: `groups`, `teams`, `players`, `matches`, `match_events`, `sanctions`
- Enums: categorías, fases, estados de partido, eventos y sanciones
- RPC: `perform_draw`, `apply_w_sanction`, `apply_inasistencia_sanction`
- RLS habilitado en todas las tablas
