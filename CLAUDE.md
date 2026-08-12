# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program called "Hyper" built with Taro 3.6 + React 18 + TypeScript. Primary target is WeChat (`weapp`), with Taro scripts available for other platforms (H5, Alipay, etc.).

## Commands

- Install: `pnpm install` (lockfile: `pnpm-lock.yaml`)
- Dev watch (WeChat): `npm run dev:weapp`
- Production build (WeChat): `npm run build:weapp`
- H5 dev/build: `npm run dev:h5` / `npm run build:h5`
- Type check: `npx tsc --noEmit`
- Run tests: `npm test` (Jest, tests in `__tests__/`)
- Encoding check: `npm run check:encoding`
- Pre-commit lint: `npx lint-staged`

## Architecture

### Entry & Routing
- `src/app.tsx` — Root component. Handles auth gating (redirects to `/pages/auth/index` when no token), IM service init, token auto-refresh, and event bus wiring.
- `src/app.config.ts` — Page routes and subpackages. Main pages: index (map), square (feed), message, user, auth, auth-code. Subpackages: activity, venue, order, square-sub, user-sub, chat, my-tickets.
- `src/custom-tab-bar/index.tsx` — 5-slot tab bar (4 nav tabs + lightning "+" button for creating posts). Class component subscribing to `tabBarStore`.

### Auth & HTTP
- `src/utils/request.ts` — Auth-aware HTTP client. Base URL: `https://www.hypercn.cn`. Bearer token injection, 401 interception with token refresh queue, auto-refresh at 80% of token lifetime. Emits `FORCE_LOGOUT` on failed refresh.
- Auth flow uses `Taro.storage` for tokens (`access_token`, `refresh_token`, `access_expire`). Login via `pages/auth` (video background) or `pages/auth-code` (SMS code).

### State Management
- Valtio for tab bar state (`src/store/tabbar.ts`).
- Most state is local to each page via React hooks. No centralized Redux/Zustand store.

### Key Event Bus (Taro.eventCenter)
- `FORCE_LOGOUT` — triggers auth gate redirect
- `AUTH_LOGIN_SUCCESS` — reconnects IM
- `TOKEN_REFRESHED` — reconnects IM with new token
- `USER_INFO_UPDATED` — reconnects IM
- `TAB_SWITCH_LOADING` — shows/hides global loading mask

### IM (Instant Messaging)
- `src/utils/im.ts` — WebSocket-based chat service. Singleton pattern via `IMService.getInstance()`.

### Styling
- Less for component styles + Tailwind CSS via `weapp-tailwindcss` plugin.
- Design width: 750 (standard Taro mobile design). Path alias: `@/*` → `./src/*`.

### Build Config
- `config/index.ts` — Taro + Webpack 5 + `weapp-tailwindcss` integration. Env vars prefixed `YDY_` from `.env.development` / `.env.production`.

## Guardrails

- Run `npm run check:encoding` before committing if you touched Chinese text or older pages with known encoding issues.
- Avoid full rewrites of historically fragile pages (e.g., `src/pages/activity/index.tsx`). Use minimal patches.
- After syntax or encoding fixes in fragile pages, run `npx tsc --noEmit` before finishing.
- Pre-commit hook runs `lint-staged` (ESLint + mojibake check). If partially staged files cause stale errors, re-`git add` before retrying.
