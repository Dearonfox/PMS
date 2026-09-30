import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { AuthUser } from "../App";
import { boardApi, dateLabel, errorMessage, type Comment, type Post, type PostPage } from "../api/board";
import "./Board.css";

type UserProps = { user: AuthUser | null };

function LoginLink() {
  const location = useLocation();
  return <Link to="/login" state={{ from: location.pathname + location.search }}>로그인하기</Link>;
}

function ErrorNotice({ message }: { message: string }) {
  return <div className="boardError" role="alert">{message} {message.includes("로그인") && <LoginLink />}</div>;
}

export default function Board({ user }: UserProps) {
  const location = useLocation();
  return <div className="boardApp">
    <header className="boardHeader"><Link to="/posts" className="boardBrand">CareerStep <span>커뮤니티</span></Link>
      <nav aria-label="주 메뉴"><Link to="/">프로젝트 홈</Link>{user ? <span>{user.display_name}님</span> : <LoginLink />}</nav>
    </header>
    <main className="boardMain"><Routes key={location.pathname}>
      <Route index element={<PostList />} />
      <Route path="new" element={<PostEditor user={user} />} />
      <Route path=":postId/edit" element={<PostEditor user={user} edit />} />
      <Route path=":postId" element={<PostView user={user} />} />
      <Route path="*" element={<p>페이지를 찾을 수 없습니다. <Link to="/posts">게시판으로</Link></p>} />
    </Routes></main>
  </div>;
}

function PostList() {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = params.get("search") ?? "";
  const [query, setQuery] = useState(search);
  const [data, setData] = useState<PostPage | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const location = useLocation();
  useEffect(() => { setQuery(search); }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    boardApi<PostPage>(`/posts?${new URLSearchParams({ page: String(page), size: "10", search })}`, { signal: controller.signal })
      .then(setData).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, [page, search, retry]);
  const movePage = (next: number) => setParams({ page: String(next), ...(search ? { search } : {}) });
  return <>
    <div className="boardTitle"><div><p className="boardEyebrow">함께 성장하는 공간</p><h1>자유 게시판</h1><p>질문과 경험을 나누고 다음 걸음을 함께 준비하세요.</p></div><Link className="boardPrimary" to="/posts/new">글쓰기</Link></div>
    {location.state?.notice && <p role="status" className="boardSuccess">{location.state.notice}</p>}
    <form className="boardSearch" onSubmit={e => { e.preventDefault(); setParams(query.trim() ? { search: query.trim() } : {}); }}>
      <input aria-label="제목 및 내용 검색" placeholder="제목 또는 내용으로 검색" maxLength={200} value={query} onChange={e => setQuery(e.target.value)} />
      <button type="submit">검색</button>{search && <button type="button" onClick={() => setParams({})}>초기화</button>}
    </form>
    {error ? <><ErrorNotice message={error} /><button onClick={() => setRetry(retry + 1)}>다시 시도</button></> : !data ? <p role="status">게시글을 불러오는 중…</p> : <>
      <p className="boardMeta">총 {data.total}개의 게시글 · 최신순</p>
      {!data.items.length ? <div className="boardEmpty">{search ? "검색 결과가 없습니다. 다른 검색어를 입력해주세요." : page > 1 ? "이 페이지에는 게시글이 없습니다." : "아직 게시글이 없습니다. 첫 이야기를 나눠보세요."}{page > 1 && <button onClick={() => movePage(1)}>첫 페이지로</button>}</div> :
        <ul className="boardPosts">{data.items.map(post => <li key={post.id}>
          <Link className="boardPostTitle" to={`/posts/${post.id}`} state={{ listUrl: location.pathname + location.search }}>{post.title}</Link>
          <div className="boardMeta"><span>{post.author.display_name}</span><time>{dateLabel(post.created_at)}</time><span>조회 {post.view_count}</span><span>댓글 {post.comment_count}</span></div>
        </li>)}</ul>}
      {data.total_pages > 0 && <nav className="boardPagination" aria-label="게시글 페이지">
        <button disabled={page <= 1} onClick={() => movePage(page - 1)}>이전</button>
        <span aria-live="polite">{page} / {data.total_pages}</span>
        <button disabled={page >= data.total_pages} onClick={() => movePage(page + 1)}>다음</button>
      </nav>}
    </>}
  </>;
}

