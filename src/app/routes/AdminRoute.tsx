import { Suspense, lazy } from "react";
import { Spinner } from "../../ui/Spinner";
import type { AppRoutesProps } from "../AppRoutes.types";

const AdminPage = lazy(() =>
  import("../../admin/AdminPage").then((module) => ({ default: module.AdminPage }))
);

export function AdminRoute({
  user,
  adminCollections,
  adminCollectionsLoading,
  adminCollectionBusySlug,
  adminModerationBusy,
  adminStatus,
  setAdminUserShadowban,
  removeAdminUser,
  createCollection,
  updateCollection,
  deleteCollection
}: AppRoutesProps) {
  return (
    <Suspense fallback={<section className="adminPage"><Spinner size={20} /></section>}>
      <AdminPage
        user={user}
        collections={adminCollections}
        loading={adminCollectionsLoading}
        busySlug={adminCollectionBusySlug}
        moderationBusy={adminModerationBusy}
        status={adminStatus}
        onShadowbanUser={(emailOrId) => setAdminUserShadowban(emailOrId, true)}
        onUnshadowbanUser={(emailOrId) => setAdminUserShadowban(emailOrId, false)}
        onRemoveUser={removeAdminUser}
        onCreateCollection={createCollection}
        onUpdateCollection={updateCollection}
        onDeleteCollection={deleteCollection}
      />
    </Suspense>
  );
}
