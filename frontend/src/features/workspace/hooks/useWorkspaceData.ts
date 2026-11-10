import { useEffect, useState } from "react";

import type { AuthUser } from "../../../App";
import { ACCESS_TOKEN_KEY, API_BASE_URL } from "../constants";
import type { ApiProject, ApiSpace, ApiSpaceMember, ApiTask, Project, Space, SpaceMember, Task } from "../types";
import { mapProject, mapSpace, mapSpaceMember, mapTask } from "../utils";

export default function useWorkspaceData(user: AuthUser | null) {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
    const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);

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
                const response = await fetch(`${API_BASE_URL}/spaces`, {
                    headers: { Authorization: `Bearer ${token ?? ""}` },
                });
                if (!response.ok) throw new Error("스페이스를 불러오지 못했습니다.");

                const data = ((await response.json()) as ApiSpace[]).map(mapSpace);
                setSpaces(data);
                setActiveSpaceId((current) => current ?? data[0]?.id ?? null);
                if (data.length === 0) {
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
        const authorization = `Bearer ${window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}`;

        const loadMembers = async () => {
            setMembersError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/spaces/${activeSpaceId}/members`, {
                    headers: { Authorization: authorization },
                });
                if (!response.ok) throw new Error("멤버 목록을 불러오지 못했습니다.");
                setSpaceMembers(((await response.json()) as ApiSpaceMember[]).map(mapSpaceMember));
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
                    fetch(`${API_BASE_URL}/projects?space_id=${activeSpaceId}`, { headers: { Authorization: authorization } }),
                    fetch(`${API_BASE_URL}/tasks?space_id=${activeSpaceId}`, { headers: { Authorization: authorization } }),
                ]);
                if (!projectsResponse.ok || !tasksResponse.ok) throw new Error("보드 데이터를 불러오지 못했습니다.");

                const projectData = ((await projectsResponse.json()) as ApiProject[]).map(mapProject);
                const taskData = ((await tasksResponse.json()) as ApiTask[]).map(mapTask);
                setProjects(projectData);
                setTasks(taskData);
                setActiveProjectId((current) => current !== null && projectData.some((project) => project.id === current) ? current : projectData[0]?.id ?? null);
            } catch (error) {
                console.error(error);
                setLoadError("백엔드에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
            } finally {
                setLoading(false);
            }
        };

        void loadMembers();
        void loadBoard();
    }, [activeSpaceId]);

    return {
        spaces, setSpaces, projects, setProjects, tasks, setTasks, spaceMembers, setSpaceMembers,
        activeSpaceId, setActiveSpaceId, activeProjectId, setActiveProjectId,
        loading, loadError, membersLoading, setMembersLoading, membersError, setMembersError,
    };
}
