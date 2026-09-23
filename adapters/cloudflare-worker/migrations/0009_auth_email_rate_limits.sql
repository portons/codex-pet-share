create table if not exists auth_email_rate_limits (
  scope text not null,
  subject_hash text not null,
  window_started_at integer not null,
  request_count integer not null check (request_count >= 1),
  expires_at integer not null,
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (scope, subject_hash)
);

create index if not exists auth_email_rate_limits_expiry_idx
  on auth_email_rate_limits(expires_at);
