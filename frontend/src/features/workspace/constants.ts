import type { DueState, SpaceMemberRole, TaskStatus } from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
export const ACCESS_TOKEN_KEY = "pms_access_token";
export const taskStatuses: TaskStatus[] = ["Todo", "In Progress", "Done"];

export const statusLabels: Record<TaskStatus, string> = {
    Todo: "할 일",
    "In Progress": "진행 중",
    Done: "완료",
};

export const dueStateLabels: Record<DueState, string> = {
    overdue: "마감 지연",
    soon: "마감 임박",
    later: "예정",
    none: "마감일 없음",
};

export const roleLabels: Record<SpaceMemberRole, string> = {
    admin: "관리자",
    member: "멤버",
    viewer: "뷰어",
};
