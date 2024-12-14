import { auth, provider } from "../firebase-config.js";
import { signInWithPopup } from "firebase/auth";
import "../styles/Auth.css";
import Cookies from "universal-cookie";
import { useState } from "react";

const cookies = new Cookies();

export const Auth = ({ setIsAuth }) => {
  const [errorMessage, setErrorMessage] = useState("");
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      cookies.set("auth-token", result.user.refreshToken);
      setIsAuth(true);
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to sign in. Please try again.");
    }
  };

  return (
    <div className="auth">
      <h1>Chat Application</h1>
      <p>Sign In With Google To Continue</p>
      {errorMessage && (
        <p className="error-message" style={{ color: "red", marginTop: "10px" }}>
          {errorMessage}
        </p>
      )}
      <button onClick={signInWithGoogle}>Sign In</button>
    </div>
  );
};
