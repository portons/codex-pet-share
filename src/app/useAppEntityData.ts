import { useState } from "react";
import type { AdminCollection } from "../admin/AdminPage";
import { defaultPageSize, randomRequestToken } from "../domain/config";
import { readJson } from "../domain/http";
import { normalizePet } from "../domain/pets";
import type {
  AuthSession,
  CollectionDetailResponse,
  CollectionsResponse,
  CollectionSummary,
  ContentMode,
  Creator,
  CreatorLeaderboardItem,
  CreatorPetsResponse,
  CreatorsLeaderboardResponse,
  GalleryMeta,
  GalleryResponse,
  GallerySort,
  GalleryView,
  Pet,
  PetKind,
  Route,
  User
} from "../domain/types";

type ApiFetch = (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;

type LoadGallery = (
  query: string,
  tags: string[],
  sort: GallerySort,
  page: number,
  authSession: AuthSession | null,
  content: ContentMode,
  view: GalleryView,
  kind: PetKind
) => Promise<void>;

export function useAppEntityData({
  apiFetch,
  session,
  user,
  route,
  query,
  activeTags,
  activeSort,
  activeView,
  activeKind,
  contentMode,
  galleryMeta,
  loadGallery
}: {
  apiFetch: ApiFetch;
  session: AuthSession | null;
  user: User | null;
  route: Route;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  contentMode: ContentMode;
  galleryMeta: GalleryMeta;
  loadGallery: LoadGallery;
}) {
  const [minePets, setMinePets] = useState<Pet[]>([]);
  const [favoritePets, setFavoritePets] = useState<Pet[]>([]);
  const [detailPet, setDetailPet] = useState<Pet | null>(null);
  const [morePets, setMorePets] = useState<Array<Pet>>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [creatorPets, setCreatorPets] = useState<Pet[]>([]);
  const [creatorMeta, setCreatorMeta] = useState<GalleryMeta>({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
    totalPages: 0
  });
  const [creators, setCreators] = useState<CreatorLeaderboardItem[]>([]);
  const [creatorsTotal, setCreatorsTotal] = useState(0);
  const [collections, setCollections] = useState<Array<CollectionSummary>>([]);
  const [adminCollections, setAdminCollections] = useState<Array<AdminCollection>>([]);
  const [collectionDetail, setCollectionDetail] = useState<Omit<CollectionSummary, "topPets"> | null>(null);
  const [collectionPets, setCollectionPets] = useState<Array<Pet>>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mineLoading, setMineLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [adminCollectionsLoading, setAdminCollectionsLoading] = useState(false);
  const [collectionDetailLoading, setCollectionDetailLoading] = useState(false);

  async function loadMine(currentUser = user, authSession = session) {
    if (!currentUser) {
      setMinePets([]);
      return;
    }
    setMineLoading(true);
    try {
      const body = await readJson<{ pets: Pet[] }>(await apiFetch("/api/pets/mine", {}, authSession));
      setMinePets(body.pets.map(normalizePet));
    } finally {
      setMineLoading(false);
    }
  }

  async function loadFavorites(currentUser = user, authSession = session) {
    if (!currentUser) {
      setFavoritePets([]);
      return;
    }
    setFavoritesLoading(true);
    try {
      const body = await readJson<{ pets: Pet[] }>(await apiFetch("/api/pets/favorites", {}, authSession));
      setFavoritePets(body.pets.map(normalizePet));
    } finally {
      setFavoritesLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    setMorePets([]);
    try {
      const randomParams = new URLSearchParams({
        page: "1",
        pageSize: "6",
        sort: "random",
        random: randomRequestToken()
      });
      if (contentMode === "all") {
        randomParams.set("content", "all");
      }
      const [body, randomBody] = await Promise.all([
        readJson<{ pet: Pet }>(await apiFetch(`/api/pets/${id}`)),
        readJson<GalleryResponse>(await apiFetch(`/api/pets?${randomParams}`))
      ]);
      setDetailPet(normalizePet(body.pet));
      setMorePets(randomBody.pets.map(normalizePet).filter((pet) => pet.id !== id).slice(0, 3));
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadCreator(id: string, page = creatorMeta.page, authSession = session, content = contentMode) {
    setCreatorLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(creatorMeta.pageSize));
      if (content === "all") {
        params.set("content", "all");
      }
      const body = await readJson<CreatorPetsResponse>(await apiFetch(`/api/users/${id}/pets?${params}`, {}, authSession));
      setCreator(body.user);
      setCreatorPets(body.pets.map(normalizePet));
      setCreatorMeta({
        page: body.page,
        pageSize: body.pageSize,
        total: body.total,
        totalPages: body.totalPages
      });
    } finally {
      setCreatorLoading(false);
    }
  }

  async function loadCreators(authSession = session, content = contentMode) {
    setCreatorsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "25");
      if (content === "all") {
        params.set("content", "all");
      }
      const body = await readJson<CreatorsLeaderboardResponse>(await apiFetch(`/api/creators/leaderboard?${params}`, {}, authSession));
      setCreators(body.creators.map((creator) => ({
        ...creator,
        topPets: creator.topPets.map(normalizePet)
      })));
      setCreatorsTotal(body.total);
    } finally {
      setCreatorsLoading(false);
    }
  }

  async function loadCollections(authSession = session, content = contentMode) {
    setCollectionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (content === "all") {
        params.set("content", "all");
      }
      const suffix = params.toString() ? `?${params}` : "";
      const body = await readJson<CollectionsResponse>(await apiFetch(`/api/collections${suffix}`, {}, authSession));
      setCollections(body.collections.map((collection) => ({
        ...collection,
        topPets: collection.topPets.map(normalizePet)
      })));
    } finally {
      setCollectionsLoading(false);
    }
  }

  async function loadCollectionDetail(slug: string, authSession = session, content = contentMode) {
    setCollectionDetailLoading(true);
    try {
      const params = new URLSearchParams();
      if (content === "all") {
        params.set("content", "all");
      }
      const suffix = params.toString() ? `?${params}` : "";
      const body = await readJson<CollectionDetailResponse>(await apiFetch(`/api/collections/${slug}${suffix}`, {}, authSession));
      setCollectionDetail(body.collection);
      setCollectionPets(body.pets.map(normalizePet));
    } finally {
      setCollectionDetailLoading(false);
    }
  }

  async function loadAdminCollections(authSession = session, currentUser = user) {
    if (!currentUser?.isAdmin) {
      setAdminCollections([]);
      return;
    }
    setAdminCollectionsLoading(true);
    try {
      const body = await readJson<{ collections: Array<AdminCollection> }>(
        await apiFetch("/api/admin/collections", {}, authSession)
      );
      setAdminCollections(body.collections);
    } finally {
      setAdminCollectionsLoading(false);
    }
  }

  async function refreshPrimaryPetLists(authSession = session, currentUser = user) {
    await Promise.all([
      loadGallery(query, activeTags, activeSort, galleryMeta.page, authSession, contentMode, activeView, activeKind),
      loadMine(currentUser, authSession),
      loadFavorites(currentUser, authSession)
    ]);
  }

  async function refreshRoutePetLists(authSession = session, currentUser = user) {
    const refreshes: Array<Promise<void>> = [
      loadGallery(query, activeTags, activeSort, galleryMeta.page, authSession, contentMode, activeView, activeKind)
    ];
    if (currentUser) {
      refreshes.push(loadMine(currentUser, authSession), loadFavorites(currentUser, authSession));
    }
    if (route.name === "user") {
      refreshes.push(loadCreator(route.id, creatorMeta.page, authSession, contentMode));
    }
    if (route.name === "creators") {
      refreshes.push(loadCreators(authSession, contentMode));
    }
    if (route.name === "collections") {
      refreshes.push(loadCollections(authSession, contentMode));
    }
    if (route.name === "collection") {
      refreshes.push(loadCollectionDetail(route.slug, authSession, contentMode));
    }
    await Promise.all(refreshes);
  }

  return {
    minePets,
    setMinePets,
    favoritePets,
    setFavoritePets,
    detailPet,
    setDetailPet,
    morePets,
    creator,
    setCreator,
    creatorPets,
    setCreatorPets,
    creatorMeta,
    setCreatorMeta,
    creators,
    creatorsTotal,
    collections,
    setCollections,
    adminCollections,
    setAdminCollections,
    collectionDetail,
    setCollectionDetail,
    collectionPets,
    setCollectionPets,
    detailLoading,
    mineLoading,
    favoritesLoading,
    creatorLoading,
    creatorsLoading,
    collectionsLoading,
    adminCollectionsLoading,
    collectionDetailLoading,
    loadMine,
    loadFavorites,
    loadDetail,
    loadCreator,
    loadCreators,
    loadCollections,
    loadCollectionDetail,
    loadAdminCollections,
    refreshPrimaryPetLists,
    refreshRoutePetLists
  };
}
