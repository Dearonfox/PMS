import type { Task } from "../types";
import { dueStateLabels, statusLabels } from "../constants";
import { getDueState } from "../utils";

type Props = {
    displayName: string;
    tasks: Task[];
    dueTasks: Task[];
    recentTasks: Task[];
    doneCount: number;
    getProjectName: (projectId: number) => string;
    onOpenTask: (task: Task) => void;
};

function InboxTaskList({
    tasks,
    emptyMessage,
    getProjectName,
    onOpenTask,
    showAssignee,
}: {
    tasks: Task[];
    emptyMessage: string;
    getProjectName: (projectId: number) => string;
    onOpenTask: (task: Task) => void;
    showAssignee?: boolean;
}) {
    if (!tasks.length) return <div className="emptyState">{emptyMessage}</div>;

    return (
        <div className="inboxList">
            {tasks.map((task) => {
                const dueState = getDueState(task);
                return (
                    <article key={task.id} className="inboxItem" onClick={() => onOpenTask(task)}>
                        <div className="inboxItemMain">
                            <span className={`dueBadge dueBadge-${dueState}`}>{dueStateLabels[dueState]}</span>
                            <strong>{task.title}</strong>
                            <p>{task.description || "설명 없음"}</p>
                        </div>
                        <div className="inboxItemMeta">
                            <span>{getProjectName(task.projectId)}</span>
                            <span>{showAssignee ? task.assignee || "담당자 없음" : task.due || "마감일 없음"}</span>
                            <span>{statusLabels[task.status]}</span>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

export default function InboxView({ displayName, tasks, dueTasks, recentTasks, doneCount, getProjectName, onOpenTask }: Props) {
    return (
        <div className="inboxLayout">
            <section className="inboxHero">
                <div>
                    <span className="inboxEyebrow">Today</span>
                    <h2>{displayName}님이 확인할 작업</h2>
                    <p>별도 알림 테이블 없이 현재 작업 데이터를 기준으로 만든 받은함입니다.</p>
                </div>
                <div className="inboxStats">
                    <div><strong>{tasks.length}</strong><span>배정됨</span></div>
                    <div><strong>{dueTasks.length}</strong><span>마감 주의</span></div>
                    <div><strong>{doneCount}</strong><span>완료</span></div>
                </div>
            </section>

            <section className="inboxSection">
                <div className="inboxSectionHeader"><h3>마감 주의</h3><span>{dueTasks.length}개</span></div>
                <InboxTaskList tasks={dueTasks} emptyMessage="지금 급하게 확인할 마감 작업이 없습니다." getProjectName={getProjectName} onOpenTask={onOpenTask} />
            </section>

            <section className="inboxSection">
                <div className="inboxSectionHeader"><h3>최근 배정 작업</h3><span>{recentTasks.length}개</span></div>
                <InboxTaskList tasks={recentTasks} emptyMessage="아직 내게 배정된 작업이 없습니다." getProjectName={getProjectName} onOpenTask={onOpenTask} showAssignee />
            </section>
        </div>
    );
}
