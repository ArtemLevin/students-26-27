# HM-02 historical recovery

This is a dedicated migration of reviewed teaching coverage for an already registered lesson. Normal publication is unchanged. The initial implementation is deliberately narrow: one cabinet, one existing lesson, additive canonical outcomes, no existing competency reconciliation, no mastery claims, no new practice assignments.

## Review and apply

1. Examine the actual lesson and catalog. Record each competency, existing HTML anchor, relation, confidence, decision, basis, exact source and reason for leaving practice unassigned. Include a review ID. Keep the eight approved exclusions.
2. Record Git blob IDs for the exact contract, catalog, HTML, metadata and registry bytes in `expectedBefore`. Obtain these from GitHub or `git hash-object --no-filters <path>`; an altered checkout is intentionally rejected. The transaction additionally checks SHA-256 snapshots.
3. Preview (default is read-only):

   ```sh
   node scripts/recover-learning-coverage.mjs <manifest.json> --dry-run
   ```

4. Review the report and candidate changes. Copy its two `expectedAfter` Git blob IDs into the manifest only after reviewing the candidate. A manifest with unresolved review decisions is not executable. Commit the sealed manifest with the migration for traceability.
5. Apply on a dedicated clean branch and review the diff:

   ```sh
   node scripts/recover-learning-coverage.mjs <sealed-manifest.json> --apply
   node scripts/student.mjs validate
   node scripts/sync-learning-coverage.mjs --check
   node shared/student-dashboard/learning-coverage.browser.mjs
   ```

6. Repeat apply to verify idempotency before committing. A second run against the exact reviewed after state is a no-op; other registry or metadata changes invalidate the manifest. For subsequent lessons prepare a fresh manifest against the updated registry. Reconcile already-linked or legacy-ID evidence separately; the initial tool refuses it rather than silently duplicating or upgrading evidence.

The only intended writes are the existing metadata file and its registry record, in a rollback-capable transaction. Full cabinet validation runs before and after the write; protected authority inputs (including mastery, KTP and practice config) are checked. New canonical links have `masteryClaim: null`; new registry entries explicitly exclude assignment generation (`practiceDisposition: none`) with a rationale in the manifest. Existing practice enrichment, metadata and legacy records are preserved.

## First pilot

The preview manifest for Timofey's 2026-07-21 lesson contains five conservative `touched` links derived from the explanatory HTML sections. Training exercise completion and assessment were not inferred. The preview is tied to the initial registry revision; after real migration it is an archived evidence record and should not be replayed as an unsealed input on a later registry.

The recovery CI applies a temporary sealed copy **only in a disposable Actions checkout** and checks exact changed paths, idempotency, package and platform contracts and all coverage pages. It never pushes the educational-data changes. Before the real pilot is published, the dedicated pilot CI fixture must be retired or updated to use the sealed record without assuming the initial before state forever.

The current phase does not address unregistered lessons, catalog expansion, subject routing, historical mastery discrepancies, or pedagogical review of all material. Those belong to subsequent stages.
