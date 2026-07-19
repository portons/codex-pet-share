import { type CSSProperties } from "react";
import { formatDate } from "../../domain/format";
import type { GalleryRecentComment } from "../../domain/types";
import { Icon } from "../../ui/Icon";
import { UserAvatar } from "../../ui/UserAvatar";

export function DiscussionContextRail({
  comments,
  loading
}: {
  comments: GalleryRecentComment[];
  loading: boolean;
}) {
  if (loading && comments.length === 0) {
    return null;
  }

  return (
    <aside className="discussionRail" aria-label="Recent comments">
      <div className="discussionRailIntro">
        <span className="discussionRailKicker">
          <Icon name="comment" size={13} />
          Recent comments
        </span>
      </div>
      <RecentCommentList comments={comments} />
    </aside>
  );
}

function RecentCommentList({ comments }: { comments: GalleryRecentComment[] }) {
  if (!comments.length) {
    return <p className="discussionEmpty">No recent comments match these filters.</p>;
  }

  return (
    <ol className="recentCommentList">
      {comments.map((comment, index) => {
        const commentHref = `#/pets/${comment.petId}?comment=${encodeURIComponent(comment.id)}`;
        const petHref = `#/pets/${comment.petId}`;
        const authorHref = comment.authorId ? `#/users/${comment.authorHandle || comment.authorId}` : "";
        return (
          <li
            key={comment.id}
            className="recentCommentItem"
            style={{ "--discussion-index": index } as CSSProperties}
          >
            <div className="recentCommentMain">
              <a className="recentCommentPreview" href={petHref} aria-label={`Open ${comment.petDisplayName}`}>
                <img src={comment.petPosterUrl} alt="" loading="lazy" decoding="async" />
              </a>
              <div className="recentCommentBody">
                <span className="recentCommentPetContext">
                  <span>Pet discussed</span>
                  <a className="recentCommentPet" href={petHref}>{comment.petDisplayName}</a>
                </span>
                <a className="recentCommentText" href={commentHref}>{comment.body}</a>
              </div>
            </div>
            <span className="recentCommentMeta">
              <span className="recentCommentAuthor">
                <UserAvatar name={comment.authorName} avatarUrl={comment.authorAvatarUrl} size="sm" />
                {authorHref ? (
                  <a href={authorHref}>{comment.authorName}</a>
                ) : (
                  <span>{comment.authorName}</span>
                )}
              </span>
              <span>{formatDate(comment.createdAt)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
