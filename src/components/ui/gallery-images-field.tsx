"use client";

import Image from "next/image";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { uploadMasterImage } from "@/lib/supabase/storage-upload";

export const MAX_GALLERY_IMAGES = 6;

const ALLOWED_EXT = new Set(["webp", "jpg", "jpeg", "png"]);
const ACCEPT =
  "image/webp,image/jpeg,image/jpg,image/png,.webp,.jpg,.jpeg,.png";

function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function isAllowedImage(file: File): boolean {
  const ext = fileExtension(file.name);
  if (ALLOWED_EXT.has(ext)) return true;
  const type = file.type.toLowerCase();
  return (
    type === "image/webp" ||
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png"
  );
}

/** Normalize cover + gallery into up to 6 unique image URLs. */
export function collectDisplayImages(
  coverUrl?: string | null,
  galleryUrls?: string[] | null,
  max = MAX_GALLERY_IMAGES
): string[] {
  const out: string[] = [];
  for (const url of [coverUrl, ...(galleryUrls ?? [])]) {
    if (!url || out.includes(url)) continue;
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

/** Horizontal strip of thumbnails (list / table rows). */
export function ImageThumbRow({
  urls,
  className,
  size = 44,
  max = MAX_GALLERY_IMAGES,
}: {
  urls: string[];
  className?: string;
  size?: number;
  max?: number;
}) {
  const list = urls.slice(0, max);
  if (list.length === 0) {
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        style={{ minHeight: size }}
      >
        <div
          className="rounded border border-dashed border-stone-200 bg-stone-50"
          style={{ width: size, height: size }}
        />
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {list.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={size}
          height={size}
          className="rounded object-cover"
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

/** Upload / manage up to 6 images (.webp, .jpg, .jpeg, .png). */
export function GalleryImagesField({
  label = "Images (up to 6)",
  value,
  onChange,
  disabled,
  max = MAX_GALLERY_IMAGES,
  folder = "gallery",
}: {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  max?: number;
  /** Storage folder: vehicles | itineraries | destinations | hotels */
  folder?: string;
}) {
  const { show } = useToast();
  const [uploading, setUploading] = useState(false);
  const urls = value.slice(0, max);

  async function addFile(file: File) {
    if (urls.length >= max) return;
    if (!isAllowedImage(file)) {
      show("Only .webp, .jpg, .jpeg, .png images are allowed");
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadMasterImage(file, folder);
      onChange([...urls, publicUrl].slice(0, max));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed";
      show(message);
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(urls.filter((_, i) => i !== index));
  }

  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-xs text-stone-500">
        First image is the cover. Up to {max} photos — .webp, .jpg, .jpeg, .png only.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((src, i) => (
          <div key={`${src.slice(0, 48)}-${i}`} className="relative">
            <Image
              src={src}
              alt=""
              width={72}
              height={72}
              unoptimized
              className="h-[72px] w-[72px] rounded-lg border border-stone-200 object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            {i === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
                Cover
              </span>
            )}
          </div>
        ))}
        {urls.length < max && !disabled && (
          <label
            className={cn(
              "flex h-[72px] w-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 bg-stone-50 text-stone-500",
              uploading ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-stone-100"
            )}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span className="text-[10px]">Add</span>
              </>
            )}
            <input
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void addFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
