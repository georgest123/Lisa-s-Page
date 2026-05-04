<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- **Stack**: Next.js 16.2.4 (App Router, Turbopack), React 19, Tailwind CSS 4, TypeScript 5, ESLint 9.
- **Package manager**: npm (lockfile: `package-lock.json`).
- **Key scripts** (see `package.json`): `npm run dev`, `npm run build`, `npm run lint`.
- **Dev server**: `npm run dev` starts on port 3000 with Turbopack HMR.
- **Node.js**: Requires Node.js 22+ (installed at `/usr/local/bin/node`).
- **No external services**: No database, Docker, or API keys required.
