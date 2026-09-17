# Supervisión de Locales

App para supervisores de mantenimiento: checklist de inspección por sucursal
(generador, luces, fríos, pisos, áreas de personal, baños, comedores,
oficinas, limpieza, seguridad, etc.) más un panel web para que los
administradores revisen y gestionen los informes.

- **Supervisores**: instalan la app en su celular Android (PWA, sin tienda de
  apps) y completan el checklist en terreno, con fotos de evidencia para cada
  problema encontrado.
- **Administradores**: revisan los informes enviados por sucursal desde el
  navegador (web), marcan incidencias como resueltas y gestionan sucursales y
  usuarios.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) (Postgres, Auth, Storage) como backend
- PWA instalable en Android (manifest + service worker)

## 1. Crear el proyecto en Supabase

1. Crea un proyecto en [app.supabase.com](https://app.supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido completo de
   [`supabase/schema.sql`](./supabase/schema.sql). Esto crea las tablas, los
   permisos (RLS), el bucket de fotos y siembra el checklist por defecto.
3. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public` key

## 2. Configurar variables de entorno

Copia `.env.example` a `.env.local` y completa los valores de Supabase:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## 3. Instalar y correr en desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 4. Crear usuarios

Por ahora los usuarios se crean desde el panel de Supabase:

1. **Authentication → Users → Invite user** (o crea el usuario con
   email/contraseña).
2. Al crearse, automáticamente se le crea un perfil con rol **supervisor**.
3. Para convertir el primer usuario en **administrador**, ve a
   **Table Editor → profiles** y cambia su `role` a `admin` manualmente (los
   siguientes administradores ya se pueden gestionar desde `/admin/usuarios`).
4. Como administrador, entra a **Sucursales** y crea los locales, luego asigna
   los supervisores correspondientes a cada sucursal.

## 5. Flujo de uso

- Un supervisor entra en su celular, elige **Nueva inspección**, selecciona su
  sucursal y completa el checklist por secciones. Cada ítem puede marcarse
  como OK / Problema / N-A, o registrar una temperatura (fuera de rango se
  marca automáticamente como problema). Los problemas admiten notas y foto.
- Al enviar el informe, queda disponible para el administrador en
  **Reportes**, donde puede revisar el detalle, ver las fotos y marcar cada
  incidencia como resuelta.
- El **Panel** (`/admin`) muestra un resumen por sucursal: última visita e
  incidencias pendientes.

## 6. Instalar como app en Android

1. Abre la URL del sitio (desplegado, por ejemplo en Vercel) desde Chrome en
   el celular.
2. Inicia sesión.
3. Chrome mostrará la opción **"Agregar a pantalla de inicio" / "Instalar
   app"** (o desde el menú ⋮). Queda instalada como una app normal, sin pasar
   por Play Store.

## 7. Editar el checklist

El checklist (secciones e ítems) vive en las tablas `checklist_sections` y
`checklist_items` de Supabase. Se puede editar directamente desde
**Table Editor** en Supabase para agregar, quitar o reordenar ítems sin tocar
código.

## Estructura del proyecto

```
src/app/(app)/inspecciones/   → flujo del supervisor (móvil)
src/app/(app)/admin/          → panel de administración (web)
src/components/ChecklistForm  → formulario de checklist (usado en ambos flujos)
supabase/schema.sql           → esquema completo + RLS + checklist inicial
public/manifest.json, sw.js   → configuración PWA
```
