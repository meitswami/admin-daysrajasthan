"use client";

import Script from "next/script";
import { LOCAL_DEMO_WIDGET_KEY } from "@/modules/chat/constants";

/**
 * Local admin preview — bottom-right floating widget via the same loader script
 * customers embed. Uses stable demo key `twd-live`.
 */
export function AdminLocalChatWidget() {
  const src = `/api/chat/widget/script?key=${encodeURIComponent(LOCAL_DEMO_WIDGET_KEY)}`;

  return (
    <Script
      id="td-admin-local-chat-widget"
      src={src}
      strategy="afterInteractive"
    />
  );
}
