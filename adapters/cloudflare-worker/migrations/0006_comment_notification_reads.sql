create table if not exists comment_notification_reads (
  user_id text not null references users(id) on delete cascade,
  comment_id text not null references pet_comments(id) on delete cascade,
  read_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  primary key (user_id, comment_id)
);

create index if not exists comment_notification_reads_user_idx on comment_notification_reads(user_id, read_at desc);
create index if not exists pet_comments_owner_feed_idx on pet_comments(pet_id, created_at desc, id desc);
