# Module Conventions (Phase 1+)

Enforced for new module work. Phase 0 scaffolds remain frozen unless explicitly reopened.

## Independence

- Modules are independently reusable.
- Depend only through approved manifests (`shared/module-contract.ts`).
- Prefer interfaces + services; avoid tight coupling.

## Layering

| Layer | Allowed |
|-------|---------|
| `app/**` pages & layouts | Composition only — no business logic |
| React `components/**` | Presentational only |
| `modules/**` | All business logic |
| `app/api/**` | Validate → call module `service` → respond |

## Required files (when a module is actively implemented)

- `types.ts`
- `schemas.ts`
- `service.ts`
- `repository.ts` — only if database access exists
- `validators.ts`
- `constants.ts`
- `index.ts`
- `README.md`

Do not add empty placeholder files that throw “not implemented” without a real contract.

## Documentation after each task

- `CURRENT_STATE.md`
- `CHANGELOG.md`
- `TASKS.md`
- Module `README.md` if the module changed

## Verification

- `npm run build` must succeed before the next task.
- Stop and wait for approval after each completed task.
