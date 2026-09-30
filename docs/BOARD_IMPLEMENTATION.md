# CareerStep 게시판 구현

## 기존 구조와 적용 방향

- 프론트엔드: React 19, TypeScript, Vite, React Router 7. 기존 `App.tsx`의 경로와 `Home.tsx` 기능 유지.
- 백엔드: FastAPI, SQLAlchemy 2, MySQL(PyMySQL). API prefix `/api/v1`, Pydantic DTO, 오류 `detail`, 삭제 응답 `{ "deleted": true }` 유지.
- 인증: 기존 이메일/비밀번호 가입·로그인, 자체 HS256 JWT와 `get_current_user` 재사용. `localStorage.pms_access_token`을 Authorization Bearer로 전달하고 `/auth/me`로 사용자 확인.
- 기존 Firebase 파일과 의존성은 보존했으며 게시판에서 사용하지 않음.
- Axios/공통 토스트/공통 레이아웃 컴포넌트가 없어 기존 fetch 방식과 어두운 CSS 스타일을 따르는 게시판 전용 모듈·레이아웃 추가. 새 라이브러리 없음.
- `VITE_API_BASE_URL`, `DATABASE_URL`, `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` 유지. 기존 Docker 및 의존성 설치 명세는 없음.
- 게시판은 Space에 소속되지 않는 공개 커뮤니티. 기존 Space/Project/Task 접근 정책은 그대로 유지.
- 페이지 이탈 확인을 위해 `main.tsx`에서 BrowserRouter를 createBrowserRouter/RouterProvider로 전환. 기존 App의 Routes는 유지.

## 새 파일

- `backend/app/models/board.py`: Post/Comment ORM, 작성자 관계, 댓글 cascade, 인덱스.
- `backend/app/schemas/board.py`: 입력 및 응답 DTO, 공백/길이 검증.
- `backend/app/api/v1/endpoints/board.py`: 공개 읽기, 인증/소유자 검증과 CRUD.
- `backend/app/migrate_board.py`: 기존 users PK 타입을 반영하는 재실행 가능한 추가 테이블 마이그레이션.
- `backend/tests/test_board.py`: 격리된 SQLite와 실제 Uvicorn HTTP 통합 테스트.
- `frontend/src/api/board.ts`: fetch, JWT 헤더, 공통 오류와 타입.
- `frontend/src/pages/Board.tsx`: 목록/상세/작성/수정, 폼, 댓글, 페이지네이션 컴포넌트.
- `frontend/src/pages/Board.css`: 게시판 범위 스타일 및 모바일 대응.
- `docs/BOARD_IMPLEMENTATION.md`: 이 문서.

## 수정 파일

- `backend/app/models/__init__.py`: 모델 등록, 기존 시작 시 create_all에 포함.
- `backend/app/api/v1/router.py`: 게시판 API 등록.
- `frontend/src/App.tsx`: `/posts/*`, 인증 초기 로딩 안내.
- `frontend/src/main.tsx`: 이탈 차단을 지원하는 데이터 라우터.
- `frontend/src/pages/Home.tsx`: 사이드바 게시판 메뉴.
- `docs/AI_CONTEXT.md`: 변경한 방향과 지속 구현 정보.

기존 `.idea/workspace.xml`과 추적 중인 Python 캐시의 사용자 변경은 수정 대상으로 삼지 않음.

## 기능과 제한값

- 목록: 제목, 작성자, 작성일, 조회수, 댓글 수, 최신순(작성일/id), 페이지네이션, 제목/본문 검색, 검색 상태 URL 보존.
- 상세: 제목/본문/작성자/작성·수정일/조회수/댓글, 목록 복귀, 본인 글 수정·삭제.
- 글 작성/수정: 로그인 필요, 기존 내용 로드, 서버와 클라이언트에서 빈 값 방지, trim, 제목 200자/본문 10,000자.
- 작성 중 내부 이동·뒤로 가기는 React Router blocker, 새로고침·탭 닫기는 beforeunload 확인. 브라우저가 beforeunload 문구를 결정함.
- 댓글 작성/수정/삭제: 로그인 필요, 본인만 변경, trim, 2,000자 제한.
- 요청 중 버튼 비활성화, 로딩·오류·빈 목록·검색 결과 없음·권한·로그인 안내 및 성공 메시지. 삭제는 네이티브 confirm 사용.
- SQLAlchemy 바인딩과 LIKE 와일드카드 escape로 검색 문자열 처리. HTML은 React 텍스트로 출력하며 HTML 실행 기능 없음.
- 작성자 ID는 JWT로 확인한 사용자에서만 설정. 입력 DTO에서 임의 author_id 등 추가 필드 거부.
- 조회수는 상세 GET 요청마다 원자적으로 1 증가. 수정 폼의 기존 데이터 로드도 상세 GET을 사용하므로 증가하며 방문자별 중복 제거는 없음. 조회만으로 수정일은 바뀌지 않음.

## DB 변경

