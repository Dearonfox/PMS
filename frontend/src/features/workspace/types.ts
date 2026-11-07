export type Space = { id: number; name: string; description?: string | null; creatorId: number };

export type SpaceMemberRole = "admin" | "member" | "viewer";

export type SpaceMember = {
    spaceId: number;
    userId: number;
    email: string;
    displayName: string;
    role: SpaceMemberRole;
};

export type Project = {
    id: number;
    spaceId: number;
    name: string;
    emoji?: string | null;
    description?: string | null;
};

export type TaskStatus = "Todo" | "In Progress" | "Done";
export type ViewMode = "home" | "my-tasks" | "inbox" | "reporting";
export type DueState = "overdue" | "soon" | "later" | "none";
export type UiIconName = "board" | "home" | "tasks" | "inbox" | "report" | "plus" | "calendar";

export type Task = {
    id: number;
    title: string;
    projectId: number;
    status: TaskStatus;
    due?: string | null;
    assignee?: string | null;
    assigneeId?: number | null;
    description?: string | null;
    creatorId: number;
};

export type ApiSpace = { id: number; name: string; description?: string | null; creator_id: number };

export type ApiSpaceMember = {
    space_id: number;
    user_id: number;
    email: string;
    display_name: string;
    role: SpaceMemberRole;
};

export type ApiProject = {
    id: number;
    space_id: number;
    name: string;
    emoji?: string | null;
    description?: string | null;
};

export type ApiTask = {
    id: number;
    title: string;
    project_id: number;
    status: TaskStatus;
    due?: string | null;
    assignee?: string | null;
    assignee_id?: number | null;
    description?: string | null;
    creator_id: number;
};

export type TaskForm = {
    title: string;
    status: TaskStatus;
    assignee: string;
    due: string;
    description: string;
};

export type ProjectForm = { name: string; emoji: string; description: string };
export type SpaceForm = { name: string; description: string };
export type MemberForm = { email: string; role: SpaceMemberRole };

export type ProjectReport = Project & {
    taskCount: number;
    todoCount: number;
    inProgressCount: number;
    doneCount: number;
    dueRiskCount: number;
    completionRate: number;
};
