import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./login.css";

export default function Login() {
    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log("로그인 성공:", result.user);
        } catch (err) {
            console.error(err);
            alert("로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
        }
    };

    return (
        <div className="loginPage">
            {/* 배경 데코 */}
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
                        <p>
                            Space → Project → Task 흐름으로 업무를 정리하고, 진행률과 담당자를
                            빠르게 공유하세요.
                        </p>

                        <div className="featureList">
                            <div className="featureItem">
                                <span className="dot" />
                                <span>스페이스별 권한(Admin/User/Viewer)</span>
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
                            <p>Google 계정으로 빠르게 시작하세요.</p>
                        </div>

                        <button className="googleBtn" onClick={handleGoogleLogin}>
              <span className="googleIcon" aria-hidden="true">
                {/* Google G 아이콘(SVG) */}
                  <svg width="18" height="18" viewBox="0 0 48 48">
                  <path
                      d="M44.5 20H24v8.5h11.8C34.4 33.7 29.7 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.5 0 6.7 1.4 9.1 3.6l6-6C35.6 5.1 30.1 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.2-2.8-.5-4z"
                      fill="currentColor"
                      opacity="0.12"
                  />
                  <path
                      d="M44.5 20H24v8.5h11.8C34.4 33.7 29.7 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.5 0 6.7 1.4 9.1 3.6l6-6C35.6 5.1 30.1 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.2-2.8-.5-4z"
                      fill="#4285F4"
                  />
                  <path
                      d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.5 0 6.7 1.4 9.1 3.6l6-6C35.6 5.1 30.1 3 24 3 16 3 9.1 7.4 6.3 14.7z"
                      fill="#EA4335"
                  />
                  <path
                      d="M24 45c6 0 11.5-2 15.6-5.5l-7.2-5.9C30.2 35.3 27.2 36.3 24 36.3c-5.7 0-10.4-3.3-12.8-8.4l-7.2 5.5C6.8 40.6 14.8 45 24 45z"
                      fill="#34A853"
                  />
                  <path
                      d="M11.2 27.9c-.6-1.7-1-3.5-1-5.4 0-1.8.3-3.5.9-5.1l-7-5.1C2.7 15.4 2 19.1 2 23c0 4.1.8 7.9 2.3 11.3l6.9-6.4z"
                      fill="#FBBC05"
                  />
                </svg>
              </span>
                            Google로 계속하기
                        </button>

                        <div className="helperRow">
                            <span className="helperText">계정이 없나요?</span>
                            <button
                                className="linkBtn"
                                type="button"
                                onClick={() => alert("회원가입 흐름은 추후 추가하면 돼요!")}
                            >
                                회원가입 안내
                            </button>
                        </div>

                        <div className="finePrint">
                            계속 진행하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                        </div>
                    </div>

                    <div className="miniFooter">
                        <span>© {new Date().getFullYear()} PMS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
