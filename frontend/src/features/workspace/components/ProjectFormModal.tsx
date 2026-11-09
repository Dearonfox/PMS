import type { FormEvent } from "react";

import type { Project, ProjectForm } from "../types";

type Props = {
    editingProject: Project | null;
    form: ProjectForm;
    error: string | null;
    busy: boolean;
    onChange: (form: ProjectForm) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ProjectFormModal({ editingProject, form, error, busy, onChange, onClose, onSubmit }: Props) {
    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="createModal" onClick={(event) => event.stopPropagation()}>
                <div className="modalHeader">
                    <div>
                        <h2>{editingProject ? "프로젝트 수정" : "프로젝트 만들기"}</h2>
                        <p>{editingProject ? "프로젝트 이름, 아이콘, 설명을 수정합니다." : "새 프로젝트를 만들고 바로 보드에 추가합니다."}</p>
                    </div>
                    <button className="modalCloseBtn" type="button" onClick={onClose}>닫기</button>
                </div>

                <form className="createForm" onSubmit={onSubmit}>
                    <div className="modalGrid">
                        <label className="modalField">
                            <span>이름</span>
                            <input className="modalInput" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="프로젝트 이름" disabled={busy} />
                        </label>
                        <label className="modalField">
                            <span>아이콘</span>
                            <input className="modalInput" value={form.emoji} onChange={(event) => onChange({ ...form, emoji: event.target.value })} placeholder="[앱]" disabled={busy} />
                        </label>
                    </div>

                    <label className="modalField">
                        <span>설명</span>
                        <textarea className="modalTextarea" value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="프로젝트 설명을 입력하세요" disabled={busy} />
                    </label>

                    {error ? <div className="errorBanner">{error}</div> : null}
                    <div className="modalActions">
                        <button className="ghostBtn" type="button" onClick={onClose} disabled={busy}>취소</button>
                        <button className="primaryBtn" type="submit" disabled={busy}>{busy ? "저장 중..." : editingProject ? "변경사항 저장" : "프로젝트 만들기"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
