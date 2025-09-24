// src/components/MainLayout.js

import React, { useState } from 'react';
import { signOut } from "firebase/auth";
import { auth } from "../firebase-config";
import Cookies from "universal-cookie";
import { SidePanel } from './SidePanel';
import { Chat } from './Chat';
import { CreateRoomModal } from './CreateRoomModal';

const cookies = new Cookies();

export const MainLayout = ({ setIsAuth }) => {
    const [currentChat, setCurrentChat] = useState(null); // e.g., 'room-name' or 'uid1_uid2'
    const [chatHeader, setChatHeader] = useState("Select a chat to begin");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut(auth);
        cookies.remove("auth-token");
        setIsAuth(false);
    };

    // This function is passed to the SidePanel to update the active chat
    const selectChat = (chatId, chatName) => {
        setCurrentChat(chatId);
        setChatHeader(chatName);
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Chat Application</h1>
                <button className="signout-button" onClick={handleSignOut}>
                    Sign Out
                </button>
            </header>

            <div className="main-content">
                <SidePanel 
                    onSelectChat={selectChat} 
                    onCreateRoom={() => setIsModalOpen(true)}
                    currentChat={currentChat}
                />
                <main className="chat-area">
                    {currentChat ? (
                        <Chat key={currentChat} room={currentChat} header={chatHeader} />
                    ) : (
                        <div className="welcome-screen">
                            <h2>Welcome, {auth.currentUser.displayName}! 👋</h2>
                            <p>Select a room or a user from the left panel to start chatting.</p>
                        </div>
                    )}
                </main>
            </div>
            
            {isModalOpen && (
                <CreateRoomModal 
                    onClose={() => setIsModalOpen(false)} 
                    onRoomCreated={(roomName) => {
                        selectChat(roomName, `# ${roomName}`); // Automatically switch to the new room
                        setIsModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};