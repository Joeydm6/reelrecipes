-- Recipes schema with RLS policies
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  image_url text,
  source_url text,
  servings int,
  prep_min int,
  cook_min int,
  calories int,
  tags text[] default '{}',
  rating int,
  favorite boolean default false,
  ingredients_json jsonb,
  steps_json jsonb,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

alter table public.recipes enable row level security;

-- Ensure column exists when table already present
alter table public.recipes add column if not exists source_url text;

-- Allow authenticated owners to manage their rows
drop policy if exists "Recipes owners can view" on public.recipes;
create policy "Recipes owners can view" on public.recipes
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "Recipes owners can insert" on public.recipes;
create policy "Recipes owners can insert" on public.recipes
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Recipes owners can update" on public.recipes;
create policy "Recipes owners can update" on public.recipes
  for update using (user_id is null or auth.uid() = user_id);

drop policy if exists "Recipes owners can delete" on public.recipes;
create policy "Recipes owners can delete" on public.recipes
  for delete using (user_id is null or auth.uid() = user_id);

-- Optional: allow anon read if desired
drop policy if exists "Anon can view recipes" on public.recipes;
create policy "Anon can view recipes" on public.recipes
  for select using (true);