# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-07-16

### Changed

- Settings entry moved from the GitHub header button into the account avatar menu (Global navigation), next to Settings; userscript manager menu command unchanged

## [1.6.0] - 2026-07-16

### Added

- **Neon** card style: dark glass panels with finish-colored neon borders, OVR glow, and a soft pulse on higher tiers

## [1.5.3] - 2026-07-16

### Changed

- Profile scout panel expands smoothly on insert and when swapping skeleton → card (respects `prefers-reduced-motion`)

## [1.5.2] - 2026-07-16

### Changed

- Duel links use `gitfut.com/{you}/vs/{opponent}` when signed into GitHub (falls back to `/{opponent}/vs` if logged out or viewing yourself)

## [1.5.1] - 2026-07-16

### Changed

- FIFA card style now uses distinct metallic finishes (Bronze, Silver, Gold, Inform, TOTY, Icon, Founder) instead of a nearly colorless flat look; still no glow / shine / pulse

## [1.5.0] - 2026-07-16

### Added

- Card style setting: **Standard** (current finish glow / shine) or **FIFA** (restrained colors, no extra highlights)

## [1.4.1] - 2026-07-16

### Added

- Script version shown in the settings panel header
- Cache stats in settings: cached card count, used/free size, and a remaining-space progress bar

## [1.4.0] - 2026-07-16

### Removed

- Live card PNG on profile pages (`gf-card-img-wrap` / `gitfut.com/{username}.png`) and the related settings toggle — the image endpoint is unreliable

## [1.3.1] - 2026-07-16

### Changed

- Finish shine on profile panel and hovercards plays once on appear, then fades out (no loop)

## [1.3.0] - 2026-07-16

### Changed

- Profile scout panel restyled to match hovercard finish theming: tinted gradients, tier glow, OVR badge, shine, and pulse on higher finishes
- Profile loading state uses a layout skeleton instead of plain “Scouting…” text

## [1.2.2] - 2026-07-16

### Changed

- Slightly larger border radius on themed avatar hovercards
- Hovercard loading state uses a layout skeleton instead of plain “Scouting…” text

## [1.2.1] - 2026-07-16

### Removed

- Animated top accent bar on high-tier avatar hovercards (looked like a progress loader)

## [1.2.0] - 2026-07-16

### Added

- Finish-tier theming for the whole avatar hovercard: tinted background, accent bar, outer glow, and shine that scale with Bronze → Icon / Founder
- Pulse / shimmer motion on higher tiers (In-Form, TOTY, Icon, Founder); respects `prefers-reduced-motion`

## [1.1.0] - 2026-07-16

### Changed

- Inline OVR badges next to usernames replaced with GitFut data inside GitHub’s native avatar hovercard popover

### Added

- Compact scout block in user hovercards: OVR, position, finish, six stats, archetype, and links to the full report / duel page
- Setting to enable or disable hovercard injection

## [1.0.0] - 2026-07-16

### Added

- GitFut scout panel on GitHub user profile sidebars (overall, position, finish, six stats, attributes, playstyles)
- Optional live card image from `gitfut.com/{username}.png`
- Compact OVR + position badges next to user links across GitHub (lazy-loaded)
- Local response cache with configurable TTL and clear-cache action
- Settings button in the GitHub header plus userscript manager menu command
- UI localization for 10 languages based on browser locale (fallback: English)
- Soft-navigation support (Turbo / soft-nav / pjax) so panels survive in-site profile switches
- Tampermonkey / Violentmonkey / Greasemonkey-compatible metadata and auto-update URLs

[1.2.1]: https://github.com/NemoKing1210/github-gitfut/releases/tag/v1.2.1
[1.2.0]: https://github.com/NemoKing1210/github-gitfut/releases/tag/v1.2.0
[1.1.0]: https://github.com/NemoKing1210/github-gitfut/releases/tag/v1.1.0
[1.0.0]: https://github.com/NemoKing1210/github-gitfut/releases/tag/v1.0.0
