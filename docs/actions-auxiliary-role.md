# GitHub Actions Auxiliary Role

Created: 2026-05-01

## Decision

For Price-Drop, GitHub Actions should be a **watchdog**, not a producer.

Allowed:

- schema validation
- freshness/staleness checks
- GitHub Pages JSON checks
- static syntax/smoke checks
- alerting through failed workflow status

Not allowed:

- overwriting `data/deals.json` from legacy CSV
- running `scripts/update-deals.js` as a scheduled producer
- storing PAT/key/token values in workflow files
- closing MangoOps items automatically

## Current blocker

The current OAuth token cannot create/update `.github/workflows/*` because it lacks `workflow` scope.
Therefore the workflow is stored as:

- `docs/freshness-check-workflow.example.yml`

When a workflow-capable PAT or GitHub UI access is available, copy it to:

- `.github/workflows/freshness-check.yml`

## Recommended workflow contents

The example workflow should run:

```bash
node scripts/validate-public-feeds.js
node scripts/check-freshness.js --source=local
node scripts/check-freshness.js --source=pages
```

It should use `permissions: contents: read` only.
