import { useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { AuthUser } from "../App";
import InboxView from "../features/workspace/components/InboxView";
import DeleteConfirmModal from "../features/workspace/components/DeleteConfirmModal";
import MembersModal from "../features/workspace/components/MembersModal";
import ProjectFormModal from "../features/workspace/components/ProjectFormModal";
import ReportingView from "../features/workspace/components/ReportingView";
import SpaceFormModal from "../features/workspace/components/SpaceFormModal";
import useWorkspaceData from "../features/workspace/hooks/useWorkspaceData";
import useWorkspaceView from "../features/workspace/hooks/useWorkspaceView";
import TaskFormModal from "../features/workspace/components/TaskFormModal";
import UiIcon from "../features/workspace/components/UiIcon";
import { ACCESS_TOKEN_KEY, API_BASE_URL, statusLabels, taskStatuses as columns } from "../features/workspace/constants";
import type { ApiProject, ApiSpace, ApiSpaceMember, ApiTask, MemberForm, Project, ProjectForm, Space, SpaceForm, SpaceMember, SpaceMemberRole, Task, TaskForm, TaskStatus, ViewMode } from "../features/workspace/types";
import { emptyMemberForm, emptyProjectForm, emptySpaceForm, emptyTaskForm, formFromProject, formFromSpace, formFromTask, getDueState, mapProject, mapSpace, mapSpaceMember, mapTask } from "../features/workspace/utils";
import "./Home.css";

type Props = {
    user: AuthUser | null;
    onLogout: () => void;
};

export default function Home({ user, onLogout }: Props) {
    const nav = useNavigate();
    const location = useLocation();

    const {
        spaces, setSpaces, projects, setProjects, tasks, setTasks, spaceMembers, setSpaceMembers,
        activeSpaceId, setActiveSpaceId, activeProjectId, setActiveProjectId,
        loading, loadError, membersLoading, setMembersLoading, membersError, setMembersError,
    } = useWorkspaceData(user);
    const [viewMode, setViewMode] = useState<ViewMode>("home");
    const [query, setQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<TaskForm>(emptyTaskForm("Todo"));
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editForm, setEditForm] = useState<TaskForm>(emptyTaskForm("Todo"));
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
    const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm());
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [updatingMemberId, setUpdatingMemberId] = useState<number | null>(null);
    const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

    const {
        activeSpace, activeProject, currentSpaceRoleLabel,
        canManageSpace, canManageProjects, canWriteTasks, selectedTask, selectedTaskProject,
        scopedTasks, visibleTasks, isSearching, inboxTasks, inboxDueTasks, inboxRecentTasks, inboxDoneTasks,
        getProjectName, reportingTasks, reportingTotalCount, reportingDoneCount, reportingTodoCount,
        reportingInProgressCount, reportingDueRiskCount, reportingCompletionRate, topProjectReports,
        hasNoSpaces, hasNoProjects, showSearchEmpty, showBoardEmpty,
    } = useWorkspaceView({
        spaces, projects, tasks, spaceMembers, activeSpaceId, activeProjectId, selectedTaskId,
        viewMode, query, user, loading, loadError,
    });

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

        setForm(emptyTaskForm(status));
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
            setForm(emptyTaskForm("Todo"));
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
                    <button className="sbNavItem" onClick={() => nav("/posts")}><UiIcon name="board" />게시판</button>
                    <button
                        className={`sbNavItem ${viewMode === "home" ? "sbNavItemActive" : ""}`}
                        onClick={() => setViewMode("home")}
                    >
                        <UiIcon name="home" />홈
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "my-tasks" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("my-tasks"))}
                    >
                        <UiIcon name="tasks" />내 작업
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "inbox" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("inbox"))}
                    >
                        <UiIcon name="inbox" />받은함
                    </button>
                    <button
                        className={`sbNavItem ${viewMode === "reporting" ? "sbNavItemActive" : ""}`}
                        onClick={() => requireAuth(() => setViewMode("reporting"))}
                    >
                        <UiIcon name="report" />리포트
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
                            <UiIcon name="plus" />
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
                                <UiIcon name="plus" />새 작업
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

                    {viewMode === "home" && activeProject ? (
                        <div className="projectViewBar" aria-label="프로젝트 보기">
                            <div className="projectViewTabs">
                                <span className="projectViewTab projectViewTabActive"><UiIcon name="board" />보드</span>
                            </div>
                            <div className="projectViewTools">
                                <span>그룹: 상태</span>
                                <span>{visibleTasks.length}개 작업</span>
                            </div>
                        </div>
                    ) : null}

                    {loading ? <div className="infoBanner">프로젝트와 작업을 불러오는 중입니다...</div> : null}
                    {loadError ? <div className="errorBanner">{loadError}</div> : null}
                    {statusChangeError ? <div className="errorBanner">{statusChangeError}</div> : null}
                    {hasNoSpaces ? (
                        <div className="workspaceEmptyPanel">
                            <div className="workspaceEmptyCopy">
                                <div className="workspaceEmptyIcon"><UiIcon name="board" /></div>
                                <span className="emptyEyebrow">WORKSPACE SETUP</span>
                                <h2>팀의 첫 작업 공간을 만들어보세요</h2>
                                <p>스페이스 하나에 프로젝트와 작업을 모아두면 팀의 진행 상황을 한곳에서 확인할 수 있습니다.</p>
                                <button className="primaryBtn" type="button" onClick={() => requireAuth(openCreateSpaceModal)}>
                                    <UiIcon name="plus" />스페이스 만들기
                                </button>
                            </div>
                            <div className="workspaceEmptyGuide" aria-label="스페이스 생성 후 가능한 작업">
                                <div className="workspaceGuideHeader"><span>시작 가이드</span><strong>3단계</strong></div>
                                <div className="workspaceGuideStep workspaceGuideStepActive"><span>01</span><div><strong>스페이스 만들기</strong><small>팀과 업무의 기준 공간</small></div></div>
                                <div className="workspaceGuideStep"><span>02</span><div><strong>프로젝트 추가</strong><small>목표와 업무 흐름 정리</small></div></div>
                                <div className="workspaceGuideStep"><span>03</span><div><strong>작업 배정하기</strong><small>담당자와 진행 상태 관리</small></div></div>
                            </div>
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
                        <InboxView
                            displayName={user?.display_name ?? "사용자"}
                            tasks={inboxTasks}
                            dueTasks={inboxDueTasks}
                            recentTasks={inboxRecentTasks}
                            doneCount={inboxDoneTasks.length}
                            getProjectName={getProjectName}
                            onOpenTask={openTaskDetail}
                        />
                    ) : null}

                    {viewMode === "reporting" && !loading && !loadError ? (
                        <ReportingView
                            isSearching={isSearching}
                            tasks={reportingTasks}
                            totalCount={reportingTotalCount}
                            todoCount={reportingTodoCount}
                            inProgressCount={reportingInProgressCount}
                            doneCount={reportingDoneCount}
                            dueRiskCount={reportingDueRiskCount}
                            completionRate={reportingCompletionRate}
                            projectReports={topProjectReports}
                        />
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
                                    <span className={`colStatusDot colStatusDot-${column.replace(" ", "-").toLowerCase()}`} />
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
                                                        <span className={`taskDueMeta taskDueMeta-${getDueState(task)}`}><UiIcon name="calendar" />{task.due || "마감일 없음"}</span>
                                                        <span className="taskAssigneeMeta" title={task.assignee || "담당자 없음"}>
                                                            <span className="taskAssigneeAvatar">{(task.assignee?.[0] ?? "–").toUpperCase()}</span>
                                                            <span>{task.assignee || "미배정"}</span>
                                                        </span>
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
                                            <UiIcon name="plus" />작업 추가
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
                <TaskFormModal
                    mode="create"
                    projectName={activeProject?.name}
                    form={form}
                    error={createError}
                    busy={isCreating}
                    currentUserName={user?.display_name}
                    onChange={setForm}
                    onClose={closeCreateModal}
                    onSubmit={handleCreateTask}
                />
            ) : null}

            {editingTask ? (
                <TaskFormModal
                    mode="edit"
                    projectName={activeProject?.name}
                    form={editForm}
                    error={editError}
                    busy={isUpdating}
                    currentUserName={user?.display_name}
                    onChange={setEditForm}
                    onClose={closeEditModal}
                    onSubmit={handleUpdateTask}
                />
            ) : null}

            {deleteConfirmTask ? (
                <DeleteConfirmModal
                    title="작업 삭제"
                    description="삭제한 작업은 되돌릴 수 없습니다."
                    summaryTitle={deleteConfirmTask.title}
                    summaryMeta={`${deleteConfirmTask.due || "마감일 없음"} · ${deleteConfirmTask.assignee || "담당자 없음"}`}
                    error={deleteError}
                    busy={deletingTaskId !== null}
                    confirmLabel="작업 삭제"
                    onClose={closeDeleteModal}
                    onConfirm={() => void handleDeleteTask()}
                />
            ) : null}

            {isProjectModalOpen ? (
                <ProjectFormModal
                    editingProject={editingProject}
                    form={projectForm}
                    error={projectError}
                    busy={isSavingProject}
                    onChange={setProjectForm}
                    onClose={closeProjectModal}
                    onSubmit={handleSaveProject}
                />
            ) : null}

            {deleteConfirmProject ? (
                <DeleteConfirmModal
                    title="프로젝트 삭제"
                    description="프로젝트에 포함된 작업도 함께 삭제됩니다."
                    summaryTitle={`${deleteConfirmProject.emoji ?? "[ ]"} ${deleteConfirmProject.name}`}
                    summaryMeta={deleteConfirmProject.description || "설명 없음"}
                    error={projectDeleteError}
                    busy={deletingProjectId !== null}
                    confirmLabel="프로젝트 삭제"
                    onClose={closeProjectDeleteModal}
                    onConfirm={() => void handleDeleteProject()}
                />
            ) : null}

            {isMembersModalOpen ? (
                <MembersModal
                    activeSpace={activeSpace}
                    members={spaceMembers}
                    form={memberForm}
                    loading={membersLoading}
                    error={membersError}
                    adding={isAddingMember}
                    updatingMemberId={updatingMemberId}
                    removingMemberId={removingMemberId}
                    onFormChange={setMemberForm}
                    onClose={closeMembersModal}
                    onSubmit={handleAddSpaceMember}
                    onRoleChange={(member, role) => void handleUpdateSpaceMemberRole(member, role)}
                    onRemove={(member) => void handleRemoveSpaceMember(member)}
                />
            ) : null}

            {isSpaceModalOpen ? (
                <SpaceFormModal
                    editingSpace={editingSpace}
                    form={spaceForm}
                    error={spaceError}
                    busy={isSavingSpace}
                    onChange={setSpaceForm}
                    onClose={closeSpaceModal}
                    onSubmit={handleSaveSpace}
                />
            ) : null}

            {deleteConfirmSpace ? (
                <DeleteConfirmModal
                    title="스페이스 삭제"
                    description="스페이스에 포함된 프로젝트와 작업도 함께 삭제됩니다."
                    summaryTitle={deleteConfirmSpace.name}
                    summaryMeta={deleteConfirmSpace.description || "설명 없음"}
                    error={spaceDeleteError}
                    busy={deletingSpaceId !== null}
                    confirmLabel="스페이스 삭제"
                    onClose={closeSpaceDeleteModal}
                    onConfirm={() => void handleDeleteSpace()}
                />
            ) : null}
        </div>
    );
}
