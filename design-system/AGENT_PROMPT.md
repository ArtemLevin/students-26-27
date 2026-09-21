# LEVIN / ATLAS — Agent Brief

When creating or redesigning a personal student navigator:

1. Read `design-system/DESIGN_SYSTEM.md`, `DESIGN_RULES.md`, `COMPOSITIONS.md`, `FINGERPRINTS.md`, and `REFERENCE_DARYA.md`.
2. Inspect `students/darya_savenkova/site/index.html` and, for lesson work, `students/darya_savenkova/site/14.09.26.html` as the current quality reference.
3. Inspect the target student's current page, latest lessons and recent fingerprints.
4. Choose a fingerprint before writing HTML/CSS and deliberately change at least three expression axes versus the nearest visual neighbor.
5. Preserve the radial competence map as a product primitive where the curriculum supports it.
6. Derive visual decisions from learning information, not decoration.
7. Build composition with typography, whitespace, rules, indexes, scales and diagrams before considering card containers.
8. Use only one accent family per student.
9. Keep application behavior and competence-map semantics stable unless the task explicitly changes them.
10. Use shared `--la-*` tokens and a scoped local adapter.
11. Reuse `shared/student-dashboard/atlas-motion.js` for route/waypoint/parallax behavior when those primitives are appropriate; do not fork a student-local copy.
12. Run the quality gate from `DESIGN_RULES.md` before finalizing.

Required anti-template constraint: if the first draft resembles a generic hero + cards SaaS page, revise the composition before shipping.

Required anti-clone constraint: Darya sets the grammar and quality bar. Copying her exact palette, hero composition, image placement and route treatment into another student is also a failed draft.

## Mandatory repository deliverables

For a brand-new student, start with `node scripts/create-student.mjs <slug>`; see `design-system/SCAFFOLDING.md`.

For every new or redesigned `students/**/site/index.html`:

- create/update adjacent `design.json`;
- expose matching `data-atlas-composition`, `data-atlas-accent`, `data-atlas-density`, and `data-atlas-motion` on `body`;
- load `tokens.css`, `foundations.css`, and `archetypes.css`;
- load `student-sites.css` or a deliberate local LEVIN / ATLAS adapter;
- keep the complete fingerprint tuple unique across entry cabinets;
- run `node design-system/test-contract.mjs` before commit;
- when adopting living-atlas motion, load `../../../shared/student-dashboard/atlas-motion.js` instead of duplicating it in the student's folder;
- record which three or more axes intentionally differ from the Darya reference.

Dated lesson pages and labs remain portable lesson artifacts and are outside the mandatory fingerprint contract.
