# GitHub GitFut

[![Install userscript](https://img.shields.io/badge/Install-userscript-238636?style=for-the-badge)](https://raw.githubusercontent.com/NemoKing1210/github-gitfut/main/github-gitfut.user.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.0-green?style=for-the-badge)](CHANGELOG.md)

A userscript for GitHub that adds [GitFut](https://gitfut.com) scouting — World Cup–style player cards rated out of 99 — while you browse profiles and hover user avatars.

Open any public GitHub profile and see overall rating, position, finish tier, six football stats, and playstyles. Hover an avatar anywhere on GitHub to get the same scouting snapshot in the native popover.

Example scout report: [gitfut.com/NemoKing1210](https://gitfut.com/NemoKing1210)

Compatible with [Tampermonkey](https://www.tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/), [Greasemonkey](https://www.greasespot.net/), ScriptCat, and other managers that support the `// ==UserScript==` metadata block.

## Quick install

1. Install a userscript manager (Tampermonkey or Violentmonkey recommended).
2. Click the install link below — your manager should open an installation prompt.

**Install URL:**

```
https://raw.githubusercontent.com/NemoKing1210/github-gitfut/main/github-gitfut.user.js
```

[![Install](https://img.shields.io/badge/⬇_Install-GitHub_GitFut-0d1117?style=for-the-badge&labelColor=238636)](https://raw.githubusercontent.com/NemoKing1210/github-gitfut/main/github-gitfut.user.js)

### Install from URL (dashboard)

| Manager | Path |
|---------|------|
| Tampermonkey | Dashboard → **Utilities** → **Install from URL** |
| Violentmonkey | Dashboard → **+** → **Install from URL** |
| Greasemonkey | Add-on menu → **New User Script** → paste the raw URL |

Paste the [install URL](#quick-install) above.

### Manual install

1. Open [`github-gitfut.user.js`](github-gitfut.user.js) in this repository.
2. Copy the entire file contents.
3. In your userscript manager, create a new script and paste the code.
4. Save and enable the script.

## Updates

The script includes `@updateURL` and `@downloadURL` metadata pointing to the raw GitHub file. Supported managers check for updates automatically (Tampermonkey: Dashboard → check interval; Violentmonkey: similar).

**To release a new version:**

1. Bump `@version` in `github-gitfut.user.js` and `github-gitfut.meta.js`.
2. Add an entry to [`CHANGELOG.md`](CHANGELOG.md).
3. Push to `main` (or create a GitHub Release).

Managers compare the installed `@version` with the remote metadata to decide whether to offer an update.

## Features

- **Profile scout panel** — overall (OVR), position, finish tier, PAC / SHO / PAS / DRI / DEF / PHY, attributes, and playstyles in the profile sidebar
- **Avatar hovercard** — GitFut block inside GitHub’s native popover on avatar hover
- **Finish-tier theming** — profile panel and popover tint, glow, and shine scale with Bronze → Icon / Founder
- **Settings panel** — header button + manager menu: card style (Standard / FIFA / Neon), version, hovercard injection, cache stats / remaining space, cache duration, clear cache
- **Smart caching** — responses cached locally to reduce API load
- **Soft navigation** — works with GitHub Turbo / soft-nav profile switches
- **10 UI languages** — English, Russian, Chinese, Spanish, Portuguese, German, French, Japanese, Korean, Polish (detected from browser locale)

## Supported pages

| Site | URL pattern |
|------|-------------|
| GitHub | `https://github.com/*` |
| Gist | `https://gist.github.com/*` |

Profile panels appear on user overview pages (`github.com/{username}`). Hovercard injection runs whenever GitHub shows a user avatar popover.

## Finish tiers

| Finish | Typical OVR | Accent |
|--------|-------------|--------|
| Bronze | ≤ 64 | Copper |
| Silver | 65–74 | Steel |
| Gold | 75–84 | Gold |
| In-Form (TOTW) | activity spike | Crimson |
| TOTY | 85–89 | Blue |
| Icon | 90+ | Ivory / purple |

## How it works

```
GitHub page loads / soft-navigates
       │
       ├── Profile URL? ──► Inject loader in `.js-profile-editable-area`
       │
       └── Avatar hover? ──► GitHub opens `.Popover.js-hovercard-content`
                │
                ▼
       Check local cache (GM_getValue)
                │
       cache miss ──► GET gitfut.com/api/card/{username}
                │         (max 2 concurrent, staggered starts)
                ▼
       Render scout panel / hovercard block · link to gitfut.com/{username}
```

### Data source

Card JSON:

```
GET https://gitfut.com/api/card/{username}
```

Full scout report:

```
https://gitfut.com/{username}
```

### Caching

Results are stored in Tampermonkey/Violentmonkey storage (`gf_github_cache_v1`). TTL is configurable in the settings panel (default **12 hours**; `0` disables caching). Use **Clear cache** in settings to drop all stored lookups.

Duplicate in-flight requests for the same username are deduplicated.

### Settings

Open **GitFut** in the GitHub header (or the userscript manager menu) to configure:

| Setting | Default | Notes |
|---------|---------|--------|
| Card style | Standard | Standard, FIFA (metallic), or Neon (dark + glow) |
| Show GitFut in avatar hovercards | On | Injects into GitHub’s native user popover |
| Cache duration (hours) | 12 | Max 168 (7 days); `0` disables |
| Clear cache | — | Immediate; does not require Save |

## Repository layout

```text
github-gitfut/
├── github-gitfut.user.js   # Installable userscript (canonical distribution file)
├── github-gitfut.meta.js   # Metadata-only companion for faster update checks
├── README.md               # Documentation and install instructions
├── CHANGELOG.md            # Version history
├── LICENSE                 # MIT license
└── .gitattributes          # GitHub linguist overrides
```

| File | Purpose |
|------|---------|
| `github-gitfut.user.js` | Full script served at `@downloadURL` / `@updateURL` |
| `github-gitfut.meta.js` | Lightweight metadata mirror; managers may fetch it instead of the full script when checking for updates |

## Script metadata

Key `// ==UserScript==` fields used by managers:

| Field | Value |
|-------|-------|
| `@namespace` | `https://github.com/NemoKing1210/github-gitfut` |
| `@version` | Semantic version (must be bumped on every release) |
| `@updateURL` / `@downloadURL` | Raw GitHub URL of `github-gitfut.user.js` |
| `@homepageURL` | This repository |
| `@supportURL` | GitHub Issues |
| `@license` | MIT |
| `@grant` | `GM_xmlhttpRequest`, `GM_getValue`, `GM_setValue`, `GM_addStyle`, `GM_registerMenuCommand` |
| `@connect` | `gitfut.com` |

Localized `@name` and `@description` tags are provided for en, ru, zh-CN, es, pt-BR, de, fr, ja, ko, and pl.

## Required permissions

| Grant | Purpose |
|-------|---------|
| `GM_xmlhttpRequest` | Fetch card data from GitFut (bypasses CORS) |
| `GM_getValue` / `GM_setValue` | Persist response cache and settings |
| `GM_addStyle` | Inject panel and badge styles |
| `GM_registerMenuCommand` | Open settings from the manager menu |

`@connect` is limited to `gitfut.com`.

## Development

### Local workflow (Violentmonkey)

1. Clone this repository.
2. In Violentmonkey, install from the local `github-gitfut.user.js` file.
3. Enable **Track local file** before closing the install dialog.
4. Edit the file in your IDE — changes apply after a page reload.

### Local workflow (Tampermonkey)

Tampermonkey does not track local files natively. Options:

- Reinstall from URL after each change, or
- Use a local HTTP server and temporarily point `@updateURL` / `@downloadURL` to `http://localhost:...` during development (do not commit local URLs).

### Configuration

Constants near the top of `github-gitfut.user.js` can be adjusted:

| Constant | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT` | 2 | Parallel API requests |
| `REQUEST_DELAY_MS` | 100 ms | Delay between starting queued API tasks |
| `CACHE_PERSIST_MS` | 1000 ms | Debounce interval for writing cache to storage |
| `SCAN_DEBOUNCE_MS` | 400 ms | Debounce for DOM / soft-nav rescans |

## Data source

All scouting data comes from the public GitFut API. See [Younesfdj/gitfut](https://github.com/Younesfdj/gitfut) for how ratings are derived from GitHub activity.

This project is **not affiliated** with GitHub, Microsoft, or GitFut. Ratings are community-generated and may be incomplete or outdated. Use them as a fun reference, not as a guarantee.

## License

[MIT](LICENSE) — Copyright (c) 2026 NemoKing
