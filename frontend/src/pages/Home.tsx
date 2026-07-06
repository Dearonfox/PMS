import { useEffect, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { AuthUser } from "../App";
import "./Home.css";

type Props = {
    user: AuthUser | null;
    onLogout: () => void;
};

type Space = { id: number; name: string; description?: string | null; creatorId: number };
type SpaceMemberRole = "admin" | "member" | "viewer";
type SpaceMember = {
    spaceId: number;
    userId: number;
    email: string;
    displayName: string;
    role: SpaceMemberRole;
};
type Project = { id: number; spaceId: number; name: string; emoji?: string | null; description?: string | null };
type TaskStatus = "Todo" | "In Progress" | "Done";
type ViewMode = "home" | "my-tasks" | "inbox" | "reporting";
type DueState = "overdue" | "soon" | "later" | "none";
type Task = {
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

type ApiSpace = { id: number; name: string; description?: string | null; creator_id: number };
type ApiSpaceMember = {
    space_id: number;
    user_id: number;
    email: string;
    display_name: string;
    role: SpaceMemberRole;
};
type ApiProject = { id: number; space_id: number; name: string; emoji?: string | null; description?: string | null };
type ApiTask = {
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

type TaskForm = {
    title: string;
    status: TaskStatus;
    assignee: string;
    due: string;
    description: string;
};

type ProjectForm = {
    name: string;
    emoji: string;
    description: string;
};

type SpaceForm = {
    name: string;
    description: string;
};

type MemberForm = {
    email: string;
    role: SpaceMemberRole;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const columns: TaskStatus[] = ["Todo", "In Progress", "Done"];
const ACCESS_TOKEN_KEY = "pms_access_token";
const statusLabels: Record<TaskStatus, string> = {
    Todo: "할 일",
    "In Progress": "진행 중",
    Done: "완료",
};

const dueStateLabels: Record<DueState, string> = {
    overdue: "마감 지연",
    soon: "마감 임박",
    later: "예정",
    none: "마감일 없음",
};

const roleLabels: Record<SpaceMemberRole, string> = {
    admin: "관리자",
    member: "멤버",
    viewer: "뷰어",
};

const emptyForm = (status: TaskStatus): TaskForm => ({
    title: "",
    status,
    assignee: "",
    due: "",
    description: "",
});

const emptyProjectForm = (): ProjectForm => ({
    name: "",
    emoji: "",
    description: "",
});

const emptySpaceForm = (): SpaceForm => ({
    name: "",
    description: "",
});

const emptyMemberForm = (): MemberForm => ({
    email: "",
    role: "member",
});

const formFromSpace = (space: Space): SpaceForm => ({
    name: space.name,
    description: space.description ?? "",
});

const formFromProject = (project: Project): ProjectForm => ({
    name: project.name,
    emoji: project.emoji ?? "",
    description: project.description ?? "",
});

const formFromTask = (task: Task): TaskForm => ({
    title: task.title,
    status: task.status,
    assignee: task.assignee ?? "",
    due: task.due ?? "",
    description: task.description ?? "",
});

function mapSpace(space: ApiSpace): Space {
    return {
        id: space.id,
        name: space.name,
        description: space.description,
        creatorId: space.creator_id,
    };
}

function mapSpaceMember(member: ApiSpaceMember): SpaceMember {
    return {
        spaceId: member.space_id,
        userId: member.user_id,
        email: member.email,
        displayName: member.display_name,
        role: member.role,
    };
}

function mapProject(project: ApiProject): Project {
    return {
        id: project.id,
        spaceId: project.space_id,
        name: project.name,
        emoji: project.emoji,
        description: project.description,
    };
}

function mapTask(task: ApiTask): Task {
    return {
        id: task.id,
        title: task.title,
        projectId: task.project_id,
        status: task.status,
        due: task.due,
        assignee: task.assignee,
        assigneeId: task.assignee_id,
        description: task.description,
        creatorId: task.creator_id,
    };
}

function parseDueDate(due?: string | null) {
    if (!due) return null;

    const normalizedDue = due.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (normalizedDue === "today" || normalizedDue === "오늘") {
        return today;
    }

    if (normalizedDue === "tomorrow" || normalizedDue === "내일") {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow;
    }

    const parsedDate = new Date(due);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }
    parsedDate.setHours(0, 0, 0, 0);
    return parsedDate;
}

function getDueState(task: Task): DueState {
    const dueDate = parseDueDate(task.due);
    if (!dueDate) {
        return "none";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

    if (task.status !== "Done" && daysUntilDue < 0) {
        return "overdue";
    }

    if (task.status !== "Done" && daysUntilDue <= 3) {
        return "soon";
    }

    return "later";
}

export default function Home({ user, onLogout }: Props) {
    const nav = useNavigate();
    const location = useLocation();

    const [spaces, setSpaces] = useState<Space[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("home");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<TaskForm>(emptyForm("Todo"));
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editForm, setEditForm] = useState<TaskForm>(emptyForm("Todo"));
    const [editError, setEditError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
    const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);
    const [statusChangeError, setStatusChangeError] = useState<string | null>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm());
    const [projectError, setProjectError] = useState<string | null>(null);
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
    const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);
    const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [editingSpace, setEditingSpace] = useState<Space | null>(null);
    const [spaceForm, setSpaceForm] = useState<SpaceForm>(emptySpaceForm());
    const [spaceError, setSpaceError] = useState<string | null>(null);
    const [isSavingSpace, setIsSavingSpace] = useState(false);
    const [deleteConfirmSpace, setDeleteConfirmSpace] = useState<Space | null>(null);
    const [spaceDeleteError, setSpaceDeleteError] = useState<string | null>(null);
    const [deletingSpaceId, setDeletingSpaceId] = useState<number | null>(null);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm());
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

    useEffect(() => {
        const loadSpaces = async () => {
            if (!user) {
                setSpaces([]);
                setProjects([]);
                setTasks([]);
                setActiveSpaceId(null);
                setActiveProjectId(null);
                setLoading(false);
                setLoadError(null);
                return;
            }

            setLoading(true);
            setLoadError(null);

            try {
                const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
                const spacesResponse = await fetch(`${API_BASE_URL}/spaces`, {
                    headers: {
                        Authorization: `Bearer ${token ?? ""}`,
                    },
                });

                if (!spacesResponse.ok) {
                    throw new Error("스페이스를 불러오지 못했습니다.");
                }

                const spacesData = ((await spacesResponse.json()) as ApiSpace[]).map(mapSpace);

                setSpaces(spacesData);
                setActiveSpaceId((current) => current ?? spacesData[0]?.id ?? null);
                if (spacesData.length === 0) {
                    setProjects([]);
                    setTasks([]);
                    setLoading(false);
                }
            } catch (error) {
                console.error(error);
                setLoadError("백엔드에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
                setLoading(false);
            }
        };

        void loadSpaces();
    }, [user]);

    useEffect(() => {
        if (activeSpaceId === null) {
            setSpaceMembers([]);
            return;
        }

        setSpaceMembers([]);

        const loadCurrentSpaceMembers = async () => {
            setMembersError(null);

            try {
                const response = await fetch(`${API_BASE_URL}/spaces/${activeSpaceId}/members`, {
                    headers: {
                        Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("멤버 목록을 불러오지 못했습니다.");
                }

                const membersData = ((await response.json()) as ApiSpaceMember[]).map(mapSpaceMember);
                setSpaceMembers(membersData);
            } catch (error) {
                console.error(error);
                setSpaceMembers([]);
                setMembersError("멤버 목록을 불러올 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요.");
            }
        };

        const loadBoard = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const [projectsResponse, tasksResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/projects?space_id=${activeSpaceId}`, {
                        headers: {
                            Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
                        },
                    }),
                    fetch(`${API_BASE_URL}/tasks?space_id=${activeSpaceId}`, {
                        headers: {
                            Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
                        },
                    }),
                ]);

                if (!projectsResponse.ok || !tasksResponse.ok) {
                    throw new Error("보드 데이터를 불러오지 못했습니다.");
                }

                const projectsData = ((await projectsResponse.json()) as ApiProject[]).map(mapProject);
                const tasksData = (await tasksResponse.json()) as ApiTask[];

                setProjects(projectsData);
                setTasks(tasksData.map(mapTask));
                setActiveProjectId((current) =>
                    current !== null && projectsData.some((project) => project.id === current)
                        ? current
                        : projectsData[0]?.id ?? null,
                );
            } catch (error) {
                console.error(error);
                setLoadError("백엔드에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
            } finally {
                setLoading(false);
            }
        };

        void loadCurrentSpaceMembers();
        void loadBoard();
    }, [activeSpaceId]);

    const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? spaces[0] ?? null;
    const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
    const backendUserId = user?.id ?? null;
    const currentSpaceMember = spaceMembers.find((member) => member.userId === backendUserId) ?? null;
    const currentSpaceRole = currentSpaceMember?.role ?? (activeSpace?.creatorId === backendUserId ? "admin" : null);
    const currentSpaceRoleLabel = currentSpaceRole ? roleLabels[currentSpaceRole] : "역할 확인 중";
    const canManageSpace = currentSpaceRole === "admin";
    const canManageProjects = currentSpaceRole === "admin";
    const canWriteTasks = currentSpaceRole === "admin" || currentSpaceRole === "member";
    const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
    const selectedTaskProject = selectedTask
        ? projects.find((project) => project.id === selectedTask.projectId) ?? null
        : null;
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedUserDisplayName = user?.display_name.trim().toLowerCase() ?? null;
    const normalizedUserEmail = user?.email.trim().toLowerCase() ?? null;

    const isTaskAssignedToCurrentUser = (task: Task) => {
        if (backendUserId !== null && task.assigneeId === backendUserId) {
            return true;
        }

        const normalizedAssignee = task.assignee?.trim().toLowerCase();
        return Boolean(
            normalizedAssignee &&
                (normalizedAssignee === normalizedUserDisplayName || normalizedAssignee === normalizedUserEmail),
        );
    };

    const scopedTasks = tasks.filter((task) => {
        if (viewMode === "my-tasks" || viewMode === "inbox") {
            return backendUserId !== null && isTaskAssignedToCurrentUser(task);
        }
        if (viewMode === "reporting") {
            return true;
        }
        return task.projectId === activeProject?.id;
    });

    const visibleTasks = scopedTasks.filter((task) => {
        if (!normalizedQuery) {
            return true;
        }

        const projectName = projects.find((project) => project.id === task.projectId)?.name ?? "";
        return [
            task.title,
            task.description,
            task.assignee,
            task.due,
            statusLabels[task.status],
            projectName,
        ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
    const isSearching = normalizedQuery.length > 0;
    const inboxTasks = isSearching ? visibleTasks : tasks.filter(isTaskAssignedToCurrentUser);
    const inboxDueTasks = inboxTasks
        .filter((task) => task.status !== "Done")
        .filter((task) => {
            const dueState = getDueState(task);
            return dueState === "overdue" || dueState === "soon";
        });
    const inboxRecentTasks = [...inboxTasks].sort((first, second) => second.id - first.id).slice(0, 6);
    const inboxDoneTasks = inboxTasks.filter((task) => task.status === "Done");

    const getProjectName = (projectId: number) =>
        projects.find((project) => project.id === projectId)?.name ?? "프로젝트 없음";
    const reportingTasks = viewMode === "reporting" && isSearching ? visibleTasks : tasks;
    const reportingTotalCount = reportingTasks.length;
    const reportingDoneCount = reportingTasks.filter((task) => task.status === "Done").length;
    const reportingTodoCount = reportingTasks.filter((task) => task.status === "Todo").length;
    const reportingInProgressCount = reportingTasks.filter((task) => task.status === "In Progress").length;
    const reportingDueRiskCount = reportingTasks.filter((task) => {
        const dueState = getDueState(task);
        return dueState === "overdue" || dueState === "soon";
    }).length;
    const reportingCompletionRate =
        reportingTotalCount > 0 ? Math.round((reportingDoneCount / reportingTotalCount) * 100) : 0;
    const projectReports = projects.map((project) => {
        const projectTasks = reportingTasks.filter((task) => task.projectId === project.id);
        const doneCount = projectTasks.filter((task) => task.status === "Done").length;
        const dueRiskCount = projectTasks.filter((task) => {
            const dueState = getDueState(task);
            return dueState === "overdue" || dueState === "soon";
        }).length;
        const completionRate = projectTasks.length > 0 ? Math.round((doneCount / projectTasks.length) * 100) : 0;

        return {
            ...project,
            taskCount: projectTasks.length,
            todoCount: projectTasks.filter((task) => task.status === "Todo").length,
            inProgressCount: projectTasks.filter((task) => task.status === "In Progress").length,
            doneCount,
            dueRiskCount,
            completionRate,
        };
    });
    const topProjectReports = [...projectReports]
        .sort((first, second) => second.taskCount - first.taskCount || second.completionRate - first.completionRate)
        .slice(0, 5);
    const hasNoSpaces = !loading && !loadError && spaces.length === 0;
    const hasNoProjects = !loading && !loadError && spaces.length > 0 && projects.length === 0;
    const showSearchEmpty = !loading && !loadError && isSearching && visibleTasks.length === 0;
    const showBoardEmpty =
        !loading &&
        !loadError &&
        !isSearching &&
        viewMode !== "inbox" &&
        viewMode !== "reporting" &&
        projects.length > 0 &&
        visibleTasks.length === 0;

    const requireAuth = (action: () => void) => {
        if (!user) {
            nav("/login", {
                state: {
                    notice: "이 기능을 사용하려면 로그인이 필요합니다.",
                    from: location.pathname,
                },
            });
            return;
        }
        action();
    };

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
    });

    const resolveAssigneeId = (assignee: string) => {
        if (!user) {
            return null;
        }

        const normalizedAssignee = assignee.trim().toLowerCase();
        if (!normalizedAssignee) {
            return null;
        }

        return normalizedAssignee === user.display_name.trim().toLowerCase() ||
            normalizedAssignee === user.email.trim().toLowerCase()
            ? user.id
            : null;
    };

    const openCreateModal = (status: TaskStatus = "Todo") => {
        if (!activeProject) {
            return;
        }

        setForm(emptyForm(status));
        setCreateError(null);
        setIsCreateOpen(true);
    };

    const openCreateProjectModal = () => {
        setEditingProject(null);
        setProjectForm(emptyProjectForm());
        setProjectError(null);
        setIsProjectModalOpen(true);
    };

    const openEditProjectModal = (project: Project) => {
        setEditingProject(project);
        setProjectForm(formFromProject(project));
        setProjectError(null);
        setIsProjectModalOpen(true);
    };

    const closeProjectModal = () => {
        if (isSavingProject) {
            return;
        }

        setIsProjectModalOpen(false);
        setEditingProject(null);
        setProjectError(null);
    };

    const openCreateSpaceModal = () => {
        setEditingSpace(null);
        setSpaceForm(emptySpaceForm());
        setSpaceError(null);
        setIsSpaceModalOpen(true);
    };

    const openEditSpaceModal = (space: Space) => {
        setEditingSpace(space);
        setSpaceForm(formFromSpace(space));
        setSpaceError(null);
        setIsSpaceModalOpen(true);
    };

    const closeSpaceModal = () => {
        if (isSavingSpace) {
            return;
        }

        setIsSpaceModalOpen(false);
        setEditingSpace(null);
        setSpaceError(null);
    };

    const loadSpaceMembers = async (spaceId: number) => {
        setMembersLoading(true);
        setMembersError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/members`, {
                headers: {
                    Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
                },
            });
            if (!response.ok) {
                throw new Error("멤버 목록을 불러오지 못했습니다.");
            }

            const membersData = ((await response.json()) as ApiSpaceMember[]).map(mapSpaceMember);
            setSpaceMembers(membersData);
        } catch (error) {
            console.error(error);
            setMembersError("멤버 목록을 불러올 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요.");
        } finally {
            setMembersLoading(false);
        }
    };

    const openMembersModal = () => {
        if (!activeSpace) {
            return;
        }

        setMemberForm(emptyMemberForm());
        setMembersError(null);
        setIsMembersModalOpen(true);
        void loadSpaceMembers(activeSpace.id);
    };

    const closeMembersModal = () => {
        if (isAddingMember || updatingMemberId !== null || removingMemberId !== null) {
            return;
        }

        setIsMembersModalOpen(false);
        setMembersError(null);
    };

    const closeCreateModal = () => {
        if (isCreating) {
            return;
        }

        setIsCreateOpen(false);
        setCreateError(null);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setEditForm(formFromTask(task));
        setEditError(null);
    };

    const openTaskDetail = (task: Task) => {
        setSelectedTaskId(task.id);
    };

    const closeTaskDetail = () => {
        setSelectedTaskId(null);
    };

    const closeEditModal = () => {
        if (isUpdating) {
            return;
        }

        setEditingTask(null);
        setEditError(null);
    };

    const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!activeProject) {
            setCreateError("작업을 만들 프로젝트를 먼저 선택해주세요.");
            return;
        }

        if (!form.title.trim()) {
            setCreateError("작업 제목을 입력해주세요.");
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    title: form.title.trim(),
                    project_id: activeProject.id,
                    status: form.status,
                    assignee: form.assignee.trim() || null,
                    assignee_id: resolveAssigneeId(form.assignee),
                    due: form.due.trim() || null,
                    description: form.description.trim() || null,
                }),
            });

            if (!response.ok) {
                throw new Error("작업 생성에 실패했습니다.");
            }

            const createdTask = (await response.json()) as ApiTask;
            setTasks((current) => [...current, mapTask(createdTask)]);
            setIsCreateOpen(false);
            setForm(emptyForm("Todo"));
        } catch (error) {
            console.error(error);
            setCreateError("작업을 만들 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveProject = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!projectForm.name.trim()) {
            setProjectError("프로젝트 이름을 입력해주세요.");
            return;
        }

        setIsSavingProject(true);
        setProjectError(null);

        try {
            const response = await fetch(
                editingProject ? `${API_BASE_URL}/projects/${editingProject.id}` : `${API_BASE_URL}/projects`,
                {
                    method: editingProject ? "PATCH" : "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        space_id: activeSpace?.id ?? null,
                        name: projectForm.name.trim(),
                        emoji: projectForm.emoji.trim() || null,
                        description: projectForm.description.trim() || null,
                    }),
                },
            );

            if (response.status === 409) {
                setProjectError("같은 이름의 프로젝트가 이미 있습니다.");
                return;
            }

            if (!response.ok) {
                throw new Error("프로젝트 저장에 실패했습니다.");
            }

            const savedProject = mapProject((await response.json()) as ApiProject);
            setProjects((current) => {
                if (editingProject) {
                    return current.map((project) => (project.id === savedProject.id ? savedProject : project));
                }
                return [...current, savedProject];
            });
            setActiveProjectId(savedProject.id);
            setViewMode("home");
            setIsProjectModalOpen(false);
            setEditingProject(null);
            setProjectForm(emptyProjectForm());
        } catch (error) {
            console.error(error);
            setProjectError("프로젝트를 저장할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally {
            setIsSavingProject(false);
        }
    };

    const handleSaveSpace = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!spaceForm.name.trim()) {
            setSpaceError("스페이스 이름을 입력해주세요.");
            return;
        }

        setIsSavingSpace(true);
        setSpaceError(null);

        try {
            const response = await fetch(
                editingSpace ? `${API_BASE_URL}/spaces/${editingSpace.id}` : `${API_BASE_URL}/spaces`,
                {
                    method: editingSpace ? "PATCH" : "POST",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        name: spaceForm.name.trim(),
                        description: spaceForm.description.trim() || null,
                    }),
                },
            );

            if (response.status === 409) {
                setSpaceError("같은 이름의 스페이스가 이미 있습니다.");
                return;
            }

            if (!response.ok) {
                throw new Error("스페이스 저장에 실패했습니다.");
            }

            const savedSpace = mapSpace((await response.json()) as ApiSpace);
            setSpaces((current) => {
                if (editingSpace) {
                    return current.map((space) => (space.id === savedSpace.id ? savedSpace : space));
                }
                return [...current, savedSpace];
            });
            setActiveSpaceId(savedSpace.id);
            setActiveProjectId(null);
            setIsSpaceModalOpen(false);
            setEditingSpace(null);
            setSpaceForm(emptySpaceForm());
        } catch (error) {
            console.error(error);
            setSpaceError("스페이스를 저장할 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요.");
        } finally {
            setIsSavingSpace(false);
        }
    };

    const handleAddSpaceMember = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!activeSpace) {
            return;
        }

        if (!memberForm.email.trim()) {
            setMembersError("추가할 사용자 이메일을 입력해주세요.");
            return;
        }

        setIsAddingMember(true);
        setMembersError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${activeSpace.id}/members`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                    email: memberForm.email.trim(),
                    role: memberForm.role,
                }),
            });

            if (response.status === 404) {
                setMembersError("해당 이메일로 가입된 사용자를 찾을 수 없습니다.");
                return;
            }

            if (response.status === 409) {
                setMembersError("이미 이 스페이스에 추가된 사용자입니다.");
                return;
            }

            if (!response.ok) {
                throw new Error("멤버 추가에 실패했습니다.");
            }

            const addedMember = mapSpaceMember((await response.json()) as ApiSpaceMember);
            setSpaceMembers((current) => [...current, addedMember]);
            setMemberForm(emptyMemberForm());
        } catch (error) {
            console.error(error);
            setMembersError("멤버를 추가할 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요.");
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleUpdateSpaceMemberRole = async (member: SpaceMember, role: SpaceMemberRole) => {
        if (!activeSpace || member.role === role) {
            return;
        }

        setUpdatingMemberId(member.userId);
        setMembersError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${activeSpace.id}/members/${member.userId}`, {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({ role }),
            });

            if (!response.ok) {
                throw new Error("멤버 역할 변경에 실패했습니다.");
            }

            const updatedMember = mapSpaceMember((await response.json()) as ApiSpaceMember);
            setSpaceMembers((current) =>
                current.map((item) => (item.userId === updatedMember.userId ? updatedMember : item)),
            );
        } catch (error) {
            console.error(error);
            setMembersError("멤버 역할을 변경할 수 없습니다. 다시 시도해주세요.");
        } finally {
            setUpdatingMemberId(null);
        }
    };

    const handleRemoveSpaceMember = async (member: SpaceMember) => {
        if (!activeSpace) {
            return;
        }

        setRemovingMemberId(member.userId);
        setMembersError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${activeSpace.id}/members/${member.userId}`, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error("멤버 제거에 실패했습니다.");
            }

            setSpaceMembers((current) => current.filter((item) => item.userId !== member.userId));
        } catch (error) {
            console.error(error);
            setMembersError("멤버를 제거할 수 없습니다. 다시 시도해주세요.");
        } finally {
            setRemovingMemberId(null);
        }
    };

    const handleUpdateTask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editingTask) {
            return;
        }

        if (!editForm.title.trim()) {
            setEditError("작업 제목을 입력해주세요.");
            return;
        }

        setIsUpdating(true);
        setEditError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${editingTask.id}`, {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({
                    title: editForm.title.trim(),
                    project_id: editingTask.projectId,
                    status: editForm.status,
                    assignee: editForm.assignee.trim() || null,
                    assignee_id: resolveAssigneeId(editForm.assignee),
                    due: editForm.due.trim() || null,
                    description: editForm.description.trim() || null,
                }),
            });

            if (!response.ok) {
                throw new Error("작업 수정에 실패했습니다.");
            }

            const updatedTask = mapTask((await response.json()) as ApiTask);
            setTasks((current) => current.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
            setEditingTask(null);
        } catch (error) {
            console.error(error);
            setEditError("작업을 수정할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleTaskDragStart = (event: DragEvent<HTMLElement>, task: Task) => {
        if (!user || !canWriteTasks) {
            event.preventDefault();
            return;
        }

        setDraggingTaskId(task.id);
        setStatusChangeError(null);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(task.id));
    };

    const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
        if (draggingTaskId === null || !canWriteTasks) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTargetStatus(status);
    };

    const handleTaskDrop = async (event: DragEvent<HTMLDivElement>, nextStatus: TaskStatus) => {
        event.preventDefault();

        const taskId = Number(event.dataTransfer.getData("text/plain") || draggingTaskId);
        const task = tasks.find((item) => item.id === taskId);
        setDraggingTaskId(null);
        setDropTargetStatus(null);

        if (!canWriteTasks) {
            setStatusChangeError("이 스페이스에서 작업을 수정할 권한이 없습니다.");
            return;
        }

        if (!task || task.status === nextStatus) {
            return;
        }

        if (!user) {
            requireAuth(() => undefined);
            return;
        }

        const previousTasks = tasks;
        setStatusChangeError(null);
        setTasks((current) =>
            current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)),
        );

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({
                    title: task.title,
                    project_id: task.projectId,
                    status: nextStatus,
                    assignee: task.assignee,
                    assignee_id: task.assigneeId,
                    due: task.due,
                    description: task.description,
                }),
            });

            if (!response.ok) {
                throw new Error("작업 상태 변경에 실패했습니다.");
            }

            const updatedTask = mapTask((await response.json()) as ApiTask);
            setTasks((current) => current.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
        } catch (error) {
            console.error(error);
            setTasks(previousTasks);
            setStatusChangeError("작업 상태를 변경할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        }
    };

    const handleTaskDragEnd = () => {
        setDraggingTaskId(null);
        setDropTargetStatus(null);
    };

    const closeDeleteModal = () => {
        if (deletingTaskId !== null) {
            return;
        }

        setDeleteConfirmTask(null);
        setDeleteError(null);
    };

    const closeProjectDeleteModal = () => {
        if (deletingProjectId !== null) {
            return;
        }

        setDeleteConfirmProject(null);
        setProjectDeleteError(null);
    };

    const closeSpaceDeleteModal = () => {
        if (deletingSpaceId !== null) {
            return;
        }

        setDeleteConfirmSpace(null);
        setSpaceDeleteError(null);
    };

    const handleDeleteProject = async () => {
        if (!deleteConfirmProject) {
            return;
        }

        setDeletingProjectId(deleteConfirmProject.id);
        setProjectDeleteError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/projects/${deleteConfirmProject.id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error("프로젝트 삭제에 실패했습니다.");
            }

            if (selectedTask?.projectId === deleteConfirmProject.id) {
                setSelectedTaskId(null);
            }
            setProjects((current) => {
                const nextProjects = current.filter((project) => project.id !== deleteConfirmProject.id);
                setActiveProjectId((currentId) => {
                    if (currentId !== deleteConfirmProject.id) {
                        return currentId;
                    }
                    return nextProjects[0]?.id ?? null;
                });
                return nextProjects;
            });
            setTasks((current) => current.filter((task) => task.projectId !== deleteConfirmProject.id));
            setDeleteConfirmProject(null);
            setViewMode("home");
        } catch (error) {
            console.error(error);
            setProjectDeleteError("프로젝트를 삭제할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally {
            setDeletingProjectId(null);
        }
    };

    const handleDeleteSpace = async () => {
        if (!deleteConfirmSpace) {
            return;
        }

        setDeletingSpaceId(deleteConfirmSpace.id);
        setSpaceDeleteError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${deleteConfirmSpace.id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error("스페이스 삭제에 실패했습니다.");
            }

            setSpaces((current) => {
                const nextSpaces = current.filter((space) => space.id !== deleteConfirmSpace.id);
                setActiveSpaceId((currentId) => {
                    if (currentId !== deleteConfirmSpace.id) {
                        return currentId;
                    }
                    return nextSpaces[0]?.id ?? null;
                });
                if (nextSpaces.length === 0) {
                    setProjects([]);
                    setTasks([]);
                    setActiveProjectId(null);
                }
                return nextSpaces;
            });
            setSelectedTaskId(null);
            setDeleteConfirmSpace(null);
            setViewMode("home");
        } catch (error) {
            console.error(error);
            setSpaceDeleteError("스페이스를 삭제할 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요.");
        } finally {
            setDeletingSpaceId(null);
        }
    };

    const handleDeleteTask = async () => {
        if (!deleteConfirmTask) {
            return;
        }

        setDeletingTaskId(deleteConfirmTask.id);
        setDeleteError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${deleteConfirmTask.id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error("작업 삭제에 실패했습니다.");
            }

            setTasks((current) => current.filter((item) => item.id !== deleteConfirmTask.id));
            setSelectedTaskId((current) => (current === deleteConfirmTask.id ? null : current));
            setDeleteConfirmTask(null);
        } catch (error) {
            console.error(error);
            setDeleteError("작업을 삭제할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally {
            setDeletingTaskId(null);
        }
    };

    return (
        <div className="asanaApp">
            <aside className="asanaSidebar">
                <div className="sbBrand">
                    <div className="sbLogo">PMS</div>
                    <div className="sbSub">팀 작업 관리 보드</div>
                </div>

                <div className="spaceSwitcher">
                    <div className="spaceSwitcherHeader">
                        <span>스페이스</span>
                        <button
                            className="spaceIconBtn"
                            type="button"
                            title="스페이스 추가"
                            onClick={() => requireAuth(openCreateSpaceModal)}
                        >
                            +
                        </button>
                    </div>
                    {spaces.length ? (
                        <>
                            <select
                                className="spaceSelect"
                                value={activeSpace?.id ?? ""}
                                onChange={(event) => {
                                    setActiveSpaceId(Number(event.target.value));
                                    setActiveProjectId(null);
                                    setViewMode("home");
                                }}
                            >
                                {spaces.map((space) => (
                                    <option key={space.id} value={space.id}>
                                        {space.name}
                                    </option>
                                ))}
                            </select>
                            <div className="roleBadge" title="현재 스페이스 역할">
                                {currentSpaceRoleLabel}
                            </div>
                            <div className="spaceActions">
                                {canManageSpace ? (
                                    <>
                                        <button
                                            className="spaceActionBtn"
                                            type="button"
                                            onClick={() => requireAuth(openMembersModal)}
                                            disabled={!activeSpace}
                                        >
                                            멤버
                                        </button>
                                        <button
                                            className="spaceActionBtn"
                                            type="button"
                                            onClick={() => activeSpace && requireAuth(() => openEditSpaceModal(activeSpace))}
                                            disabled={!activeSpace}
                                        >
                                            수정
                                        </button>
                                        <button
                                            className="spaceActionBtn danger"
                                            type="button"
                                            onClick={() =>
                                                activeSpace &&
                                                requireAuth(() => {
                                                    setDeleteConfirmSpace(activeSpace);
                                                    setSpaceDeleteError(null);
                                                })
                                            }
                                            disabled={!activeSpace}
                                        >
                                            삭제
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <button className="spaceCreateBtn" type="button" onClick={() => requireAuth(openCreateSpaceModal)}>
                            첫 스페이스 만들기
                        </button>
                    )}
                </div>

                <nav className="sbNav">
                    <button
                        className={`sbNavItem ${viewMode === "home" ? "sbNavItemActive" : ""}`}
                        onClick={() => setViewMode("home")}
                    >
                        홈
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "my-tasks" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("my-tasks"))}
                    >
                        내 작업
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "inbox" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("inbox"))}
                    >
                        받은함
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "reporting" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("reporting"))}
                    >
                        리포트
                    </button>
                </nav>

                <div className="sbSectionHeader">
                    <span className="sbSectionTitle">프로젝트</span>
                    {canManageProjects ? (
                        <button
                            className="sbAddProjectBtn"
                            type="button"
                            title="프로젝트 추가"
                            onClick={() => requireAuth(openCreateProjectModal)}
                            disabled={!activeSpace}
                        >
                            +
                        </button>
                    ) : null}
                </div>
                <div className="sbProjects">
                    {projects.map((project) => (
                        <div key={project.id} className="sbProjectRow">
                            <button
                                className={`sbProjectItem ${project.id === activeProject?.id ? "sbProjectItemActive" : ""}`}
                                onClick={() => {
                                    setViewMode("home");
                                    setActiveProjectId(project.id);
                                }}
                            >
                                <span className="sbEmoji">{project.emoji ?? "[ ]"}</span>
                                <span className="sbProjectName">{project.name}</span>
                            </button>
                            {canManageProjects ? (
                                <div className="sbProjectActions">
                                    <button
                                        className="sbProjectActionBtn"
                                        type="button"
                                        title="프로젝트 수정"
                                        onClick={() => requireAuth(() => openEditProjectModal(project))}
                                    >
                                        수정
                                    </button>
                                    <button
                                        className="sbProjectActionBtn danger"
                                        type="button"
                                        title="프로젝트 삭제"
                                        onClick={() =>
                                            requireAuth(() => {
                                                setDeleteConfirmProject(project);
                                                setProjectDeleteError(null);
                                            })
                                        }
                                    >
                                        삭제
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>

                <div className="sbFooter">
                    <div className="userChip" title={user?.email ?? ""}>
                        <div className="avatar">
                            {(user?.display_name?.[0] ?? user?.email?.[0] ?? "G").toUpperCase()}
                        </div>
                        <div className="userMeta">
                            <div className="userName">{user?.display_name ?? "게스트"}</div>
                            <div className="userEmail">{user?.email ?? "로그인하면 작업을 만들고 관리할 수 있습니다."}</div>
                        </div>
                    </div>

                    {user ? (
                        <button
                            className="ghostBtn"
                            onClick={() => {
                                window.localStorage.removeItem(ACCESS_TOKEN_KEY);
                                onLogout();
                            }}
                        >
                            로그아웃
                        </button>
                    ) : (
                        <Link className="ghostBtn ghostLink" to="/login" state={{ from: location.pathname }}>
                            로그인
                        </Link>
                    )}
                </div>
            </aside>

            <main className="asanaMain">
                <header className="topbar">
                    <div className="topLeft">
                        <div className="crumb">
                            <span className="crumbMuted">프로젝트</span>
                            <span className="crumbStrong">
                                {viewMode === "inbox"
                                    ? "받은함"
                                    : viewMode === "reporting"
                                      ? "리포트"
                                      : viewMode === "my-tasks"
                                        ? "내 작업"
                                        : activeProject?.name ?? "선택된 프로젝트 없음"}
                            </span>
                        </div>
                    </div>

                    <div className="topRight">
                        <div className="searchWrap">
                            <input
                                className="searchInput"
                                placeholder="제목, 설명, 담당자 검색"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                            {query ? (
                                <button
                                    className="searchClearBtn"
                                    type="button"
                                    onClick={() => setQuery("")}
                                    title="검색어 지우기"
                                >
                                    지우기
                                </button>
                            ) : null}
                        </div>
                        {canWriteTasks ? (
                            <button
                                className="primaryBtn"
                                onClick={() => requireAuth(() => openCreateModal("Todo"))}
                                disabled={!activeProject && viewMode !== "my-tasks"}
                            >
                                + 새 작업
                            </button>
                        ) : null}
                    </div>
                </header>

                <section className="content">
                    <div className="boardHeader">
                        <h1>
                            {viewMode === "inbox"
                                ? "받은함"
                                : viewMode === "reporting"
                                  ? "리포트"
                                  : viewMode === "my-tasks"
                                    ? "내 작업"
                                    : activeProject?.name ?? "프로젝트"}
                        </h1>
                        <p>
                            {viewMode === "inbox"
                                ? "내게 배정된 작업 중 지금 확인할 항목을 모아 보여줍니다."
                                : viewMode === "reporting"
                                  ? "프로젝트와 작업 진행 상황을 현재 데이터 기준으로 집계합니다."
                                  : viewMode === "my-tasks"
                                    ? "현재 로그인한 계정에 배정된 작업만 모아서 보여줍니다."
                                    : "백엔드에서 불러온 실제 데이터입니다. 새 작업을 만들면 선택한 상태 컬럼에 바로 표시됩니다."}
                        </p>
                        <div className="boardSummary">
                            {viewMode === "inbox"
                                ? `확인할 작업 ${inboxTasks.length}개 · 마감 주의 ${inboxDueTasks.length}개`
                                : viewMode === "reporting"
                                  ? `전체 ${reportingTotalCount}개 · 완료율 ${reportingCompletionRate}% · 마감 주의 ${reportingDueRiskCount}개`
                                  : isSearching
                                    ? `검색 결과 ${visibleTasks.length}개 / 전체 ${scopedTasks.length}개`
                                    : `표시 중인 작업 ${visibleTasks.length}개`}
                        </div>
                    </div>

                    {loading ? <div className="infoBanner">프로젝트와 작업을 불러오는 중입니다...</div> : null}
                    {loadError ? <div className="errorBanner">{loadError}</div> : null}
                    {statusChangeError ? <div className="errorBanner">{statusChangeError}</div> : null}
                    {hasNoSpaces ? (
                        <div className="emptyActionPanel">
                            <div>
                                <span className="emptyEyebrow">Workspace</span>
                                <h2>첫 스페이스를 만들어보세요</h2>
                                <p>스페이스는 팀이나 업무 단위로 프로젝트와 작업을 묶는 가장 큰 작업 공간입니다.</p>
                            </div>
                            <button className="primaryBtn" type="button" onClick={() => requireAuth(openCreateSpaceModal)}>
                                + 스페이스 만들기
                            </button>
                        </div>
                    ) : null}
                    {hasNoProjects ? (
                        <div className="emptyActionPanel">
                            <div>
                                <span className="emptyEyebrow">Start</span>
                                <h2>첫 프로젝트를 만들어보세요</h2>
                                <p>
                                    {activeSpace?.name ?? "현재 스페이스"}에 프로젝트가 생기면 작업 보드, 받은함,
                                    리포트가 같은 데이터로 바로 연결됩니다.
                                </p>
                            </div>
                            {canManageProjects ? (
                                <button className="primaryBtn" type="button" onClick={() => requireAuth(openCreateProjectModal)}>
                                    + 프로젝트 만들기
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    {showSearchEmpty ? (
                        <div className="emptyActionPanel">
                            <div>
                                <span className="emptyEyebrow">Search</span>
                                <h2>검색 결과가 없습니다</h2>
                                <p>`{query.trim()}`에 맞는 작업이 없습니다. 제목, 설명, 담당자, 마감일을 다시 확인해보세요.</p>
                            </div>
                            <button className="ghostBtn" type="button" onClick={() => setQuery("")}>
                                검색 지우기
                            </button>
                        </div>
                    ) : null}
                    {showBoardEmpty ? (
                        <div className="emptyActionPanel">
                            <div>
                                <span className="emptyEyebrow">{viewMode === "my-tasks" ? "My Tasks" : "Board"}</span>
                                <h2>{viewMode === "my-tasks" ? "아직 내게 배정된 작업이 없습니다" : "아직 작업이 없습니다"}</h2>
                                <p>
                                    {viewMode === "my-tasks"
                                        ? "작업을 만들고 담당자를 나에게 배정하면 이 화면에서 바로 모아볼 수 있습니다."
                                        : "첫 작업을 만들면 Todo 컬럼에 추가되고, 드래그로 상태를 바꿀 수 있습니다."}
                                </p>
                            </div>
                            {canWriteTasks ? (
                                <button
                                    className="primaryBtn"
                                    type="button"
                                    onClick={() => requireAuth(() => openCreateModal("Todo"))}
                                    disabled={!activeProject}
                                >
                                    + 작업 만들기
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    {viewMode === "inbox" && !loading && !loadError ? (
                        <div className="inboxLayout">
                            <section className="inboxHero">
                                <div>
                                    <span className="inboxEyebrow">Today</span>
                                    <h2>{user?.display_name ?? "사용자"}님이 확인할 작업</h2>
                                    <p>별도 알림 테이블 없이 현재 작업 데이터를 기준으로 만든 받은함입니다.</p>
                                </div>
                                <div className="inboxStats">
                                    <div>
                                        <strong>{inboxTasks.length}</strong>
                                        <span>배정됨</span>
                                    </div>
                                    <div>
                                        <strong>{inboxDueTasks.length}</strong>
                                        <span>마감 주의</span>
                                    </div>
                                    <div>
                                        <strong>{inboxDoneTasks.length}</strong>
                                        <span>완료</span>
                                    </div>
                                </div>
                            </section>

                            <section className="inboxSection">
                                <div className="inboxSectionHeader">
                                    <h3>마감 주의</h3>
                                    <span>{inboxDueTasks.length}개</span>
                                </div>
                                {inboxDueTasks.length ? (
                                    <div className="inboxList">
                                        {inboxDueTasks.map((task) => (
                                            <article
                                                key={task.id}
                                                className="inboxItem"
                                                onClick={() => openTaskDetail(task)}
                                            >
                                                <div className="inboxItemMain">
                                                    <span className={`dueBadge dueBadge-${getDueState(task)}`}>
                                                        {dueStateLabels[getDueState(task)]}
                                                    </span>
                                                    <strong>{task.title}</strong>
                                                    <p>{task.description || "설명 없음"}</p>
                                                </div>
                                                <div className="inboxItemMeta">
                                                    <span>{getProjectName(task.projectId)}</span>
                                                    <span>{task.due || "마감일 없음"}</span>
                                                    <span>{statusLabels[task.status]}</span>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="emptyState">지금 급하게 확인할 마감 작업이 없습니다.</div>
                                )}
                            </section>

                            <section className="inboxSection">
                                <div className="inboxSectionHeader">
                                    <h3>최근 배정 작업</h3>
                                    <span>{inboxRecentTasks.length}개</span>
                                </div>
                                {inboxRecentTasks.length ? (
                                    <div className="inboxList">
                                        {inboxRecentTasks.map((task) => (
                                            <article
                                                key={task.id}
                                                className="inboxItem"
                                                onClick={() => openTaskDetail(task)}
                                            >
                                                <div className="inboxItemMain">
                                                    <span className={`dueBadge dueBadge-${getDueState(task)}`}>
                                                        {dueStateLabels[getDueState(task)]}
                                                    </span>
                                                    <strong>{task.title}</strong>
                                                    <p>{task.description || "설명 없음"}</p>
                                                </div>
                                                <div className="inboxItemMeta">
                                                    <span>{getProjectName(task.projectId)}</span>
                                                    <span>{task.assignee || "담당자 없음"}</span>
                                                    <span>{statusLabels[task.status]}</span>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="emptyState">아직 내게 배정된 작업이 없습니다.</div>
                                )}
                            </section>
                        </div>
                    ) : null}

                    {viewMode === "reporting" && !loading && !loadError ? (
                        <div className="reportLayout">
                            <section className="reportHero">
                                <div>
                                    <span className="reportEyebrow">Overview</span>
                                    <h2>전체 프로젝트 진행률</h2>
                                    <p>
                                        {isSearching
                                            ? "검색 결과에 포함된 작업만 기준으로 집계합니다."
                                            : "현재 등록된 모든 프로젝트와 작업을 기준으로 집계합니다."}
                                    </p>
                                </div>
                                <div
                                    className="completionRing"
                                    style={{
                                        background: `conic-gradient(rgba(90, 169, 255, 0.90) ${reportingCompletionRate}%, rgba(255, 255, 255, 0.08) 0)`,
                                    }}
                                    aria-label={`완료율 ${reportingCompletionRate}%`}
                                >
                                    <strong>{reportingCompletionRate}%</strong>
                                    <span>완료율</span>
                                </div>
                            </section>

                            <section className="reportKpis">
                                <div className="reportKpi">
                                    <span>전체 작업</span>
                                    <strong>{reportingTotalCount}</strong>
                                </div>
                                <div className="reportKpi">
                                    <span>할 일</span>
                                    <strong>{reportingTodoCount}</strong>
                                </div>
                                <div className="reportKpi">
                                    <span>진행 중</span>
                                    <strong>{reportingInProgressCount}</strong>
                                </div>
                                <div className="reportKpi">
                                    <span>완료</span>
                                    <strong>{reportingDoneCount}</strong>
                                </div>
                                <div className="reportKpi warning">
                                    <span>마감 주의</span>
                                    <strong>{reportingDueRiskCount}</strong>
                                </div>
                            </section>

                            <section className="reportPanel">
                                <div className="reportSectionHeader">
                                    <h3>상태별 작업 분포</h3>
                                    <span>{reportingTotalCount}개 작업</span>
                                </div>
                                <div className="statusBars">
                                    {columns.map((column) => {
                                        const count = reportingTasks.filter((task) => task.status === column).length;
                                        const rate = reportingTotalCount > 0 ? Math.round((count / reportingTotalCount) * 100) : 0;

                                        return (
                                            <div className="statusBarRow" key={column}>
                                                <div className="statusBarLabel">
                                                    <strong>{statusLabels[column]}</strong>
                                                    <span>
                                                        {count}개 · {rate}%
                                                    </span>
                                                </div>
                                                <div className="statusBarTrack">
                                                    <div className={`statusBarFill statusBarFill-${column.replaceAll(" ", "")}`} style={{ width: `${rate}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="reportPanel">
                                <div className="reportSectionHeader">
                                    <h3>프로젝트별 현황</h3>
                                    <span>{topProjectReports.length}개 프로젝트</span>
                                </div>
                                {topProjectReports.length ? (
                                    <div className="projectReportList">
                                        {topProjectReports.map((project) => (
                                            <article className="projectReportItem" key={project.id}>
                                                <div className="projectReportTitle">
                                                    <span>{project.emoji ?? "[ ]"}</span>
                                                    <strong>{project.name}</strong>
                                                </div>
                                                <div className="projectReportProgress">
                                                    <div className="projectProgressTrack">
                                                        <div className="projectProgressFill" style={{ width: `${project.completionRate}%` }} />
                                                    </div>
                                                    <strong>{project.completionRate}%</strong>
                                                </div>
                                                <div className="projectReportMeta">
                                                    <span>전체 {project.taskCount}</span>
                                                    <span>진행 {project.inProgressCount}</span>
                                                    <span>완료 {project.doneCount}</span>
                                                    <span>마감 주의 {project.dueRiskCount}</span>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="emptyState">리포트로 집계할 프로젝트가 없습니다.</div>
                                )}
                            </section>
                        </div>
                    ) : null}

                    {viewMode !== "inbox" && viewMode !== "reporting" && !hasNoSpaces && !hasNoProjects && !showBoardEmpty ? (
                    <div className="kanban">
                        {columns.map((column) => (
                            <div
                                key={column}
                                className={`col ${dropTargetStatus === column ? "colDropTarget" : ""}`}
                                onDragOver={(event) => handleColumnDragOver(event, column)}
                                onDrop={(event) => void handleTaskDrop(event, column)}
                            >
                                <div className="colHead">
                                    <span className="colTitle">{statusLabels[column]}</span>
                                    <span className="colCount">
                                        {visibleTasks.filter((task) => task.status === column).length}
                                    </span>
                                </div>

                                <div className="colBody">
                                    {visibleTasks
                                        .filter((task) => task.status === column)
                                        .map((task) => (
                                            <article
                                                key={task.id}
                                                className={`taskCard ${selectedTaskId === task.id ? "taskCardSelected" : ""} ${
                                                    draggingTaskId === task.id ? "taskCardDragging" : ""
                                                }`}
                                                draggable={canWriteTasks}
                                                onDragStart={(event) => handleTaskDragStart(event, task)}
                                                onDragEnd={handleTaskDragEnd}
                                                onClick={() => openTaskDetail(task)}
                                            >
                                                <div className="taskTitle">{task.title}</div>
                                                {task.description ? (
                                                    <p className="taskDescription">{task.description}</p>
                                                ) : null}
                                                <div className="taskFooter">
                                                    <div className="taskMeta">
                                                        <span className="pill">{task.due || "마감일 없음"}</span>
                                                        <span className="pill muted">{task.assignee || "담당자 없음"}</span>
                                                    </div>
                                                    {canWriteTasks ? (
                                                        <div className="taskActions">
                                                            <button
                                                                className="taskActionBtn"
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    requireAuth(() => openEditModal(task));
                                                                }}
                                                            >
                                                                수정
                                                            </button>
                                                            <button
                                                                className="taskActionBtn danger"
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    requireAuth(() => {
                                                                        setDeleteConfirmTask(task);
                                                                        setDeleteError(null);
                                                                    });
                                                                }}
                                                                disabled={deletingTaskId === task.id}
                                                            >
                                                                {deletingTaskId === task.id ? "삭제 중" : "삭제"}
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </article>
                                        ))}

                                    {canWriteTasks ? (
                                        <button
                                            className="addCardBtn"
                                            onClick={() => requireAuth(() => openCreateModal(column))}
                                            disabled={!activeProject && viewMode !== "my-tasks"}
                                        >
                                            + 작업 추가
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : null}
                </section>
            </main>

            {selectedTask ? (
                <aside className="taskDetailPanel" aria-label="작업 상세">
                    <div className="detailHeader">
                        <div>
                            <div className="detailEyebrow">{selectedTaskProject?.name ?? "프로젝트"}</div>
                            <h2>{selectedTask.title}</h2>
                        </div>
                        <button className="detailCloseBtn" type="button" onClick={closeTaskDetail} title="상세 닫기">
                            닫기
                        </button>
                    </div>

                    {canWriteTasks ? (
                        <div className="detailActions">
                            <button className="primaryBtn" type="button" onClick={() => requireAuth(() => openEditModal(selectedTask))}>
                                수정
                            </button>
                            <button
                                className="dangerBtn"
                                type="button"
                                onClick={() =>
                                    requireAuth(() => {
                                        setDeleteConfirmTask(selectedTask);
                                        setDeleteError(null);
                                    })
                                }
                                disabled={deletingTaskId === selectedTask.id}
                            >
                                삭제
                            </button>
                        </div>
                    ) : null}

                    <div className="detailGrid">
                        <div className="detailField">
                            <span>상태</span>
                            <strong>{statusLabels[selectedTask.status]}</strong>
                        </div>
                        <div className="detailField">
                            <span>담당자</span>
                            <strong>{selectedTask.assignee || "담당자 없음"}</strong>
                        </div>
                        <div className="detailField">
                            <span>마감일</span>
                            <strong>{selectedTask.due || "마감일 없음"}</strong>
                        </div>
                        <div className="detailField">
                            <span>작성자 ID</span>
                            <strong>{selectedTask.creatorId}</strong>
                        </div>
                    </div>

                    <section className="detailSection">
                        <h3>설명</h3>
                        <p>{selectedTask.description || "아직 설명이 없습니다."}</p>
                    </section>
                </aside>
            ) : null}

            {isCreateOpen ? (
                <div className="modalBackdrop" onClick={closeCreateModal}>
                    <div className="createModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>작업 만들기</h2>
                                <p>{activeProject ? `프로젝트: ${activeProject.name}` : "프로젝트를 먼저 선택해주세요."}</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeCreateModal}>
                                닫기
                            </button>
                        </div>

                        <form className="createForm" onSubmit={handleCreateTask}>
                            <label className="modalField">
                                <span>제목</span>
                                <input
                                    className="modalInput"
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="작업 제목을 입력하세요"
                                    disabled={isCreating}
                                />
                            </label>

                            <div className="modalGrid">
                                <label className="modalField">
                                    <span>상태</span>
                                    <select
                                        className="modalInput"
                                        value={form.status}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                status: event.target.value as TaskStatus,
                                            }))
                                        }
                                        disabled={isCreating}
                                    >
                                        {columns.map((column) => (
                                            <option key={column} value={column}>
                                                {statusLabels[column]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="modalField">
                                    <span>담당자</span>
                                    <input
                                        className="modalInput"
                                        value={form.assignee}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, assignee: event.target.value }))
                                        }
                                        placeholder="이름"
                                        disabled={isCreating}
                                    />
                                    {user ? (
                                        <button
                                            className="assignMeBtn"
                                            type="button"
                                            onClick={() =>
                                                setForm((current) => ({ ...current, assignee: user.display_name }))
                                            }
                                            disabled={isCreating}
                                        >
                                            나에게 배정
                                        </button>
                                    ) : null}
                                </label>
                            </div>

                            <label className="modalField">
                                <span>마감일</span>
                                <input
                                    className="modalInput"
                                    value={form.due}
                                    onChange={(event) => setForm((current) => ({ ...current, due: event.target.value }))}
                                    placeholder="오늘, 내일, 2026-04-10"
                                    disabled={isCreating}
                                />
                            </label>

                            <label className="modalField">
                                <span>설명</span>
                                <textarea
                                    className="modalTextarea"
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="작업 설명을 입력하세요"
                                    disabled={isCreating}
                                />
                            </label>

                            {createError ? <div className="errorBanner">{createError}</div> : null}

                            <div className="modalActions">
                                <button className="ghostBtn" type="button" onClick={closeCreateModal} disabled={isCreating}>
                                    취소
                                </button>
                                <button className="primaryBtn" type="submit" disabled={isCreating}>
                                    {isCreating ? "생성 중..." : "작업 만들기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {editingTask ? (
                <div className="modalBackdrop" onClick={closeEditModal}>
                    <div className="createModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>작업 수정</h2>
                                <p>{activeProject ? `프로젝트: ${activeProject.name}` : "프로젝트 작업"}</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeEditModal}>
                                닫기
                            </button>
                        </div>

                        <form className="createForm" onSubmit={handleUpdateTask}>
                            <label className="modalField">
                                <span>제목</span>
                                <input
                                    className="modalInput"
                                    value={editForm.title}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="작업 제목을 입력하세요"
                                    disabled={isUpdating}
                                />
                            </label>

                            <div className="modalGrid">
                                <label className="modalField">
                                    <span>상태</span>
                                    <select
                                        className="modalInput"
                                        value={editForm.status}
                                        onChange={(event) =>
                                            setEditForm((current) => ({
                                                ...current,
                                                status: event.target.value as TaskStatus,
                                            }))
                                        }
                                        disabled={isUpdating}
                                    >
                                        {columns.map((column) => (
                                            <option key={column} value={column}>
                                                {statusLabels[column]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="modalField">
                                    <span>담당자</span>
                                    <input
                                        className="modalInput"
                                        value={editForm.assignee}
                                        onChange={(event) =>
                                            setEditForm((current) => ({ ...current, assignee: event.target.value }))
                                        }
                                        placeholder="이름"
                                        disabled={isUpdating}
                                    />
                                    {user ? (
                                        <button
                                            className="assignMeBtn"
                                            type="button"
                                            onClick={() =>
                                                setEditForm((current) => ({ ...current, assignee: user.display_name }))
                                            }
                                            disabled={isUpdating}
                                        >
                                            나에게 배정
                                        </button>
                                    ) : null}
                                </label>
                            </div>

                            <label className="modalField">
                                <span>마감일</span>
                                <input
                                    className="modalInput"
                                    value={editForm.due}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, due: event.target.value }))
                                    }
                                    placeholder="오늘, 내일, 2026-04-10"
                                    disabled={isUpdating}
                                />
                            </label>

                            <label className="modalField">
                                <span>설명</span>
                                <textarea
                                    className="modalTextarea"
                                    value={editForm.description}
                                    onChange={(event) =>
                                        setEditForm((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="작업 설명을 입력하세요"
                                    disabled={isUpdating}
                                />
                            </label>

                            {editError ? <div className="errorBanner">{editError}</div> : null}

                            <div className="modalActions">
                                <button className="ghostBtn" type="button" onClick={closeEditModal} disabled={isUpdating}>
                                    취소
                                </button>
                                <button className="primaryBtn" type="submit" disabled={isUpdating}>
                                    {isUpdating ? "저장 중..." : "변경사항 저장"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {deleteConfirmTask ? (
                <div className="modalBackdrop" onClick={closeDeleteModal}>
                    <div className="deleteModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>작업 삭제</h2>
                                <p>삭제한 작업은 되돌릴 수 없습니다.</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeDeleteModal}>
                                닫기
                            </button>
                        </div>

                        <div className="deleteSummary">
                            <div className="deleteTitle">{deleteConfirmTask.title}</div>
                            <div className="deleteMeta">
                                {deleteConfirmTask.due || "마감일 없음"} · {deleteConfirmTask.assignee || "담당자 없음"}
                            </div>
                        </div>

                        {deleteError ? <div className="errorBanner">{deleteError}</div> : null}

                        <div className="modalActions">
                            <button className="ghostBtn" type="button" onClick={closeDeleteModal} disabled={deletingTaskId !== null}>
                                취소
                            </button>
                            <button
                                className="dangerBtn"
                                type="button"
                                onClick={() => void handleDeleteTask()}
                                disabled={deletingTaskId !== null}
                            >
                                {deletingTaskId !== null ? "삭제 중..." : "작업 삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {isProjectModalOpen ? (
                <div className="modalBackdrop" onClick={closeProjectModal}>
                    <div className="createModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>{editingProject ? "프로젝트 수정" : "프로젝트 만들기"}</h2>
                                <p>
                                    {editingProject
                                        ? "프로젝트 이름, 아이콘, 설명을 수정합니다."
                                        : "새 프로젝트를 만들고 바로 보드에 추가합니다."}
                                </p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeProjectModal}>
                                닫기
                            </button>
                        </div>

                        <form className="createForm" onSubmit={handleSaveProject}>
                            <div className="modalGrid">
                                <label className="modalField">
                                    <span>이름</span>
                                    <input
                                        className="modalInput"
                                        value={projectForm.name}
                                        onChange={(event) =>
                                            setProjectForm((current) => ({ ...current, name: event.target.value }))
                                        }
                                        placeholder="프로젝트 이름"
                                        disabled={isSavingProject}
                                    />
                                </label>

                                <label className="modalField">
                                    <span>아이콘</span>
                                    <input
                                        className="modalInput"
                                        value={projectForm.emoji}
                                        onChange={(event) =>
                                            setProjectForm((current) => ({ ...current, emoji: event.target.value }))
                                        }
                                        placeholder="[앱]"
                                        disabled={isSavingProject}
                                    />
                                </label>
                            </div>

                            <label className="modalField">
                                <span>설명</span>
                                <textarea
                                    className="modalTextarea"
                                    value={projectForm.description}
                                    onChange={(event) =>
                                        setProjectForm((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="프로젝트 설명을 입력하세요"
                                    disabled={isSavingProject}
                                />
                            </label>

                            {projectError ? <div className="errorBanner">{projectError}</div> : null}

                            <div className="modalActions">
                                <button
                                    className="ghostBtn"
                                    type="button"
                                    onClick={closeProjectModal}
                                    disabled={isSavingProject}
                                >
                                    취소
                                </button>
                                <button className="primaryBtn" type="submit" disabled={isSavingProject}>
                                    {isSavingProject
                                        ? "저장 중..."
                                        : editingProject
                                          ? "변경사항 저장"
                                          : "프로젝트 만들기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {deleteConfirmProject ? (
                <div className="modalBackdrop" onClick={closeProjectDeleteModal}>
                    <div className="deleteModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>프로젝트 삭제</h2>
                                <p>프로젝트에 포함된 작업도 함께 삭제됩니다.</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeProjectDeleteModal}>
                                닫기
                            </button>
                        </div>

                        <div className="deleteSummary">
                            <div className="deleteTitle">
                                {deleteConfirmProject.emoji ?? "[ ]"} {deleteConfirmProject.name}
                            </div>
                            <div className="deleteMeta">
                                {deleteConfirmProject.description || "설명 없음"}
                            </div>
                        </div>

                        {projectDeleteError ? <div className="errorBanner">{projectDeleteError}</div> : null}

                        <div className="modalActions">
                            <button
                                className="ghostBtn"
                                type="button"
                                onClick={closeProjectDeleteModal}
                                disabled={deletingProjectId !== null}
                            >
                                취소
                            </button>
                            <button
                                className="dangerBtn"
                                type="button"
                                onClick={() => void handleDeleteProject()}
                                disabled={deletingProjectId !== null}
                            >
                                {deletingProjectId !== null ? "삭제 중..." : "프로젝트 삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {isMembersModalOpen ? (
                <div className="modalBackdrop" onClick={closeMembersModal}>
                    <div className="createModal memberModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>멤버 관리</h2>
                                <p>{activeSpace ? `${activeSpace.name} 스페이스 멤버를 관리합니다.` : "스페이스를 선택해주세요."}</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeMembersModal}>
                                닫기
                            </button>
                        </div>

                        <form className="memberInviteForm" onSubmit={handleAddSpaceMember}>
                            <label className="modalField">
                                <span>이메일</span>
                                <input
                                    className="modalInput"
                                    type="email"
                                    value={memberForm.email}
                                    onChange={(event) =>
                                        setMemberForm((current) => ({ ...current, email: event.target.value }))
                                    }
                                    placeholder="user@example.com"
                                    disabled={isAddingMember}
                                />
                            </label>

                            <label className="modalField">
                                <span>역할</span>
                                <select
                                    className="modalInput"
                                    value={memberForm.role}
                                    onChange={(event) =>
                                        setMemberForm((current) => ({
                                            ...current,
                                            role: event.target.value as SpaceMemberRole,
                                        }))
                                    }
                                    disabled={isAddingMember}
                                >
                                    {Object.entries(roleLabels).map(([role, label]) => (
                                        <option key={role} value={role}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button className="primaryBtn" type="submit" disabled={isAddingMember}>
                                {isAddingMember ? "추가 중..." : "멤버 추가"}
                            </button>
                        </form>

                        {membersError ? <div className="errorBanner">{membersError}</div> : null}

                        <div className="memberList">
                            {membersLoading ? (
                                <div className="emptyState">멤버 목록을 불러오는 중입니다...</div>
                            ) : spaceMembers.length ? (
                                spaceMembers.map((member) => (
                                    <article className="memberRow" key={member.userId}>
                                        <div className="memberIdentity">
                                            <div className="avatar smallAvatar">{member.displayName[0]?.toUpperCase() ?? "U"}</div>
                                            <div>
                                                <strong>{member.displayName}</strong>
                                                <span>{member.email}</span>
                                            </div>
                                        </div>

                                        <div className="memberControls">
                                            <select
                                                className="memberRoleSelect"
                                                value={member.role}
                                                onChange={(event) =>
                                                    void handleUpdateSpaceMemberRole(
                                                        member,
                                                        event.target.value as SpaceMemberRole,
                                                    )
                                                }
                                                disabled={updatingMemberId === member.userId || removingMemberId === member.userId}
                                            >
                                                {Object.entries(roleLabels).map(([role, label]) => (
                                                    <option key={role} value={role}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                className="taskActionBtn danger"
                                                type="button"
                                                onClick={() => void handleRemoveSpaceMember(member)}
                                                disabled={removingMemberId === member.userId}
                                            >
                                                {removingMemberId === member.userId ? "제거 중..." : "제거"}
                                            </button>
                                        </div>
                                    </article>
                                ))
                            ) : (
                                <div className="emptyState">아직 이 스페이스에 멤버가 없습니다.</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}

            {isSpaceModalOpen ? (
                <div className="modalBackdrop" onClick={closeSpaceModal}>
                    <div className="createModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>{editingSpace ? "스페이스 수정" : "스페이스 만들기"}</h2>
                                <p>
                                    {editingSpace
                                        ? "스페이스 이름과 설명을 수정합니다."
                                        : "팀이나 업무 단위로 프로젝트를 묶는 새 스페이스를 만듭니다."}
                                </p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeSpaceModal}>
                                닫기
                            </button>
                        </div>

                        <form className="createForm" onSubmit={handleSaveSpace}>
                            <label className="modalField">
                                <span>이름</span>
                                <input
                                    className="modalInput"
                                    value={spaceForm.name}
                                    onChange={(event) =>
                                        setSpaceForm((current) => ({ ...current, name: event.target.value }))
                                    }
                                    placeholder="스페이스 이름"
                                    disabled={isSavingSpace}
                                />
                            </label>

                            <label className="modalField">
                                <span>설명</span>
                                <textarea
                                    className="modalTextarea"
                                    value={spaceForm.description}
                                    onChange={(event) =>
                                        setSpaceForm((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="스페이스 설명을 입력하세요"
                                    disabled={isSavingSpace}
                                />
                            </label>

                            {spaceError ? <div className="errorBanner">{spaceError}</div> : null}

                            <div className="modalActions">
                                <button
                                    className="ghostBtn"
                                    type="button"
                                    onClick={closeSpaceModal}
                                    disabled={isSavingSpace}
                                >
                                    취소
                                </button>
                                <button className="primaryBtn" type="submit" disabled={isSavingSpace}>
                                    {isSavingSpace
                                        ? "저장 중..."
                                        : editingSpace
                                          ? "변경사항 저장"
                                          : "스페이스 만들기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {deleteConfirmSpace ? (
                <div className="modalBackdrop" onClick={closeSpaceDeleteModal}>
                    <div className="deleteModal" onClick={(event) => event.stopPropagation()}>
                        <div className="modalHeader">
                            <div>
                                <h2>스페이스 삭제</h2>
                                <p>스페이스에 포함된 프로젝트와 작업도 함께 삭제됩니다.</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeSpaceDeleteModal}>
                                닫기
                            </button>
                        </div>

                        <div className="deleteSummary">
                            <div className="deleteTitle">{deleteConfirmSpace.name}</div>
                            <div className="deleteMeta">{deleteConfirmSpace.description || "설명 없음"}</div>
                        </div>

                        {spaceDeleteError ? <div className="errorBanner">{spaceDeleteError}</div> : null}

                        <div className="modalActions">
                            <button
                                className="ghostBtn"
                                type="button"
                                onClick={closeSpaceDeleteModal}
                                disabled={deletingSpaceId !== null}
                            >
                                취소
                            </button>
                            <button
                                className="dangerBtn"
                                type="button"
                                onClick={() => void handleDeleteSpace()}
                                disabled={deletingSpaceId !== null}
                            >
                                {deletingSpaceId !== null ? "삭제 중..." : "스페이스 삭제"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
