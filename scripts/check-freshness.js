#!/usr/bin/env node
/**
 * Check freshness of Price-Drop public JSON feeds without mutating data.
 *
 * This monitor intentionally does not generate or overwrite data.
 * MangoBingsu/Durian remain the publisher; this script is only a watchdog.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES_BASE = 'https://superguava.github.io/myrealtrip-price-drop';
const NOW = new Date();

const FEEDS = [
  {
    name: 'deals',
    path: 'data/deals.json',
    timeFields: ['lastSweepMeta.checkedAt', 'lastComparisonSweep.checkedAt', 'updatedAt', 'date'],
    maxAgeHours: Number(process.env.DEALS_MAX_AGE_HOURS || 30),
    requiredPaths: ['deals'],
  },
  {
    name: 'airfare_lowprice',
    path: 'data/airfare_lowprice.json',
    timeFields: ['checkedAt'],
    maxAgeHours: Number(process.env.AIRFARE_MAX_AGE_HOURS || 12),
    requiredPaths: ['cards'],
  },
  {
    name: 'team_metrics',
    path: 'data/team_metrics.json',
    timeFields: ['checkedAt'],
    maxAgeHours: Number(process.env.TEAM_MAX_AGE_HOURS || 12),
    requiredPaths: ['funnel', 'inventory', 'cta'],
  },
];

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function get(obj, dotted) {
  return dotted.split('.').reduce((cur, key) => (cur && cur[key] !== undefined ? cur[key] : undefined), obj);
}

function parseKstLike(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  // Date-only values are interpreted as start of day KST.
  // This must run before Date parsing because JS treats YYYY-MM-DD as UTC.
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return new Date(`${trimmed}T00:00:00+09:00`);

  // ISO with timezone, e.g. 2026-05-01T05:44:52+09:00
  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime())) return iso;

  // KST display, e.g. 2026-04-30 06:47 KST
  const kst = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?\s*KST$/i);
  if (kst) {
    const [, y, mo, d, h = '00', mi = '00', s = '00'] = kst;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`);
  }

  return null;
}

function pickFreshestTime(feed, data) {
  const candidates = feed.timeFields
    .map((field) => ({ field, raw: get(data, field), parsed: parseKstLike(get(data, field)) }))
    .filter((x) => x.parsed && !Number.isNaN(x.parsed.getTime()))
    .sort((a, b) => b.parsed - a.parsed);
  return candidates[0] || null;
}

async function readJson(feed, source) {
  if (source === 'pages') {
    const url = `${PAGES_BASE}/${feed.path}?freshness=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status} ${url}`);
    return res.json();
  }
  return JSON.parse(fs.readFileSync(path.join(ROOT, feed.path), 'utf8'));
}

async function main() {
  const source = argValue('source', process.env.FRESHNESS_SOURCE || 'local');
  if (!['local', 'pages'].includes(source)) throw new Error(`invalid --source=${source}`);

  const rows = [];
  const errors = [];

  for (const feed of FEEDS) {
    try {
      const data = await readJson(feed, source);
      for (const req of feed.requiredPaths) {
        const value = get(data, req);
        if (value === undefined || (Array.isArray(value) && value.length === 0)) {
          errors.push(`${feed.name}: required path missing/empty: ${req}`);
        }
      }

      const freshest = pickFreshestTime(feed, data);
      if (!freshest) {
        errors.push(`${feed.name}: no parseable timestamp in ${feed.timeFields.join(', ')}`);
        rows.push({ feed: feed.name, status: 'missing_timestamp' });
        continue;
      }

      const ageHours = (NOW - freshest.parsed) / 36e5;
      const ok = ageHours <= feed.maxAgeHours;
      rows.push({
        feed: feed.name,
        field: freshest.field,
        timestamp: freshest.raw,
        ageHours: Number(ageHours.toFixed(2)),
        maxAgeHours: feed.maxAgeHours,
        status: ok ? 'ok' : 'stale',
      });
      if (!ok) errors.push(`${feed.name}: stale (${ageHours.toFixed(2)}h > ${feed.maxAgeHours}h) via ${freshest.field}=${freshest.raw}`);
    } catch (err) {
      errors.push(`${feed.name}: ${err.message}`);
      rows.push({ feed: feed.name, status: 'error', error: err.message });
    }
  }

  console.log(JSON.stringify({ checkedAt: NOW.toISOString(), source, rows }, null, 2));

  if (errors.length) {
    console.error('\nFreshness check failed:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
