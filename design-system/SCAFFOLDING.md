# LEVIN / ATLAS — Student scaffolder

Use the repository-native scaffolder for every new student cabinet.

Basic command:

    node scripts/create-student.mjs ivan_ivanov \
      --name "Иван Иванов" \
      --grade "10 класс" \
      --program "ЕГЭ, профильная математика"

It creates students/ivan_ivanov/site/design.json and students/ivan_ivanov/site/index.html and appends the chosen fingerprint to design-system/STUDENT_ROSTER.md.

## Fingerprint selection

The selector scans every existing students/**/site/design.json, generates valid archetype candidates, removes complete duplicates, and ranks the rest by maximum minimum Hamming distance across composition, accent, density, geometry, typography and motion. Ties prefer less-used axis values, then less-used composition and accent, with a deterministic lexical final tie-break.

## Overrides

Art direction can constrain composition and/or accent:

    node scripts/create-student.mjs ivan_ivanov --composition blueprint --accent forest

The selector still chooses the remaining axes and refuses a complete duplicate.

## Dry run

    node scripts/create-student.mjs ivan_ivanov --name "Иван Иванов" --dry-run

No files are written.

## Safety

Existing site/index.html, design.json, or a non-empty site directory are never overwritten. After a real creation the command runs design-system/test-contract.mjs. If verification fails, the generated site directory is removed and the roster is restored.

The --no-verify option is intended only for isolated tests and exceptional maintenance.

## Next implementation step

The scaffold is a cabinet shell. After creation, inspect the student's program and materials, replace placeholder metrics, build the competency catalog with stable IDs, connect the radial map, add lesson/material links, and run dashboard-specific tests plus the LEVIN / ATLAS contract.
