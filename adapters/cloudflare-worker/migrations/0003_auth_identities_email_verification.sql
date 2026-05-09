alter table users add column email_verified_at text;

update users
set email_verified_at = created_at
where email_verified_at is null;

create table if not exists auth_identities (
  provider text not null check (provider in ('google', 'x')),
  provider_user_id text not null,
  user_id text not null references users(id) on delete cascade,
  email text not null,
  email_verified_at text,
  display_name text,
  avatar_url text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (provider, provider_user_id),
  unique (provider, user_id)
);

create table if not exists email_verification_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at integer not null,
  consumed_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists auth_login_codes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  code_hash text not null unique,
  expires_at integer not null,
  consumed_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists auth_identities_user_idx on auth_identities(user_id);
create index if not exists email_verification_tokens_user_idx on email_verification_tokens(user_id, created_at desc);
create index if not exists auth_login_codes_user_idx on auth_login_codes(user_id, created_at desc);
