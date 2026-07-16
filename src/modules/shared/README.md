# Shared

## Purpose

Cross-cutting module contracts, errors, and Travel Days table inventory helpers.

## Responsibilities

- `MODULE_MANIFESTS` dependency graph
- `ModuleError`
- `TRAVEL_DAYS_TABLES`

## Dependencies

- None (leaf module)

## Exported services

- `getModuleManifest`, `isDependencyAllowed`, `isTravelDaysTable`, `ModuleError`

## Future roadmap

- Result types, logging helpers, test utilities
