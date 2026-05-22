import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { AuthUser } from "../App";
import "./Login.css";

type LoginLocationState = {
    notice?: string;
    from?: string;
};

type AuthResponse = {
    access_token: string;
    token_type: string;
    user: AuthUser;
};

type Props = {
    onLogin: (user: AuthUser) => void;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const ACCESS_TOKEN_KEY = "pms_access_token";

export default function Login({ onLogin }: Props) {
    const nav = useNavigate();
    const location = useLocation();

    const state = useMemo(() => (location.state ?? {}) as LoginLocationState, [location.state]);
    const notice = state.notice;
    const from = state.from ?? "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password.trim()) {
            setError("이메일/비밀번호를 입력해주세요.");
            return;
        }

        setBusy(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                }),
            });

            if (!response.ok) {
                throw new Error("Invalid credentials");
            }

            const authResponse = (await response.json()) as AuthResponse;
            window.localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.access_token);
            onLogin(authResponse.user);
            nav(from, { replace: true });
        } catch (err: unknown) {
            console.error(err);
            setError("이메일 또는 비밀번호가 올바르지 않아요.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="loginPage">
            <div className="bgGlow bgGlow1" />
            <div className="bgGlow bgGlow2" />

            <div className="loginShell">
                <div className="brandPane">
                    <div className="brandTop">
                        <div className="brandMark">PMS</div>
                        <div className="brandTag">Work, organized. Simple.</div>
                    </div>

                    <div className="brandCopy">
                        <h2>팀 작업을 한 눈에.</h2>
                        <p>Space → Project → Task 흐름으로 업무를 정리하고, 진행률과 담당자를 빠르게 공유하세요.</p>

                        <div className="featureList">
                            <div className="featureItem">
                                <span className="dot" />
                                <span>FastAPI 자체 JWT 인증</span>
                            </div>
                            <div className="featureItem">
                                <span className="dot" />
                                <span>프로젝트/태스크/서브태스크 구조</span>
                            </div>
                            <div className="featureItem">
                                <span className="dot" />
                                <span>진행률·마감일 기반 관리</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="cardPane">
                    <div className="loginCard">
                        <div className="cardHeader">
                            <h1>로그인</h1>
                            <p>이메일과 비밀번호로 로그인하세요.</p>
                        </div>

                        {notice && <div className="errorBox">{notice}</div>}
                        {error && <div className="errorBox">{error}</div>}

                        <form className="emailForm" onSubmit={handleEmailLogin}>
                            <label className="field">
                                <span className="fieldLabel">이메일</span>
                                <input
                                    className="textInput"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={busy}
                                    autoComplete="email"
                                />
                            </label>

                            <label className="field">
                                <span className="fieldLabel">비밀번호</span>
                                <input
                                    className="textInput"
                                    type="password"
                                    placeholder="비밀번호"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={busy}
                                    autoComplete="current-password"
                                />
                            </label>

                            <button className="submitBtn" type="submit" disabled={busy}>
                                {busy ? "처리 중..." : "이메일로 로그인"}
                            </button>

                            <div className="helperRow">
                                <span className="helperText">계정이 없나요?</span>
                                <button
                                    className="linkBtn"
                                    type="button"
                                    onClick={() => nav("/signup", { state: { from } })}
                                    disabled={busy}
                                >
                                    회원가입
                                </button>
                            </div>
                        </form>

                        <div className="finePrint">로그인 후 JWT 토큰으로 보호된 API를 호출합니다.</div>
                    </div>

                    <div className="miniFooter">
                        <span>© {new Date().getFullYear()} PMS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

