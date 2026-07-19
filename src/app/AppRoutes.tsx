import { LegalPage } from "../legal/LegalPage";
import { AdminRoute } from "./routes/AdminRoute";
import { CollectionRoute, CollectionsRoute } from "./routes/CollectionRoutes";
import { CreatorRoute, CreatorsRoute } from "./routes/CreatorRoutes";
import { DetailRoute } from "./routes/DetailRoute";
import { FavoritesRoute, GalleryRoute } from "./routes/GalleryRoutes";
import { MineRoute, UploadRoute } from "./routes/UploadRoutes";
import type { AppRoutesProps } from "./AppRoutes.types";

export function AppRoutes(props: AppRoutesProps) {
  const { route } = props;
  return (
    <>
      {route.name === "gallery" && <GalleryRoute {...props} />}

      {route.name === "favorites" && <FavoritesRoute {...props} />}

      {route.name === "mine" && <MineRoute {...props} />}

      {route.name === "upload" && <UploadRoute {...props} />}

      {route.name === "creators" && <CreatorsRoute {...props} />}

      {route.name === "collections" && <CollectionsRoute {...props} />}

      {route.name === "collection" && <CollectionRoute {...props} />}

      {route.name === "admin" && <AdminRoute {...props} />}

      {route.name === "legal" && <LegalPage page={route.page} />}

      {route.name === "user" && <CreatorRoute {...props} />}

      {route.name === "detail" && <DetailRoute {...props} />}
    </>
  );
}
