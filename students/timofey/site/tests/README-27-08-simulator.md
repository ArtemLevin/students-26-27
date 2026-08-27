# 27.08.26 simulator checks

The lesson simulator is covered by two lightweight regression checks:

- `lesson-27-08-simulator.mjs` validates the mathematical core (trajectory roots and vertex, unit conversion and rail temperature, fourth-root scaling, exponent subtraction).
- `lesson-27-08-simulator-static.mjs` validates the page/module contract and the presence of the main interactive affordances.

Both are imported by `dashboard-regression.mjs`, so the existing Timofey dashboard CI job executes them automatically.
