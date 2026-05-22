import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { AuthUser } from "../App";
import "./Home.css";

type Props = {
    user: AuthUser | null;
    onLogout: () => void;
};

type Project = { id: number; name: string; emoji?: string };
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

type ApiProject = { id: number; name: string; emoji?: string };
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

type CreateTaskForm = {
    title: string;
    status: TaskStatus;
    assignee: string;
    due: string;
    description: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const columns: TaskStatus[] = ["Todo", "In Progress", "Done"];
const ACCESS_TOKEN_KEY = "pms_access_token";

const emptyForm = (status: TaskStatus): CreateTaskForm => ({
    title: "",
    status,
    assignee: "",
    due: "",
    description: "",
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
    const [form, setForm] = useState<CreateTaskForm>(emptyForm("Todo"));

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
                    throw new Error("Failed to load board data.");
                }

                const projectsData = (await projectsResponse.json()) as ApiProject[];
                const tasksData = (await tasksResponse.json()) as ApiTask[];

                setProjects(projectsData);
                setTasks(tasksData.map(mapTask));
                setActiveProjectId((current) => current ?? projectsData[0]?.id ?? null);
            } catch (error) {
                console.error(error);
                setLoadError("Could not connect to the backend API. Check that the FastAPI server is running.");
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
                    notice: "Login is required to use this action.",
                    from: location.pathname,
                },
            });
            return;
        }
        action();
    };

    const openCreateModal = (status: TaskStatus = "Todo") => {
        if (!activeProject) {
            return;
        }

        setForm(emptyForm(status));
        setCreateError(null);
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        if (isCreating) {
            return;
        }

        setIsCreateOpen(false);
        setCreateError(null);
    };

    const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!activeProject) {
            setCreateError("Choose a project before creating a task.");
            return;
        }

        if (!form.title.trim()) {
            setCreateError("Task title is required.");
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
                },
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
                throw new Error("Task creation failed.");
            }

            const createdTask = (await response.json()) as ApiTask;
            setTasks((current) => [...current, mapTask(createdTask)]);
            setIsCreateOpen(false);
            setForm(emptyForm("Todo"));
        } catch (error) {
            console.error(error);
            setCreateError("Could not create the task. Check the backend server and try again.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="asanaApp">
            <aside className="asanaSidebar">
                <div className="sbBrand">
                    <div className="sbLogo">PMS</div>
                    <div className="sbSub">Asana-inspired workflow</div>
                </div>

                <nav className="sbNav">
                    <button
                        className={`sbNavItem ${viewMode === "home" ? "sbNavItemActive" : ""}`}
                        onClick={() => setViewMode("home")}
                    >
                        Home
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "my-tasks" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("my-tasks"))}
                    >
                        My tasks
                    </button>
                    <button
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("Inbox view is next on the roadmap."))}
                    >
                        Inbox
                    </button>
                    <button
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("Reporting view is next on the roadmap."))}
                    >
                        Reporting
                    </button>
                </nav>

                <div className="sbSectionTitle">Projects</div>
                <div className="sbProjects">
                    {projects.map((project) => (
                        <button
                            key={project.id}
                            className={`sbProjectItem ${project.id === activeProject?.id ? "sbProjectItemActive" : ""}`}
                            onClick={() => {
                                setViewMode("home");
                                setActiveProjectId(project.id);
                            }}
                        >
                            <span className="sbEmoji">{project.emoji ?? "[ ]"}</span>
                            <span className="sbProjectName">{project.name}</span>
                        </button>
                    ))}
                </div>

                <div className="sbFooter">
                    <div className="userChip" title={user?.email ?? ""}>
                        <div className="avatar">
                            {(user?.display_name?.[0] ?? user?.email?.[0] ?? "G").toUpperCase()}
                        </div>
                        <div className="userMeta">
                            <div className="userName">{user?.display_name ?? "Guest"}</div>
                            <div className="userEmail">{user?.email ?? "Login to create and manage tasks."}</div>
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
                            Logout
                        </button>
                    ) : (
                        <Link className="ghostBtn ghostLink" to="/login" state={{ from: location.pathname }}>
                            Login
                        </Link>
                    )}
                </div>
            </aside>

            <main className="asanaMain">
                <header className="topbar">
                    <div className="topLeft">
                        <div className="crumb">
                            <span className="crumbMuted">Project</span>
                            <span className="crumbStrong">
                                {viewMode === "my-tasks" ? "My tasks" : activeProject?.name ?? "No project selected"}
                            </span>
                        </div>
                    </div>

                    <div className="topRight">
                        <div className="searchWrap">
                            <input
                                className="searchInput"
                                placeholder="Search tasks"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </div>
                        <button
                            className="primaryBtn"
                            onClick={() => requireAuth(() => openCreateModal("Todo"))}
                            disabled={!activeProject && viewMode !== "my-tasks"}
                        >
                            + New task
                        </button>
                    </div>
                </header>

                <section className="content">
                    <div className="boardHeader">
                        <h1>{viewMode === "my-tasks" ? "My tasks" : activeProject?.name ?? "Projects"}</h1>
                        <p>
                            {viewMode === "my-tasks"
                                ? "Tasks created by the currently signed-in account are filtered here."
                                : "Live data is now loaded from the FastAPI backend. Create a task here and it will appear in the matching column immediately."}
                        </p>
                    </div>

                    {loading ? <div className="infoBanner">Loading projects and tasks...</div> : null}
                    {loadError ? <div className="errorBanner">{loadError}</div> : null}
                    {!loading && !loadError && projects.length === 0 ? (
                        <div className="infoBanner">No projects found in the backend yet.</div>
                    ) : null}

                    <div className="kanban">
                        {columns.map((column) => (
                            <div key={column} className="col">
                                <div className="colHead">
                                    <span className="colTitle">{column}</span>
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
                                                <div className="taskMeta">
                                                    <span className="pill">{task.due || "No due date"}</span>
                                                    <span className="pill muted">{task.assignee || "Unassigned"}</span>
                                                </div>
                                            </article>
                                        ))}

                                    <button
                                        className="addCardBtn"
                                        onClick={() => requireAuth(() => openCreateModal(column))}
                                        disabled={!activeProject && viewMode !== "my-tasks"}
                                    >
                                        + Add task
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
                                <h2>Create task</h2>
                                <p>{activeProject ? `Project: ${activeProject.name}` : "Choose a project first."}</p>
                            </div>
                            <button className="modalCloseBtn" type="button" onClick={closeCreateModal}>
                                Close
                            </button>
                        </div>

                        <form className="createForm" onSubmit={handleCreateTask}>
                            <label className="modalField">
                                <span>Title</span>
                                <input
                                    className="modalInput"
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Write the task title"
                                    disabled={isCreating}
                                />
                            </label>

                            <div className="modalGrid">
                                <label className="modalField">
                                    <span>Status</span>
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
                                                {column}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="modalField">
                                    <span>Assignee</span>
                                    <input
                                        className="modalInput"
                                        value={form.assignee}
                                        onChange={(event) =>
                                            setForm((current) => ({ ...current, assignee: event.target.value }))
                                        }
                                        placeholder="Name"
                                        disabled={isCreating}
                                    />
                                </label>
                            </div>

                            <label className="modalField">
                                <span>Due</span>
                                <input
                                    className="modalInput"
                                    value={form.due}
                                    onChange={(event) => setForm((current) => ({ ...current, due: event.target.value }))}
                                    placeholder="Today, Tomorrow, 2026-04-10"
                                    disabled={isCreating}
                                />
                            </label>

                            <label className="modalField">
                                <span>Description</span>
                                <textarea
                                    className="modalTextarea"
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="Optional task details"
                                    disabled={isCreating}
                                />
                            </label>

                            {createError ? <div className="errorBanner">{createError}</div> : null}

                            <div className="modalActions">
                                <button className="ghostBtn" type="button" onClick={closeCreateModal} disabled={isCreating}>
                                    Cancel
                                </button>
                                <button className="primaryBtn" type="submit" disabled={isCreating}>
                                    {isCreating ? "Creating..." : "Create task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
