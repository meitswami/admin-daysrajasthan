import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";

export const MASTER_IMAGES_BUCKET = "master-images";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function useStorageUpload(): boolean {
  return isSupabaseConfigured() && isRealDataMode();
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "jpg";
}

function mimeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/** Resize/compress browser File to stay under Storage limits. */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const preferPng = file.type === "image/png";
  const mime = preferPng ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, preferPng ? undefined : JPEG_QUALITY)
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  const ext = preferPng ? "png" : "jpg";
  return new File([blob], `${base}.${ext}`, { type: mime, lastModified: Date.now() });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a master-data image to Supabase Storage (real mode) or return a data URL (dummy).
 * Folder examples: vehicles | itineraries | destinations | hotels
 */
export async function uploadMasterImage(
  file: File,
  folder: string
): Promise<string> {
  const compressed = await compressImageFile(file);

  if (!useStorageUpload()) {
    return readAsDataUrl(compressed);
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const ext = fileExtension(compressed.name);
  const path = `${folder.replace(/[^a-z0-9_-]/gi, "")}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(MASTER_IMAGES_BUCKET).upload(path, compressed, {
    cacheControl: "3600",
    upsert: false,
    contentType: compressed.type || mimeFromExt(ext),
  });

  if (error) {
    throw new Error(error.message || "Image upload failed");
  }

  const { data } = supabase.storage.from(MASTER_IMAGES_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Could not resolve public image URL");
  }
  return data.publicUrl;
}

/** If value is still a data URL, re-upload it; otherwise keep http(s) URLs as-is. */
export async function ensureStoredImageUrl(
  value: string,
  folder: string
): Promise<string> {
  if (!value) return value;
  if (!value.startsWith("data:")) return value;
  if (!useStorageUpload()) return value;

  const res = await fetch(value);
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const file = new File([blob], `upload.${ext}`, { type: mime });
  return uploadMasterImage(file, folder);
}

export async function ensureStoredImageUrls(
  values: string[],
  folder: string
): Promise<string[]> {
  const out: string[] = [];
  for (const value of values.filter(Boolean)) {
    out.push(await ensureStoredImageUrl(value, folder));
  }
  return out;
}
