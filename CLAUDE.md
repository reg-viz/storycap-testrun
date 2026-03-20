# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (build required before lint/typecheck — packages depend on each other's dist)
pnpm install
pnpm build

# Build all packages
pnpm build

# Lint (prettier + oxlint)
pnpm lint                    # Check only
pnpm format                  # Auto-fix

# Type check
pnpm typecheck

# Unit tests (Vitest)
pnpm test:unit               # Run all
pnpm vitest run packages/internal  # Single package
pnpm vitest run packages/internal/src/hook.test.ts  # Single file

# E2E tests (runs examples sequentially, captures screenshots)
pnpm test:e2e
pnpm test:e2e v9-react-vite  # Single example

# Per-package commands (from package dir)
pnpm build / pnpm test / pnpm typecheck
```

## Architecture

Monorepo with three packages providing stable screenshot capture for Storybook visual regression testing. Stability is achieved via CDP metrics monitoring + hash-based retake verification.

### Package Dependency

```
@storycap-testrun/browser ──┐
                            ├── @storycap-testrun/internal
@storycap-testrun/node ─────┘
```

- **internal** (`packages/internal`): Shared core logic — `ScreenshotAdapter` interface, hook processor, parameter resolution, CDP metrics-based `waitForStableMetrics()`. Zero external dependencies.
- **browser** (`packages/browser`): For `@storybook/addon-vitest`. Implements browser-side adapter using Vitest browser commands. Exports a Vitest plugin (`@storycap-testrun/browser/vitest-plugin`) that registers the `resolveScreenshotFilepath` browser command.
- **node** (`packages/node`): For `@storybook/test-runner`. Implements Node-side adapter using Playwright's CDP session and file I/O.

### Core Pattern: ScreenshotAdapter

Both browser and node packages implement `ScreenshotAdapter` (defined in `packages/internal/src/screenshot.ts`). The adapter plugs into `createScreenshotFunction()` which orchestrates the full capture flow: context creation → parameter resolution → hook setup → stability wait → retake loop → post-capture hooks.

### Hook Lifecycle

Three phases defined in `packages/internal/src/hook.ts`:

1. **setup** — Before metrics monitoring (e.g., disable CSS animations)
2. **preCapture** — Immediately before screenshot (e.g., mask/remove elements)
3. **postCapture** — After screenshot saved (e.g., custom file processing)

Built-in hooks: animation disabling, element removal, element masking. Custom hooks via `ScreenshotHook<Page, Context>`.

### Stability Detection (packages/internal/src/wait-for-stable.ts)

Multi-layer approach:

1. **CDP Metrics**: Monitors `Nodes`, `RecalcStyleCount`, `LayoutCount` — stable when all three are unchanged across 3 consecutive readings
2. **Hash Retake**: Takes two consecutive screenshots, compares hashes. Retries up to 10 times if they differ
3. **DOM Readiness** (browser-specific): DOMContentLoaded + load + network idle + font loading

## Code Conventions

- **ESM**: `"type": "module"` throughout. Dual ESM+CJS output via tsdown
- **TypeScript**: Strict mode via `@tsconfig/strictest`, `isolatedDeclarations: true`
- **Linter**: oxlint (not ESLint) with type-aware checking. Config in `.oxlintrc.json`
- **Formatter**: prettier with `prettier-plugin-packagejson`
- **Build**: tsdown per package — minified, no sourcemaps, `.d.ts` with declaration maps
- **Tests co-located**: `*.test.ts` alongside source files
- **Test environment**: happy-dom for browser package, Node for others
- **Vitest globals**: `globals: true` — `describe`, `test`, `expect`, `vi` etc. are available without import
- **Type imports**: Use `import type` for type-only imports (`consistent-type-imports` enforced)
- **Import order**: Alphabetical, no blank lines between groups (`import/order` enforced)
- **Pre-commit hooks**: lefthook runs prettier and oxlint on staged files automatically

## Examples

Four example projects in `examples/` (each with own `pnpm-lock.yaml`, independent of monorepo workspace).
Each example has its own dependencies — run `pnpm install` inside the example dir before testing individually.

- `v8-react` — test-runner + `@storycap-testrun/node`
- `v9-react` — test-runner + `@storycap-testrun/node`
- `v9-react-vite` — addon-vitest + `@storycap-testrun/browser`
- `v10-react-vite` — addon-vitest + `@storycap-testrun/browser`

## Release

Versioning and publishing via [changesets](https://github.com/changesets/changesets). Use `pnpm changelog` to create a changeset.
