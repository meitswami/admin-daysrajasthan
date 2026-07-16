# Design System

## Purpose

Own the **Royal Rajasthan** visual language (cream, maroon, gold, motion, card primitives) for website, chat, customer portal, and branded documents.

## Responsibilities

- Theme tokens and CSS custom-property maps
- Surface themes (website / admin / customer / team)
- Animation presets
- Icon name registry (presentation components resolve icons)
- Card variant tokens for Renderer / chat

## Dependencies

- `shared` only  
- **Must not** depend on Intelligence, Knowledge, Chat, or Supabase

## Exported services

- `getDesignTokens()` / `getColorTokens()` / `getTypographyTokens()`
- `getSurfaceTheme(surface)`
- `getAnimationPreset(name)` / `listAnimationPresets()`
- `getCardVariant(name)` / `listCardVariants()`
- `getIconDefinition(name)` / `listIconDefinitions()`
- `tokensToCssVariables(tokens)` — framework-agnostic CSS variable map
- Zod schemas + parsers in `schemas.ts` / `validators.ts`

## Module layout

`types.ts` · `schemas.ts` · `constants.ts` · `validators.ts` · `service.ts` · `index.ts`  
No `repository.ts` (no database).

## Future roadmap

- Wire CSS variables into `(website)` layout (Phase 2)
- Icon React wrappers in `components/` consuming the registry
- Dark-free operational themes stay token-aligned, quieter for admin/team
