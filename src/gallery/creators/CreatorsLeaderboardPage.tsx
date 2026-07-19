import { useEffect, useState, type FormEvent } from "react";
import { formatMetric } from "../../domain/format";
import type { CreatorLeaderboardItem, CreatorLeaderboardSort, GalleryMeta } from "../../domain/types";
import { EmptyState } from "../../ui/EmptyState";
import { Icon } from "../../ui/Icon";
import { UploadsSkeleton } from "../../ui/Skeletons";
import { PaginationControls } from "../PaginationControls";
import { CreatorFeatureCard, CreatorRankRow } from "./CreatorRankCards";
import { leaderboardModes, leaderboardModesById } from "./leaderboard-modes";

export function CreatorsLeaderboardPage({
  creators,
  meta,
  mode,
  query,
  loading,
  onMode,
  onQuery,
  onPage
}: {
  creators: CreatorLeaderboardItem[];
  meta: GalleryMeta;
  mode: CreatorLeaderboardSort;
  query: string;
  loading: boolean;
  onMode: (mode: CreatorLeaderboardSort) => void;
  onQuery: (query: string) => void;
  onPage: (page: number) => void;
}) {
  const [draftQuery, setDraftQuery] = useState(query);
  const activeMode = leaderboardModesById[mode];
  const rankedPageCreators = creators.map((creator, index) => ({
    creator,
    rank: creatorAbsoluteRank(meta, index)
  }));
  const featuredCreators = rankedPageCreators.filter((item) => item.rank <= 3);
  const rankedCreators = rankedPageCreators.filter((item) => item.rank > 3);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQuery(draftQuery);
  }

  function clearQuery() {
    setDraftQuery("");
    onQuery("");
  }

  return (
    <section className="surface creatorLeaderboardSurface">
      <header className="sectionHeader creatorLeaderboardHeader">
        <div>
          <p className="metaText">Creators</p>
          <h1>Leaderboard</h1>
          <p className="sectionSubhead">
            {formatMetric(meta.total)} {meta.total === 1 ? "creator" : "creators"} · sorted by {activeMode.label.toLowerCase()}
            {meta.totalPages > 1 ? ` · page ${meta.page} of ${meta.totalPages}` : ""}
          </p>
        </div>
        <div className="creatorLeaderboardActions">
          <form className="creatorSearchForm" onSubmit={submitQuery}>
            <label className="searchShell creatorSearchShell">
              <Icon name="search" size={15} />
              <input
                className="input inputLg searchInput"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search creators"
                aria-label="Search creators"
              />
            </label>
            {query ? (
              <button className="btn" type="button" disabled={loading} onClick={clearQuery}>
                Clear
              </button>
            ) : null}
            <button className="btn btnPrimary" type="submit" disabled={loading}>
              Find
            </button>
          </form>
          <div className="creatorLeaderboardToolbar" aria-label="Leaderboard sort">
            {leaderboardModes.map((item) => (
              <button
                className={item.id === mode ? "active" : ""}
                key={item.id}
                type="button"
                aria-pressed={item.id === mode}
                onClick={() => onMode(item.id)}
              >
                <Icon name={item.icon} size={13} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {loading ? (
        <UploadsSkeleton />
      ) : creators.length ? (
        <div className="creatorLeaderboardBoard">
          <div className="creatorTopPagination">
            <PaginationControls meta={meta} loading={loading} onPage={onPage} />
          </div>
          {featuredCreators.length ? (
            <div className="creatorTopThree" aria-label="Featured creators">
              {featuredCreators.map(({ creator, rank }) => (
                <CreatorFeatureCard
                  creator={creator}
                  key={creator.id}
                  mode={mode}
                  rank={rank}
                />
              ))}
            </div>
          ) : null}

          {rankedCreators.length ? (
            <div className="creatorRankList" aria-label="Creator rankings">
              {rankedCreators.map(({ creator, rank }) => (
                <CreatorRankRow creator={creator} key={creator.id} mode={mode} rank={rank} />
              ))}
            </div>
          ) : null}
          <PaginationControls meta={meta} loading={loading} onPage={onPage} />
        </div>
      ) : (
        <EmptyState text={query ? "No creators match that search." : "No creators yet."} />
      )}
    </section>
  );
}

function creatorAbsoluteRank(meta: GalleryMeta, index: number) {
  return (meta.page - 1) * meta.pageSize + index + 1;
}
