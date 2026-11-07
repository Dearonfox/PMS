import { statusLabels, taskStatuses } from "../constants";
import type { ProjectReport, Task } from "../types";

type Props = {
    isSearching: boolean;
    tasks: Task[];
    totalCount: number;
    todoCount: number;
    inProgressCount: number;
    doneCount: number;
    dueRiskCount: number;
    completionRate: number;
    projectReports: ProjectReport[];
};

export default function ReportingView({ isSearching, tasks, totalCount, todoCount, inProgressCount, doneCount, dueRiskCount, completionRate, projectReports }: Props) {
    return (
        <div className="reportLayout">
            <section className="reportHero">
                <div>
                    <span className="reportEyebrow">Overview</span>
                    <h2>전체 프로젝트 진행률</h2>
                    <p>{isSearching ? "검색 결과에 포함된 작업만 기준으로 집계합니다." : "현재 등록된 모든 프로젝트와 작업을 기준으로 집계합니다."}</p>
                </div>
                <div className="completionRing" style={{ background: `conic-gradient(rgba(90, 169, 255, 0.90) ${completionRate}%, rgba(255, 255, 255, 0.08) 0)` }} aria-label={`완료율 ${completionRate}%`}>
                    <strong>{completionRate}%</strong><span>완료율</span>
                </div>
            </section>

            <section className="reportKpis">
                <div className="reportKpi"><span>전체 작업</span><strong>{totalCount}</strong></div>
                <div className="reportKpi"><span>할 일</span><strong>{todoCount}</strong></div>
                <div className="reportKpi"><span>진행 중</span><strong>{inProgressCount}</strong></div>
                <div className="reportKpi"><span>완료</span><strong>{doneCount}</strong></div>
                <div className="reportKpi warning"><span>마감 주의</span><strong>{dueRiskCount}</strong></div>
            </section>

            <section className="reportPanel">
                <div className="reportSectionHeader"><h3>상태별 작업 분포</h3><span>{totalCount}개 작업</span></div>
                <div className="statusBars">
                    {taskStatuses.map((status) => {
                        const count = tasks.filter((task) => task.status === status).length;
                        const rate = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                        return (
                            <div className="statusBarRow" key={status}>
                                <div className="statusBarLabel"><strong>{statusLabels[status]}</strong><span>{count}개 · {rate}%</span></div>
                                <div className="statusBarTrack"><div className={`statusBarFill statusBarFill-${status.replaceAll(" ", "")}`} style={{ width: `${rate}%` }} /></div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="reportPanel">
                <div className="reportSectionHeader"><h3>프로젝트별 현황</h3><span>{projectReports.length}개 프로젝트</span></div>
                {projectReports.length ? (
                    <div className="projectReportList">
                        {projectReports.map((project) => (
                            <article className="projectReportItem" key={project.id}>
                                <div className="projectReportTitle"><span>{project.emoji ?? "[ ]"}</span><strong>{project.name}</strong></div>
                                <div className="projectReportProgress"><div className="projectProgressTrack"><div className="projectProgressFill" style={{ width: `${project.completionRate}%` }} /></div><strong>{project.completionRate}%</strong></div>
                                <div className="projectReportMeta"><span>전체 {project.taskCount}</span><span>진행 {project.inProgressCount}</span><span>완료 {project.doneCount}</span><span>마감 주의 {project.dueRiskCount}</span></div>
                            </article>
                        ))}
                    </div>
                ) : <div className="emptyState">리포트로 집계할 프로젝트가 없습니다.</div>}
            </section>
        </div>
    );
}
