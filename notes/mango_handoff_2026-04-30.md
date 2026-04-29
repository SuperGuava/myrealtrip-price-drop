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

### 큐레이션 표준 SKU 트랙 (라이브 · 4테마)

- daily collector 가 매일 09:30 KST 에 큐레이션 테마를 푸시.
- DOW 로테이션 (4테마 균형):
  - Mon (1) / Fri (5) → `japan_themepark` (도쿄 디즈니, USJ)
  - Tue (2) / Sat (6) → `southeast_asia_iconic` (다낭 바나힐, 방콕 디너크루즈)
  - Wed (3)         → `japan_citypass` (오사카 주유패스, 도쿄 스카이트리)
  - Thu (4) / Sun (0) → `korea_family_iconic` ← 풀 7개로 확장 (제주 서귀포잠수함·헬로키티·레일바이크 + 서울 롯데월드 어드벤처·N타워·롯데월드 아쿠아리움 + 용인 에버랜드). sampling 4 가 매일 다른 조합 노출.
- 레지스트리: `notes/curated_standard_skus.json` — gid + naverQuery 로 표준 SKU 만 큐레이션.

### 결정적 랜덤 샘플링 (NEW)

`curated_seed.py` 가 `--sample-size 4 --seed YYYYMMDD` 로 호출되도록 collector 갱신. 풀이 4개 이하면 전체 그대로 (현재 상태), 풀이 5+ 가 되면 날짜별 결정적 부분집합. 같은 날 = 같은 결과, 날짜 바뀜 = 자동 로테이션. 시간대별 다양성 필요해지면 시드를 `%Y%m%d%H` 로 바꾸면 됨.

→ frontend 영향 없음. 데이터 스키마 동일. 다만 같은 테마라도 다른 날에는 다른 조합이 노출될 수 있음을 인지.

### 동적 헤더 카피 권장 (확장)

`deals_doc.theme.title` / `deals_doc.theme.city` 가 이미 들어옴. 큐레이션 트랙은 매일 도시·페르소나가 다르므로 hero subtitle 도 그걸 반영하면 살아있는 사이트로 보임:

```
오늘의 비교: {theme.title}
{theme.subtitle}
```

`runId` 가 `mb-curated-...` 로 시작하면 큐레이션 트랙이라는 것도 동시에 알 수 있다.

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

## 5. 추가 데이터 피드 (NEW — 2026-04-30 18:00 KST 추가)

> 구화 요청: lowprice.kr v0 카드 이미지에 있던 정보(자몽 신저가 + 인벤토리 +
> 합류 CTA)를 망고 frontend 에 통합해달라. 별도 JSON 두 개로 publish 했음.

### 5-1. data/airfare_lowprice.json

자몽이 발급한 항공 신저가 카드 (이미 매번 갱신될 예정). 스키마:

```json
{
  "checkedAt": "2026-04-30T07:47:16+09:00",
  "totalSave": 342700,
  "count": 6,
  "cards": [
    {
      "origin": "ICN",
      "destination": "BKK",
      "depart": "2026-06-12",
      "carrier": "SC",
      "intl": true,
      "price": 215100,
      "baseline": 267500,
      "save": 52400,
      "mylinkCode": "https://myrealt.rip/Ygvn38",
      "mylink": "https://myrealt.rip/Ygvn38",
      "external": {
        "naver":      "https://flight.naver.com/...",
        "kayak":      "https://www.kayak.co.kr/...",
        "skyscanner": "https://www.skyscanner.co.kr/...",
        "google":     "https://www.google.com/travel/flights?..."
      }
    },
    ...
  ]
}
```

### 5-2. data/team_metrics.json

```json
{
  "checkedAt": "...",
  "funnel":     { "joins": 4, "clicks": 0, "payments": 0 },
  "savings":    { "airfareTotal": 342700, "lowpriceCount": 6 },
  "inventory":  { "flights": 2, "stays": 3, "experiences": 9, "total": 14 },
  "cta": {
    "telegramJoinUrl": "https://t.me/superguava_9_bot",
    "emailJoin":       "ninefirebar@gmail.com"
  }
}
```

### 5-3. 권장 UI 섹션 (lowprice.kr v0 이미지 그대로 차용 OK)

페이지 구성안:

1. **HERO** — `team_metrics.funnel` + `team_metrics.savings.airfareTotal` 4개 stat
   (합류 / 클릭 / 결제 / 누적 절약). 기존 deals.json 의 metrics 와 우선순위 협상해서
   하나만 표시. team_metrics 가 더 상위 진실.
2. **오늘의 비교 SKU** (큐레이션 트랙) — 기존 `deals.json` 카드 + 1번 항목 priceComparison UI.
3. **발견한 신저가 (자몽 자동 발급)** — `data/airfare_lowprice.json` cards 6개. 카드 형식:
   - route: `{origin} → {destination} · {depart}`
   - now-price + (`save > 0` 이면) `↓ ₩{save:,} 절약` green pill + baseline strikethrough
   - carrier: `운항 {carrier}`
   - CTA: `이 가격으로 예약 →` (`mylink` 사용)
   - small 외부 비교 chips: `naver / kayak / skyscanner / google` (`external.*`)
4. **운영 중인 망고팀 인벤토리** — `team_metrics.inventory` 3 stat (항공/숙소/액티비티).
5. **망고팀에 합류하세요** — `team_metrics.cta.telegramJoinUrl` + `emailJoin` 두 버튼.

### 5-4. 갱신 주기

- `data/deals.json`: 큐레이션 daily 09:30 + sweep 6h.
- `data/airfare_lowprice.json` + `data/team_metrics.json`: 자몽 watch-all 06:30 직후 06:35 KST cron 으로 publish (구화 PAT 갱신 후 활성화).
- frontend 는 `cache:'no-store'` 로 단순 fetch 만 하면 됨.

## 6. 다음 액션 (구화)

1. **WAUG / Klook 등 affiliate 가입** — `notes/affiliate_signup.md` 의 1·2순위.
2. **PAT 갱신** — `~/.openclaw/workspace/.env` 첫 줄의 `github_pat_...` 가 만료됐다 (401). data_publish.py / price_comparison_sweep.py / curated_seed.py 의 GitHub PUT 이 모두 그 줄에 의존한다. fine-grained PAT 새로 발급해서 첫 줄 교체 + 가능하면 mango-ops scope 도 포함.
3. 망고에게 이 핸드오프 위치 (`myrealtrip-price-drop@b7ac8943` → 추후 commit 도 `notes/mango_handoff_2026-04-30.md`) 알리기.
