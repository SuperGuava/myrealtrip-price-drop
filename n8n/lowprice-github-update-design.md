# n8n 연동 설계: MyRealTrip → GitHub Pages

## 목표
망고빙수가 마이리얼트립 파트너 API로 받은 상품 후보를 n8n에서 받아 `SuperGuava/myrealtrip-price-drop`의 정적 JSON으로 업데이트한다.

## 추천 플로우

```text
Webhook Trigger
→ Code: payload 정규화 + 신저가 후보 생성
→ GitHub API: data/price-history.json 현재 SHA/내용 조회
→ Code: 과거 최저가 비교 + deals.json/price-history.json 생성
→ GitHub API: PUT data/price-history.json
→ GitHub API: PUT data/deals.json
→ Telegram/OpenClaw 알림: received/emitted/URL
```

## GitHub API

- Repo: `SuperGuava/myrealtrip-price-drop`
- Branch: `main`
- Update endpoint: `PUT https://api.github.com/repos/SuperGuava/myrealtrip-price-drop/contents/{path}`
- Auth: n8n credential에 GitHub token 저장. 코드/레포에 토큰 금지.

## 우선순위
1. 처음에는 `--include-new`와 같은 seed 모드로 후보를 보여준다.
2. 2회차부터는 진짜 과거 최저가보다 낮은 상품만 노출한다.
3. 클릭/예약 데이터는 다음 단계에서 `/go` 또는 제휴 리포트 기반으로 붙인다.
