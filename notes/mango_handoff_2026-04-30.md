# 망고 핸드오프 — priceComparison UI + 큐레이션 헤더 (2026-04-30)

> From: 망고빙수 (collector·sweep 운영)
> To: 망고 (frontend)
> 목적: 망고빙수가 추가한 두 가지 신규 기능을 frontend 에 노출.

## 1. priceComparison UI (가장 시급)

### 데이터는 이미 들어가고 있다

`data/deals.json` 의 각 `deal` 에 다음 필드가 매 6시간마다 어태치되고 있다:

```json
{
  "title": "...",
  "price": 31011,
  "priceComparison": {
    "checkedAt": "2026-04-30T06:38:21+09:00",
    "query": "오사카 주유패스 1일권",
    "sources": [
      { "seller": "클룩",   "price": 31000, "currency": "KRW", "url": "...", "snippet": "..." },
      { "seller": "와그",   "price": 32100, "currency": "KRW", "url": "...", "snippet": "..." },
      { "seller": "하나투어","price": 32100, "currency": "KRW", "url": "...", "snippet": "..." },
      { "seller": "투어비스","price": 32564, "currency": "KRW", "url": "...", "snippet": "..." }
    ],
    "verdict": {
      "mrtIsCheapest": false,
      "overpayPct": 0,
      "cheapestOther": 31000,
      "deltaWon": 11
    }
  }
}
```

### 현재 frontend 는 이걸 전혀 보여주지 않음

`index.html` 의 deal 카드는 shop/title/price/previousPrice/lowType/evidence/tags/display.why 만 렌더한다. priceComparison 은 그냥 무시된다.

### 추가 권장 UI

각 deal 카드 안에 작은 비교 섹션:

```
┌── 다른 OTA 가격 ───────────────────┐
│  클룩       ₩31,000      [보기]   │  ← 정렬: 가격 오름차순
│  와그       ₩32,100      [보기]   │
│  하나투어   ₩32,100      [보기]   │
│  투어비스   ₩32,564      [보기]   │
└────────────────────────────────────┘
```

verdict 별 pill:

- `mrtIsCheapest: true, savingPct >= 5` → 🟢 "마이리얼트립이 N% 더 쌉니다 (₩X 저렴)"
- `mrtIsCheapest: true, savingPct < 5` → 🟡 "마이리얼트립이 거의 동률 (₩X 차이)"
- `mrtIsCheapest: false, overpayPct >= 5` → 🔴 "외부가 N% 더 쌉니다 (₩X)" — 단, **CTA 는 여전히 마이리얼트립 url** 유지 (북극성)
- `mrtIsCheapest: false, overpayPct < 5` → 🟡 "사실상 동률"
- verdict 가 `null` → 비교 박스 숨김

### 향후 affiliateUrl 핸들링 (지금은 없음, 곧 들어옴)

`source` 객체에 `affiliateUrl` 필드가 추가될 수 있다 (와그/클룩 affiliate 등록 후).
있으면 `[보기]` 가 `affiliateUrl` 로, 없으면 `url` 로 가도록 단 한 줄 가드 추가:

```js
const cta = src.affiliateUrl || src.url;
```

스키마는 backwards-compatible — 지금부터 코드를 그렇게 짜둬도 안전.

### 헤더 카피

지금 hero 가 "오늘의 신저가" 이지만 큐레이션 트랙은 신저가가 아니라 "오늘의 비교" 가 더 정확:

- `data.theme?.title` 이 들어오면 이미 표시되고 있음 (`heroTitle` 갈아끼기). 다만 **section-head 의 `<h2>오늘의 신저가</h2>`** 가 하드코딩이라 큐레이션 푸시일 때도 "신저가" 로 뜬다.
- 권장: `data.theme?.title` 또는 `data.runId.includes('curated')` 면 section title 도 "오늘의 비교 SKU" 처럼 동적으로.

## 2. ₩0 strikethrough 가드

이미 적용된 거 확인했음 (`d.previousPrice > 0`). 이 가드 절대 빼지 마라 — `Number(null) === 0` 이고 `Number.isFinite(0) === true` 라서 0 원이 strikethrough 로 노출되는 회귀가 다시 생긴다.

## 3. 운영 변경사항 메모

### 큐레이션 표준 SKU 트랙 (라이브)

- daily collector 가 매일 09:30 KST 에 큐레이션 테마를 푸시.
- DOW 로테이션:
  - Mon (1) / Wed (3) / Fri (5) → `japan_themepark` (도쿄 디즈니, USJ)
  - Tue (2) / Sat (6) → `southeast_asia_iconic` (다낭 바나힐, 방콕 디너크루즈)
  - Thu (4) / Sun (0) → `japan_citypass` (오사카 주유패스, 도쿄 스카이트리)
- 레지스트리: `notes/curated_standard_skus.json` — gid + naverQuery 로 표준 SKU 만 큐레이션.

### Cross-OTA SERP 비교 (라이브)

- `src/price_comparison_sweep.py` 가 6시간마다 Naver SERP 여행 vertical 에서 와그/하나투어/투어비스/쿠팡/클룩/트립닷컴 가격을 동시에 추출.
- `naverQuery` override (레지스트리에 명시) 가 우선, 없으면 title 정규화로 fallback.
- price-band 필터 ±40~300% 와 SKU 미스매치 키워드 가드 (`+호텔`/`+왕복`/`+패키지`/`+사진` 등) 로 outlier 제거.

### 라이브 검증 결과 (2026-04-30 첫 fire)

- 오사카 주유패스 ₩31,011 — 4 OTA 매칭, 사실상 동률 (delta ₩11)
- 도쿄 스카이트리+수족관 ₩34,278 — 2 OTA 매칭, 와그 ₩16,160 은 SKU 단품 추정
- 큐레이션 풀이 늘면 매칭 정확도도 자동으로 좋아짐 (registry-driven)

## 4. 다음 액션 (망고)

1. 위의 priceComparison UI 추가 + section title 동적화.
2. 그 외에는 현재 frontend 그대로 유지. 데이터 스키마는 backwards-compatible.
3. 막히면 망고빙수 텔레그램으로 핑.

## 5. 다음 액션 (구화)

1. WAUG / Klook 등 affiliate 가입 — `notes/affiliate_signup.md` 의 1·2순위.
2. PAT 만료/회전 — mango-ops 권한이 막혀서 이 핸드오프를 mango-ops 가 아닌 myrealtrip-price-drop repo `notes/` 에 배치했다. 다음에 mango-ops 도 같이 쓰려면 PAT 갱신 필요.
