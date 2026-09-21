# LEVIN / ATLAS — Design Rules

## Prohibited default vocabulary

Do not use these as automatic design choices:
- generic SaaS hero followed by identical feature cards;
- glassmorphism;
- purple/blue AI gradients;
- gradient text;
- decorative blur blobs;
- large soft shadows everywhere;
- 16–28 px radii on every container;
- random icon decoration;
- pill controls without a functional reason;
- centering every section;
- putting every semantic unit into a card;
- repeated 3-column feature grids.

## Preferred order of operations

Before creating a container/card, try:
1. typography;
2. whitespace;
3. a rule;
4. an index;
5. a scale;
6. a table/list;
7. a diagram;
8. marginalia.

## Reference requirement

Darya Savenkova is the current reference implementation for the LEVIN / ATLAS quality bar. Use `REFERENCE_DARYA.md` to inherit grammar, interaction purpose and anti-AI discipline.

The reference must not become a cloning template. A redesigned student should differ from Darya or the nearest migrated student in at least three expression/fingerprint axes.

## Composition requirement

Every page needs at least one strong composition gesture: asymmetric split, oversized index, radial dominance, technical side rail, catalog spine, or comparable structure. Decoration alone does not count.

## One-signature rule

Each student page gets one distinctive visual motif. Repeat it consistently; do not accumulate unrelated motifs.

## Accessibility

- keyboard focus is visible;
- hit areas are practical on touch;
- contrast remains sufficient in both themes;
- status meaning survives grayscale;
- reduced-motion is respected;
- page structure remains legible at 200% zoom.

## Release quality gate

Before shipping, verify:
1. The page cannot be mistaken for a generic generated SaaS template.
2. The fingerprint differs materially from recent student pages.
3. LEVIN / ATLAS identity is still recognizable.
4. Decorative elements have a content or navigation role.
5. Card count has been challenged and reduced where possible.
6. Type hierarchy remains strong with animation disabled.
7. Mobile is a composition, not a squeezed desktop.
8. The radial map and learning data remain the primary product.
9. Dark/light theme behavior remains coherent.
10. The page is usable with keyboard only.
11. The page belongs to the same LEVIN / ATLAS family as Darya without copying her exact palette/composition/image assignment.
12. Route rail, waypoint drift, parallax, Navigator and glow are present only where they communicate orientation, state or next action.

## Automated repository guardrail

The human release gate above is backed by `design-system/test-contract.mjs`.

For every `students/**/site/index.html`, CI requires:

1. adjacent `design.json`;
2. fingerprint fields valid against the repository schema contract;
3. a unique complete fingerprint tuple;
4. runtime `data-atlas-*` values consistent with `design.json`;
5. shared `tokens.css`, `foundations.css`, and `archetypes.css`;
6. either `student-sites.css` or a local LEVIN / ATLAS adapter.

This guardrail checks structural identity. Artistic quality, composition strength, semantic hierarchy, accessibility and anti-template judgment remain part of review.
