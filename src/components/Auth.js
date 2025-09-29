// src/components/Auth.js

import { auth, provider, db } from "../firebase-config.js";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "../styles/Auth.css";
import Cookies from "universal-cookie";
import { useState } from "react";

const cookies = new Cookies();

export const Auth = () => {
  const [errorMessage, setErrorMessage] = useState("");

  const signInWithGoogle = async () => {
    try {
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      cookies.set("auth-token", result.user.refreshToken);
      const userRef = doc(db, "users", result.user.uid);
      await setDoc(
        userRef,
        {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        },
        { merge: true }
      );

    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage("Failed to sign in. Please try again.");
      }
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