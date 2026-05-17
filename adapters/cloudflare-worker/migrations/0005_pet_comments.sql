create table if not exists pet_comments (
  id text primary key,
  pet_id text not null references pets(id) on delete cascade,
  author_id text references users(id) on delete set null,
  body text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists pet_comment_reactions (
  comment_id text not null references pet_comments(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  reaction text not null check (reaction in ('heart', 'sparkle', 'laugh', 'party', 'eyes')),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (comment_id, user_id, reaction)
);

create index if not exists pet_comments_pet_created_idx on pet_comments(pet_id, created_at desc);
create index if not exists pet_comments_author_idx on pet_comments(author_id, created_at desc);
create index if not exists pet_comment_reactions_user_idx on pet_comment_reactions(user_id, created_at desc);
