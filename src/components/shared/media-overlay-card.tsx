"use client";

import { useState } from "react";
import Image from "next/image";
import {
  resolveCoverImage,
  type PlaceholderCategory,
} from "@/lib/constants/placeholder-images";
import { cn } from "@/lib/utils";

export function MediaOverlayCard({
  imageUrl,
  imageCategory = "travel",
  minHeightClass = "min-h-[260px]",
  className,
  children,
}: {
  imageUrl?: string | null;
  imageCategory?: PlaceholderCategory;
  minHeightClass?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const fallback = resolveCoverImage(null, imageCategory);
  const [src, setSrc] = useState(() => resolveCoverImage(imageUrl, imageCategory));

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 shadow-md",
        minHeightClass,
        className
      )}
    >
      <div className="absolute inset-0">
        <Image
          src={src}
          alt=""
          fill
          unoptimized={src.startsWith("https://images.unsplash.com")}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={() => setSrc(fallback)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35" />
      </div>
      <div
        className={cn(
          "relative z-10 flex flex-col p-4 text-white sm:p-5",
          minHeightClass
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function MediaThumb({
  imageUrl,
  imageCategory = "travel",
  className,
  width = 64,
  height = 64,
}: {
  imageUrl?: string | null;
  imageCategory?: PlaceholderCategory;
  className?: string;
  width?: number;
  height?: number;
}) {
  const fallback = resolveCoverImage(null, imageCategory);
  const [src, setSrc] = useState(() => resolveCoverImage(imageUrl, imageCategory));

  return (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      unoptimized={src.startsWith("https://images.unsplash.com")}
      className={cn("shrink-0 rounded-xl object-cover", className)}
      onError={() => setSrc(fallback)}
    />
  );
}
