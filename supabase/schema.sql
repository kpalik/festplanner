-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin', 'superadmin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FESTIVALS
create table public.festivals (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  image_url text,
  website_url text,
  is_public boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- STAGES
create table public.stages (
  id uuid default uuid_generate_v4() primary key,
  festival_id uuid references public.festivals(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- BANDS
create table public.bands (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  bio text,
  origin_country text,
  image_url text,
  website_url text,
  spotify_url text,
  apple_music_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SHOWS (Performances)
create table public.shows (
  id uuid default uuid_generate_v4() primary key,
  festival_id uuid references public.festivals(id) on delete cascade not null,
  stage_id uuid references public.stages(id) on delete cascade not null,
  band_id uuid references public.bands(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status text default 'draft' check (status in ('draft', 'published')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRIPS
create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  festival_id uuid references public.festivals(id) on delete cascade not null,
  name text not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRIP MEMBERS
create table public.trip_members (
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'invited' check (status in ('invited', 'joined', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (trip_id, user_id)
);

-- RLS POLICIES (Basic Setup)
alter table public.profiles enable row level security;
alter table public.festivals enable row level security;
alter table public.stages enable row level security;
alter table public.bands enable row level security;
alter table public.shows enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

-- Public read access for published festivals/shows (refining later)
create policy "Public festivals are viewable by everyone" on public.festivals for select using (is_public = true);
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
