import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Login.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export default function Signup() {
    const nav = useNavigate();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!displayName.trim() || !email.trim() || !pw.trim()) {
            setError("이름, 이메일, 비밀번호를 입력해주세요.");
            return;
        }

        setBusy(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim(),
                    display_name: displayName.trim(),
                    password: pw,
                }),
            });

            if (response.status === 409) {
                setError("이미 가입된 이메일이에요.");
                return;
            }

            if (!response.ok) {
                throw new Error("Signup failed.");
            }

            nav("/login", {
                replace: true,
                state: { notice: "회원가입이 완료되었습니다! 로그인 해주세요." },
            });
        } catch (e: unknown) {
            console.error(e);
            setError("회원가입에 실패했어요. 잠시 후 다시 시도해주세요.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="loginPage ">
            <div className="bgGlow bgGlow1" />
            <div className="bgGlow bgGlow2" />

            <div className="loginShell">
                <div className="brandPane">
                    <div className="brandTop">
                        <div className="brandMark">PMS</div>
                        <div className="brandTag">팀 작업을 간단하게 정리하세요.</div>
                    </div>

                    <div className="brandCopy">
                        <h2>새 계정을 만들어요.</h2>
                        <p>가입 후 이메일과 비밀번호로 로그인하면 홈 화면으로 이동합니다.</p>
                    </div>
                </div>

                <div className="cardPane">
                    <div className="loginCard">
                        <div className="cardHeader">
                            <h1>회원가입</h1>
                            <p>이메일과 비밀번호로 사용할 계정을 생성하세요.</p>
                        </div>

                        {error && <div className="errorBox">{error}</div>}

                        <form className="emailForm" onSubmit={onSignup}>
                            <label className="field">
                                <span className="fieldLabel">이름</span>
                                <input
                                    className="textInput"
                                    type="text"
                                    placeholder="홍길동"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    disabled={busy}
                                    autoComplete="name"
                                />
                            </label>

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
                                    placeholder="비밀번호 (6자 이상)"
                                    value={pw}
                                    onChange={(e) => setPw(e.target.value)}
                                    disabled={busy}
                                    autoComplete="new-password"
                                />
                            </label>

                            <button className="submitBtn" type="submit" disabled={busy}>
                                {busy ? "처리 중..." : "가입하기"}
                            </button>

                            <div className="helperRow">
                                <span className="helperText">이미 계정이 있나요?</span>
                                <button className="linkBtn" type="button" onClick={() => nav("/login")} disabled={busy}>
                                    로그인
                                </button>
                            </div>
                        </form>

                        <div className="finePrint">가입 후에는 로그인 화면으로 돌아갑니다.</div>
                    </div>

                    <div className="miniFooter">
                        <span>© {new Date().getFullYear()} PMS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
