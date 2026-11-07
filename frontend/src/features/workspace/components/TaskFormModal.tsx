import type { FormEvent } from "react";

import { statusLabels, taskStatuses } from "../constants";
import type { TaskForm, TaskStatus } from "../types";

type Props = {
    mode: "create" | "edit";
    projectName?: string;
    form: TaskForm;
    error: string | null;
    busy: boolean;
    currentUserName?: string;
    onChange: (form: TaskForm) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function TaskFormModal({ mode, projectName, form, error, busy, currentUserName, onChange, onClose, onSubmit }: Props) {
    const isCreate = mode === "create";
    const update = <Key extends keyof TaskForm>(key: Key, value: TaskForm[Key]) => onChange({ ...form, [key]: value });

    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="createModal" onClick={(event) => event.stopPropagation()}>
                <div className="modalHeader">
                    <div>
                        <h2>{isCreate ? "작업 만들기" : "작업 수정"}</h2>
                        <p>{projectName ? `프로젝트: ${projectName}` : isCreate ? "프로젝트를 먼저 선택해주세요." : "프로젝트 작업"}</p>
                    </div>
                    <button className="modalCloseBtn" type="button" onClick={onClose}>닫기</button>
                </div>

                <form className="createForm" onSubmit={onSubmit}>
                    <label className="modalField">
                        <span>제목</span>
                        <input className="modalInput" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="작업 제목을 입력하세요" disabled={busy} />
                    </label>

                    <div className="modalGrid">
                        <label className="modalField">
                            <span>상태</span>
                            <select className="modalInput" value={form.status} onChange={(event) => update("status", event.target.value as TaskStatus)} disabled={busy}>
                                {taskStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                            </select>
                        </label>

                        <label className="modalField">
                            <span>담당자</span>
                            <input className="modalInput" value={form.assignee} onChange={(event) => update("assignee", event.target.value)} placeholder="이름" disabled={busy} />
                            {currentUserName ? <button className="assignMeBtn" type="button" onClick={() => update("assignee", currentUserName)} disabled={busy}>나에게 배정</button> : null}
                        </label>
                    </div>

                    <label className="modalField">
                        <span>마감일</span>
                        <input className="modalInput" value={form.due} onChange={(event) => update("due", event.target.value)} placeholder="오늘, 내일, 2026-04-10" disabled={busy} />
                    </label>

                    <label className="modalField">
                        <span>설명</span>
                        <textarea className="modalTextarea" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="작업 설명을 입력하세요" disabled={busy} />
                    </label>

                    {error ? <div className="errorBanner">{error}</div> : null}

                    <div className="modalActions">
                        <button className="ghostBtn" type="button" onClick={onClose} disabled={busy}>취소</button>
                        <button className="primaryBtn" type="submit" disabled={busy}>{busy ? (isCreate ? "생성 중..." : "저장 중...") : (isCreate ? "작업 만들기" : "변경사항 저장")}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
