# Universal API Gateway

Sole external entry pipeline for Website, Admin, Customer/Team portals, AI Chat, and future Mobile / WhatsApp / public APIs.

## Request lifecycle

```
Client
  ↓
API Gateway (runGateway)
  ↓
Validation (schema)
  ↓
Authentication (anonymous | session | service)
  ↓
Authorization / permissions
  ↓
Rate limiting
  ↓
Logging + metrics
  ↓
Feature flags
  ↓
Handler → Module services (Knowledge / CRP / Quotation / Search / …)
  ↓
Standard response envelope
```

## Thin API route pattern

```ts
import { runGateway } from "@/modules/api-gateway";

export async function POST(request: Request) {
  return runGateway(request, {
    routeId: "public.contact",
    auth: "anonymous",
    featureFlag: "public.contact",
    schema: contactSchema,
    handler: async ({ input }) => {
      // call module service — no business rules in the route file
      return { data: await someModuleService(input), status: 201, message: "Created" };
    },
  });
}
```

## Standard response

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "metadata": { "version": "v1", "routeId": "...", "durationMs": 12, "featureFlags": {} },
  "pagination": null,
  "errors": null,
  "traceId": "...",
  "timestamp": "..."
}
```

## Extensibility (interfaces ready)

| Concern | Swap via |
|---------|----------|
| Auth | `setAuthResolver` |
| Permissions | `setPermissionChecker` |
| Rate limit | `setRateLimiter` (Redis later) |
| Logging | `setGatewayLogger` (OTEL / Sentry / Datadog) |
| Metrics | `getMetricsSnapshot` |
| Feature flags | `setFeatureFlag` |
| Middleware chain | `runMiddlewareChain` |

## Responsibilities

Request validation · AuthN/AuthZ · Rate limiting · Logging · Response formatting · Error handling · API versioning · Feature flags · Performance metrics

## Non-goals

- Business logic (belongs in domain modules)
- Page / React logic
- Direct Supabase catalog access

## Frozen modules

Gateway consumes other modules from route handlers; it does not modify Design System, Knowledge, Quotation, CRP, or Search.
