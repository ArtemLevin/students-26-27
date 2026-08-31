# practice-sync-v1

Versioned wire contract shared with `ArtemLevin/tutor-assistant-web`.

## Boundary

`students-26-27` owns PracticeState migration, browser scheduler/generators, local storage fallback, deterministic reconciliation and outbox coordination. `tutor-assistant-web` owns authenticated canonical persistence, immutable event ingestion and optimistic concurrency.

Production sync is same-origin/session based. Public GitHub Pages remain local-only until served through the authenticated portal or another reviewed short-lived handoff. No long-lived bearer token is stored in this repository.

Enablement is explicit: create the coordinator with `enabled: config.features?.serverSync === true`. Existing dashboards therefore retain local-only behavior until portal rollout.

The fixture `fixtures/sync-cycle.json` is duplicated byte-for-byte in both repositories and covered by contract tests.
