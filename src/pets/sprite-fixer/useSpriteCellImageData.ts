import { useEffect, useState } from "react";
import { spriteCellHeight, spriteCellWidth } from "../../domain/config";
import { fetchPetPackageSpritesheet } from "../../uploads/uploadAssets";

export function useSpriteCellImageData(downloadUrl: string, row: number, frame: number) {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setImageData(null);
    setLoading(true);
    setError("");

    async function loadCell() {
      try {
        const spritesheet = await fetchPetPackageSpritesheet(downloadUrl);
        objectUrl = URL.createObjectURL(spritesheet);
        const image = new Image();
        image.decoding = "async";
        image.src = objectUrl;
        await image.decode();
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = spriteCellWidth;
        canvas.height = spriteCellHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Could not read sprite pixels.");
        }
        context.imageSmoothingEnabled = false;
        context.drawImage(
          image,
          frame * spriteCellWidth,
          row * spriteCellHeight,
          spriteCellWidth,
          spriteCellHeight,
          0,
          0,
          spriteCellWidth,
          spriteCellHeight
        );
        setImageData(context.getImageData(0, 0, spriteCellWidth, spriteCellHeight));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load sprite pixels.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCell();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [downloadUrl, frame, row]);

  return { imageData, loading, error };
}
