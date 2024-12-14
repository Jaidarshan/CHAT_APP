import React, { useState } from "react";
import { Chat } from "./components/Chat";
import { Auth } from "./components/Auth.js";
import Cookies from "universal-cookie";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase-config"; // Import Firestore db
import { doc, getDoc, setDoc } from "firebase/firestore"; // Import Firestore methods
import "./App.css";

const cookies = new Cookies();

function ChatApp() {
  const [isAuth, setIsAuth] = useState(cookies.get("auth-token"));
  const [isInChat, setIsInChat] = useState(false);
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  // Handle entering the chat or creating a new room
  const handleEnterChat = async () => {
    if (room.trim() === "") {
      setError("Room name cannot be empty!");
      return;
    }

    // Check if the room exists in Firestore
    const roomRef = doc(db, "rooms", room.trim());
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      // Room doesn't exist, so create a new room
      await setDoc(roomRef, {
        createdAt: new Date(),
        creator: auth.currentUser.displayName,
      });
    }

    // Proceed to chat for the given room
    setIsInChat(true);
  };

  // Handle sign-out
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
            <div className="sign-out-button">
              Sign Out
              <img
                src="./logout.jpg"
                width="20px"
                alt="sign out button"
                className="signout-image"
              />
            </div>
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
