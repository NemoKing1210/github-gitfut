# AGENTS.md — GitHub GitFut

Instructions for AI coding agents working in this repository.

## Project

Userscript that adds [GitFut](https://gitfut.com) scouting cards on GitHub profile pages and inside native avatar hovercard popovers. Compatible with Tampermonkey, Violentmonkey, Greasemonkey, and similar managers.

- **Canonical script:** `github-gitfut.user.js` (also `@downloadURL` / `@updateURL`)
- **Metadata companion:** `github-gitfut.meta.js` (must stay in sync with the userscript header)
- **Docs:** `README.md`, `CHANGELOG.md` (Keep a Changelog + SemVer)
- **License:** MIT

No build step, bundler, tests, or package manager. Edit the `.user.js` file directly.

## Repository layout

```text
github-gitfut/
├── github-gitfut.user.js   # Full installable userscript
├── github-gitfut.meta.js   # Metadata-only mirror for update checks
├── README.md
├── CHANGELOG.md
├── LICENSE
├── AGENTS.md               # This file (cross-tool agent instructions)
└── CLAUDE.md               # Claude Code entry → imports AGENTS.md
```

## Architecture (high level)

1. Detect profile username from `github.com/{username}` (skip reserved paths).
2. Inject a scout panel into `.js-profile-editable-area` (after followers block / before `.vcard-details`).
3. Watch `.Popover.js-hovercard-content` and inject a GitFut block into the native user hovercard on avatar hover.
4. Fetch `GET https://gitfut.com/api/card/{username}` via `GM_xmlhttpRequest`.
5. Optionally show `https://gitfut.com/{username}.png` on profile pages and link to the full report / duel page.
6. Cache in `GM_getValue` / `GM_setValue` (`gf_github_cache_v1`); settings in `gf_github_settings`.
7. Re-scan on Turbo / soft-nav / pjax / `MutationObserver` because GitHub navigates without full reloads.

Keep rate limits polite: `MAX_CONCURRENT`, `REQUEST_DELAY_MS`, cache TTL; avoid re-fetching the same hovercard login while `gfState` is loading/ready.

## Conventions

- Single IIFE with `'use strict'`; vanilla JS only (no frameworks).
- Prefer existing patterns: constants at top, locale maps, cache, API queue, panel/badge UI.
- Match GitHub Primer tokens where possible (`--fgColor-*`, `--bgColor-*`, `--borderColor-*`).
- Finish tier colors follow GitFut (bronze / silver / gold / totw / toty / icon / founder).
- Do not expand `@connect` or `@grant` beyond what is needed.
- Do not commit localhost `@updateURL` / `@downloadURL` values.
- Keep `github-gitfut.meta.js` identical to the `==UserScript==` block in the `.user.js` file.

## Releases

When shipping a user-visible change:

1. Bump `@version` in **both** `github-gitfut.user.js` and `github-gitfut.meta.js`.
2. Add a Keep a Changelog entry in `CHANGELOG.md`.
3. Update README version badge / docs if they mention the version or new behavior.

## Localization

UI locales: `en`, `ru`, `zh`, `es`, `pt`, `de`, `fr`, `ja`, `ko`, `pl`.

- Add every new user-facing string to **all** `TRANSLATIONS` locales.
- Keep localized `@name` / `@description` metadata tags aligned when changing the product description.

## Do not

- Add a build toolchain, TypeScript, or npm unless explicitly requested.
- Imply affiliation with GitHub, Microsoft, or GitFut in docs or UI copy.
- Scout organization accounts as if they were users without verifying API support.
- Spam the GitFut API (respect cache, concurrency caps, and hovercard state guards).

## Local testing

- **Violentmonkey:** install local file + enable Track local file; reload GitHub after edits.
- **Tampermonkey:** reinstall from file/URL, or temporary local server URLs (do not commit them).
- Smoke-test a known profile (e.g. [NemoKing1210 on GitFut](https://gitfut.com/NemoKing1210)) and soft-nav to another user.
