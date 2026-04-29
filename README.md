# Mango Travel Price Drop landing MVP

매일 업데이트되는 신저가 랜딩페이지 초안.

## 파일
- `index.html`: 정적 랜딩페이지
- `data/deals.json`: 표시 데이터
- `scripts/update-deals.js`: 일일 업데이트 훅(현재 샘플 유지, 데이터 소스 연결 지점 포함)
- `.github/workflows/daily-update.yml`: 매일 08:00 KST 업데이트 예시

## 배포
정적 호스팅(Vercel/Netlify/Cloudflare Pages/GitHub Pages)에 `projects/lowprice-landing`을 루트로 배포하면 됩니다.

## Domain caution

`lowprice.kr` is not owned by Guava/Mango. This project uses GitHub Pages as a temporary prototype only and must not depend on that domain.
