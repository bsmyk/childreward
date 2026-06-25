-- Supabase schema for the parent/kid reward app.
--
-- The server talks to Postgres with the service-role key, which bypasses Row
-- Level Security. RLS is enabled on every table as defense-in-depth so that
-- anything reaching these tables with the anon/auth key (e.g. the browser) is
-- denied by default until explicit policies are added.
--
-- Apply with: psql "$SUPABASE_DB_URL" -f supabase/schema.sql
-- (or paste into the Supabase SQL editor).

-- gen_random_uuid() lives in pgcrypto.
create extension if not exists pgcrypto;

-- profiles -----------------------------------------------------------------
-- One row per Supabase Auth user. role drives parent/kid access; stars is the
-- kid's reward balance.
create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('parent', 'kid')),
  display_name text,
  family_id    uuid,
  stars        int  not null default 0,
  created_at   timestamptz not null default now()
);

-- todos --------------------------------------------------------------------
create table if not exists todos (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  done       boolean not null default false,
  owner_id   uuid references profiles (id) on delete set null,
  family_id  uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- rewards ------------------------------------------------------------------
create table if not exists rewards (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,
  cost       int  not null default 0,
  family_id  uuid,
  created_at timestamptz not null default now()
);

-- redemptions --------------------------------------------------------------
-- A kid spending stars on a reward.
create table if not exists redemptions (
  id         uuid primary key default gen_random_uuid(),
  reward_id  uuid references rewards (id) on delete cascade,
  profile_id uuid references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Row Level Security (defense-in-depth; server uses the service role key) ---
alter table profiles    enable row level security;
alter table todos       enable row level security;
alter table rewards     enable row level security;
alter table redemptions enable row level security;
