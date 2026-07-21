import { resolvePublicWidgetConfig, resolveRequestPublicOrigin } from "@/modules/chat";

/**
 * Returns a small loader script that mounts the offline iframe widget.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const origin = resolveRequestPublicOrigin(request);

  if (!key) {
    return new Response("/* Travel Days Chat: missing key */", {
      status: 400,
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  const config = await resolvePublicWidgetConfig(key);
  if (!config) {
    return new Response("/* Travel Days Chat: invalid key — sync keys from Admin → AI & Chat after create */", {
      status: 401,
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  // Respect Widget Settings → Widget enabled / AI mode Disabled
  if (!config.enabled || config.aiMode === "disabled") {
    return new Response("/* Travel Days Chat: widget disabled */", {
      status: 200,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const iframeSrc = `${origin}/embed/chat?key=${encodeURIComponent(key)}`;
  const primary = config.appearance.primaryColor.replace(/[^#A-Fa-f0-9]/g, "") || "#7A1F1F";
  const label = JSON.stringify(config.appearance.launcherLabel);

  const js = `
(function(){
  if (window.__TD_CHAT_MOUNTED__) return;
  window.__TD_CHAT_MOUNTED__ = true;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", ${label});
  btn.textContent = ${label};
  btn.style.cssText = "position:fixed;z-index:2147483000;right:16px;bottom:16px;border:0;border-radius:999px;padding:12px 18px;background:${primary};color:#fff;font:600 14px/1.2 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer;";
  var frame = document.createElement("iframe");
  frame.title = "Travel Days Chat";
  frame.src = ${JSON.stringify(iframeSrc)};
  frame.style.cssText = "position:fixed;z-index:2147483001;right:16px;bottom:72px;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 96px));border:0;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:none;background:#fff;";
  btn.addEventListener("click", function(){
    frame.style.display = frame.style.display === "none" ? "block" : "none";
  });
  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();`;

  return new Response(js, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
