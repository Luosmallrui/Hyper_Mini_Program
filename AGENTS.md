# AGENTS

## Repo Snapshot
- Stack: Taro 3 + React 18 + TypeScript + Webpack 5.
- Primary app target in current usage: WeChat Mini Program via `taro build --type weapp`.
- Tailwind-for-weapp is wired through `weapp-tailwindcss` in [`config/index.ts`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/config/index.ts).
- All Taro build scripts in [`package.json`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/package.json) pass `--env-prefix YDY_`.

## Install
- Lockfile present: `pnpm-lock.yaml`.
- Dependencies can still be installed with the package manager available in the environment:
  - `npm install`
  - `pnpm install`

## Common Commands
- WeChat Mini Program dev watch: `npm run dev:weapp`
- WeChat Mini Program production build: `npm run build:weapp`
- H5 dev watch: `npm run dev:h5`
- H5 build: `npm run build:h5`
- Encoding/mojibake check: `npm run check:encoding`
- Manual pre-commit reproduction: `npx lint-staged`
- Jest entrypoint: `npm test`
- TypeScript check: `npx tsc --noEmit`
- Other supported Taro targets also have matching `build:*` and `dev:*` scripts: `swan`, `alipay`, `tt`, `rn`, `qq`, `jd`, `quickapp`, `harmony-hybrid`.
- All `dev:*` scripts are thin wrappers around the corresponding `build:*` script with `--watch --mode development`.

## Test Workflow
- Jest uses [`jest.config.ts`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/jest.config.ts) with `jsdom`.
- Current test discovery is limited to `__tests__/**/*.(spec|test).[jt]s?(x)`.
- There is no dedicated `test:weapp` script in [`package.json`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/package.json); README's "测试版本" command is stale.

## Commit Workflow
- `postinstall` runs `weapp-tw patch`.
- `prepare` runs `husky install`.
- Pre-commit hook executes `npx lint-staged` via [`.husky/pre-commit`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/.husky/pre-commit).
- `lint-staged` behavior from [`package.json`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/package.json):
  - `src/**/*.{js,jsx,ts,tsx}`: `eslint --fix --quiet` + `node scripts/check-mojibake.js`
  - `*.{md,less,scss,css,json}`: `node scripts/check-mojibake.js`
- If a commit UI appears stuck on "Preparing lint-staged", run `npx lint-staged` manually to see the underlying failure.
- With partially staged files (`git status` shows `MM`), `lint-staged` checks the staged version; re-`git add` the target file before retrying if errors look stale.

## Guardrails
- Before commit, prefer running `npm run check:encoding` if you touched Chinese copy or older pages with known encoding risk.
- [`scripts/check-mojibake.js`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/scripts/check-mojibake.js) scans tracked text files by default and skips `node_modules/`, `.git/`, `dist/`, and `.husky/_/`.
- `scripts/check-mojibake.js` also blocks the replacement character `U+FFFD`; describe it as `U+FFFD` in docs instead of pasting the raw character.
- Avoid full-file rewrites in historically fragile pages such as `src/pages/activity/index.tsx`; use minimal patches where possible.
- After repairing syntax or mojibake damage in fragile pages, run `npx tsc --noEmit` before finishing.

## TODO
- README currently mentions `pnpm run test:weapp`, but no `test:weapp` script exists in [`package.json`](/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/package.json). Keep `AGENTS.md` aligned with actual scripts until README is corrected.
