# TMT-CUP

App para gestionar un torneo de fútbol (equipos, sorteo de grupos, partidos,
tabla de posiciones y sanciones). Construida con [Next.js](https://nextjs.org)
(App Router) y [Supabase](https://supabase.com) como base de datos.

## Stack

- **Next.js 16** (App Router, route handlers en `app/api/**`)
- **Supabase** (Postgres administrado, sin ORM)
- **Tailwind CSS 4**
- **pnpm** como gestor de paquetes

## Estructura del proyecto

```
app/
  api/            # route handlers (teams, matches, draw, sanctions, standings)
  layout.tsx      # layout raíz
  page.tsx        # página principal
lib/
  supabase.ts     # cliente de Supabase (server-only, service_role key)
supabase/
  migrations/     # esquema SQL y funciones RPC
  README.md       # cómo aplicar las migraciones y variables de entorno
public/           # assets estáticos
```

## Getting Started

Instala las dependencias con pnpm:

```bash
pnpm install
```

Configura las variables de entorno (ver `supabase/README.md` para el detalle
y cómo obtenerlas):

```bash
# .env.local
SUPABASE_URL=https://<tu-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```

Aplica las migraciones de base de datos (ver `supabase/README.md`), y luego
levanta el servidor de desarrollo:

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
`lib/supabase.ts`. Ver `supabase/README.md` para el esquema completo, cómo
aplicar migraciones y por qué algunas operaciones usan funciones RPC en vez
de llamadas directas.
