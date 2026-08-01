"use client";

import Image from "next/image";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { uploadMasterImage } from "@/lib/supabase/storage-upload";
import { ImageLightbox } from "@/components/ui/image-lightbox";

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

function thumbNeedsUnoptimized(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}

/** Prefer a compact remote URL when the host supports resize (Unsplash / Supabase). */
export function thumbnailSrc(
  src: string,
  edgePx: number,
  fit: "cover" | "contain" = "contain"
): string {
  if (!src || thumbNeedsUnoptimized(src)) return src;
  try {
    const url = new URL(src);
    if (url.hostname === "images.unsplash.com") {
      url.searchParams.set("w", String(edgePx));
      url.searchParams.set("h", String(edgePx));
      url.searchParams.set("fit", fit === "cover" ? "crop" : "max");
      url.searchParams.set("q", "60");
      url.searchParams.set("auto", "format");
      return url.toString();
    }
    if (url.pathname.includes("/storage/v1/object/public/")) {
      url.pathname = url.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/"
      );
      url.searchParams.set("width", String(edgePx));
      url.searchParams.set("height", String(edgePx));
      url.searchParams.set("resize", fit === "cover" ? "cover" : "contain");
      url.searchParams.set("quality", "60");
      return url.toString();
    }
  } catch {
    /* keep original */
  }
  return src;
}

function ThumbImage({
  src,
  width,
  height,
  requestEdge,
  objectFit,
  onOpen,
}: {
  src: string;
  width: number;
  height: number;
  requestEdge: number;
  objectFit: "cover" | "contain";
  onOpen?: () => void;
}) {
  const preferred = thumbnailSrc(src, requestEdge, objectFit);
  const [current, setCurrent] = useState(preferred);
  const unoptimized =
    thumbNeedsUnoptimized(current) ||
    current !== src; /* already resized at the CDN */

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className={cn(
        "relative shrink-0 overflow-hidden rounded border border-stone-200 bg-stone-100",
        onOpen && "cursor-zoom-in transition hover:border-stone-300 hover:ring-1 hover:ring-amber-300/60"
      )}
      style={{ width, height }}
      aria-label={onOpen ? "View image" : undefined}
    >
      <Image
        src={current}
        alt=""
        width={width}
        height={height}
        sizes={`${Math.max(width, height)}px`}
        loading="lazy"
        decoding="async"
        quality={65}
        unoptimized={unoptimized}
        className={cn(
          "h-full w-full",
          objectFit === "contain" ? "object-contain" : "object-cover"
        )}
        onError={() => {
          if (current !== src) setCurrent(src);
        }}
      />
    </button>
  );
}

/** Horizontal strip of thumbnails (list / table rows). Click opens lightbox. */
export function ImageThumbRow({
  urls,
  className,
  size = 56,
  width,
  height,
  max = MAX_GALLERY_IMAGES,
  objectFit = "contain",
  enableLightbox = true,
  lightboxTitle = "Images",
}: {
  urls: string[];
  className?: string;
  /** Square edge when width/height not set */
  size?: number;
  width?: number;
  height?: number;
  max?: number;
  objectFit?: "cover" | "contain";
  enableLightbox?: boolean;
  lightboxTitle?: string;
}) {
  const list = urls.slice(0, max);
  const w = width ?? Math.round(size * 1.55);
  const h = height ?? size;
  const requestEdge = Math.min(320, Math.max(96, Math.max(w, h) * 2));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (list.length === 0) {
    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        style={{ minHeight: h }}
      >
        <div
          className="rounded border border-dashed border-stone-200 bg-stone-50"
          style={{ width: w, height: h }}
        />
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex items-center gap-1.5", className)}>
        {list.map((src, i) => (
          <ThumbImage
            key={src}
            src={src}
            width={w}
            height={h}
            requestEdge={requestEdge}
            objectFit={objectFit}
            onOpen={
              enableLightbox
                ? () => {
                    setLightboxIndex(i);
                    setLightboxOpen(true);
                  }
                : undefined
            }
          />
        ))}
      </div>
      {enableLightbox ? (
        <ImageLightbox
          open={lightboxOpen}
          urls={urls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          title={lightboxTitle}
        />
      ) : null}
    </>
  );
}

/** Fixed-size auto-scrolling image carousel for table cells (same footprint as a thumb). */
export function ImageThumbCarousel({
  urls,
  className,
  width = 96,
  height = 64,
  max = MAX_GALLERY_IMAGES,
  intervalMs = 2800,
  objectFit = "cover",
  enableLightbox = true,
  lightboxTitle = "Images",
}: {
  urls: string[];
  className?: string;
  width?: number;
  height?: number;
  max?: number;
  intervalMs?: number;
  objectFit?: "cover" | "contain";
  enableLightbox?: boolean;
  lightboxTitle?: string;
}) {
  const list = urls.filter(Boolean).slice(0, max);
  const requestEdge = Math.min(320, Math.max(96, Math.max(width, height) * 2));
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [list.join("|")]);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [list.length, intervalMs]);

  if (list.length === 0) {
    return (
      <div
        className={cn("rounded border border-dashed border-stone-200 bg-stone-50", className)}
        style={{ width, height }}
      />
    );
  }

  const current = list[Math.min(index, list.length - 1)]!;

  return (
    <>
      <div className={cn("relative", className)} style={{ width, height }}>
        <ThumbImage
          src={current}
          width={width}
          height={height}
          requestEdge={requestEdge}
          objectFit={objectFit}
          onOpen={
            enableLightbox
              ? () => {
                  setLightboxOpen(true);
                }
              : undefined
          }
        />
        {list.length > 1 ? (
          <div className="pointer-events-none absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 gap-0.5">
            {list.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 w-1 rounded-full shadow-sm",
                  i === index ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      {enableLightbox ? (
        <ImageLightbox
          open={lightboxOpen}
          urls={list}
          startIndex={index}
          onClose={() => setLightboxOpen(false)}
          title={lightboxTitle}
        />
      ) : null}
    </>
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