현재 로컬 MySQL에 posts/comments 생성 완료. 기존 테이블과 데이터는 변경하지 않음.

- posts: id/title/content/author_id/view_count/created_at/updated_at.
- comments: id/post_id/author_id/content/created_at/updated_at.
- 작성자는 users FK(RESTRICT), comments.post_id는 posts FK(CASCADE). ORM에서도 글 삭제 시 댓글 제거.
- posts `(created_at, id)`, comments `(post_id, created_at, id)`, 각 author_id 인덱스.
- 부분 문자열 LIKE 검색은 일반 B-tree 인덱스로 가속할 수 없어 불필요한 title 인덱스는 추가하지 않음. 데이터가 커지면 MySQL FULLTEXT/한국어 토큰화 정책 검토.
- 실제 로컬 users.id는 INTEGER. `backend/sql/schema.sql`의 BIGINT와 차이가 있어 SQL 파일을 실행하는 대신 기존 users.id 타입을 반영하는 마이그레이션 제공.
- 재실행 검증 완료. 새 설치의 시작 시 create_all도 테이블 생성 가능. 기존 DB 설치에서는 명시적 마이그레이션을 먼저 실행하는 것을 권장.

## API

모든 경로에 `/api/v1`을 붙임.

| 메서드 | 경로 | 권한/응답 |
| --- | --- | --- |
| GET | /posts?page=1&size=10&search= | 공개, items/page/size/total/total_pages |
| GET | /posts/{post_id} | 공개, 상세·작성자·댓글 수 |
| POST | /posts | 로그인, 201 |
| PUT | /posts/{post_id} | 작성자, 200 |
| DELETE | /posts/{post_id} | 작성자, 200 |
| GET | /posts/{post_id}/comments | 공개, 댓글 배열 |
| POST | /posts/{post_id}/comments | 로그인, 201 |
| PUT | /comments/{comment_id} | 작성자, 200 |
| DELETE | /comments/{comment_id} | 작성자, 200 |

page는 1 이상, size는 1~100, search는 최대 200자. 입력 오류 422, 인증 오류 401, 작성자 불일치 403, 존재하지 않는 리소스 404. 작성자 공개 정보는 id/display_name만 포함.

## 실행 및 검증

PowerShell에서 저장소 루트를 기준으로 각 터미널에서 실행:

```powershell
cd backend
.\.venv\Scripts\python.exe -B -m app.migrate_board
.\.venv\Scripts\python.exe -B -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm run dev -- --host 127.0.0.1
```

접속: http://127.0.0.1:5173/posts

```powershell
cd backend
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -v
```

```powershell
cd frontend
npm run lint
npm run build
```

검증 결과:

- 실제 HTTP 통합 테스트 통과: 공개 목록/상세/댓글, 가입·JWT, 글 작성/수정/삭제, 비로그인 차단, 타인 글·댓글 수정/삭제 403, 댓글 CRUD와 개수, 댓글 cascade, trim/길이/추가 author_id 거부, 검색/페이지네이션/정렬, 404, 조회수 및 수정일 유지.
- 테스트는 별도 임시 SQLite 사용. 기존 MySQL에 테스트 게시글·계정을 만들지 않음.
- MySQL 테이블 생성, 재실행, 인덱스와 FK 검사 통과. 실제 MySQL 연결로 FastAPI 시작 성공.
- ESLint 및 TypeScript/Vite 프로덕션 빌드 통과.
- 브라우저에서 공개 목록·빈 상태·비로그인 글쓰기 안내 확인. 로그인 이후의 전체 UI 클릭 검증과 모바일 실기기 검증은 별도 필요. 기존 로컬 개발 계정의 기본 비밀번호 로그인은 실패했으며 계정 정보를 변경하지 않음.
- Windows 테스트 서버 프로세스의 파일 잠금 문제를 스레드 기반 서버 종료·DB 연결 dispose로 수정. 테스트 실행 시 기존 websockets 의존성의 deprecation warning이 출력되지만 테스트는 통과.

## 직접 설정할 사항과 개선 후보

- 현재 로컬 설정은 그대로 사용 가능. 별도 환경은 backend/.env에 DATABASE_URL, 강한 JWT_SECRET_KEY를 설정하고 필요하면 ACCESS_TOKEN_EXPIRE_MINUTES 조정.
- 프론트엔드 API 주소가 다르면 VITE_API_BASE_URL 설정. 기본 주소는 http://127.0.0.1:8000/api/v1.
- 다른 호스트에 배포하면 기존 main.py CORS 허용 origin과 SPA 경로 fallback도 배포 주소에 맞게 구성.
- 새 환경은 기존 프로젝트 의존성 설치가 선행되어야 함. 이 작업에서 라이브러리나 Docker 설정은 추가하지 않음.
- 개선 후보: 댓글 페이지네이션, 검색 전용 인덱스, 방문자별 조회 중복 제거, 신고/운영자 관리, 첨부 파일, 임시 저장, UI 자동 회귀 테스트.
