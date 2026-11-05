# PMS Frontend

React, TypeScript, Vite로 구현한 PMS 프론트엔드입니다.

프로젝트 소개, 전체 실행 방법, 기술적 의사결정은 [루트 README](../README.md)에서 확인할 수 있습니다.

## 실행

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

기본 API 주소는 `http://127.0.0.1:8000/api/v1`입니다. 다른 주소를 사용하려면 `.env`를 생성합니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## 검증

```powershell
npm run lint
npm run build
```
