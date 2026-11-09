type Props = {
    title: string;
    description: string;
    summaryTitle: string;
    summaryMeta: string;
    error: string | null;
    busy: boolean;
    confirmLabel: string;
    onClose: () => void;
    onConfirm: () => void;
};

export default function DeleteConfirmModal({
    title,
    description,
    summaryTitle,
    summaryMeta,
    error,
    busy,
    confirmLabel,
    onClose,
    onConfirm,
}: Props) {
    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="deleteModal" onClick={(event) => event.stopPropagation()}>
                <div className="modalHeader">
                    <div><h2>{title}</h2><p>{description}</p></div>
                    <button className="modalCloseBtn" type="button" onClick={onClose}>닫기</button>
                </div>

                <div className="deleteSummary">
                    <div className="deleteTitle">{summaryTitle}</div>
                    <div className="deleteMeta">{summaryMeta}</div>
                </div>

                {error ? <div className="errorBanner">{error}</div> : null}

                <div className="modalActions">
                    <button className="ghostBtn" type="button" onClick={onClose} disabled={busy}>취소</button>
                    <button className="dangerBtn" type="button" onClick={onConfirm} disabled={busy}>
                        {busy ? "삭제 중..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
