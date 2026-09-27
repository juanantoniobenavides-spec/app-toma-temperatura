# Handoff para la próxima sesión de Claude — Checklist Supervisor Mantenimiento

Este archivo es un resumen para que una nueva sesión de Claude (corriendo en
local, en la carpeta `Escritorio/Retail Software/App supervisor` de este PC)
retome el proyecto sin perder contexto. La sesión anterior fue remota (en la
nube) y por eso no podía abrir un navegador ni acceder al Escritorio de este
computador; esta nueva sesión local sí debería poder hacer ambas cosas.

## Qué es el proyecto

App para supervisores de mantenimiento de locales/sucursales retail:

- **Supervisores** completan, desde el celular (Android, instalada como PWA
  sin pasar por Play Store), un checklist de inspección por sucursal:
  generador, iluminación, frío/refrigeración, pisos, áreas de personal,
  baños clientes, baños/camarines de personal, comedor, oficinas, limpieza
  general y seguridad. Cada ítem se marca OK / Problema / N-A (o una
  temperatura con rango válido), y los problemas admiten nota + foto.
- **Administradores** revisan desde un panel web los informes por sucursal,
  ven el detalle con fotos, marcan incidencias como resueltas, y gestionan
  sucursales, supervisores asignados y roles de usuario.

## Stack técnico

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage) como backend
- PWA (manifest + service worker) para instalar en Android desde Chrome

## Estado actual (todo funcionando en build/lint, pero sin probar en navegador real)

Ya está implementado:

- Esquema completo de base de datos en `supabase/schema.sql`: tablas,
  Row Level Security, bucket de fotos, y **seed** del checklist completo
  (11 secciones con sus ítems).
- Autenticación con Supabase Auth (login, middleware de sesión, roles
  admin/supervisor vía tabla `profiles`, trigger que crea el perfil
  automáticamente al invitar un usuario).
- Flujo completo del supervisor: `/inspecciones` (lista), `/inspecciones/nueva`
  (elegir sucursal asignada), `/inspecciones/[id]` (formulario de checklist
  con guardado automático, temperatura con rango, fotos, envío final).
- Panel admin completo: `/admin` (resumen por sucursal con incidencias
  pendientes), `/admin/reportes` (listado filtrable) y `/admin/reportes/[id]`
  (detalle + marcar resuelto), `/admin/sucursales` (CRUD + asignar
  supervisores), `/admin/usuarios` (cambiar rol).
- PWA: `public/manifest.json`, `public/sw.js`, íconos generados en
  `public/icons/`.
- `README.md` con instrucciones de setup completas.
- `npm run build` y `npx eslint .` pasan sin errores.

**Lo que falta / lo que hay que hacer a continuación**, en orden lógico:

1. **Git**: esta carpeta viene de un `.zip` (sin historial de `git`). Antes de
   seguir editando, correr `git init`, `git add -A`, `git commit` para tener
   historial local. Si el acceso de GitHub ya se resolvió (ver punto 2),
   mejor clonar el repo real en vez de reusar esta carpeta suelta.
2. **Acceso a GitHub**: el push desde la sesión anterior falló porque la
   Claude GitHub App no está instalada en
   `juanantoniobenavides-spec/app-toma-temperatura`. Hay que instalarla
   (https://github.com/apps/claude/installations/select_target) o
   reconectar GitHub desde claude.ai antes de poder pushear. La rama de
   trabajo se llamaba `claude/maintenance-supervisor-app-u7swi2`.
3. **Crear el proyecto real en Supabase** (no existe todavía, solo el SQL):
   crear proyecto en supabase.com, correr `supabase/schema.sql` completo en
   el SQL Editor, y copiar `Project URL` + `anon key`.
4. **Configurar `.env.local`** (no viene en el zip por seguridad): copiar
   `.env.example` y completar con las credenciales del punto 3.
5. **Levantar en local**: `npm install` y `npm run dev`, abrir
   `http://localhost:3000` — **esto es lo primero que la sesión anterior no
   pudo hacer** (no tenía navegador). Probar el flujo completo con ojos
   humanos: login, checklist como supervisor, panel como admin.
6. **Crear el primer usuario admin**: invitar un usuario desde
   Supabase (Authentication → Users → Invite user), y en
   Table Editor → `profiles` cambiar su `role` a `admin` manualmente (los
   siguientes admins ya se gestionan desde `/admin/usuarios`).
7. **Crear al menos una sucursal** desde `/admin/sucursales` y asignarle un
   supervisor para poder probar el flujo de punta a punta.
8. **Probar la instalación PWA en un Android real**: abrir el sitio
   desplegado desde Chrome en el celular y confirmar que aparece
   "Instalar app" / "Agregar a pantalla de inicio", y que las fotos se
   suben bien usando la cámara del teléfono.
9. **Desplegar a producción** (por ejemplo Vercel) — hoy el proyecto solo
   corre en `npm run dev`, no hay nada desplegado.

### Pendientes conocidos, de menor prioridad

- El archivo `middleware.ts` usa una convención que Next.js 16 marca como
  deprecada en favor de `proxy.ts` (solo un warning en build, no rompe nada;
  se puede migrar con `npx @next/codemod@canary middleware-to-proxy .`
  cuando haya tiempo).
- No hay UI para editar la plantilla del checklist (secciones/ítems): se
  edita directo en Supabase Table Editor (`checklist_sections`,
  `checklist_items`). Si el negocio necesita cambiarlo seguido, vale la pena
  construir una pantalla admin para esto.
- El service worker solo cachea el "shell" de la PWA (íconos, manifest); no
  hay cola de escritura offline. Si un supervisor pierde señal a mitad de un
  checklist, los guardados fallarán silenciosamente hasta reconectar — sería
  bueno endurecer esto si las sucursales tienen mala señal.
- No hay tests automatizados (unitarios ni e2e).
- No se probó el flujo de "olvidé mi contraseña" (no hay link en el login).

## Estructura relevante del código

```
supabase/schema.sql              → esquema + RLS + seed del checklist (correr en Supabase)
src/app/(app)/inspecciones/      → flujo del supervisor
src/app/(app)/admin/             → panel de administración
src/components/ChecklistForm.tsx → formulario de checklist (compartido por ambos flujos)
src/lib/supabase/                → clientes Supabase (browser/server/middleware)
src/lib/auth.ts                  → helpers de sesión y rol (requireProfile/requireAdmin)
public/manifest.json, sw.js      → PWA
.env.example                     → variables de entorno necesarias
README.md                        → guía de setup paso a paso
```

## Instrucción para la nueva sesión de Claude

Lee este archivo completo antes de tocar código. Luego confirma con el
usuario en qué paso de la lista "falta / a continuación" quiere seguir (lo
más probable: puntos 3, 4 y 5 — crear el Supabase real, configurar el
`.env.local` y levantar el proyecto para probarlo en el navegador por
primera vez).
