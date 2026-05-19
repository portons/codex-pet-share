import { useState, type Dispatch, type SetStateAction } from "react";
import { readJson } from "../domain/http";
import { normalizeAvatarUrl } from "../domain/users";
import type { AuthSession, Pet, PetComment, PetCommentsResponse, User } from "../domain/types";

type ApiFetch = (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;

const commentsPageSize = 20;

export function usePetComments({
  apiFetch,
  session,
  user,
  setDetailPet,
  openAuth
}: {
  apiFetch: ApiFetch;
  session: AuthSession | null;
  user: User | null;
  setDetailPet: Dispatch<SetStateAction<Pet | null>>;
  openAuth: () => void;
}) {
  const [comments, setComments] = useState<PetComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsBusy, setCommentsBusy] = useState("");
  const [commentsStatus, setCommentsStatus] = useState("");
  const [commentsMeta, setCommentsMeta] = useState({
    page: 1,
    pageSize: commentsPageSize,
    total: 0,
    totalPages: 0
  });

  function clearComments() {
    setComments([]);
    setCommentsStatus("");
    setCommentsMeta({
      page: 1,
      pageSize: commentsPageSize,
      total: 0,
      totalPages: 0
    });
  }

  async function loadComments(petId: string, page = 1, commentId = "") {
    setCommentsLoading(true);
    setCommentsStatus("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(commentsPageSize)
      });
      if (commentId) {
        params.set("commentId", commentId);
      }
      const body = await readJson<PetCommentsResponse>(
        await apiFetch(`/api/pets/${petId}/comments?${params}`, {}, session)
      );
      const nextComments = body.comments.map(normalizeComment);
      setComments((current) =>
        page === 1 ? nextComments : mergeComments(current, nextComments)
      );
      setCommentsMeta({
        page: body.page,
        pageSize: body.pageSize,
        total: body.total,
        totalPages: body.totalPages
      });
    } catch (error) {
      setCommentsStatus(error instanceof Error ? error.message : "Could not load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment(pet: Pet, body: string) {
    if (!user) {
      openAuth();
      return false;
    }
    const cleanBody = body.trim();
    if (!cleanBody) {
      setCommentsStatus("Write a comment first.");
      return false;
    }
    setCommentsBusy("new");
    setCommentsStatus("");
    try {
      const responseBody = await readJson<{ comment: PetComment; total: number }>(
        await apiFetch(`/api/pets/${pet.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: cleanBody })
        })
      );
      const nextComment = normalizeComment(responseBody.comment);
      setComments((current) => [nextComment, ...current.filter((comment) => comment.id !== nextComment.id)]);
      setCommentsMeta((current) => ({
        ...current,
        total: responseBody.total,
        totalPages: Math.ceil(responseBody.total / current.pageSize)
      }));
      setDetailPet((current) => current?.id === pet.id ? { ...current, commentCount: responseBody.total } : current);
      return true;
    } catch (error) {
      setCommentsStatus(error instanceof Error ? error.message : "Comment failed.");
      return false;
    } finally {
      setCommentsBusy("");
    }
  }

  async function deleteComment(pet: Pet, comment: PetComment) {
    if (!user || commentsBusy) return;
    setCommentsBusy(`delete:${comment.id}`);
    setCommentsStatus("");
    try {
      const body = await readJson<{ ok: true; total: number }>(
        await apiFetch(`/api/pets/${pet.id}/comments/${comment.id}`, {
          method: "DELETE"
        })
      );
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setCommentsMeta((current) => ({
        ...current,
        total: body.total,
        totalPages: Math.ceil(body.total / current.pageSize)
      }));
      setDetailPet((current) => current?.id === pet.id ? { ...current, commentCount: body.total } : current);
    } catch (error) {
      setCommentsStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setCommentsBusy("");
    }
  }

  async function toggleReaction(pet: Pet, comment: PetComment, reaction: string) {
    if (!user) {
      openAuth();
      return;
    }
    if (commentsBusy) return;
    const active = comment.reactions.some((item) => item.reaction === reaction && item.reactedByMe);
    setCommentsBusy(`reaction:${comment.id}:${reaction}`);
    setCommentsStatus("");
    try {
      const body = await readJson<{ comment: PetComment }>(
        await apiFetch(`/api/pets/${pet.id}/comments/${comment.id}/reactions`, {
          method: active ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction })
        })
      );
      setComments((current) => current.map((item) => item.id === comment.id ? normalizeComment(body.comment) : item));
    } catch (error) {
      setCommentsStatus(error instanceof Error ? error.message : "Reaction failed.");
    } finally {
      setCommentsBusy("");
    }
  }

  return {
    comments,
    commentsLoading,
    commentsBusy,
    commentsStatus,
    commentsMeta,
    clearComments,
    loadComments,
    submitComment,
    deleteComment,
    toggleReaction
  };
}

function mergeComments(current: PetComment[], next: PetComment[]) {
  const seen = new Set(current.map((comment) => comment.id));
  return [...current, ...next.filter((comment) => !seen.has(comment.id))];
}

function normalizeComment(comment: PetComment): PetComment {
  return {
    ...comment,
    authorAvatarUrl: normalizeAvatarUrl(comment.authorAvatarUrl)
  };
}
