// components/Auth.js

import { auth, provider, db } from "../firebase-config.js"; // Import db
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Import doc and setDoc
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

      // --- NEW: Add user to Firestore 'users' collection ---
      const userRef = doc(db, "users", result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        },
        { merge: true } // Use merge to avoid overwriting data if user already exists
      );
      // --- End of new code ---

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