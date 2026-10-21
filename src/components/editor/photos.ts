import { createClient } from "@/lib/supabase/client";

const BUCKET = "invitation-photos";
const MAX_SIDE = 1600;

/** Downscales and re-encodes as WebP so uploads stay small and fast for guests. */
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process this image."))), "image/webp", 0.82),
  );
}

/** Uploads to `{userId}/{invitationId}/{uuid}.webp` and returns that storage path. */
export async function uploadPhoto(file: File, userId: string, invitationId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 20 * 1024 * 1024) throw new Error("That image is too large (20 MB max).");
  const blob = await toWebp(file);
  const path = `${userId}/${invitationId}/${crypto.randomUUID()}.webp`;
  const { error } = await createClient().storage.from(BUCKET).upload(path, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw new Error("Upload failed. Please try again.");
  return path;
}
