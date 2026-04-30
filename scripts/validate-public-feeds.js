#!/usr/bin/env node
/**
 * Validate Mango/MyRealTrip public feed schema before/after publisher writes.
 *
 * This is a guardrail for MangoBingsu/Durian publisher stability.
 * It never mutates data and never reads secrets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function assert(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateDeals(errors) {
  const data = readJson('data/deals.json');
  assert(errors, typeof data.date === 'string', 'deals.date must be string');
  assert(errors, typeof data.updatedAt === 'string', 'deals.updatedAt must be string');
  assert(errors, isObject(data.metrics), 'deals.metrics must exist');
  assert(errors, Array.isArray(data.deals), 'deals.deals must be array');
  assert(errors, data.deals.length > 0, 'deals.deals must not be empty');

  if (data.runId && String(data.runId).startsWith('mb-curated-')) {
    assert(errors, isObject(data.theme), 'curated deals must include theme');
    assert(errors, typeof data.theme.title === 'string', 'theme.title must be string');
    assert(errors, typeof data.theme.city === 'string', 'theme.city must be string');
  }

  data.deals?.forEach((deal, i) => {
    const prefix = `deals.deals[${i}]`;
    assert(errors, typeof deal.shop === 'string' && deal.shop, `${prefix}.shop required`);
    assert(errors, typeof deal.title === 'string' && deal.title, `${prefix}.title required`);
    assert(errors, Number.isFinite(Number(deal.price)) && Number(deal.price) > 0, `${prefix}.price must be positive number`);
    assert(errors, typeof deal.url === 'string' && /^https?:\/\//.test(deal.url), `${prefix}.url must be http(s)`);
    assert(errors, ['first_collected', 'new_low'].includes(deal.lowType), `${prefix}.lowType must be first_collected/new_low`);
    assert(errors, isObject(deal.evidence) && typeof deal.evidence.reason === 'string' && deal.evidence.reason, `${prefix}.evidence.reason required`);
    assert(errors, isObject(deal.display), `${prefix}.display required`);
    assert(errors, Array.isArray(deal.tags), `${prefix}.tags must be array`);

    if (deal.lowType === 'new_low') {
      assert(errors, typeof deal.previousPrice === 'number' && deal.previousPrice > deal.price, `${prefix}.previousPrice should be greater than price for new_low`);
    }

    if (deal.priceComparison !== undefined) {
      const pc = deal.priceComparison;
      assert(errors, isObject(pc), `${prefix}.priceComparison must be object`);
      assert(errors, typeof pc.checkedAt === 'string', `${prefix}.priceComparison.checkedAt required`);
      assert(errors, Array.isArray(pc.sources), `${prefix}.priceComparison.sources must be array`);
      assert(errors, isObject(pc.verdict), `${prefix}.priceComparison.verdict required`);
      pc.sources?.forEach((src, j) => {
        assert(errors, typeof src.seller === 'string' && src.seller, `${prefix}.priceComparison.sources[${j}].seller required`);
        assert(errors, Number.isFinite(Number(src.price)) && Number(src.price) > 0, `${prefix}.priceComparison.sources[${j}].price must be positive`);
        assert(errors, typeof src.url === 'string' && /^https?:\/\//.test(src.url), `${prefix}.priceComparison.sources[${j}].url must be http(s)`);
      });
    }
  });

  if (data.meta?.rejections) {
    assert(errors, Array.isArray(data.meta.rejections), 'meta.rejections must be array if present');
  }
}

function validateAirfare(errors) {
  const data = readJson('data/airfare_lowprice.json');
  assert(errors, typeof data.checkedAt === 'string', 'airfare.checkedAt required');
  assert(errors, Array.isArray(data.cards), 'airfare.cards must be array');
  assert(errors, data.cards.length > 0, 'airfare.cards must not be empty');
  data.cards?.forEach((card, i) => {
    const prefix = `airfare.cards[${i}]`;
    for (const key of ['origin', 'destination', 'depart', 'carrier']) assert(errors, typeof card[key] === 'string' && card[key], `${prefix}.${key} required`);
    for (const key of ['price', 'baseline', 'save']) assert(errors, Number.isFinite(Number(card[key])), `${prefix}.${key} must be number`);
    assert(errors, typeof card.mylink === 'string' && /^https?:\/\//.test(card.mylink), `${prefix}.mylink must be http(s)`);
  });
}

function validateTeam(errors) {
  const data = readJson('data/team_metrics.json');
  assert(errors, typeof data.checkedAt === 'string', 'team.checkedAt required');
  assert(errors, isObject(data.funnel), 'team.funnel required');
  assert(errors, isObject(data.savings), 'team.savings required');
  assert(errors, isObject(data.inventory), 'team.inventory required');
  assert(errors, isObject(data.cta), 'team.cta required');
  for (const key of ['joins', 'clicks', 'payments']) assert(errors, Number.isFinite(Number(data.funnel[key])), `team.funnel.${key} must be number`);
  for (const key of ['flights', 'stays', 'experiences', 'total']) assert(errors, Number.isFinite(Number(data.inventory[key])), `team.inventory.${key} must be number`);
}

const errors = [];
try { validateDeals(errors); } catch (err) { errors.push(`deals: ${err.message}`); }
try { validateAirfare(errors); } catch (err) { errors.push(`airfare: ${err.message}`); }
try { validateTeam(errors); } catch (err) { errors.push(`team: ${err.message}`); }

if (errors.length) {
  console.error('Public feed validation failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}
console.log('Public feed validation passed');
