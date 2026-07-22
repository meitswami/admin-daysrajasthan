"use client";

import { useEffect } from "react";

const RELOAD_KEY = "td-chunk-reload";

function isChunkLoadFailure(reason: unknown): boolean {
  if (!reason) return false;
  if (reason instanceof Error) {
    const name = reason.name || "";
    const message = reason.message || "";
    return (
      name === "ChunkLoadError" ||
      /Loading chunk [\d]+ failed/i.test(message) ||
      /Failed to load chunk/i.test(message) ||
      /ChunkLoadError/i.test(message)
    );
  }
  if (typeof reason === "string") {
    return /ChunkLoadError|Failed to load chunk|Loading chunk/i.test(reason);
  }
  return false;
}

/**
 * After a deploy, open tabs can request deleted/renamed JS chunks and crash.
 * One hard reload usually picks up the new build; guard against reload loops.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    function reloadOnce() {
      try {
        const last = sessionStorage.getItem(RELOAD_KEY);
        const now = Date.now();
        if (last && now - Number(last) < 15_000) return;
        sessionStorage.setItem(RELOAD_KEY, String(now));
      } catch {
        // sessionStorage blocked — still try once via location
      }
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      if (isChunkLoadFailure(event.error) || isChunkLoadFailure(event.message)) {
        event.preventDefault();
        reloadOnce();
      }
    }

    function onRejection(event: PromiseRejectionEvent) {
      if (isChunkLoadFailure(event.reason)) {
        event.preventDefault();
        reloadOnce();
      }
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
