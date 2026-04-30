# Mango Travel Price Drop landing MVP

GitHub Pages prototype for the Mango/MyRealTrip price-drop experiment.

Live page: https://superguava.github.io/myrealtrip-price-drop/

## Current operating model

The public page is a static `index.html` that fetches JSON files from `data/`:

- `data/deals.json`: curated MyRealTrip comparison SKUs and OTA comparison evidence
- `data/airfare_lowprice.json`: airfare low-price cards
- `data/team_metrics.json`: funnel, savings, inventory, and CTA metrics

As of 2026-05-01, this repo does **not** contain a GitHub Actions workflow.
Data refreshes are published by the MangoBingsu/Durian n8n + Mango local/ops pipeline as direct commits to this repository.

## Files

- `index.html`: static landing page
- `data/deals.json`: current MyRealTrip comparison payload
- `data/airfare_lowprice.json`: airfare low-price feed
- `data/team_metrics.json`: team/funnel feed
- `scripts/check-freshness.js`: freshness/staleness watchdog for public JSON feeds
- `scripts/validate-public-feeds.js`: schema guard for publisher pre/post checks
- `scripts/update-deals.js`: legacy CSV updater kept for reference only
- `OPERATIONS.md`: operating notes and current refresh mechanism
- `docs/durian-publisher-stabilization.md`: publisher stability runbook
- `docs/actions-auxiliary-role.md`: GitHub Actions watchdog-only role
- `docs/freshness-check-workflow.example.yml`: workflow example; copy into `.github/workflows/` only when `workflow` scope/UI access is available

## Important caution

Do not wire `scripts/update-deals.js` into automation without updating it first.
It is a legacy CSV updater and can overwrite the richer MangoBingsu protocol fields currently used by the page.

Safe check commands:

```bash
node scripts/validate-public-feeds.js
node scripts/check-freshness.js --source=local
node scripts/check-freshness.js --source=pages
```

## Deployment

GitHub Pages serves the repository root from `main`.

## Domain caution

`lowprice.kr` is not owned by Guava/Mango. This project uses GitHub Pages as a temporary prototype only and must not depend on that domain.
