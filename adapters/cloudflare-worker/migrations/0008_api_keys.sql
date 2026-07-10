create table if not exists api_keys (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at text,
  revoked_at text
);

create index if not exists api_keys_user_idx on api_keys(user_id, created_at desc);
