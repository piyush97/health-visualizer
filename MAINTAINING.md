# Maintaining health-visualizer

Maintenance runbook for [piyush97/health-visualizer](https://github.com/piyush97/health-visualizer).

## Package manager: npm is canonical

- The repository declares **npm** as the package manager (`"packageManager": "npm@10.9.0"` in `package.json`).
- **npm is the only supported package manager for maintenance.** Use `package-lock.json` for reproducible installs.
- A `bun.lock` file is also present in the repository but is **not** authoritative and should be ignored. Do not add or update dependencies with bun; do not keep the two lockfiles in sync. If the project is ever migrated fully to bun, update this document and the Dependabot configuration first.
- Do not delete `bun.lock` — it is left in place for existing local workflows.

## Requirements

- Node.js **20 LTS** (CI pins Node 20 via `actions/setup-node`).
- npm 10.x (bundled with Node 20).
- A PostgreSQL database for runtime features; see `.env.example` for the required environment variables.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`, runs on every push to `main` and on pull requests.

Pipeline (all with npm):

```bash
npm ci --legacy-peer-deps # install exactly what package-lock.json pins
npm run build             # next build
npm run lint              # next lint
npm run typecheck         # tsc --noEmit
```

> **Why `--legacy-peer-deps`:** `react` is pinned at `^19.1.0`, but the latest
> `@clerk/nextjs` within the `^6.21.0` range requires `react ~19.2.3+`. A plain
> `npm ci` therefore fails with ERESOLVE. `--legacy-peer-deps` is the canonical
> install mode until the manifest is reconciled (e.g. by bumping `react`). The
> `DATABASE_URL` env var is required by `prisma generate` (postinstall) — a
> placeholder URL is sufficient; no database connection is made.

Local equivalents:

```bash
npm ci --legacy-peer-deps
npm run build
npm run lint
npm run typecheck
```

If a build fails due to missing environment variables, run with `SKIP_ENV_VALIDATION=1` (supported by `src/env.js`) — but prefer providing the real variables from `.env.example`. For a full local build, export `DATABASE_URL` (used by `prisma generate`) and the other variables from `.env.example`.

CI uses the following placeholder environment (see `.github/workflows/ci.yml`):

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/health-visualizer"
export OPENAI_API_KEY="placeholder"
export CLERK_SECRET_KEY="placeholder"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_Y2xlcmsuZXhhbXBsZS5jb20k"
export SKIP_ENV_VALIDATION=1
```

The Clerk key is a well-formed `pk_test_` key so `/signin` can prerender; production uses the real key from Clerk dashboard.

## Known debt (pre-existing)

- **ESLint errors:** the scaffolded UI code (`src/components/ui/*`, `src/lib/health-parser.ts`, `src/server/api/routers/chat.ts`) carries ~47 pre-existing ESLint errors under the strict type-checked config. `next build` skips ESLint (`eslint.ignoreDuringBuilds` in `next.config.js`); CI still runs `npm run lint` explicitly to track the debt. Clean these up incrementally — do not disable the rules.
- **Peer-dependency conflict:** see the `--legacy-peer-deps` note above. A long-term fix is bumping `react` (and reconciling `@clerk/nextjs`), tracked via Dependabot.

## Dependabot

Configuration: `.github/dependabot.yml`.

- **npm ecosystem** — weekly (Monday 06:00 UTC), up to 5 open PRs, labelled `dependencies`, minor+patch grouped into a single `minor-patch` PR.
- **github-actions ecosystem** — weekly, labelled `dependencies`.
- Dependabot PRs are exempt from the stale workflow.
- Merge cadence: review the diff (lockfile-only changes are low risk), then merge with **squash**. CI runs on every Dependabot PR; only merge green PRs. Because install uses `--legacy-peer-deps`, review Dependabot's proposed `package.json`/`package-lock.json` changes against the ERESOLVE constraint above — prefer PRs that bump `react`/`@clerk/nextjs` together.

## Codebase notes

- The T3 scaffold's example `post` router (`src/server/api/routers/post.ts`) and its `LatestPost` component were removed — they referenced a `Post` model that does not exist in `prisma/schema.prisma` and broke the build. The active routers are `health` and `chat` (`src/server/api/root.ts`).

## Stale issues & PRs

Workflow: `.github/workflows/stale.yml` (runs Monday 09:00 UTC, also manually dispatchable).

- Issues are marked `stale` after 60 days of inactivity.
- PRs are marked `stale` after 30 days of inactivity.
- **Nothing is ever closed automatically** (`days-before-*-close: -1`). The stale label is a nudge to review, close, or update.
- Dependabot PRs (label `dependencies`) are exempt.

## Release process

1. Bump the version in `package.json` (currently `0.1.0`).
2. Run the full local check: `npm ci && npm run build && npm run lint && npm run typecheck`.
3. Commit with a conventional message (e.g. `feat:`, `fix:`, `chore:`).
4. Push to `main` — CI runs automatically.
5. Tag the release: `git tag v<version>` and `git push origin v<version>`.
6. Draft a GitHub release from the tag, summarizing changes.

## Verification checklist

- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run build` succeeds.
- [ ] `npm run lint` succeeds.
- [ ] `npm run typecheck` succeeds.
- [ ] CI is green on `main`.
- [ ] Dependabot PRs reviewed and merged (squash) within the week.
