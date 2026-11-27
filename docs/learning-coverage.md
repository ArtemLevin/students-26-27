# Cumulative learning coverage (Student Platform v2)

Each canonical student cabinet now loads cumulative teaching coverage from its contract's lesson registry and competency catalog. The coverage is a read-only projection of published lesson evidence; no separate mutable counter or mastery writes are needed. For a new lesson, normal publication via scripts/publish-lesson.mjs must include reviewed outcomes with stable competency IDs, evidence anchors and relation (touched, practiced, assessed). No assessment is inferred from lesson attendance or topic coverage.

All lessons are retained. The highest documented relation for each skill survives subsequent repetition; each unique ID is counted once. First appearance in the latest lesson is marked separately. Historical records with explicit known ID and positive legacy level appear as historical evidence, without asserting a canonical relation or mastery. Unlinked records are excluded. Existing mastery, practice and KTP remain independent. Sofia's native coverage mode uses the same pure shared calculator. Other cabinets receive a cumulative interactive matrix beside their existing mastery heatmap.

The scaffolder includes the shared adapter. To repair or audit adapters, run:

    node scripts/sync-learning-coverage.mjs --check
    node scripts/sync-learning-coverage.mjs --apply
    node --test shared/student-dashboard/learning-coverage.test.mjs

The separate legacy chemistry archive lacks a dedicated v2 contract and is not included in the canonical student coverage map. Do not mix its topics into a different subject's catalog.