function PostView({ user }: UserProps) {
  const { postId } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const nav = useNavigate();
  const location = useLocation();
  const listUrl = typeof location.state?.listUrl === "string" && location.state.listUrl.startsWith("/posts?") ? location.state.listUrl : "/posts";
  useEffect(() => {
    const controller = new AbortController();
    boardApi<Post>(`/posts/${postId}`, { signal: controller.signal }).then(setPost)
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, [postId, retry]);
  async function remove() {
    if (busy || !window.confirm("게시글과 모든 댓글을 삭제하시겠습니까?")) return;
    setBusy(true); setError("");
    try { await boardApi(`/posts/${postId}`, { method: "DELETE" }); nav("/posts", { replace: true, state: { notice: "게시글이 삭제되었습니다." } }); }
    catch (error) { setError(errorMessage(error)); setBusy(false); }
  }
  return <>
    <Link to={listUrl}>← 목록으로</Link>
    {location.state?.notice && <p role="status" className="boardSuccess">{location.state.notice}</p>}
    {error && <ErrorNotice message={error} />}
    {!post ? error ? <button onClick={() => { setError(""); setRetry(retry + 1); }}>다시 시도</button> : <p role="status">게시글을 불러오는 중…</p> : <>
      <article className="boardArticle"><h1>{post.title}</h1>
        <div className="boardMeta"><span>{post.author.display_name}</span><span>작성 {dateLabel(post.created_at)}</span><span>수정 {dateLabel(post.updated_at)}</span><span>조회 {post.view_count}</span></div>
        <div className="boardContent">{post.content}</div>
        {user?.id === post.author.id && <div className="boardActions"><Link to={`/posts/${post.id}/edit`}>수정</Link><button disabled={busy} onClick={remove}>{busy ? "삭제 중…" : "삭제"}</button></div>}
      </article>
      <Comments key={post.id} postId={post.id} user={user} />
    </>}
  </>;
}

function PostEditor({ user, edit = false }: UserProps & { edit?: boolean }) {
  const { postId } = useParams();
  const [initial, setInitial] = useState({ title: "", content: "" });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ready, setReady] = useState(!edit);
  const [allowed, setAllowed] = useState(!edit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saved = useRef(false);
  const nav = useNavigate();
  const dirty = title !== initial.title || content !== initial.content;
  const blocker = useBlocker(() => !saved.current && (busy || dirty));
  useEffect(() => {
    if (blocker.state === "blocked" && !busy) {
      if (window.confirm("작성 중인 내용이 사라집니다. 페이지를 나가시겠습니까?")) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, busy]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if ((dirty || busy) && !saved.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);
  useEffect(() => {
    if (!edit || !user) return;
    const controller = new AbortController();
    boardApi<Post>(`/posts/${postId}`, { signal: controller.signal }).then(post => {
      if (post.author.id !== user.id) { setError("작성자만 게시글을 수정할 수 있습니다."); return; }
      setInitial({ title: post.title, content: post.content }); setTitle(post.title); setContent(post.content); setAllowed(true);
    }).catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, [edit, postId, user]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !title.trim() || !content.trim()) return;
    setBusy(true); setError("");
    try {
      const post = await boardApi<Post>(edit ? `/posts/${postId}` : "/posts", { method: edit ? "PUT" : "POST", body: JSON.stringify({ title: title.trim(), content: content.trim() }) });
      saved.current = true;
      nav(`/posts/${post.id}`, { replace: true, state: { notice: edit ? "게시글이 수정되었습니다." : "게시글이 작성되었습니다." } });
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  if (!user) return <div className="boardEmpty">게시글 작성·수정은 로그인이 필요합니다. <LoginLink /><p><Link to="/posts">목록으로</Link></p></div>;
  return <>
    <h1>{edit ? "게시글 수정" : "새 게시글"}</h1>
    {error && <ErrorNotice message={error} />}
    {!ready ? <p role="status">기존 내용을 불러오는 중…</p> : allowed && <form className="boardForm" onSubmit={submit}>
      <label>제목 <span>{title.length}/200</span><input required maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></label>
      <label>내용 <span>{content.length}/10,000</span><textarea required maxLength={10000} rows={14} value={content} disabled={busy} onChange={e => setContent(e.target.value)} /></label>
      <div className="boardActions"><button className="boardPrimary" disabled={busy || !title.trim() || !content.trim()}>{busy ? "저장 중…" : "저장"}</button><button type="button" disabled={busy} onClick={() => nav(edit ? `/posts/${postId}` : "/posts")}>취소</button></div>
    </form>}
    {ready && !allowed && <Link to="/posts">목록으로</Link>}
  </>;
}

function Comments({ postId, user }: UserProps & { postId: number }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    boardApi<Comment[]>(`/posts/${postId}/comments`, { signal: controller.signal }).then(setComments)
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, [postId, retry]);
  async function mutate(method: "POST" | "PUT" | "DELETE", id?: number) {
    if (busy) return;
    if (method === "DELETE" && !window.confirm("댓글을 삭제하시겠습니까?")) return;
    const value = (method === "POST" ? content : draft).trim();
    if (method !== "DELETE" && !value) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await boardApi<Comment>(id ? `/comments/${id}` : `/posts/${postId}/comments`, { method, ...(method !== "DELETE" ? { body: JSON.stringify({ content: value }) } : {}) });
      setComments(current => method === "POST" ? [...(current ?? []), result] : method === "PUT" ? (current ?? []).map(c => c.id === id ? result : c) : (current ?? []).filter(c => c.id !== id));
      if (method === "POST") setContent("");
      else { setEditing(null); setDraft(""); }
      setNotice(method === "POST" ? "댓글이 작성되었습니다." : method === "PUT" ? "댓글이 수정되었습니다." : "댓글이 삭제되었습니다.");
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="boardComments"><h2>댓글 {comments?.length ?? ""}</h2>
    {error && <><ErrorNotice message={error} />{comments === null && <button onClick={() => setRetry(retry + 1)}>다시 시도</button>}</>}
    {notice && <p className="boardSuccess" role="status">{notice}</p>}
    {comments === null ? !error && <p role="status">댓글을 불러오는 중…</p> : !comments.length ? <p className="boardMeta">첫 댓글을 남겨보세요.</p> : <ul className="boardCommentList">{comments.map(comment => <li key={comment.id}>
      <div className="boardMeta"><strong>{comment.author.display_name}</strong><time>{dateLabel(comment.created_at)}</time></div>
      {editing === comment.id ? <form className="boardForm" onSubmit={e => { e.preventDefault(); void mutate("PUT", comment.id); }}>
        <textarea aria-label="댓글 수정" maxLength={2000} required value={draft} disabled={busy} onChange={e => setDraft(e.target.value)} />
        <div className="boardActions"><button disabled={busy || !draft.trim()}>수정 저장</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>취소</button></div>
      </form> : <><p className="boardContent">{comment.content}</p>{user?.id === comment.author.id && <div className="boardActions"><button disabled={busy} onClick={() => { setEditing(comment.id); setDraft(comment.content); }}>수정</button><button disabled={busy} onClick={() => void mutate("DELETE", comment.id)}>삭제</button></div>}</>}
    </li>)}</ul>}
    {user ? <form className="boardForm" onSubmit={e => { e.preventDefault(); void mutate("POST"); }}>
      <label>댓글 남기기 <span>{content.length}/2,000</span><textarea required maxLength={2000} rows={3} value={content} disabled={busy || comments === null} onChange={e => setContent(e.target.value)} /></label>
      <button className="boardPrimary" disabled={busy || comments === null || !content.trim()}>{busy ? "처리 중…" : "댓글 등록"}</button>
    </form> : <p>댓글을 남기려면 <LoginLink /></p>}
  </section>;
}
