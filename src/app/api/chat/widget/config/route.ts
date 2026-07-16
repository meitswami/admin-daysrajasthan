import { resolvePublicWidgetConfig } from "@/modules/chat";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key =
    url.searchParams.get("key") ??
    request.headers.get("x-td-widget-key") ??
    "";

  if (!key) {
    return Response.json(
      { success: false, message: "Missing widget key", data: null },
      { status: 401 }
    );
  }

  const config = await resolvePublicWidgetConfig(key);
  if (!config) {
    return Response.json(
      { success: false, message: "Invalid or revoked widget key", data: null },
      { status: 401 }
    );
  }

  return Response.json({
    success: true,
    message: "OK",
    data: config,
  });
}
