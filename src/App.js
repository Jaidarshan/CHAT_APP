import React, { useState, useEffect } from "react";
import { Auth } from "./components/Auth.js";
import { MainLayout } from "./components/MainLayout.js";
import { auth } from "./firebase-config.js";
import "./App.css";

function ChatApp() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  if (!user) {
    return <Auth />;
  }

  return <MainLayout />;
}

export default ChatApp;