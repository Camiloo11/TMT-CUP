# TMT-CUP

App para gestionar un torneo de fútbol: equipos, sorteo de grupos, partidos,
tabla de posiciones y sanciones. Está construida con [Next.js](https://nextjs.org)
(App Router) y [Supabase](https://supabase.com) como base de datos.

## Stack

- **Next.js 16** (App Router, route handlers en `app/api/**`)
- **Supabase** (Postgres administrado, sin ORM)
- **Tailwind CSS 4**
- **pnpm** como gestor de paquetes

## Estructura

La estructura actual del repo es esta:

```
app/
  api/            # route handlers del backend (teams, matches, draw, etc.)
  layout.tsx      # layout raíz de la app
  page.tsx        # pantalla principal actual
lib/
  supabase.ts     # cliente de Supabase en servidor (service_role key)
supabase/
  migrations/     # esquema SQL y funciones RPC
  README.md       # guía para levantar la base online
public/           # assets estáticos
```

### Base de datos

- `20260703000000_create_tables.sql` crea enums, tablas, índices y RLS.
- `20260703000001_create_functions.sql` agrega las funciones RPC usadas por
  operaciones atómicas.

## Requisitos previos

- Node.js 20+ (o una versión compatible con Next.js 16)
- `pnpm`
- Un proyecto activo de Supabase

## Getting Started

Instala las dependencias:

```bash
pnpm install
```

Configura las variables de entorno. Ver [supabase/README.md](supabase/README.md)
para el paso a paso completo:

```bash
# .env.local
SUPABASE_URL=https://<tu-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

Aplica las migraciones de base de datos y luego levanta el servidor:

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Scripts

| Comando        | Descripción                       |
| -------------- | ---------------------------------- |
| `pnpm dev`     | Servidor de desarrollo             |
| `pnpm build`   | Build de producción                |
| `pnpm start`   | Sirve el build de producción       |
| `pnpm lint`    | Linter (ESLint)                    |

## Flujo de la app

- El frontend vive en `app/page.tsx` y el layout global en `app/layout.tsx`.
- La lógica del backend está en `app/api/**`.
- Todas las operaciones contra Supabase usan `lib/supabase.ts` desde servidor.
- La base online se define en `supabase/migrations/**`.

## API

| Ruta                    | Métodos      | Descripción                              |
| ------------------------ | ------------ | ----------------------------------------- |
| `/api/teams`             | GET, POST    | Listar / crear equipos                    |
| `/api/matches`           | GET, POST    | Listar / programar partidos               |
| `/api/matches/[id]`      | PATCH        | Registrar el resultado de un partido      |
| `/api/draw`              | POST         | Sorteo de grupos (equipos masculinos)     |
| `/api/standings`         | GET          | Tabla de posiciones por grupo             |
| `/api/sanctions`         | GET, POST    | Historial / aplicar sanciones             |

## Base de datos

Toda la lógica de acceso a datos vive en `app/api/**` usando el cliente de
`lib/supabase.ts`. Ver [supabase/README.md](supabase/README.md) para el orden
de las migraciones, la configuración online y el motivo de las funciones RPC.
