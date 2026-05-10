import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { AdminCollection, CollectionDraft } from "../admin/AdminPage";
import type { TagName } from "../domain/config";
import type {
  AuthSession,
  CollectionSummary,
  ContentMode,
  Creator,
  CreatorLeaderboardSort,
  CreatorLeaderboardItem,
  EditablePetKind,
  EntityShareTarget,
  GalleryMeta,
  GallerySort,
  GalleryView,
  Pet,
  PetKind,
  Route,
  UploadState,
  User
} from "../domain/types";

type SetState<T> = Dispatch<SetStateAction<T>>;

export type AppRoutesProps = {
  route: Route;
  user: User | null;
  session: AuthSession | null;
  pets: Pet[];
  galleryMeta: GalleryMeta;
  loading: boolean;
  query: string;
  activeTags: string[];
  activeSort: GallerySort;
  activeView: GalleryView;
  activeKind: PetKind;
  contentMode: ContentMode;
  deletingPetId: string;
  shadowbanBusyOwnerId: string;
  nsfwBusyId: string;
  collections: CollectionSummary[];
  userCollections: CollectionSummary[];
  userCollectionsLoading: boolean;
  setQuery: SetState<string>;
  selectTag: (tag: TagName) => void | Promise<void>;
  clearTags: () => void | Promise<void>;
  selectSort: (sort: GallerySort) => void | Promise<void>;
  selectView: (view: GalleryView) => void | Promise<void>;
  selectKind: (kind: PetKind) => void | Promise<void>;
  selectPage: (page: number) => void | Promise<void>;
  randomizeGallery: () => void | Promise<void>;
  freshPetCount: number;
  showFreshPets: () => void | Promise<void>;
  submitSearch: (event: FormEvent) => void | Promise<void>;
  likeBusyId: string;
  toggleLike: (pet: Pet) => void | Promise<void>;
  setSharingPet: SetState<Pet | null>;
  setPlaygroundPet: SetState<Pet | null>;
  setDownloadPet: SetState<Pet | null>;
  selectVisibleTag: (tag: TagName, sourceTags: string[]) => void | Promise<void>;
  openTagEditor: (pet: Pet) => void;
  openCollectionEditor: (pet: Pet) => void | Promise<void>;
  openPetCollector: (pet: Pet) => void | Promise<void>;
  openCollectionCreator: () => void | Promise<void>;
  openUserCollectionEditor: (collection: CollectionSummary) => void | Promise<void>;
  openCollectionPetAdder: (collection: Omit<CollectionSummary, "topPets">) => void | Promise<void>;
  deleteUserCollection: (collection: CollectionSummary) => void | Promise<void>;
  removePetFromUserCollection: (collection: Omit<CollectionSummary, "topPets">, pet: Pet) => void | Promise<void>;
  startUserCollectionRoom: (collection: Omit<CollectionSummary, "topPets"> & { topPets?: CollectionSummary["topPets"] }, petId?: string) => void | Promise<void>;
  togglePetNsfw: (pet: Pet) => void | Promise<void>;
  toggleOwnerShadowban: (pet: Pet) => void | Promise<void>;
  deleteUpload: (pet: Pet) => void | Promise<void>;
  openAuth: () => void;
  favoritePets: Pet[];
  favoritesLoading: boolean;
  minePets: Pet[];
  mineLoading: boolean;
  deleteStatus: string;
  uploadState: UploadState;
  uploadStatus: string;
  uploadBusy: boolean;
  setUploadState: SetState<UploadState>;
  setUploadStatus: SetState<string>;
  submitUpload: (event: FormEvent) => void | Promise<void>;
  creators: CreatorLeaderboardItem[];
  creatorsMeta: GalleryMeta;
  creatorsSort: CreatorLeaderboardSort;
  creatorsQuery: string;
  creatorsLoading: boolean;
  collectionsLoading: boolean;
  setAuthMode: SetState<"login" | "register">;
  setSharingEntity: SetState<EntityShareTarget | null>;
  collectionDetail: Omit<CollectionSummary, "topPets"> | null;
  collectionPets: Pet[];
  collectionMeta: GalleryMeta;
  collectionDetailLoading: boolean;
  adminCollections: AdminCollection[];
  adminCollectionsLoading: boolean;
  adminCollectionBusySlug: string;
  adminModerationBusy: boolean;
  adminStatus: string;
  setAdminUserShadowban: (emailOrId: string, shadowbanned: boolean) => void | Promise<void>;
  removeAdminUser: (emailOrId: string) => void | Promise<void>;
  createCollection: (draft: CollectionDraft) => void | Promise<void>;
  updateCollection: (slug: string, draft: CollectionDraft) => void | Promise<void>;
  deleteCollection: (collection: AdminCollection) => void | Promise<void>;
  creator: Creator | null;
  creatorPets: Pet[];
  creatorMeta: GalleryMeta;
  creatorLoading: boolean;
  selectCreatorPage: (page: number) => void | Promise<void>;
  selectCreatorsPage: (page: number) => void | Promise<void>;
  selectCreatorsSort: (sort: CreatorLeaderboardSort) => void | Promise<void>;
  selectCreatorsQuery: (query: string) => void | Promise<void>;
  selectCollectionPage: (page: number) => void | Promise<void>;
  detailLoading: boolean;
  detailPet: Pet | null;
  morePets: Pet[];
  openTagKind?: (kind: EditablePetKind) => void;
};
