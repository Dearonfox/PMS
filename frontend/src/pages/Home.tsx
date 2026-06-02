import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { AuthUser } from "../App";
import "./Home.css";

type Props = {
    user: AuthUser | null;
    onLogout: () => void;
};

type Project = { id: number; name: string; emoji?: string | null; description?: string | null };
type TaskStatus = "Todo" | "In Progress" | "Done";
type ViewMode = "home" | "my-tasks";
type Task = {
    id: number;
    title: string;
    projectId: number;
    status: TaskStatus;
    due?: string | null;
    assignee?: string | null;
    description?: string | null;
    creatorId: number;
};

type ApiProject = { id: number; name: string; emoji?: string | null; description?: string | null };
type ApiTask = {
    id: number;
    title: string;
    project_id: number;
    status: TaskStatus;
    due?: string | null;
    assignee?: string | null;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const columns: TaskStatus[] = ["Todo", "In Progress", "Done"];
const ACCESS_TOKEN_KEY = "pms_access_token";
const statusLabels: Record<TaskStatus, string> = {
    Todo: "할 일",
    "In Progress": "진행 중",
    Done: "완료",
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

function mapTask(task: ApiTask): Task {
    return {
        id: task.id,
        title: task.title,
        projectId: task.project_id,
        status: task.status,
        due: task.due,
        assignee: task.assignee,
        description: task.description,
        creatorId: task.creator_id,
    };
}

export default function Home({ user, onLogout }: Props) {
    const nav = useNavigate();
    const location = useLocation();

    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
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
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm());
    const [projectError, setProjectError] = useState<string | null>(null);
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
    const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);
    const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

    useEffect(() => {
        const loadBoard = async () => {
            setLoading(true);
            setLoadError(null);

            try {
                const [projectsResponse, tasksResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/projects`),
                    fetch(`${API_BASE_URL}/tasks`),
                ]);

                if (!projectsResponse.ok || !tasksResponse.ok) {
                    throw new Error("보드 데이터를 불러오지 못했습니다.");
                }

                const projectsData = (await projectsResponse.json()) as ApiProject[];
                const tasksData = (await tasksResponse.json()) as ApiTask[];

                setProjects(projectsData);
                setTasks(tasksData.map(mapTask));
                setActiveProjectId((current) => current ?? projectsData[0]?.id ?? null);
            } catch (error) {
                console.error(error);
                setLoadError("백엔드에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
            } finally {
                setLoading(false);
            }
        };

        void loadBoard();
    }, []);

    const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
    const backendUserId = user?.id ?? null;

    const visibleTasks = tasks
        .filter((task) => {
            if (viewMode === "my-tasks") {
                return backendUserId !== null && task.creatorId === backendUserId;
            }
            return task.projectId === activeProject?.id;
        })
        .filter((task) => task.title.toLowerCase().includes(query.toLowerCase()));

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

            const savedProject = (await response.json()) as ApiProject;
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
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("받은함 화면은 다음 단계에서 구현할 예정입니다."))}
                    >
                        받은함
                    </button>
                    <button
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("리포트 화면은 다음 단계에서 구현할 예정입니다."))}
                    >
                        리포트
                    </button>
                </nav>

                <div className="sbSectionHeader">
                    <span className="sbSectionTitle">프로젝트</span>
                    <button
                        className="sbAddProjectBtn"
                        type="button"
                        title="프로젝트 추가"
                        onClick={() => requireAuth(openCreateProjectModal)}
                    >
                        +
                    </button>
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
                                {viewMode === "my-tasks" ? "내 작업" : activeProject?.name ?? "선택된 프로젝트 없음"}
                            </span>
                        </div>
                    </div>

                    <div className="topRight">
                        <div className="searchWrap">
                            <input
                                className="searchInput"
                                placeholder="작업 검색"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <button
                            className="primaryBtn"
                            onClick={() => requireAuth(() => openCreateModal("Todo"))}
                            disabled={!activeProject && viewMode !== "my-tasks"}
                        >
                            + 새 작업
                        </button>
                    </div>
                </header>

                <section className="content">
                    <div className="boardHeader">
                        <h1>{viewMode === "my-tasks" ? "내 작업" : activeProject?.name ?? "프로젝트"}</h1>
                        <p>
                            {viewMode === "my-tasks"
                                ? "현재 로그인한 계정이 만든 작업만 모아서 보여줍니다."
                                : "백엔드에서 불러온 실제 데이터입니다. 새 작업을 만들면 선택한 상태 컬럼에 바로 표시됩니다."}
                        </p>
                    </div>

                    {loading ? <div className="infoBanner">프로젝트와 작업을 불러오는 중입니다...</div> : null}
                    {loadError ? <div className="errorBanner">{loadError}</div> : null}
                    {!loading && !loadError && projects.length === 0 ? (
                        <div className="infoBanner">아직 백엔드에 프로젝트가 없습니다.</div>
                    ) : null}

                    <div className="kanban">
                        {columns.map((column) => (
                            <div key={column} className="col">
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
                                            <article key={task.id} className="taskCard">
                                                <div className="taskTitle">{task.title}</div>
                                                {task.description ? (
                                                    <p className="taskDescription">{task.description}</p>
                                                ) : null}
                                                <div className="taskFooter">
                                                    <div className="taskMeta">
                                                        <span className="pill">{task.due || "마감일 없음"}</span>
                                                        <span className="pill muted">{task.assignee || "담당자 없음"}</span>
                                                    </div>
                                                    <div className="taskActions">
                                                        <button
                                                            className="taskActionBtn"
                                                            type="button"
                                                            onClick={() => requireAuth(() => openEditModal(task))}
                                                        >
                                                            수정
                                                        </button>
                                                        <button
                                                            className="taskActionBtn danger"
                                                            type="button"
                                                            onClick={() =>
                                                                requireAuth(() => {
                                                                    setDeleteConfirmTask(task);
                                                                    setDeleteError(null);
                                                                })
                                                            }
                                                            disabled={deletingTaskId === task.id}
                                                        >
                                                            {deletingTaskId === task.id ? "삭제 중" : "삭제"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}

                                    <button
                                        className="addCardBtn"
                                        onClick={() => requireAuth(() => openCreateModal(column))}
                                        disabled={!activeProject && viewMode !== "my-tasks"}
                                    >
                                        + 작업 추가
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

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
        </div>
    );
}
