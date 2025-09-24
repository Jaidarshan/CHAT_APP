// src/App.js

import React, { useState } from "react";
import { Auth } from "./components/Auth.js";
import { MainLayout } from "./components/MainLayout.js";
import Cookies from "universal-cookie";
import "./App.css";

const cookies = new Cookies();

function ChatApp() {
  const [isAuth, setIsAuth] = useState(cookies.get("auth-token"));

  if (!isAuth) {
    // If not authenticated, show the login screen
    return <Auth setIsAuth={setIsAuth} />;
  }

  // If authenticated, show the main application layout
  return <MainLayout setIsAuth={setIsAuth} />;
}

export default ChatApp;