# LEVIN / ATLAS — Migration Guide

## Goal

Adopt the system without touching competence-map data or behavioral JavaScript.

## Safe sequence

1. Add the three shared stylesheets after the page's legacy stylesheet.
2. Add `data-atlas` and fingerprint attributes to `body`.
3. Add `design.json` beside the page.
4. Add a small page-local adapter such as `levin-atlas.css` after shared LEVIN / ATLAS CSS.
5. Map legacy variables to `--la-*` tokens.
6. Remove shadows/radii/card treatment in the adapter where the chosen composition calls for it.
7. Check desktop, 1050/900 px transition, 760/620 px transition, keyboard, dark theme and print.
8. Only after visual validation consider deleting duplicated legacy declarations.

## Why adapters first

Existing student pages have different DOM/CSS generations. A scoped adapter lets the system ship incrementally and makes rollback one stylesheet/link removal.

## Repository rollout

As of 19.09.2026 every current `students/*/site/index.html` has a LEVIN / ATLAS fingerprint.

- Grigory Antipov keeps the dedicated `levin-atlas.css` pilot adapter.
- The other legacy generations use shared `design-system/student-sites.css`.
- Every student site owns `design.json`.
- Functional competence-map JavaScript and learning data stay page-owned and unchanged by the visual migration.

See `STUDENT_ROSTER.md` for the current diversity matrix.
