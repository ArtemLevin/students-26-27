# LEVIN / ATLAS — Migration Guide

## Goal

Adopt the system without touching competence-map data or behavioral JavaScript.

## Safe sequence

1. Read `REFERENCE_DARYA.md` and inspect Darya's navigator; inspect her lesson page when migrating dated lessons.
2. Inventory the target student's behavioral DOM/JS contracts and current fingerprint.
3. Choose at least three expression axes that will intentionally differ from Darya.
4. Add the three shared stylesheets after the page's legacy stylesheet.
5. Add `data-atlas` and fingerprint attributes to `body`.
6. Add/update `design.json` beside the page.
7. Add a small page-local adapter such as `levin-atlas.css` after shared LEVIN / ATLAS CSS.
8. Map legacy variables to `--la-*` tokens.
9. Remove shadows/radii/card treatment in the adapter where the chosen composition calls for it.
10. If route/waypoint/parallax behavior is useful, load `../../../shared/student-dashboard/atlas-motion.js` and add only semantically valid data attributes.
11. Add cross-highlighting between duplicate views of the same learning object when it improves orientation.
12. Check desktop, 1050/900 px transition, 760/620 px transition, keyboard, dark theme, reduced motion and print.
13. Only after visual validation consider deleting duplicated legacy declarations.

## Why adapters first

Existing student pages have different DOM/CSS generations. A scoped adapter lets the system ship incrementally and makes rollback one stylesheet/link removal.

## Repository rollout

As of 19.09.2026 every current `students/*/site/index.html` has a LEVIN / ATLAS fingerprint.

- Grigory Antipov keeps the dedicated `levin-atlas.css` historical pilot adapter.
- Darya Savenkova is the primary current visual/interaction reference.
- Shared living-atlas route/waypoint/parallax behavior lives in `shared/student-dashboard/atlas-motion.js`.
- The other legacy generations use shared `design-system/student-sites.css`.
- Every student site owns `design.json`.
- Functional competence-map JavaScript and learning data stay page-owned unless a migration deliberately adds a behavior such as cross-highlight without changing learning semantics.

See `STUDENT_ROSTER.md` for the current diversity matrix.
