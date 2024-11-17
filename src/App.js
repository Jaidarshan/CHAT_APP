import React, { useState } from "react";
import { Chat } from "./components/Chat";
import { Auth } from "./components/Auth.js";
import Cookies from "universal-cookie";
import { signOut } from "firebase/auth";
import { auth } from "./firebase-config";
import "./App.css";

const cookies = new Cookies();

function ChatApp() {
  const [isAuth, setIsAuth] = useState(cookies.get("auth-token"));
  const [isInChat, setIsInChat] = useState(null);
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  const handleEnterChat = () => {
    if (room.trim() === "") {
      setError("Room name cannot be empty!");
      return;
    }
    setIsInChat(true);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    cookies.remove("auth-token");
    setIsAuth(false);
    setIsInChat(false);
    setRoom("");
  };

  if (!isAuth) {
    return <Auth setIsAuth={setIsAuth} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Chat Application</h1>
        {isAuth && (
          <button className="signout-button" onClick={handleSignOut}>
            Sign Out
          </button>
        )}
      </header>
      <main>
        {!isInChat ? (
          <div className="room">
            <label>Type room name:</label>
            <input
              type="text"
              placeholder="Enter room name"
              value={room}
              onChange={(e) => {
                setRoom(e.target.value);
                setError("");
              }}
            />
            {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
            <button onClick={handleEnterChat}>Enter Chat</button>
          </div>
        ) : (
          <Chat room={room} />
        )}
      </main>
    </div>
  );
}

export default ChatApp;
