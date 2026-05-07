create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text,
  display_name text not null,
  handle text not null unique,
  is_admin integer not null default 0,
  shadowbanned_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  refresh_token_hash text not null unique,
  expires_at integer not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists pets (
  id text primary key,
  display_name text not null,
  description text not null,
  spritesheet_path text not null default 'spritesheet.webp',
  kind text not null default 'object',
  owner_id text references users(id) on delete set null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  source text not null check (source in ('upload', 'seed')),
  view_count integer not null default 0,
  download_count integer not null default 0,
  like_count integer not null default 0,
  tags_json text not null default '[]',
  validation_report_json text
);

create table if not exists pet_likes (
  pet_id text not null references pets(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (pet_id, user_id)
);

create table if not exists pet_stat_events (
  pet_id text not null references pets(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'download')),
  visitor_key text not null,
  period_start text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (pet_id, event_type, visitor_key, period_start)
);

create table if not exists collections (
  slug text primary key,
  display_name text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists collection_pets (
  collection_slug text not null references collections(slug) on delete cascade,
  pet_id text not null references pets(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (collection_slug, pet_id)
);

create table if not exists playground_rooms (
  id text primary key,
  host_id text not null references users(id) on delete cascade,
  host_pet_id text references pets(id) on delete set null,
  display_name text,
  collection_slug text references collections(slug) on delete set null,
  world_state_json text not null default '{"trampolines":[],"npcs":[]}',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  closed_at text
);

create table if not exists playground_room_bans (
  room_id text not null references playground_rooms(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (room_id, user_id)
);

create table if not exists admin_audit_events (
  id integer primary key autoincrement,
  actor_id text references users(id) on delete set null,
  actor_email text not null,
  action text not null,
  target_user_id text,
  target_user_email text,
  target_pet_id text,
  metadata_json text not null default '{}',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists users_email_idx on users(email);
create index if not exists users_handle_idx on users(handle);
create index if not exists pets_owner_created_idx on pets(owner_id, created_at desc, display_name asc);
create index if not exists pets_created_idx on pets(created_at desc, display_name asc);
create index if not exists pets_kind_created_idx on pets(kind, created_at desc, display_name asc);
create index if not exists pet_likes_user_created_idx on pet_likes(user_id, created_at desc);
create index if not exists collection_pets_pet_idx on collection_pets(pet_id);
create index if not exists rooms_open_host_idx on playground_rooms(status, host_id, created_at desc);
create index if not exists room_bans_user_idx on playground_room_bans(user_id);
create index if not exists audit_created_idx on admin_audit_events(created_at desc);
