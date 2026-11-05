# PMS — 팀 프로젝트 관리 서비스

Space를 중심으로 프로젝트와 작업을 관리하고, 팀원의 역할에 따라 접근 권한을 구분하는 협업 도구입니다.

단순한 Todo CRUD를 넘어 실제 팀 협업에 필요한 **역할 기반 권한**, **칸반 보드**, **개인 작업함**, **진행 현황 리포트**, **공개 커뮤니티**를 하나의 서비스로 구현했습니다.

## 주요 기능

### Space와 역할 기반 권한

- Space 생성·수정·삭제 및 이메일 기반 멤버 초대
- `admin`, `member`, `viewer` 역할 관리
- 역할에 따른 프론트엔드 UI 제어와 백엔드 API 권한 검증

| 역할 | Space·Project 관리 | 멤버 관리 | 작업 생성·수정 | 조회 |
| --- | :---: | :---: | :---: | :---: |
| admin | O | O | O | O |
| member | X | X | O | O |
| viewer | X | X | X | O |

### 프로젝트와 작업

- Space별 프로젝트와 작업 CRUD
- Todo / In Progress / Done 칸반 보드
- 드래그 앤 드롭 상태 변경
- 담당자, 마감일, 설명 관리
- 작업 검색과 상세 패널

### 개인화된 업무 화면

- **My Tasks**: 로그인 사용자에게 할당된 작업
- **Inbox**: 마감 지연·마감 임박 작업 중심의 알림형 목록
- **Reporting**: 상태별 작업 수, 완료율, 프로젝트별 진행률
- 로딩·오류·빈 데이터·검색 결과 없음 상태를 구분한 UI

### 인증과 커뮤니티

- 이메일·비밀번호 회원가입과 자체 JWT 로그인
- `/auth/me`를 이용한 사용자 세션 복구
- 공개 게시글 목록·검색·페이지네이션·상세 조회
- 게시글과 댓글 CRUD 및 작성자 소유권 검증
- 게시글 작성 중 페이지 이탈 방지

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript 5, Vite 7, React Router 7, CSS |
| Backend | FastAPI, SQLAlchemy 2, Pydantic |
| Database | MySQL, PyMySQL |
| Auth | PBKDF2 비밀번호 해싱, HS256 JWT |

## 프로젝트 구조

```text
PMS/
├─ frontend/
│  └─ src/
│     ├─ api/            # API 요청과 DTO
│     ├─ pages/          # 워크스페이스, 인증, 게시판 화면
│     ├─ App.tsx         # 인증 상태와 라우팅
│     └─ theme.css       # 공통 디자인 토큰
├─ backend/
│  ├─ app/
│  │  ├─ api/v1/         # REST API 엔드포인트
│  │  ├─ models/         # SQLAlchemy 모델
│  │  ├─ repositories/   # 데이터 접근과 권한 검증
│  │  └─ schemas/        # 요청·응답 DTO
│  └─ tests/             # API 통합·권한 회귀 테스트
└─ docs/                 # 기능 명세와 구현 문서
```

```text
React UI
  → JWT가 포함된 Fetch 요청
  → FastAPI endpoint
  → 역할·리소스 소유권 검증
  → SQLAlchemy repository
  → MySQL
```

## 로컬 실행

### 사전 준비

- Node.js 및 npm
- Python 가상환경과 백엔드 의존성
- 실행 중인 MySQL 데이터베이스

> 현재 백엔드 의존성 설치 명세는 저장소에 포함되어 있지 않습니다. 아래 과정은 기존 백엔드 가상환경이 준비되어 있다는 전제로 설명합니다.

### 1. 백엔드 환경변수

`backend/.env`를 생성합니다.

```env
DATABASE_URL=mysql+pymysql://USER:PASSWORD@127.0.0.1:3306/DATABASE_NAME
JWT_SECRET_KEY=충분히-길고-예측하기-어려운-문자열
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 2. 백엔드 실행

```powershell
cd backend
.\.venv\Scripts\python.exe -B -m app.migrate_board
.\.venv\Scripts\python.exe -B -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: <http://127.0.0.1:8000>
- Swagger UI: <http://127.0.0.1:8000/docs>
- 로컬 seed 계정: `owner@pms.local` / `password123`

seed 계정은 로컬 개발 전용이며 운영 환경에서 사용하면 안 됩니다.

### 3. 프론트엔드 실행

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

<http://127.0.0.1:5173>으로 접속합니다. API 주소가 다르면 `frontend/.env`를 설정합니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## 검증

```powershell
cd frontend
npm run lint
npm run build
```

```powershell
cd backend
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -v
```

백엔드 테스트는 별도 SQLite 데이터베이스를 사용해 로컬 MySQL 데이터를 변경하지 않습니다.

## 구현에서 중점적으로 고민한 부분

### 프론트와 백엔드의 이중 권한 검증

역할에 따라 사용할 수 없는 버튼과 드래그 기능을 UI에서 제한하는 동시에 API에서도 Space 멤버십과 역할을 다시 검증합니다. UI 조작이나 직접 API 호출만으로 권한을 우회할 수 없도록 구성했습니다.

### Space 단위 데이터 격리

프로젝트와 작업 조회는 현재 사용자가 가입한 Space 범위로 제한됩니다. 클라이언트가 필터를 생략하더라도 다른 Space 데이터가 노출되지 않도록 저장소 계층에서 멤버십 조건을 적용했습니다.

### 사용 상태를 고려한 화면 구성

로딩, 오류, 데이터 없음, 검색 결과 없음, 요청 처리 중 상태를 구분했습니다. 데이터가 변경되는 동작에는 중복 요청 방지와 삭제 확인을 적용했습니다.

## 현재 한계와 개선 계획

- 워크스페이스 화면을 도메인별 컴포넌트와 custom hook으로 분리
- 공통 API client를 도입해 JWT 헤더와 오류 처리 중앙화
- React Testing Library 기반 권한·작업 흐름 테스트 추가
- 키보드 조작과 모달 포커스 관리를 포함한 접근성 개선
- 백엔드 의존성 파일과 Docker 기반 실행 환경 제공
- 사용하지 않는 Firebase 코드와 의존성 제거

## 상세 문서

- [사용자 기능 명세](docs/PMS_FUNCTIONAL_SPEC.md)
- [관리자 기능 명세](docs/PMS_ADMIN_FUNCTIONAL_SPEC.md)
- [게시판 구현 문서](docs/BOARD_IMPLEMENTATION.md)

## 라이선스

학습 및 포트폴리오 목적으로 개발한 프로젝트입니다. 별도의 오픈소스 라이선스는 아직 지정하지 않았습니다.
