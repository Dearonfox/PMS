import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";

export default function Signup() {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !pw.trim()) {
            setError("이메일/비밀번호를 입력해주세요.");
            return;
        }

        setBusy(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);

            // displayName 비었으면 이메일 앞부분 임시로
            if (!cred.user.displayName) {
                const name = email.split("@")[0] || "PMS User";
                await updateProfile(cred.user, { displayName: name });
            }

            // ✅ 자동 로그인 방지
            await signOut(auth);
            nav("/login", {
                replace: true,
                state: { notice: "회원가입이 완료되었습니다! 로그인 해주세요." },
            });
            nav("/login", { replace: true, state: { notice: "회원가입이 완료되었습니다! 로그인 해주세요." } });
        } catch (e: any) {
            console.error(e);
            const code = e?.code;
            if (code === "auth/email-already-in-use") setError("이미 가입된 이메일이에요.");
            else if (code === "auth/weak-password") setError("비밀번호가 너무 약해요. (6자 이상)");
            else if (code === "auth/invalid-email") setError("이메일 형식이 올바르지 않아요.");
            else setError("회원가입에 실패했어요. 잠시 후 다시 시도해주세요.");
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
                        <div className="brandTag">Work, organized. Simple.</div>
                    </div>

                    <div className="brandCopy">
                        <h2>새 계정을 만들어요.</h2>
                        <p>이메일로 가입 후 로그인하면 홈 화면으로 이동합니다.</p>
                    </div>
                </div>

                <div className="cardPane">
                    <div className="loginCard">
                        <div className="cardHeader">
                            <h1>회원가입</h1>
                            <p>이메일로 계정을 생성하세요.</p>
                        </div>

                        {error && <div className="errorBox">{error}</div>}

                        <form className="emailForm" onSubmit={onSignup}>
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

