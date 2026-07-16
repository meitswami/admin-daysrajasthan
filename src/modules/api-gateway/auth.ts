/**
 * Gateway auth adapters — interfaces ready; session resolution is best-effort.
 */

import type { AuthMode, GatewayActor } from "./types";

export type AuthResolver = (request: Request, mode: AuthMode) => Promise<GatewayActor>;

const anonymousActor = (): GatewayActor => ({
  id: null,
  email: null,
  roles: ["anonymous"],
  authMode: "anonymous",
});

/**
 * Default auth resolver.
 * - anonymous: always allowed
 * - session: reads cookie presence heuristically (full Supabase auth stays in auth module later)
 * - service: requires `x-td-service-key` matching env
 */
export const defaultAuthResolver: AuthResolver = async (request, mode) => {
  if (mode === "anonymous") return anonymousActor();

  if (mode === "service") {
    const expected = process.env.TD_SERVICE_API_KEY;
    const provided = request.headers.get("x-td-service-key");
    if (expected && provided && expected === provided) {
      return {
        id: "service",
        email: null,
        roles: ["service"],
        authMode: "service",
      };
    }
    return {
      id: null,
      email: null,
      roles: [],
      authMode: "service",
    };
  }

  // session — mark authenticated if any sb/auth cookie exists (non-invasive)
  const cookie = request.headers.get("cookie") ?? "";
  const hasSession =
    cookie.includes("sb-") ||
    cookie.includes("td-demo-session") ||
    cookie.toLowerCase().includes("supabase");

  if (hasSession) {
    return {
      id: "session-user",
      email: null,
      roles: ["authenticated"],
      authMode: "session",
    };
  }

  return {
    id: null,
    email: null,
    roles: [],
    authMode: "session",
  };
};

let activeResolver: AuthResolver = defaultAuthResolver;

/** Inject auth resolver (tests / future Auth module). */
export function setAuthResolver(resolver: AuthResolver): void {
  activeResolver = resolver;
}

/** Resolve actor for a request. */
export async function resolveActor(request: Request, mode: AuthMode): Promise<GatewayActor> {
  return activeResolver(request, mode);
}

/**
 * Whether actor satisfies auth mode.
 */
export function isAuthenticated(actor: GatewayActor, mode: AuthMode): boolean {
  if (mode === "anonymous") return true;
  if (mode === "service") return actor.roles.includes("service");
  return Boolean(actor.id) && actor.roles.includes("authenticated");
}
