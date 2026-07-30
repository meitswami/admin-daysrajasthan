"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export function ImageLightbox({
  open,
  urls,
  startIndex = 0,
  onClose,
  title = "Images",
}: {
  open: boolean;
  urls: string[];
  startIndex?: number;
  onClose: () => void;
  title?: string;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const count = urls.length;

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, startIndex), Math.max(0, count - 1)));
    setZoom(MIN_ZOOM);
  }, [open, startIndex, count]);

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setIndex((i) => (i + delta + count) % count);
      setZoom(MIN_ZOOM);
    },
    [count]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      if (e.key === "-") setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, go]);

  if (!open || count === 0) return null;

  const src = urls[index] ?? urls[0];
  const unoptimized = src.startsWith("data:") || src.startsWith("blob:");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-950 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-800 px-3 py-2.5 sm:px-4">
          <p className="min-w-0 truncate text-sm font-medium text-stone-200">
            {title}
            {count > 1 ? (
              <span className="ml-2 text-stone-400">
                {index + 1} / {count}
              </span>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              className="rounded-lg p-2 text-stone-300 hover:bg-stone-800 disabled:opacity-40"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="tabular-nums text-xs text-stone-400">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              className="rounded-lg p-2 text-stone-300 hover:bg-stone-800 disabled:opacity-40"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-stone-300 hover:bg-stone-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-[50vh] flex-1 items-center justify-center overflow-hidden bg-stone-900">
          {count > 1 && (
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:left-3"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div
            className="flex h-[min(70vh,640px)] w-full items-center justify-center overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={src}
              src={src}
              alt=""
              width={1200}
              height={800}
              unoptimized={unoptimized}
              className={cn(
                "max-h-[min(70vh,640px)] w-auto max-w-full object-contain transition-transform duration-200"
              )}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>
          {count > 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 sm:right-3"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {count > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t border-stone-800 px-3 py-2.5 sm:px-4">
            {urls.map((u, i) => (
              <button
                key={`${u}-${i}`}
                type="button"
                onClick={() => {
                  setIndex(i);
                  setZoom(MIN_ZOOM);
                }}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border bg-stone-800",
                  i === index ? "border-amber-400" : "border-stone-700 opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={u}
                  alt=""
                  fill
                  unoptimized={u.startsWith("data:") || u.startsWith("blob:")}
                  className="object-contain p-0.5"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 border-t border-stone-800 px-3 py-2 text-xs text-stone-500 sm:hidden">
          <Minus className="h-3 w-3" />
          Pinch or use zoom
          <Plus className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
