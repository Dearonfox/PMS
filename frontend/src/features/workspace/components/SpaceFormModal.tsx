import type { FormEvent } from "react";

import type { Space, SpaceForm } from "../types";

type Props = {
    editingSpace: Space | null;
    form: SpaceForm;
    error: string | null;
    busy: boolean;
    onChange: (form: SpaceForm) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SpaceFormModal({ editingSpace, form, error, busy, onChange, onClose, onSubmit }: Props) {
    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="createModal" onClick={(event) => event.stopPropagation()}>
                <div className="modalHeader">
                    <div>
                        <h2>{editingSpace ? "스페이스 수정" : "스페이스 만들기"}</h2>
                        <p>{editingSpace ? "스페이스 이름과 설명을 수정합니다." : "팀이나 업무 단위로 프로젝트를 묶는 새 스페이스를 만듭니다."}</p>
                    </div>
                    <button className="modalCloseBtn" type="button" onClick={onClose}>닫기</button>
                </div>

                <form className="createForm" onSubmit={onSubmit}>
                    <label className="modalField">
                        <span>이름</span>
                        <input className="modalInput" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="스페이스 이름" disabled={busy} />
                    </label>
                    <label className="modalField">
                        <span>설명</span>
                        <textarea className="modalTextarea" value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} placeholder="스페이스 설명을 입력하세요" disabled={busy} />
                    </label>

                    {error ? <div className="errorBanner">{error}</div> : null}
                    <div className="modalActions">
                        <button className="ghostBtn" type="button" onClick={onClose} disabled={busy}>취소</button>
                        <button className="primaryBtn" type="submit" disabled={busy}>{busy ? "저장 중..." : editingSpace ? "변경사항 저장" : "스페이스 만들기"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
