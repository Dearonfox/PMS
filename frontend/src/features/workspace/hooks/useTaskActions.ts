import { useState } from "react";
import type { Dispatch, DragEvent, FormEvent, SetStateAction } from "react";

import type { AuthUser } from "../../../App";
import { ACCESS_TOKEN_KEY, API_BASE_URL } from "../constants";
import type { ApiTask, Project, Task, TaskForm, TaskStatus } from "../types";
import { emptyTaskForm, formFromTask, mapTask } from "../utils";

type Params = {
    user: AuthUser | null;
    activeProject: Project | null;
    canWriteTasks: boolean;
    tasks: Task[];
    setTasks: Dispatch<SetStateAction<Task[]>>;
    setSelectedTaskId: Dispatch<SetStateAction<number | null>>;
    requireAuth: (action: () => void) => void;
};

export default function useTaskActions({ user, activeProject, canWriteTasks, tasks, setTasks, setSelectedTaskId, requireAuth }: Params) {
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
    const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
    const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);
    const [statusChangeError, setStatusChangeError] = useState<string | null>(null);

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`,
    });
    const resolveAssigneeId = (assignee: string) => {
        if (!user) return null;
        const normalized = assignee.trim().toLowerCase();
        if (!normalized) return null;
        return normalized === user.display_name.trim().toLowerCase() || normalized === user.email.trim().toLowerCase() ? user.id : null;
    };

    const openCreateModal = (status: TaskStatus = "Todo") => {
        if (!activeProject) return;
        setForm(emptyTaskForm(status));
        setCreateError(null);
        setIsCreateOpen(true);
    };
    const closeCreateModal = () => {
        if (isCreating) return;
        setIsCreateOpen(false);
        setCreateError(null);
    };
    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setEditForm(formFromTask(task));
        setEditError(null);
    };
    const closeEditModal = () => {
        if (isUpdating) return;
        setEditingTask(null);
        setEditError(null);
    };
    const closeDeleteModal = () => {
        if (deletingTaskId !== null) return;
        setDeleteConfirmTask(null);
        setDeleteError(null);
    };

    const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!activeProject) return setCreateError("작업을 만들 프로젝트를 먼저 선택해주세요.");
        if (!form.title.trim()) return setCreateError("작업 제목을 입력해주세요.");
        setIsCreating(true);
        setCreateError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/tasks`, {
                method: "POST", headers: authHeaders(), body: JSON.stringify({
                    title: form.title.trim(), project_id: activeProject.id, status: form.status,
                    assignee: form.assignee.trim() || null, assignee_id: resolveAssigneeId(form.assignee),
                    due: form.due.trim() || null, description: form.description.trim() || null,
                }),
            });
            if (!response.ok) throw new Error("작업 생성에 실패했습니다.");
            const created = mapTask((await response.json()) as ApiTask);
            setTasks((current) => [...current, created]);
            setIsCreateOpen(false);
            setForm(emptyTaskForm("Todo"));
        } catch (error) {
            console.error(error);
            setCreateError("작업을 만들 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally { setIsCreating(false); }
    };

    const handleUpdateTask = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingTask) return;
        if (!editForm.title.trim()) return setEditError("작업 제목을 입력해주세요.");
        setIsUpdating(true);
        setEditError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${editingTask.id}`, {
                method: "PATCH", headers: authHeaders(), body: JSON.stringify({
                    title: editForm.title.trim(), project_id: editingTask.projectId, status: editForm.status,
                    assignee: editForm.assignee.trim() || null, assignee_id: resolveAssigneeId(editForm.assignee),
                    due: editForm.due.trim() || null, description: editForm.description.trim() || null,
                }),
            });
            if (!response.ok) throw new Error("작업 수정에 실패했습니다.");
            const updated = mapTask((await response.json()) as ApiTask);
            setTasks((current) => current.map((task) => task.id === updated.id ? updated : task));
            setEditingTask(null);
        } catch (error) {
            console.error(error);
            setEditError("작업을 수정할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally { setIsUpdating(false); }
    };

    const handleTaskDragStart = (event: DragEvent<HTMLElement>, task: Task) => {
        if (!user || !canWriteTasks) return event.preventDefault();
        setDraggingTaskId(task.id);
        setStatusChangeError(null);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(task.id));
    };
    const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
        if (draggingTaskId === null || !canWriteTasks) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTargetStatus(status);
    };
    const handleTaskDragEnd = () => { setDraggingTaskId(null); setDropTargetStatus(null); };
    const handleTaskDrop = async (event: DragEvent<HTMLDivElement>, nextStatus: TaskStatus) => {
        event.preventDefault();
        const taskId = Number(event.dataTransfer.getData("text/plain") || draggingTaskId);
        const task = tasks.find((item) => item.id === taskId);
        handleTaskDragEnd();
        if (!canWriteTasks) return setStatusChangeError("이 스페이스에서 작업을 수정할 권한이 없습니다.");
        if (!task || task.status === nextStatus) return;
        if (!user) return requireAuth(() => undefined);
        const previousTasks = tasks;
        setStatusChangeError(null);
        setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
                method: "PATCH", headers: authHeaders(), body: JSON.stringify({
                    title: task.title, project_id: task.projectId, status: nextStatus, assignee: task.assignee,
                    assignee_id: task.assigneeId, due: task.due, description: task.description,
                }),
            });
            if (!response.ok) throw new Error("작업 상태 변경에 실패했습니다.");
            const updated = mapTask((await response.json()) as ApiTask);
            setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
        } catch (error) {
            console.error(error);
            setTasks(previousTasks);
            setStatusChangeError("작업 상태를 변경할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        }
    };

    const handleDeleteTask = async () => {
        if (!deleteConfirmTask) return;
        setDeletingTaskId(deleteConfirmTask.id);
        setDeleteError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${deleteConfirmTask.id}`, { method: "DELETE", headers: authHeaders() });
            if (!response.ok) throw new Error("작업 삭제에 실패했습니다.");
            setTasks((current) => current.filter((item) => item.id !== deleteConfirmTask.id));
            setSelectedTaskId((current) => current === deleteConfirmTask.id ? null : current);
            setDeleteConfirmTask(null);
        } catch (error) {
            console.error(error);
            setDeleteError("작업을 삭제할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요.");
        } finally { setDeletingTaskId(null); }
    };

    return {
        isCreateOpen, createError, isCreating, form, setForm, editingTask, editForm, setEditForm,
        editError, isUpdating, deleteConfirmTask, setDeleteConfirmTask, deleteError, setDeleteError, deletingTaskId,
        draggingTaskId, dropTargetStatus, statusChangeError,
        openCreateModal, closeCreateModal, openEditModal, closeEditModal, closeDeleteModal,
        handleCreateTask, handleUpdateTask, handleTaskDragStart, handleColumnDragOver,
        handleTaskDrop, handleTaskDragEnd, handleDeleteTask,
    };
}
