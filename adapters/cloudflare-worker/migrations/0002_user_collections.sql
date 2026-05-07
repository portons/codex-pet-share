alter table collections add column owner_id text references users(id) on delete cascade;

create index if not exists collections_owner_idx on collections(owner_id, created_at desc);
