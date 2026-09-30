const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type Author = { id: number; display_name: string };
export type Post = {
  id: number; title: string; content: string; author: Author;
  view_count: number; comment_count: number; created_at: string; updated_at: string;
};
export type Comment = { id: number; post_id: number; content: string; author: Author; created_at: string; updated_at: string };
export type PostPage = { items: Post[]; page: number; size: number; total: number; total_pages: number };

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function boardApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("pms_access_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = response.status === 401 ? "로그인이 필요하거나 만료되었습니다. 다시 로그인해주세요."
      : typeof data.detail === "string" ? data.detail
      : response.status === 422 ? "입력값과 글자 수를 확인해주세요."
      : "서버 요청에 실패했습니다. 잠시 후 다시 시도해주세요.";
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "서버 요청에 실패했습니다.";
export const dateLabel = (value: string) => new Date(value).toLocaleString("ko-KR");
