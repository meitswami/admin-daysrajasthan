/**
 * Middleware pipeline interfaces — external providers later.
 */

import type { GatewayContext } from "./types";

export type GatewayMiddleware = (
  ctx: GatewayContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Compose middleware around a terminal handler.
 */
export async function runMiddlewareChain(
  middlewares: GatewayMiddleware[],
  ctx: GatewayContext,
  terminal: () => Promise<void>
): Promise<void> {
  let index = -1;
  const dispatch = async (i: number): Promise<void> => {
    if (i <= index) throw new Error("api-gateway middleware called multiple times");
    index = i;
    const fn = i === middlewares.length ? terminal : middlewares[i];
    if (!fn) return;
    await fn(ctx, () => dispatch(i + 1));
  };
  await dispatch(0);
}

/** No-op middleware placeholder for future OTEL injection points. */
export const passthroughMiddleware: GatewayMiddleware = async (_ctx, next) => {
  await next();
};
