# Mango Travel Price Drop 운영 메모

## v1 운영 방식: 수동 데이터 → 자동 랜딩 반영

1. `data/deals.csv`에 오늘의 신저가를 입력한다.
2. `node scripts/update-deals.js` 실행.
3. `data/deals.json`이 갱신된다.
4. 정적 호스팅이 `index.html` + `data/deals.json`을 배포한다.

## 배포 추천

- 가장 빠름: Netlify Drop 또는 Cloudflare Pages에 `projects/lowprice-landing` 폴더 연결
- GitHub 연동 시: 매일 08:00 KST GitHub Actions로 JSON 갱신 가능
- 도메인: `Mango Travel Price Drop` DNS를 배포 서비스로 연결

## 다음 확장

- 클릭 집계: 링크를 `/go?id=...` 형태로 바꾸고 로그 저장
- 합류 집계: 이메일/카카오/텔레그램 알림 신청 폼 연결
- 결제 집계: 제휴 링크 또는 자체 결제 이벤트 연결
- 자동 탐지: CSV 입력부를 쇼핑 API/크롤러 출력으로 교체


## 현재 배포 상태 — 2026-04-29

- GitHub repo: https://github.com/SuperGuava/myrealtrip-price-drop
- GitHub Pages source: `main` branch `/`
- Custom domain: 사용 안 함. GitHub Pages 기본 URL 사용
- 주의: 현재 GitHub OAuth token에 `workflow` scope가 없어 `.github/workflows/daily-update.yml`는 원격 repo에 올리지 않았다. 대신 v1은 로컬/수동 CSV 갱신 후 `scripts/deploy-github-pages.sh`로 반영한다.

## v1 수동 배포

```bash
cd ~/.openclaw/workspace/projects/lowprice-landing
node scripts/update-deals.js
./scripts/deploy-github-pages.sh
```

## DNS 연결 필요 없음

현재 v1은 GitHub Pages 기본 URL로 운영한다.

Apex 도메인용 A 레코드:
- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

www 서브도메인용 CNAME:
- `www` → `SuperGuava.github.io`
