import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log("로그인 성공:", result.user);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.logo}>PMS</h1>
            <p style={styles.desc}>Work, organized. Simple.</p>

            <button style={styles.googleBtn} onClick={handleGoogleLogin}>
                Google로 계속하기
            </button>
        </div>
    );
}

const styles = {
    container: {
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#f6f8f9",
    },
    logo: { fontSize: "48px", marginBottom: "10px" },
    desc: { color: "#666", marginBottom: "30px" },
    googleBtn: {
        padding: "12px 20px",
        borderRadius: "8px",
        border: "none",
        background: "#fff",
        cursor: "pointer",
        fontSize: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    },
};
