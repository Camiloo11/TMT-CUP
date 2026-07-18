# TMT-CUP

App para gestionar el torneo TMT CUP: vista pública en vivo (websockets),
mesa de control del supervisor por cancha y mesa administradora. Construida
con [Next.js](https://nextjs.org) (App Router) y [Supabase](https://supabase.com).

## Stack

- **Next.js 16** (App Router, route handlers en `app/api/**`)
- **Supabase** (Postgres administrado + Realtime, sin ORM)
- **Tailwind CSS 4**
- **pnpm** como gestor de paquetes

## Estructura

```
app/
  page.tsx                  # vista PUBLICA: grupos, partidos en vivo y fase final
  components/               # componentes de la vista publica (tarjetas, tabla, arbol)
  panel/
    page.tsx                # login del staff
    admin/
      page.tsx              # mesa administradora (actas, auditoria, registro)
      components/           # actas.tsx, HistoryPanel.tsx
    supervisor/
      page.tsx              # mesa de control del supervisor (espera -> vivo -> resumen)
      components/           # MatchCardContainer, TeamPresenceCard, ControlAlertPopup, SummaryBlocks
  api/                      # backend (route handlers)
    agenda/                 # asignaciones del dia + partidos por cancha
    audit/                  # historial de ediciones de actas (admin)
    auth/                   # login, logout, me, refresh, users (crear staff)
    brackets/               # fase final para la vista publica
    matches/                # partidos + [id]/events, [id]/lifecycle, [id]/incidents, [id]/acta
    players/                # jugadores (+ PATCH: asistencia, tMt)
    standings/              # tabla de posiciones por grupo
    teams/                  # equipos (+ PATCH: deuda saldada)
lib/
  supabase.ts               # cliente de SERVIDOR (service_role) - solo /app/api/*
  supabase-browser.ts       # cliente de NAVEGADOR (anon) - Realtime de la publica
  flags.ts                  # banderas de equipos (SVG locales en /public/flags)
  suspensions.ts            # sanciones por tarjetas (amarillas/rojas entre partidos)
  tournament.ts             # avance automatico de fase (grupos -> semis -> final)
  auth.ts / session-client.ts
public/flags/               # banderas SVG (country-flag-icons, MIT)
supabase/
  migrations/               # esquema SQL incremental
  setup_completo.sql        # TODO en un script (correr en Supabase -> SQL Editor)
  seed_real.sql             # datos reales del torneo (equipos, fixture, agenda)
```

## Reglas del torneo implementadas

- **Clasificacion**: 1ro de cada grupo (A/B/C) + el mejor 2do -> semifinales.
  Femenino (grupo unico): SF1 = 1ro vs 4to, SF2 = 2do vs 3ro. La fase final
  se llena sola al terminar los grupos (`lib/tournament.ts`).
- **Sancion W por llegada tarde** (`/api/matches/[id]/lifecycle`):
  0-2 min gracia; 2-4 min = **+1 gol** al rival; 4-6 min = **+2 goles** al
  rival; 6+ min = **victoria por W 3-0** (partido finalizado, 3 puntos).
- **Tarjetas** (`lib/suspensions.ts`): roja = resto del partido + el
  siguiente; 2 amarillas acumuladas = pierde el siguiente; las amarillas se
  reinician en semifinales, las rojas no.
- **Banderas**: SVG locales (`lib/flags.ts` + `public/flags/`). Se usan
  imagenes y no emojis porque Windows no renderiza los emojis de bandera.

## Getting Started

```bash
pnpm install
```

Variables de entorno (`.env.local`):

```bash
# Backend (obligatorias)
SUPABASE_URL=https://<tu-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>

# Vista publica en tiempo real (websockets) - llave ANON, nunca la service_role
NEXT_PUBLIC_SUPABASE_URL=https://<tu-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-public-key>
```

Base de datos: pega `supabase/setup_completo.sql` completo en
Supabase -> SQL Editor y dale RUN (es idempotente). Deja listo el esquema,
los jugadores, las banderas, la agenda, el realtime y las columnas del
registro (asistencia, tMt, deuda por equipo).

```bash
pnpm dev    # http://localhost:3000
pnpm build  # verificacion de produccion
```

## Scripts

| Comando        | Descripcion                       |
| -------------- | ---------------------------------- |
| `pnpm dev`     | Servidor de desarrollo             |
| `pnpm build`   | Build de produccion                |
| `pnpm start`   | Sirve el build de produccion       |
| `pnpm lint`    | Linter (ESLint)                    |

## API

| Ruta                          | Metodos     | Descripcion                                            |
| ----------------------------- | ----------- | ------------------------------------------------------- |
| `/api/teams`                  | GET, POST   | Equipos (`[id]` PATCH: nombre, deuda saldada)           |
| `/api/players`                | GET, POST   | Jugadores (`[id]` PATCH: asistencia, tMt)               |
| `/api/matches`                | GET, POST   | Partidos con eventos e incidentes embebidos             |
| `/api/matches/[id]`           | GET, PATCH  | Detalle con rosters y suspendidos                       |
| `/api/matches/[id]/lifecycle` | POST        | espera -> presente -> kickoff -> W -> finalizar -> publicar |
| `/api/matches/[id]/events`    | POST        | Registrar gol/tarjeta (rechaza suspendidos)             |
| `/api/matches/[id]/acta`      | PATCH       | Guardado del acta desde la mesa admin (+ auditoria)     |
| `/api/matches/[id]/incidents` | GET, POST   | Incidentes disciplinarios del partido                   |
| `/api/standings`              | GET         | Tabla de posiciones por grupo (con banderas)            |
| `/api/brackets`               | GET         | Fase final por categoria para la vista publica          |
| `/api/agenda`                 | GET         | Asignaciones del dia (+ partidos por cancha)            |
| `/api/audit`                  | GET         | Historial de ediciones de actas (admin)                 |
| `/api/auth/*`                 | POST/GET    | login, logout, me, refresh y users (crear staff)        |

## Cuentas del staff

Se crean via `POST /api/auth/users` (el primer usuario del sistema debe ser
ADMIN; despues, solo un ADMIN puede crear mas cuentas):

```js
fetch("/api/auth/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, name, role: "SUPERVISOR" }),
});
```

El `name` del supervisor debe coincidir con su nombre en `pitch_assignments`
para que al entrar vea su cancha y sus partidos del dia.

## Base de datos

Toda la logica de acceso a datos vive en `app/api/**` usando el cliente de
`lib/supabase.ts`. Ver [supabase/README.md](supabase/README.md) para el orden
de las migraciones y la configuracion online.
