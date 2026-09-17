-- ============================================================================
-- App Toma Temperatura / Checklist de Supervisión de Locales
-- Esquema inicial para Supabase (Postgres + Auth + Storage)
--
-- Cómo aplicar:
--   1. Abre tu proyecto en https://app.supabase.com
--   2. Ve a SQL Editor > New query
--   3. Pega el contenido completo de este archivo y ejecuta ("Run")
--
-- Este script es idempotente (usa IF NOT EXISTS / OR REPLACE) por lo que
-- puede volver a ejecutarse sin duplicar datos base.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'supervisor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inspection_status as enum ('draft', 'submitted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type response_status as enum ('ok', 'problem', 'na');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checklist_item_type as enum ('ok_problem', 'temperature', 'text');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles: extiende auth.users con nombre, rol
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'supervisor',
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil (rol supervisor por defecto) cuando se crea un usuario en Auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'supervisor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------------
-- branches: sucursales / locales
-- ---------------------------------------------------------------------------
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  city text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Asignación de supervisores a sucursales (muchos a muchos)
create table if not exists branch_supervisors (
  branch_id uuid not null references branches (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (branch_id, user_id)
);

-- ---------------------------------------------------------------------------
-- checklist_sections / checklist_items: plantilla del checklist
-- ---------------------------------------------------------------------------
create table if not exists checklist_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '',
  sort_order int not null default 0,
  active boolean not null default true
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references checklist_sections (id) on delete cascade,
  label text not null,
  item_type checklist_item_type not null default 'ok_problem',
  unit text not null default '',
  min_value numeric,
  max_value numeric,
  requires_photo_on_problem boolean not null default true,
  sort_order int not null default 0,
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- inspections: una visita/supervisión de un supervisor a una sucursal
-- ---------------------------------------------------------------------------
create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches (id) on delete restrict,
  supervisor_id uuid not null references profiles (id) on delete restrict,
  status inspection_status not null default 'draft',
  general_notes text not null default '',
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists inspection_responses (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections (id) on delete cascade,
  checklist_item_id uuid not null references checklist_items (id) on delete restrict,
  status response_status,
  value numeric,
  notes text not null default '',
  photo_path text,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references profiles (id),
  updated_at timestamptz not null default now(),
  unique (inspection_id, checklist_item_id)
);

create index if not exists idx_inspections_branch on inspections (branch_id);
create index if not exists idx_inspections_supervisor on inspections (supervisor_id);
create index if not exists idx_inspection_responses_inspection on inspection_responses (inspection_id);

-- ---------------------------------------------------------------------------
-- Helper: ¿el usuario actual es admin?
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_branch_supervisor(target_branch_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from branch_supervisors
    where branch_id = target_branch_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table branches enable row level security;
alter table branch_supervisors enable row level security;
alter table checklist_sections enable row level security;
alter table checklist_items enable row level security;
alter table inspections enable row level security;
alter table inspection_responses enable row level security;

-- profiles
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid() or is_admin());

drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all
  using (is_admin()) with check (is_admin());

-- branches
drop policy if exists "branches_select" on branches;
create policy "branches_select" on branches for select
  using (is_admin() or is_branch_supervisor(id));

drop policy if exists "branches_admin_write" on branches;
create policy "branches_admin_write" on branches for all
  using (is_admin()) with check (is_admin());

-- branch_supervisors
drop policy if exists "branch_supervisors_select" on branch_supervisors;
create policy "branch_supervisors_select" on branch_supervisors for select
  using (is_admin() or user_id = auth.uid());

drop policy if exists "branch_supervisors_admin_write" on branch_supervisors;
create policy "branch_supervisors_admin_write" on branch_supervisors for all
  using (is_admin()) with check (is_admin());

-- checklist_sections / checklist_items: lectura para cualquier usuario autenticado, escritura solo admin
drop policy if exists "checklist_sections_select" on checklist_sections;
create policy "checklist_sections_select" on checklist_sections for select
  using (auth.uid() is not null);

drop policy if exists "checklist_sections_admin_write" on checklist_sections;
create policy "checklist_sections_admin_write" on checklist_sections for all
  using (is_admin()) with check (is_admin());

drop policy if exists "checklist_items_select" on checklist_items;
create policy "checklist_items_select" on checklist_items for select
  using (auth.uid() is not null);

drop policy if exists "checklist_items_admin_write" on checklist_items;
create policy "checklist_items_admin_write" on checklist_items for all
  using (is_admin()) with check (is_admin());

-- inspections
drop policy if exists "inspections_select" on inspections;
create policy "inspections_select" on inspections for select
  using (is_admin() or supervisor_id = auth.uid());

drop policy if exists "inspections_insert" on inspections;
create policy "inspections_insert" on inspections for insert
  with check (
    supervisor_id = auth.uid()
    and (is_admin() or is_branch_supervisor(branch_id))
  );

drop policy if exists "inspections_update" on inspections;
create policy "inspections_update" on inspections for update
  using (is_admin() or supervisor_id = auth.uid())
  with check (is_admin() or supervisor_id = auth.uid());

drop policy if exists "inspections_admin_delete" on inspections;
create policy "inspections_admin_delete" on inspections for delete
  using (is_admin());

-- inspection_responses: siguen los permisos de la inspección padre
drop policy if exists "inspection_responses_select" on inspection_responses;
create policy "inspection_responses_select" on inspection_responses for select
  using (
    exists (
      select 1 from inspections i
      where i.id = inspection_id
        and (is_admin() or i.supervisor_id = auth.uid())
    )
  );

drop policy if exists "inspection_responses_write" on inspection_responses;
create policy "inspection_responses_write" on inspection_responses for all
  using (
    exists (
      select 1 from inspections i
      where i.id = inspection_id
        and (is_admin() or i.supervisor_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from inspections i
      where i.id = inspection_id
        and (is_admin() or i.supervisor_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: bucket para fotos de incidencias
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', true)
on conflict (id) do nothing;

drop policy if exists "inspection_photos_read" on storage.objects;
create policy "inspection_photos_read" on storage.objects for select
  using (bucket_id = 'inspection-photos');

drop policy if exists "inspection_photos_write" on storage.objects;
create policy "inspection_photos_write" on storage.objects for insert
  with check (bucket_id = 'inspection-photos' and auth.uid() is not null);

drop policy if exists "inspection_photos_update" on storage.objects;
create policy "inspection_photos_update" on storage.objects for update
  using (bucket_id = 'inspection-photos' and auth.uid() is not null);

drop policy if exists "inspection_photos_delete" on storage.objects;
create policy "inspection_photos_delete" on storage.objects for delete
  using (bucket_id = 'inspection-photos' and is_admin());

-- ============================================================================
-- Seed: plantilla de checklist por defecto
-- Cubre todo lo que puede interferir el funcionamiento normal de un local:
-- generador, luces, fríos, pisos, áreas de personal, baños, comedores,
-- oficinas, limpieza y seguridad.
-- ============================================================================
do $$
declare
  sec_id uuid;
begin
  -- Solo sembrar si aún no hay secciones (evita duplicar en re-ejecuciones)
  if exists (select 1 from checklist_sections limit 1) then
    return;
  end if;

  -- 1. Generador y energía de respaldo
  insert into checklist_sections (name, icon, sort_order) values ('Generador y energía de respaldo', 'zap', 1) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Generador enciende correctamente', 'ok_problem', 1),
    (sec_id, 'Nivel de combustible adecuado', 'ok_problem', 2),
    (sec_id, 'Mantenimiento al día (revisión visual)', 'ok_problem', 3),
    (sec_id, 'Tablero eléctrico de respaldo sin alarmas', 'ok_problem', 4);

  -- 2. Iluminación
  insert into checklist_sections (name, icon, sort_order) values ('Iluminación', 'lightbulb', 2) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Luces área de ventas funcionando', 'ok_problem', 1),
    (sec_id, 'Luces de emergencia funcionando', 'ok_problem', 2),
    (sec_id, 'Luces exteriores / estacionamiento', 'ok_problem', 3),
    (sec_id, 'Sin focos fundidos o parpadeando', 'ok_problem', 4),
    (sec_id, 'Letrero / cartel exterior encendido', 'ok_problem', 5);

  -- 3. Frío (Refrigeración)
  insert into checklist_sections (name, icon, sort_order) values ('Frío y refrigeración', 'snowflake', 3) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, unit, min_value, max_value, sort_order) values
    (sec_id, 'Temperatura cámara de frío principal', 'temperature', '°C', -2, 4, 1),
    (sec_id, 'Temperatura congelador', 'temperature', '°C', -18, -15, 2),
    (sec_id, 'Temperatura vitrina refrigerada', 'temperature', '°C', 0, 6, 3);
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Puertas y sellos de cámaras en buen estado', 'ok_problem', 4),
    (sec_id, 'Sin fugas de agua o hielo acumulado', 'ok_problem', 5),
    (sec_id, 'Alarmas de temperatura sin activar', 'ok_problem', 6);

  -- 4. Pisos y superficies
  insert into checklist_sections (name, icon, sort_order) values ('Pisos y superficies', 'layout-grid', 4) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Piso limpio y sin residuos', 'ok_problem', 1),
    (sec_id, 'Piso sin riesgo de resbalones / humedad', 'ok_problem', 2),
    (sec_id, 'Señalización de piso mojado disponible', 'ok_problem', 3),
    (sec_id, 'Piso sin daños, quiebres o desniveles', 'ok_problem', 4);

  -- 5. Áreas de personal
  insert into checklist_sections (name, icon, sort_order) values ('Áreas de personal', 'users', 5) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Casilleros en buen estado', 'ok_problem', 1),
    (sec_id, 'Zona de descanso limpia y ordenada', 'ok_problem', 2),
    (sec_id, 'Elementos de seguridad (EPP) disponibles', 'ok_problem', 3);

  -- 6. Baños clientes
  insert into checklist_sections (name, icon, sort_order) values ('Baños clientes', 'toilet', 6) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Limpieza general', 'ok_problem', 1),
    (sec_id, 'Dispensadores de jabón y papel abastecidos', 'ok_problem', 2),
    (sec_id, 'Grifería y sanitarios sin fugas', 'ok_problem', 3),
    (sec_id, 'Sin malos olores', 'ok_problem', 4);

  -- 7. Baños y camarines de personal
  insert into checklist_sections (name, icon, sort_order) values ('Baños y camarines de personal', 'toilet', 7) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Limpieza general', 'ok_problem', 1),
    (sec_id, 'Dispensadores de jabón y papel abastecidos', 'ok_problem', 2),
    (sec_id, 'Grifería y sanitarios funcionando', 'ok_problem', 3);

  -- 8. Comedor / casino
  insert into checklist_sections (name, icon, sort_order) values ('Comedor / casino', 'utensils', 8) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Limpieza de mesas y superficies', 'ok_problem', 1),
    (sec_id, 'Microondas / hervidor en buen estado', 'ok_problem', 2),
    (sec_id, 'Refrigerador de comedor limpio y funcionando', 'ok_problem', 3);

  -- 9. Oficinas
  insert into checklist_sections (name, icon, sort_order) values ('Oficinas', 'briefcase', 9) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Orden y limpieza general', 'ok_problem', 1),
    (sec_id, 'Equipos (PC, impresoras) funcionando', 'ok_problem', 2),
    (sec_id, 'Climatización funcionando', 'ok_problem', 3);

  -- 10. Limpieza general y exterior
  insert into checklist_sections (name, icon, sort_order) values ('Limpieza general y exterior', 'sparkles', 10) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Basureros vaciados y limpios', 'ok_problem', 1),
    (sec_id, 'Vidrios y vitrinas limpias', 'ok_problem', 2),
    (sec_id, 'Fachada y exterior del local en buen estado', 'ok_problem', 3);
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Observaciones generales', 'text', 4);

  -- 11. Seguridad
  insert into checklist_sections (name, icon, sort_order) values ('Seguridad', 'shield-alert', 11) returning id into sec_id;
  insert into checklist_items (section_id, label, item_type, sort_order) values
    (sec_id, 'Extintores vigentes y accesibles', 'ok_problem', 1),
    (sec_id, 'Salidas de emergencia despejadas', 'ok_problem', 2),
    (sec_id, 'Botiquín de primeros auxilios disponible', 'ok_problem', 3),
    (sec_id, 'Cámaras de seguridad operativas', 'ok_problem', 4);
end $$;
