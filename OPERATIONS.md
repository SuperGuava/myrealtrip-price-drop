# Mango Travel Price Drop 운영 메모

## 현재 운영 방식 — 2026-05-01

현재 `SuperGuava/myrealtrip-price-drop`에는 GitHub Actions cron이 없다.
따라서 과거 문서의 “매일 08:00 KST GitHub Actions 자동 갱신” 문구는 더 이상 정본이 아니다.

현재 데이터 갱신은 다음 흐름으로 운영한다.

1. 망고빙수 Collector / pricewatch가 MyRealTrip 후보와 가격 비교 데이터를 만든다.
2. 두리안 n8n 또는 망고 로컬/ops 파이프라인이 `data/*.json`을 갱신한다.
3. `SuperGuava/myrealtrip-price-drop` main에 직접 commit/push된다.
4. GitHub Pages가 정적 `index.html` + `data/*.json`을 제공한다.

현재 공개 페이지가 읽는 주요 피드:

- `data/deals.json`
- `data/airfare_lowprice.json`
- `data/team_metrics.json`

## GitHub Actions 상태

- `.github/workflows/` 없음.
- 이 repo 자체에는 매일 08:00 KST 자동 workflow가 설치되어 있지 않다.
- GitHub Actions를 도입하려면 기존 `scripts/update-deals.js`를 그대로 쓰면 안 된다.
- 보조 Actions 설계는 `docs/actions-auxiliary-role.md`를 따른다.
- workflow 예시는 `docs/freshness-check-workflow.example.yml`에 있다.

## Legacy updater caution

`scripts/update-deals.js`는 초기 CSV 기반 MVP용 레거시 스크립트다.
현재 `deals.json`의 `theme`, `metrics.discoveredCount`, `priceComparison`, `evidence`, `display`, `tags`, `lastComparisonSweep` 같은 필드를 보존하지 못한다.

따라서 이 스크립트를 cron/GitHub Actions에 바로 연결하면 현재 페이지 품질을 되돌릴 수 있다.
자동화를 추가하려면 아래 중 하나를 먼저 해야 한다.

1. MangoBingsu/Durian n8n을 정본 갱신 경로로 유지한다.
2. 새 workflow는 `data/*.json` freshness check만 수행한다.
3. 새 updater를 만들 경우 현재 MangoBingsu protocol v1 schema를 보존한다.

## 사이트가 비어 보일 때 확인 순서

정적 HTML fetch/readability 결과는 JavaScript를 실행하지 않으므로 `업데이트 확인 중…`, `자몽 피드 확인 중…`, `팀 지표 확인 중…`만 보일 수 있다.
이것만으로 데이터 fetch 실패라고 판단하지 않는다.

확인 순서:

1. `https://superguava.github.io/myrealtrip-price-drop/data/deals.json` 200 여부
2. `data/airfare_lowprice.json` 200 여부
3. `data/team_metrics.json` 200 여부
4. 실제 브라우저/Playwright 렌더링에서 카드가 표시되는지
5. 브라우저 console/network error 여부

## 안정화 체크 명령

Publisher pre/post guard:

```bash
node scripts/validate-public-feeds.js
node scripts/check-freshness.js --source=local
node scripts/check-freshness.js --source=pages
```

상세 runbook: `docs/durian-publisher-stabilization.md`

## 다음 자동화 후보

### A. Staleness monitor

GitHub Actions 또는 외부 cron으로 `data/*.json`의 `checkedAt`/`updatedAt`이 오래됐는지만 확인한다.
쓰기 권한 없이도 가능하고, 현재 schema를 훼손하지 않는다.

### B. Durian n8n publisher

망고빙수/두리안 라인을 정본 publisher로 유지한다.
토큰은 n8n credential 또는 GitHub secret으로만 보관하고, repo/로그/Telegram에는 원문을 남기지 않는다.

### C. Schema-preserving updater

GitHub Actions를 도입하려면 `scripts/update-deals.js`를 폐기하거나 v1 schema 보존형으로 다시 작성한다.
