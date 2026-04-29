# MangoBingsu → Mango Travel Price Drop payload contract

망고빙수/n8n이 아래 형태 중 하나로 보내면 `scripts/ingest-myrealtrip.js`가 정규화한다.

## 권장 payload

```json
{
  "source": "mangobingsu-myrealtrip",
  "generatedAt": "2026-04-29T21:20:00+09:00",
  "items": [
    {
      "gid": "상품ID",
      "itemName": "상품명",
      "salePrice": 82000,
      "previousPrice": 93000,
      "reviewScore": 4.8,
      "productUrl": "https://...",
      "mylink": "https://...",
      "imageUrl": "https://..."
    }
  ]
}
```

## 필수 매핑

- ID: `gid` / `productId` / `id`
- 제목: `itemName` / `title` / `name`
- 현재가: `salePrice` / `price` / `currentPrice` / `lowestPrice`
- 링크: `mylink` / `myLink` / `affiliateUrl` / `productUrl` / `deepLink` / `url`
- 비교가: `previousLowestPrice` / `previousPrice` / `originalPrice` / 저장된 과거 최저가

## 신저가 판정

- `data/price-history.json`에 상품별 과거 최저가를 저장한다.
- 현재가가 과거 최저가보다 낮으면 `lowType: new_low`로 랜딩에 노출한다.
- 초기 시드가 필요하면 `--include-new`를 붙여 첫 수집 상품도 노출한다.

## 로컬/수동 수신 테스트

```bash
cd ~/.openclaw/workspace/projects/lowprice-landing
node scripts/ingest-myrealtrip.js data/myrealtrip.sample.json --include-new
./scripts/deploy-github-pages.sh
```
