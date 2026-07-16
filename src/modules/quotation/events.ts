/**
 * Quotation event bus — hooks for CRM, Analytics, Notifications, AI Memory later.
 */

import { newUuid } from "@/lib/itinerary-builder/defaults";

import type { QuotationEvent, QuotationEventHandler, QuotationEventType } from "./types";

const handlers = new Map<QuotationEventType | "*", Set<QuotationEventHandler>>();
const history: QuotationEvent[] = [];
const MAX_HISTORY = 500;

/**
 * Subscribe to a quotation event type (`*` for all).
 */
export function onQuotationEvent(
  type: QuotationEventType | "*",
  handler: QuotationEventHandler
): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => handlers.get(type)?.delete(handler);
}

/**
 * Emit a quotation domain event to subscribers (non-blocking for async handlers).
 */
export async function emitQuotationEvent(
  type: QuotationEventType,
  quotationId: string,
  payload: Record<string, unknown> = {},
  actor: string | null = null
): Promise<QuotationEvent> {
  const event: QuotationEvent = {
    id: newUuid(),
    type,
    quotationId,
    occurredAt: new Date().toISOString(),
    actor,
    payload,
  };
  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();

  const targets = [
    ...(handlers.get(type) ?? []),
    ...(handlers.get("*") ?? []),
  ];
  await Promise.all(targets.map((h) => Promise.resolve(h(event))));
  return event;
}

/**
 * Recent in-memory events (test / debug). Not a durable store.
 */
export function listQuotationEvents(quotationId?: string): QuotationEvent[] {
  if (!quotationId) return [...history];
  return history.filter((e) => e.quotationId === quotationId);
}

/**
 * Clear handlers and history (unit tests).
 */
export function resetQuotationEvents(): void {
  handlers.clear();
  history.length = 0;
}
