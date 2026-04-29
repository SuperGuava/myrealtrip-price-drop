#!/usr/bin/env node
/**
 * Mango Travel Price Drop daily updater v1
 *
 * 운영 방식 A안:
 * 1) data/deals.csv에 오늘의 신저가를 붙여넣는다.
 * 2) node scripts/update-deals.js 실행
 * 3) data/deals.json이 갱신되고 정적 페이지가 바로 반영된다.
 *
 * 이후 B/C안으로 확장할 때는 CSV 입력부만 쇼핑몰 API/크롤러 결과로 교체하면 된다.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'data', 'deals.csv');
const jsonPath = path.join(root, 'data', 'deals.json');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function readDealsFromCsv() {
  const rows = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(rows.shift());
  return rows.map((row) => {
    const values = parseCsvLine(row);
    const item = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    return {
      shop: item.shop,
      title: item.title,
      price: Number(item.price),
      previousPrice: Number(item.previousPrice),
      url: item.url || 'https://Mango Travel Price Drop/'
    };
  }).filter((d) => d.shop && d.title && Number.isFinite(d.price) && Number.isFinite(d.previousPrice));
}

const now = new Date();
const parts = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false
}).format(now);

const current = fs.existsSync(jsonPath)
  ? JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  : { metrics: { joins: 0, clicks: 0, payments: 0 } };

const deals = readDealsFromCsv();
fs.writeFileSync(jsonPath, JSON.stringify({
  date: parts.slice(0, 10),
  updatedAt: `${parts} KST`,
  metrics: current.metrics ?? { joins: 0, clicks: 0, payments: 0 },
  deals
}, null, 2) + '\n');

console.log(`updated ${jsonPath} with ${deals.length} deals`);
