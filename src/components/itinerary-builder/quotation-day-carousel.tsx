"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  alt?: string;
  className?: string;
  /** Accent for active pagination dot */
  accent?: string;
  heightClassName?: string;
};

/** Lightweight day-image carousel (no Swiper dependency). */
export function QuotationDayCarousel({
  images,
  alt = "",
  className,
  accent = "#56AB2F",
  heightClassName = "h-48 sm:h-60",
}: Props) {
  const slides = images.filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides.join("|")]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg", className)}>
      <div className={cn("relative w-full", heightClassName)}>
        {slides.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt={alt ? `${alt} image ${i + 1}` : ""}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              i === index ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show image ${i + 1}`}
              className="h-2 w-2 rounded-full transition"
              style={{
                backgroundColor: i === index ? accent : "rgba(255,255,255,0.7)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
              }}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
