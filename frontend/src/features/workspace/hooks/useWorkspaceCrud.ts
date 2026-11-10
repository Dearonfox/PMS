import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { ACCESS_TOKEN_KEY, API_BASE_URL } from "../constants";
import type { ApiProject, ApiSpace, ApiSpaceMember, MemberForm, Project, ProjectForm, Space, SpaceForm, SpaceMember, SpaceMemberRole, Task, ViewMode } from "../types";
import { emptyMemberForm, emptyProjectForm, emptySpaceForm, formFromProject, formFromSpace, mapProject, mapSpace, mapSpaceMember } from "../utils";

type Params = {
    activeSpace: Space | null;
    selectedTask: Task | null;
    setSpaces: Dispatch<SetStateAction<Space[]>>;
    setProjects: Dispatch<SetStateAction<Project[]>>;
    setTasks: Dispatch<SetStateAction<Task[]>>;
    setSpaceMembers: Dispatch<SetStateAction<SpaceMember[]>>;
    setActiveSpaceId: Dispatch<SetStateAction<number | null>>;
    setActiveProjectId: Dispatch<SetStateAction<number | null>>;
    setSelectedTaskId: Dispatch<SetStateAction<number | null>>;
    setViewMode: Dispatch<SetStateAction<ViewMode>>;
    membersLoading: boolean;
    setMembersLoading: Dispatch<SetStateAction<boolean>>;
    membersError: string | null;
    setMembersError: Dispatch<SetStateAction<string | null>>;
};

