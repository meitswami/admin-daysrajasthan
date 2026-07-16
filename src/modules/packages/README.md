# Packages (CMS)

## Purpose

Admin/CMS workflows for website packages. **All catalog reads go through Knowledge.**

## Responsibilities

- CMS-facing adapters (`listCmsPackages`, `getCmsPackage`)
- Map Knowledge `PackageRecord` → legacy Itinerary view models for existing UI

## Dependencies

- `knowledge`, `shared`

**Must not:** query `itineraries` / Supabase directly.

## Exported services

- `listPackageRecords()` — Knowledge DTOs
- `listCmsPackages()` — legacy CMS view models
- `getCmsPackage()` / `getCmsPackageBySlug()`

## Future roadmap

- Move `(dashboard)/itineraries` fully under `(admin)/packages`
- Writes (create/update) via Knowledge write repository
