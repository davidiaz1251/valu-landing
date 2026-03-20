# Valu Landing (Astro + Supabase)

Landing de Valu Kraft con login, roles y descargas de plantillas usando Supabase.

## Incluye

- `/login` (email/password + Google)
- `/registro`
- `/olvide-contrasena`
- `/plantillas` con control por rol
- Descarga de archivos con signed URLs desde bucket `templates`
- Registro de descargas en tabla `downloads`

## Variables de entorno

```bash
cp .env.example .env
```

Completar:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

## Estructura esperada en Supabase

### Tabla `profiles`

- `id uuid primary key` (igual a `auth.users.id`)
- `email text`
- `full_name text`
- `role text` (`cliente_final` | `profesional_reposteria` | `admin`)
- `active boolean default true`

### Tabla `downloads`

- `id bigint generated`
- `user_id uuid`
- `template_id text`
- `created_at timestamptz default now()`

### Bucket Storage

- Bucket: `templates`
- Los `storagePath` de `src/data/templates.ts` deben existir ahí.

## SQL base (ejecutar en Supabase SQL Editor)

```sql
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  role text not null default 'cliente_final',
  active boolean not null default true
);

create table if not exists public.downloads (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  template_id text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.downloads enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "downloads_insert_own" on public.downloads
for insert to authenticated
with check (auth.uid() = user_id);

create policy "downloads_select_own" on public.downloads
for select to authenticated
using (auth.uid() = user_id);
```

## Storage policy base

```sql
insert into storage.buckets (id, name, public)
values ('templates', 'templates', false)
on conflict (id) do nothing;

create policy "templates_read_authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'templates');
```

## Comandos

```bash
npm install
npm run dev
npm run build
```
