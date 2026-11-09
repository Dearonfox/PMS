import { useMemo } from "react";

import type { AuthUser } from "../../../App";
import { roleLabels, statusLabels } from "../constants";
import type { Project, Space, SpaceMember, Task, ViewMode } from "../types";
import { getDueState } from "../utils";

type Params = {
    spaces: Space[];
    projects: Project[];
    tasks: Task[];
    spaceMembers: SpaceMember[];
    activeSpaceId: number | null;
    activeProjectId: number | null;
    selectedTaskId: number | null;
    viewMode: ViewMode;
    query: string;
    user: AuthUser | null;
    loading: boolean;
    loadError: string | null;
};

export default function useWorkspaceView(params: Params) {
    return useMemo(() => {
        const { spaces, projects, tasks, spaceMembers, activeSpaceId, activeProjectId, selectedTaskId, viewMode, query, user, loading, loadError } = params;
        const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0] ?? null;
        const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
        const backendUserId = user?.id ?? null;
        const currentSpaceMember = spaceMembers.find((member) => member.userId === backendUserId) ?? null;
        const currentSpaceRole = currentSpaceMember?.role ?? (activeSpace?.creatorId === backendUserId ? "admin" : null);
        const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
        const selectedTaskProject = selectedTask ? projects.find((project) => project.id === selectedTask.projectId) ?? null : null;
        const normalizedQuery = query.trim().toLowerCase();
        const normalizedUserDisplayName = user?.display_name.trim().toLowerCase() ?? null;
        const normalizedUserEmail = user?.email.trim().toLowerCase() ?? null;
        const isTaskAssignedToCurrentUser = (task: Task) => {
            if (backendUserId !== null && task.assigneeId === backendUserId) return true;
            const normalizedAssignee = task.assignee?.trim().toLowerCase();
            return Boolean(normalizedAssignee && (normalizedAssignee === normalizedUserDisplayName || normalizedAssignee === normalizedUserEmail));
        };
        const scopedTasks = tasks.filter((task) => {
            if (viewMode === "my-tasks" || viewMode === "inbox") return backendUserId !== null && isTaskAssignedToCurrentUser(task);
            if (viewMode === "reporting") return true;
            return task.projectId === activeProject?.id;
        });
        const visibleTasks = scopedTasks.filter((task) => {
            if (!normalizedQuery) return true;
            const projectName = projects.find((project) => project.id === task.projectId)?.name ?? "";
            return [task.title, task.description, task.assignee, task.due, statusLabels[task.status], projectName]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        });
        const isSearching = normalizedQuery.length > 0;
        const inboxTasks = isSearching ? visibleTasks : tasks.filter(isTaskAssignedToCurrentUser);
        const inboxDueTasks = inboxTasks.filter((task) => task.status !== "Done").filter((task) => ["overdue", "soon"].includes(getDueState(task)));
        const inboxRecentTasks = [...inboxTasks].sort((first, second) => second.id - first.id).slice(0, 6);
        const reportingTasks = viewMode === "reporting" && isSearching ? visibleTasks : tasks;
        const reportingDoneCount = reportingTasks.filter((task) => task.status === "Done").length;
        const reportingDueRiskCount = reportingTasks.filter((task) => ["overdue", "soon"].includes(getDueState(task))).length;
        const projectReports = projects.map((project) => {
            const projectTasks = reportingTasks.filter((task) => task.projectId === project.id);
            const doneCount = projectTasks.filter((task) => task.status === "Done").length;
            return {
                ...project,
                taskCount: projectTasks.length,
                todoCount: projectTasks.filter((task) => task.status === "Todo").length,
                inProgressCount: projectTasks.filter((task) => task.status === "In Progress").length,
                doneCount,
                dueRiskCount: projectTasks.filter((task) => ["overdue", "soon"].includes(getDueState(task))).length,
                completionRate: projectTasks.length > 0 ? Math.round((doneCount / projectTasks.length) * 100) : 0,
            };
        });

        return {
            activeSpace,
            activeProject,
            backendUserId,
            currentSpaceRole,
            currentSpaceRoleLabel: currentSpaceRole ? roleLabels[currentSpaceRole] : "역할 확인 중",
            canManageSpace: currentSpaceRole === "admin",
            canManageProjects: currentSpaceRole === "admin",
            canWriteTasks: currentSpaceRole === "admin" || currentSpaceRole === "member",
            selectedTask,
            selectedTaskProject,
            scopedTasks,
            visibleTasks,
            isSearching,
            inboxTasks,
            inboxDueTasks,
            inboxRecentTasks,
            inboxDoneTasks: inboxTasks.filter((task) => task.status === "Done"),
            getProjectName: (projectId: number) => projects.find((project) => project.id === projectId)?.name ?? "프로젝트 없음",
            reportingTasks,
            reportingTotalCount: reportingTasks.length,
            reportingDoneCount,
            reportingTodoCount: reportingTasks.filter((task) => task.status === "Todo").length,
            reportingInProgressCount: reportingTasks.filter((task) => task.status === "In Progress").length,
            reportingDueRiskCount,
            reportingCompletionRate: reportingTasks.length > 0 ? Math.round((reportingDoneCount / reportingTasks.length) * 100) : 0,
            topProjectReports: [...projectReports].sort((first, second) => second.taskCount - first.taskCount || second.completionRate - first.completionRate).slice(0, 5),
            hasNoSpaces: !loading && !loadError && spaces.length === 0,
            hasNoProjects: !loading && !loadError && spaces.length > 0 && projects.length === 0,
            showSearchEmpty: !loading && !loadError && isSearching && visibleTasks.length === 0,
            showBoardEmpty: !loading && !loadError && !isSearching && viewMode !== "inbox" && viewMode !== "reporting" && projects.length > 0 && visibleTasks.length === 0,
        };
    }, [params]);
}
