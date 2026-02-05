import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);

            // ✅ Firebase ID Token (JWT)
            const idToken: string = await result.user.getIdToken();

            console.log("로그인 성공:", result.user.email);
            console.log("Firebase ID Token(JWT):", idToken);

            // 임시 저장 (나중에 httpOnly 쿠키로 개선 가능)
            localStorage.setItem("idToken", idToken);
        } catch (error) {
            console.error(error);
            alert("로그인 실패");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.logo}>PMS</h1>
                <p style={styles.desc}>Work, organized. Simple.</p>

                <button style={styles.googleBtn} onClick={handleGoogleLogin}>
                    Google로 계속하기
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0f1115",
        color: "#fff",
    },
    card: {
        width: 420,
        padding: "40px 36px",
        borderRadius: 18,
        background: "#151822",
        border: "1px solid #222634",
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        textAlign: "center",
    },
    logo: {
        fontSize: 44,
        margin: 0,
        letterSpacing: 1,
    },
    desc: {
        marginTop: 10,
        marginBottom: 26,
        color: "#a8b0c0",
    },
    googleBtn: {
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #2b3243",
        background: "#1b2030",
        color: "#fff",
        cursor: "pointer",
        fontSize: 14,
    },
};
