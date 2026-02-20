import { useState } from "react";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Home.css"; // ✅ 파일명 Home.css면 이게 안전

type Props = { user: User | null };

type Project = { id: string; name: string; emoji?: string };
type Task = {
    id: string;
    title: string;
    projectId: string;
    status: "Todo" | "In Progress" | "Done";
    due?: string;
    assignee?: string;
};

const demoProjects: Project[] = [
    { id: "p1", name: "PMS Core", emoji: "🧩" },
    { id: "p2", name: "UI Bench", emoji: "🎨" },
    { id: "p3", name: "DB Design", emoji: "🗃️" },
];

const demoTasks: Task[] = [
    { id: "t1", title: "Space/Project 구조 확정", projectId: "p3", status: "Todo", due: "오늘" },
    { id: "t2", title: "Asana 스타일 Sidebar 만들기", projectId: "p2", status: "In Progress", due: "내일" },
    { id: "t3", title: "Firebase 로그인 흐름 마무리", projectId: "p1", status: "Done" },
    { id: "t4", title: "Task/Subtask ERD 정리", projectId: "p3", status: "Todo" },
];

export default function Home({ user }: Props) {
    const nav = useNavigate();
    const location = useLocation();

    const [activeProjectId, setActiveProjectId] = useState(demoProjects[0].id);
    const [query, setQuery] = useState("");

    const activeProject = demoProjects.find((p) => p.id === activeProjectId)!;

    const filtered = demoTasks
        .filter((t) => t.projectId === activeProjectId)
        .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

    const columns: Array<Task["status"]> = ["Todo", "In Progress", "Done"];

    const requireAuth = (action: () => void) => {
        if (!user) {
            nav("/login", {
                state: {
                    notice: "로그인 후 사용할 수 있어요.",
                    from: location.pathname,
                },
            });
            return;
        }
        action();
    };

    return (
        <div className="asanaApp">
            {/* Sidebar */}
            <aside className="asanaSidebar">
                <div className="sbBrand">
                    <div className="sbLogo">PMS</div>
                    <div className="sbSub">Asana-ish</div>
                </div>

                <nav className="sbNav">
                    <button className="sbNavItem sbNavItemActive">Home</button>
                    <button
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("추후: My tasks 화면"))}
                        title={!user ? "로그인 필요" : undefined}
                    >
                        My tasks
                    </button>
                    <button
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("추후: Inbox 화면"))}
                        title={!user ? "로그인 필요" : undefined}
                    >
                        Inbox
                    </button>
                    <button
                        className="sbNavItem"
                        onClick={() => requireAuth(() => alert("추후: Reporting 화면"))}
                        title={!user ? "로그인 필요" : undefined}
                    >
                        Reporting
                    </button>
                </nav>

                <div className="sbSectionTitle">Projects</div>
                <div className="sbProjects">
                    {demoProjects.map((p) => (
                        <button
                            key={p.id}
                            className={`sbProjectItem ${p.id === activeProjectId ? "sbProjectItemActive" : ""}`}
                            onClick={() => setActiveProjectId(p.id)}
                        >
                            <span className="sbEmoji">{p.emoji ?? "📁"}</span>
                            <span className="sbProjectName">{p.name}</span>
                        </button>
                    ))}
                </div>

                <div className="sbFooter">
                    <div className="userChip" title={user?.email ?? ""}>
                        <div className="avatar">
                            {(user?.displayName?.[0] ?? user?.email?.[0] ?? "G").toUpperCase()}
                        </div>
                        <div className="userMeta">
                            <div className="userName">{user?.displayName ?? "Guest"}</div>
                            <div className="userEmail">{user?.email ?? "로그인하면 기능을 사용할 수 있어요"}</div>
                        </div>
                    </div>

                    {user ? (
                        <button className="ghostBtn" onClick={() => signOut(auth)}>
                            로그아웃
                        </button>
                    ) : (
                        <Link className="ghostBtn" to="/login" state={{ from: location.pathname }}>
                            로그인
                        </Link>
                    )}
                </div>
            </aside>

            {/* Main */}
            <main className="asanaMain">
                {/* Topbar */}
                <header className="topbar">
                    <div className="topLeft">
                        <div className="crumb">
                            <span className="crumbMuted">Project</span>
                            <span className="crumbStrong">{activeProject.name}</span>
                        </div>
                    </div>

                    <div className="topRight">
                        <div className="searchWrap">
                            <input
                                className="searchInput"
                                placeholder="Search tasks…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <button
                            className="primaryBtn"
                            onClick={() => requireAuth(() => alert("추후: Task 생성 모달"))}
                            title={!user ? "로그인 필요" : undefined}
                        >
                            + New task
                        </button>
                    </div>
                </header>

                {/* Content */}
                <section className="content">
                    <div className="boardHeader">
                        <h1>{activeProject.name}</h1>
                        <p>
                            Asana 느낌의 기본 홈(데모 데이터).{user ? "" : " (Guest 모드)"} 다음은 API/DB 연동하면 됨.
                        </p>
                    </div>

                    <div className="kanban">
                        {columns.map((col) => (
                            <div key={col} className="col">
                                <div className="colHead">
                                    <span className="colTitle">{col}</span>
                                    <span className="colCount">{filtered.filter((t) => t.status === col).length}</span>
                                </div>

                                <div className="colBody">
                                    {filtered
                                        .filter((t) => t.status === col)
                                        .map((t) => (
                                            <article key={t.id} className="taskCard">
                                                <div className="taskTitle">{t.title}</div>
                                                <div className="taskMeta">
                                                    <span className="pill">{t.due ?? "No due"}</span>
                                                    <span className="pill muted">{t.assignee ?? "Unassigned"}</span>
                                                </div>
                                            </article>
                                        ))}

                                    <button
                                        className="addCardBtn"
                                        onClick={() => requireAuth(() => alert(`추후: ${col}에 task 추가`))}
                                        title={!user ? "로그인 필요" : undefined}
                                    >
                                        + Add task
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