export default function useWorkspaceCrud(params: Params) {
    const { activeSpace, selectedTask, setSpaces, setProjects, setTasks, setSpaceMembers, setActiveSpaceId, setActiveProjectId, setSelectedTaskId, setViewMode, membersLoading, setMembersLoading, membersError, setMembersError } = params;
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

    const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}` });
    const openCreateProjectModal = () => { setEditingProject(null); setProjectForm(emptyProjectForm()); setProjectError(null); setIsProjectModalOpen(true); };
    const openEditProjectModal = (project: Project) => { setEditingProject(project); setProjectForm(formFromProject(project)); setProjectError(null); setIsProjectModalOpen(true); };
    const closeProjectModal = () => { if (!isSavingProject) { setIsProjectModalOpen(false); setEditingProject(null); setProjectError(null); } };
    const openCreateSpaceModal = () => { setEditingSpace(null); setSpaceForm(emptySpaceForm()); setSpaceError(null); setIsSpaceModalOpen(true); };
    const openEditSpaceModal = (space: Space) => { setEditingSpace(space); setSpaceForm(formFromSpace(space)); setSpaceError(null); setIsSpaceModalOpen(true); };
    const closeSpaceModal = () => { if (!isSavingSpace) { setIsSpaceModalOpen(false); setEditingSpace(null); setSpaceError(null); } };

    const loadSpaceMembers = async (spaceId: number) => {
        setMembersLoading(true); setMembersError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/members`, { headers: { Authorization: `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}` } });
            if (!response.ok) throw new Error("멤버 목록을 불러오지 못했습니다.");
            setSpaceMembers(((await response.json()) as ApiSpaceMember[]).map(mapSpaceMember));
        } catch (error) { console.error(error); setMembersError("멤버 목록을 불러올 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요."); }
        finally { setMembersLoading(false); }
    };
    const openMembersModal = () => {
        if (!activeSpace) return;
        setMemberForm(emptyMemberForm()); setMembersError(null); setIsMembersModalOpen(true); void loadSpaceMembers(activeSpace.id);
    };
    const closeMembersModal = () => {
        if (isAddingMember || updatingMemberId !== null || removingMemberId !== null) return;
        setIsMembersModalOpen(false); setMembersError(null);
    };

    const handleSaveProject = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!projectForm.name.trim()) return setProjectError("프로젝트 이름을 입력해주세요.");
        setIsSavingProject(true); setProjectError(null);
        try {
            const response = await fetch(editingProject ? `${API_BASE_URL}/projects/${editingProject.id}` : `${API_BASE_URL}/projects`, {
                method: editingProject ? "PATCH" : "POST", headers: authHeaders(), body: JSON.stringify({ space_id: activeSpace?.id ?? null, name: projectForm.name.trim(), emoji: projectForm.emoji.trim() || null, description: projectForm.description.trim() || null }),
            });
            if (response.status === 409) return setProjectError("같은 이름의 프로젝트가 이미 있습니다.");
            if (!response.ok) throw new Error("프로젝트 저장에 실패했습니다.");
            const saved = mapProject((await response.json()) as ApiProject);
            setProjects((current) => editingProject ? current.map((project) => project.id === saved.id ? saved : project) : [...current, saved]);
            setActiveProjectId(saved.id); setViewMode("home"); setIsProjectModalOpen(false); setEditingProject(null); setProjectForm(emptyProjectForm());
        } catch (error) { console.error(error); setProjectError("프로젝트를 저장할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요."); }
        finally { setIsSavingProject(false); }
    };

    const handleSaveSpace = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!spaceForm.name.trim()) return setSpaceError("스페이스 이름을 입력해주세요.");
        setIsSavingSpace(true); setSpaceError(null);
        try {
            const response = await fetch(editingSpace ? `${API_BASE_URL}/spaces/${editingSpace.id}` : `${API_BASE_URL}/spaces`, {
                method: editingSpace ? "PATCH" : "POST", headers: authHeaders(), body: JSON.stringify({ name: spaceForm.name.trim(), description: spaceForm.description.trim() || null }),
            });
            if (response.status === 409) return setSpaceError("같은 이름의 스페이스가 이미 있습니다.");
            if (!response.ok) throw new Error("스페이스 저장에 실패했습니다.");
            const saved = mapSpace((await response.json()) as ApiSpace);
            setSpaces((current) => editingSpace ? current.map((space) => space.id === saved.id ? saved : space) : [...current, saved]);
            setActiveSpaceId(saved.id); setActiveProjectId(null); setIsSpaceModalOpen(false); setEditingSpace(null); setSpaceForm(emptySpaceForm());
        } catch (error) { console.error(error); setSpaceError("스페이스를 저장할 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요."); }
        finally { setIsSavingSpace(false); }
    };

    const handleAddSpaceMember = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!activeSpace) return;
        if (!memberForm.email.trim()) return setMembersError("추가할 사용자 이메일을 입력해주세요.");
        setIsAddingMember(true); setMembersError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${activeSpace.id}/members`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ email: memberForm.email.trim(), role: memberForm.role }) });
            if (response.status === 404) return setMembersError("해당 이메일로 가입된 사용자를 찾을 수 없습니다.");
            if (response.status === 409) return setMembersError("이미 이 스페이스에 추가된 사용자입니다.");
            if (!response.ok) throw new Error("멤버 추가에 실패했습니다.");
            const added = mapSpaceMember((await response.json()) as ApiSpaceMember);
            setSpaceMembers((current) => [...current, added]); setMemberForm(emptyMemberForm());
        } catch (error) { console.error(error); setMembersError("멤버를 추가할 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요."); }
        finally { setIsAddingMember(false); }
    };
    const handleUpdateSpaceMemberRole = async (member: SpaceMember, role: SpaceMemberRole) => {
        if (!activeSpace || member.role === role) return;
        setUpdatingMemberId(member.userId); setMembersError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${activeSpace.id}/members/${member.userId}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ role }) });
            if (!response.ok) throw new Error("멤버 역할 변경에 실패했습니다.");
            const updated = mapSpaceMember((await response.json()) as ApiSpaceMember);
            setSpaceMembers((current) => current.map((item) => item.userId === updated.userId ? updated : item));
        } catch (error) { console.error(error); setMembersError("멤버 역할을 변경할 수 없습니다. 다시 시도해주세요."); }
        finally { setUpdatingMemberId(null); }
    };
    const handleRemoveSpaceMember = async (member: SpaceMember) => {
        if (!activeSpace) return;
        setRemovingMemberId(member.userId); setMembersError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${activeSpace.id}/members/${member.userId}`, { method: "DELETE", headers: authHeaders() });
            if (!response.ok) throw new Error("멤버 제거에 실패했습니다.");
            setSpaceMembers((current) => current.filter((item) => item.userId !== member.userId));
        } catch (error) { console.error(error); setMembersError("멤버를 제거할 수 없습니다. 다시 시도해주세요."); }
        finally { setRemovingMemberId(null); }
    };

    const closeProjectDeleteModal = () => { if (deletingProjectId === null) { setDeleteConfirmProject(null); setProjectDeleteError(null); } };
    const closeSpaceDeleteModal = () => { if (deletingSpaceId === null) { setDeleteConfirmSpace(null); setSpaceDeleteError(null); } };
    const handleDeleteProject = async () => {
        if (!deleteConfirmProject) return;
        setDeletingProjectId(deleteConfirmProject.id); setProjectDeleteError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${deleteConfirmProject.id}`, { method: "DELETE", headers: authHeaders() });
            if (!response.ok) throw new Error("프로젝트 삭제에 실패했습니다.");
            if (selectedTask?.projectId === deleteConfirmProject.id) setSelectedTaskId(null);
            setProjects((current) => {
                const next = current.filter((project) => project.id !== deleteConfirmProject.id);
                setActiveProjectId((id) => id !== deleteConfirmProject.id ? id : next[0]?.id ?? null);
                return next;
            });
            setTasks((current) => current.filter((task) => task.projectId !== deleteConfirmProject.id));
            setDeleteConfirmProject(null); setViewMode("home");
        } catch (error) { console.error(error); setProjectDeleteError("프로젝트를 삭제할 수 없습니다. 백엔드 서버를 확인한 뒤 다시 시도해주세요."); }
        finally { setDeletingProjectId(null); }
    };
    const handleDeleteSpace = async () => {
        if (!deleteConfirmSpace) return;
        setDeletingSpaceId(deleteConfirmSpace.id); setSpaceDeleteError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${deleteConfirmSpace.id}`, { method: "DELETE", headers: authHeaders() });
            if (!response.ok) throw new Error("스페이스 삭제에 실패했습니다.");
            setSpaces((current) => {
                const next = current.filter((space) => space.id !== deleteConfirmSpace.id);
                setActiveSpaceId((id) => id !== deleteConfirmSpace.id ? id : next[0]?.id ?? null);
                if (next.length === 0) { setProjects([]); setTasks([]); setActiveProjectId(null); }
                return next;
            });
            setSelectedTaskId(null); setDeleteConfirmSpace(null); setViewMode("home");
        } catch (error) { console.error(error); setSpaceDeleteError("스페이스를 삭제할 수 없습니다. 백엔드 서버를 확인하고 다시 시도해주세요."); }
        finally { setDeletingSpaceId(null); }
    };

    return {
        isProjectModalOpen, editingProject, projectForm, setProjectForm, projectError, isSavingProject,
        deleteConfirmProject, setDeleteConfirmProject, projectDeleteError, setProjectDeleteError, deletingProjectId,
        isSpaceModalOpen, editingSpace, spaceForm, setSpaceForm, spaceError, isSavingSpace,
        deleteConfirmSpace, setDeleteConfirmSpace, spaceDeleteError, setSpaceDeleteError, deletingSpaceId,
        isMembersModalOpen, memberForm, setMemberForm, isAddingMember, updatingMemberId, removingMemberId,
        membersLoading, membersError, openCreateProjectModal, openEditProjectModal, closeProjectModal,
        openCreateSpaceModal, openEditSpaceModal, closeSpaceModal, openMembersModal, closeMembersModal,
        handleSaveProject, handleSaveSpace, handleAddSpaceMember, handleUpdateSpaceMemberRole,
        handleRemoveSpaceMember, closeProjectDeleteModal, closeSpaceDeleteModal, handleDeleteProject, handleDeleteSpace,
    };
}
