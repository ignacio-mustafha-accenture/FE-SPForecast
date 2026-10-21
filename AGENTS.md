<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Versioning

On every deploy, bump the version in `package.json` using semver:
- **patch** (`0.x.Y`) — bug fixes, minor UI tweaks
- **minor** (`0.X.0`) — new features or screens
- **major** (`X.0.0`) — breaking changes or full redesigns

The version is displayed in the navbar user menu dropdown (`src/components/layout/UserMenu.tsx` reads it from `package.json` via `import pkg from '../../../../package.json'`).

## Dashboard sub-views

The Dashboard header has buttons that open server-side filtered/paginated views, all built the same way (domain type in `src/core/domain`, method in `IEmployeeRepository` + `HttpEmployeeRepository`, use case in `src/application/use-cases` registered in `container.ts`, route under `app/(app)/dashboard/<name>/page.tsx` wrapped in `<Suspense>`, view in `src/views/<name>/`, filters kept in the URL query string, i18n block in `messages/{es,en}.json`):

- `/dashboard/unassigned` — Desasignados (`UnassignedView`)
- `/dashboard/ptos` — PTOs en curso y próximos; el filtro de estado "Finalizado" muestra el historial (`PtosView`, backend `GET /api/employees/pto`)

When adding a new one, copy `PtosView`/`UnassignedView` instead of inventing a new layout.
