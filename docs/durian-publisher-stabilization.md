# Durian Publisher Stabilization Runbook

Created: 2026-05-01
Target repo: `SuperGuava/myrealtrip-price-drop`
Owner: Mango Apply Lane
Publisher: MangoBingsu / Durian n8n line

## Decision

The publisher of Price-Drop data is **not** GitHub Actions.

- Producer/publisher: MangoBingsu Collector + Durian n8n + Mango ops direct commit path
- Watchdog: freshness/schema checks
- Final Apply/incident decision: Mango

GitHub Actions may assist with validation later, but must not overwrite data or run legacy CSV updaters.

## Publisher contract

A publisher run is healthy only if all conditions hold:

1. It updates one or more public feeds under `data/`.
2. It preserves MangoBingsu protocol v1 fields in `data/deals.json`:
   - `runId`, `theme`, `metrics.discoveredCount`
   - deal `lowType`, `label`, `evidence.reason`, `display.why`, `tags`
   - optional `priceComparison.sources`, `priceComparison.verdict`
   - optional `lastComparisonSweep`
3. It does not expose PAT/key/token values in commits, logs, cards, or Telegram.
4. It passes schema validation.
5. It passes freshness validation after publish.
6. It leaves an evidence trail: commit hash + checkedAt/updatedAt + source run id.

## Pre-publish guard

Before changing data, the publisher should run:

```bash
node scripts/validate-public-feeds.js
node scripts/check-freshness.js --source=local
```

If the current feed is already invalid, stop and report to Mango instead of overwriting blindly.

## Post-publish guard

After changing and committing data, run:

```bash
node scripts/validate-public-feeds.js
node scripts/check-freshness.js --source=local
node scripts/check-freshness.js --source=pages
```

`--source=pages` may lag briefly after push. If local passes and pages is stale, wait for Pages propagation before declaring failure.

## Incident labels

Use these labels in MangoOps reports:

- `publisher_ok`: data published, validation passed, pages fresh enough
- `publisher_local_ok_pages_lag`: local valid, Pages not propagated yet
- `publisher_schema_blocked`: schema validation failed; do not publish further
- `publisher_stale`: feed freshness exceeded threshold
- `publisher_access_blocked`: PAT/repo/write permission problem

## Legacy updater rule

Do not connect `scripts/update-deals.js` to cron or GitHub Actions.
It is an old CSV MVP updater and can erase rich protocol fields.

If a new updater is needed, build a schema-preserving publisher and validate it against `scripts/validate-public-feeds.js`.
