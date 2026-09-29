# CI merge gate

The student-dashboard workflow exposes one stable required-check context:

`merge gate`

## Runtime model

- Every pull request starts the workflow, so the required context is always reported.
- Feature-branch pushes do not start a duplicate dashboard workflow.
- Pushes to `main` still run the regression suite for dashboard-relevant changes.
- Material-only changes such as `tex_docs/**`, `pdf_docs/**`, posters, or unrelated documentation take the lightweight path.
- Dashboard/site/runtime/design/pipeline changes run the full regression suite.
- Concurrency cancels stale runs for the same pull request.
- `merge gate` fails if change classification fails or any required heavy job fails/cancels. Intentionally skipped heavy jobs are accepted only when the classifier selected the lightweight path.

## Repository setting

Protect `main` with a single required status check named exactly:

`merge gate`

Recommended settings:
- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Required check: `merge gate`.
- Do not require each matrix child separately; `merge gate` aggregates them.
- Include administrators if direct pushes to `main` should be blocked for the repository owner as well.

This repository setting lives in GitHub administration state and is intentionally separate from workflow source.
