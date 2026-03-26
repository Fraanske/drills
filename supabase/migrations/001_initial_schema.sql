create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'coach', 'viewer')) default 'coach',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  one_liner text not null default '',
  explanation text not null default '',
  setup text not null default '',
  flow_steps text not null default '',
  coaching_points text not null default '',
  variations text not null default '',
  players_needed text,
  court_area text not null check (court_area in ('half_court', 'full_court', 'small_side')) default 'half_court',
  age_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  unique (workspace_id, name)
);

create table if not exists public.drill_tags (
  drill_id uuid not null references public.drills(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (drill_id, tag_id)
);

create table if not exists public.diagrams (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid not null references public.drills(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default 'Main diagram',
  court_type text not null check (court_type in ('half_court', 'full_court')) default 'full_court',
  data_json jsonb not null default '{"courtType":"full_court","objects":[]}'::jsonb,
  preview_image_path text,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.drills enable row level security;
alter table public.tags enable row level security;
alter table public.drill_tags enable row level security;
alter table public.diagrams enable row level security;

create policy "users can view their own workspaces"
  on public.workspaces
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can view their own memberships"
  on public.workspace_members
  for select
  using (user_id = auth.uid());

create policy "users can view drills in their workspaces"
  on public.drills
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = drills.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can insert drills in their workspaces"
  on public.drills
  for insert
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = drills.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can update drills in their workspaces"
  on public.drills
  for update
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = drills.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = drills.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can delete drills in their workspaces"
  on public.drills
  for delete
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = drills.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can view tags in their workspaces"
  on public.tags
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = tags.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can manage tags in their workspaces"
  on public.tags
  for all
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = tags.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = tags.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can view drill tags in their workspaces"
  on public.drill_tags
  for select
  using (
    exists (
      select 1
      from public.drills d
      join public.workspace_members wm
        on wm.workspace_id = d.workspace_id
      where d.id = drill_tags.drill_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can manage drill tags in their workspaces"
  on public.drill_tags
  for all
  using (
    exists (
      select 1
      from public.drills d
      join public.workspace_members wm
        on wm.workspace_id = d.workspace_id
      where d.id = drill_tags.drill_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.drills d
      join public.workspace_members wm
        on wm.workspace_id = d.workspace_id
      where d.id = drill_tags.drill_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can view diagrams in their workspaces"
  on public.diagrams
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = diagrams.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "users can manage diagrams in their workspaces"
  on public.diagrams
  for all
  using (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = diagrams.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = diagrams.workspace_id
        and wm.user_id = auth.uid()
    )
  );
