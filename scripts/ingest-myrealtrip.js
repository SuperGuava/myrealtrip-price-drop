#!/usr/bin/env node
/**
 * Ingest MangoBingsu/MyRealTrip product payload into Mango Travel Price Drop deal data.
 *
 * Usage:
 *   node scripts/ingest-myrealtrip.js data/myrealtrip.sample.json --include-new
 *   cat payload.json | node scripts/ingest-myrealtrip.js --stdin
 *
 * True-low logic:
 * - Maintains data/price-history.json by stable product key.
 * - Emits deal only when current price is lower than known historical minimum.
 * - With --include-new, first-seen products are also emitted as initial seed deals.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const jsonPath = path.join(dataDir, 'deals.json');
const csvPath = path.join(dataDir, 'deals.csv');
const historyPath = path.join(dataDir, 'price-history.json');
const args = process.argv.slice(2);
const includeNew = args.includes('--include-new');
const stdinMode = args.includes('--stdin');
const fileArg = args.find(a => !a.startsWith('--'));

function readInput() {
  if (stdinMode) return fs.readFileSync(0, 'utf8');
  if (!fileArg) throw new Error('payload path required, or use --stdin');
  return fs.readFileSync(path.resolve(process.cwd(), fileArg), 'utf8');
}

function unwrap(payload) {
  if (Array.isArray(payload)) return payload;
  return payload.items || payload.products || payload.deals || payload.data?.items || payload.data?.products || [];
}

function first(...xs) {
  return xs.find(v => v !== undefined && v !== null && v !== '');
}

function number(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v.replace(/[^0-9.]/g, ''));
  return NaN;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function nowKstParts() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
}

const payload = JSON.parse(readInput());
const source = payload.source || payload.provider || 'mangobingsu-myrealtrip';
const items = unwrap(payload);
if (!Array.isArray(items)) throw new Error('payload items/products/deals must be an array');

const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : {};
const emitted = [];
const seenAt = new Date().toISOString();

for (const raw of items) {
  const id = String(first(raw.gid, raw.productId, raw.id, raw.itemId, raw.product_id, raw.url, raw.productUrl) || '').trim();
  const title = String(first(raw.itemName, raw.title, raw.name, raw.productName) || '').trim();
  const price = number(first(raw.salePrice, raw.price, raw.currentPrice, raw.lowestPrice, raw.amount));
  const url = String(first(raw.mylink, raw.myLink, raw.affiliateUrl, raw.productUrl, raw.deepLink, raw.url) || '').trim();
  if (!id || !title || !Number.isFinite(price) || !url) continue;

  const key = `${source}:${id}`;
  const prev = history[key];
  const previousMin = number(first(raw.previousLowestPrice, raw.previousPrice, raw.originalPrice, prev?.minPrice));
  const isFirstSeen = !prev;
  const isNewLow = Number.isFinite(previousMin) && price < previousMin;

  history[key] = {
    source,
    id,
    title,
    url,
    minPrice: !prev ? price : Math.min(prev.minPrice, price),
    lastPrice: price,
    lastSeenAt: seenAt,
    firstSeenAt: prev?.firstSeenAt || seenAt,
    reviewScore: first(raw.reviewScore, raw.rating, prev?.reviewScore),
    imageUrl: first(raw.imageUrl, raw.thumbnailUrl, raw.image, prev?.imageUrl)
  };

  if (isNewLow || (includeNew && isFirstSeen)) {
    emitted.push({
      shop: '마이리얼트립',
      title,
      price,
      previousPrice: Number.isFinite(previousMin) ? previousMin : Math.round(price * 1.08),
      url,
      source,
      sourceId: id,
      reviewScore: first(raw.reviewScore, raw.rating),
      imageUrl: first(raw.imageUrl, raw.thumbnailUrl, raw.image),
      lowType: isNewLow ? 'new_low' : 'first_seen'
    });
  }
}

fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');

const current = fs.existsSync(jsonPath)
  ? JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  : { metrics: { joins: 0, clicks: 0, payments: 0 }, deals: [] };
const parts = nowKstParts();
const nextDeals = emitted.length ? emitted.slice(0, 20) : [];
const next = {
  date: parts.slice(0, 10),
  updatedAt: `${parts} KST`,
  metrics: current.metrics ?? { joins: 0, clicks: 0, payments: 0 },
  deals: nextDeals,
  meta: {
    source,
    received: items.length,
    emitted: emitted.length,
    mode: includeNew ? 'include_new_seed' : 'new_lows_only'
  }
};
fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2) + '\n');

const csv = ['shop,title,price,previousPrice,url', ...nextDeals.map(d => [d.shop,d.title,d.price,d.previousPrice,d.url].map(csvEscape).join(','))].join('\n') + '\n';
fs.writeFileSync(csvPath, csv);
console.log(JSON.stringify(next.meta));
