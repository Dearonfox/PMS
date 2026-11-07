import type {
    ApiProject,
    ApiSpace,
    ApiSpaceMember,
    ApiTask,
    DueState,
    MemberForm,
    Project,
    ProjectForm,
    Space,
    SpaceForm,
    SpaceMember,
    Task,
    TaskForm,
    TaskStatus,
} from "./types";

export const emptyTaskForm = (status: TaskStatus): TaskForm => ({
    title: "",
    status,
    assignee: "",
    due: "",
    description: "",
});

export const emptyProjectForm = (): ProjectForm => ({ name: "", emoji: "", description: "" });
export const emptySpaceForm = (): SpaceForm => ({ name: "", description: "" });
export const emptyMemberForm = (): MemberForm => ({ email: "", role: "member" });

export const formFromSpace = (space: Space): SpaceForm => ({
    name: space.name,
    description: space.description ?? "",
});

export const formFromProject = (project: Project): ProjectForm => ({
    name: project.name,
    emoji: project.emoji ?? "",
    description: project.description ?? "",
});

export const formFromTask = (task: Task): TaskForm => ({
    title: task.title,
    status: task.status,
    assignee: task.assignee ?? "",
    due: task.due ?? "",
    description: task.description ?? "",
});

export const mapSpace = (space: ApiSpace): Space => ({
    id: space.id,
    name: space.name,
    description: space.description,
    creatorId: space.creator_id,
});

export const mapSpaceMember = (member: ApiSpaceMember): SpaceMember => ({
    spaceId: member.space_id,
    userId: member.user_id,
    email: member.email,
    displayName: member.display_name,
    role: member.role,
});

export const mapProject = (project: ApiProject): Project => ({
    id: project.id,
    spaceId: project.space_id,
    name: project.name,
    emoji: project.emoji,
    description: project.description,
});

export const mapTask = (task: ApiTask): Task => ({
    id: task.id,
    title: task.title,
    projectId: task.project_id,
    status: task.status,
    due: task.due,
    assignee: task.assignee,
    assigneeId: task.assignee_id,
    description: task.description,
    creatorId: task.creator_id,
});

export function parseDueDate(due?: string | null): Date | null {
    if (!due) return null;

    const normalizedDue = due.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (normalizedDue === "today" || normalizedDue === "오늘") return today;
    if (normalizedDue === "tomorrow" || normalizedDue === "내일") {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow;
    }

    const parsedDate = new Date(due);
    if (Number.isNaN(parsedDate.getTime())) return null;
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate;
}

export function getDueState(task: Task): DueState {
    const dueDate = parseDueDate(task.due);
    if (!dueDate) return "none";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

    if (task.status !== "Done" && daysUntilDue < 0) return "overdue";
    if (task.status !== "Done" && daysUntilDue <= 3) return "soon";
    return "later";
}
