import type { FormEvent } from "react";

import { roleLabels } from "../constants";
import type { MemberForm, Space, SpaceMember, SpaceMemberRole } from "../types";

type Props = {
    activeSpace: Space | null;
    members: SpaceMember[];
    form: MemberForm;
    loading: boolean;
    error: string | null;
    adding: boolean;
    updatingMemberId: number | null;
    removingMemberId: number | null;
    onFormChange: (form: MemberForm) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onRoleChange: (member: SpaceMember, role: SpaceMemberRole) => void;
    onRemove: (member: SpaceMember) => void;
};

export default function MembersModal({ activeSpace, members, form, loading, error, adding, updatingMemberId, removingMemberId, onFormChange, onClose, onSubmit, onRoleChange, onRemove }: Props) {
    return (
        <div className="modalBackdrop" onClick={onClose}>
            <div className="createModal memberModal" onClick={(event) => event.stopPropagation()}>
                <div className="modalHeader">
                    <div><h2>멤버 관리</h2><p>{activeSpace ? `${activeSpace.name} 스페이스 멤버를 관리합니다.` : "스페이스를 선택해주세요."}</p></div>
                    <button className="modalCloseBtn" type="button" onClick={onClose}>닫기</button>
                </div>

                <form className="memberInviteForm" onSubmit={onSubmit}>
                    <label className="modalField">
                        <span>이메일</span>
                        <input className="modalInput" type="email" value={form.email} onChange={(event) => onFormChange({ ...form, email: event.target.value })} placeholder="user@example.com" disabled={adding} />
                    </label>
                    <label className="modalField">
                        <span>역할</span>
                        <select className="modalInput" value={form.role} onChange={(event) => onFormChange({ ...form, role: event.target.value as SpaceMemberRole })} disabled={adding}>
                            {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                        </select>
                    </label>
                    <button className="primaryBtn" type="submit" disabled={adding}>{adding ? "추가 중..." : "멤버 추가"}</button>
                </form>

                {error ? <div className="errorBanner">{error}</div> : null}
                <div className="memberList">
                    {loading ? <div className="emptyState">멤버 목록을 불러오는 중입니다...</div> : members.length ? members.map((member) => (
                        <article className="memberRow" key={member.userId}>
                            <div className="memberIdentity">
                                <div className="avatar smallAvatar">{member.displayName[0]?.toUpperCase() ?? "U"}</div>
                                <div><strong>{member.displayName}</strong><span>{member.email}</span></div>
                            </div>
                            <div className="memberControls">
                                <select className="memberRoleSelect" value={member.role} onChange={(event) => onRoleChange(member, event.target.value as SpaceMemberRole)} disabled={updatingMemberId === member.userId || removingMemberId === member.userId}>
                                    {Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                                </select>
                                <button className="taskActionBtn danger" type="button" onClick={() => onRemove(member)} disabled={removingMemberId === member.userId}>{removingMemberId === member.userId ? "제거 중..." : "제거"}</button>
                            </div>
                        </article>
                    )) : <div className="emptyState">아직 이 스페이스에 멤버가 없습니다.</div>}
                </div>
            </div>
        </div>
    );
}
