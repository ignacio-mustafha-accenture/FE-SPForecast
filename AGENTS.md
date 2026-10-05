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
