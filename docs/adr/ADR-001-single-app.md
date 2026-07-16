# ADR-001: Single Next.js Application

## Status

Accepted

## Context

TravelDays includes a public website, admin CMS, customer portal, team quotation workspace, CRM, and an Intelligence Engine. Early options considered a monorepo with separate `apps/web` and `apps/admin`.

## Decision

Ship **one Next.js application** with App Router surface groups:

- `(website)`, `(admin)`, `(customer)`, `(team)`, `(auth)`, shared `api/`

Domain logic lives in `src/modules/*` (feature-based architecture).

## Consequences

- Shared types, auth, and design tokens without cross-repo versioning
- Clearer deployment (single Hostinger VPS app)
- Route-group migration from legacy `(dashboard)` must be deliberate (Phase 1+)
- Strict module boundaries required to avoid “god app” coupling
