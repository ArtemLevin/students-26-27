# LEVIN / ATLAS — Agent Brief

When creating or redesigning a personal student navigator:

1. Read `design-system/DESIGN_SYSTEM.md`, `DESIGN_RULES.md`, `COMPOSITIONS.md`, and `FINGERPRINTS.md`.
2. Inspect the most recent student fingerprints.
3. Choose a fingerprint before writing HTML/CSS.
4. Preserve the radial competence map as a product primitive where the curriculum supports it.
5. Derive visual decisions from learning information, not decoration.
6. Build composition with typography, whitespace, rules, indexes, scales and diagrams before considering card containers.
7. Use only one accent family per student.
8. Keep application behavior and competence-map semantics stable unless the task explicitly changes them.
9. Use shared `--la-*` tokens and a scoped local adapter.
10. Run the quality gate from `DESIGN_RULES.md` before finalizing.

Required anti-template constraint: if the first draft resembles a generic hero + cards SaaS page, revise the composition before shipping.

## Mandatory repository deliverables

For every new or redesigned `students/**/site/index.html`:

- create/update adjacent `design.json`;
- expose matching `data-atlas-composition`, `data-atlas-accent`, `data-atlas-density`, and `data-atlas-motion` on `body`;
- load `tokens.css`, `foundations.css`, and `archetypes.css`;
- load `student-sites.css` or a deliberate local LEVIN / ATLAS adapter;
- keep the complete fingerprint tuple unique across entry cabinets;
- run `node design-system/test-contract.mjs` before commit.

Dated lesson pages and labs remain portable lesson artifacts and are outside the mandatory fingerprint contract.
