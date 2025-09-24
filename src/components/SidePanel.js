// src/components/SidePanel.js

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase-config';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import '../styles/SidePanel.css';

export const SidePanel = ({ onSelectChat, onCreateRoom, currentChat }) => {
    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // Fetch public rooms
        const roomsQuery = query(collection(db, "rooms"), orderBy("name"));
        const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
            setRooms(snapshot.docs.map(doc => doc.data().name).filter(Boolean));
        });

        // Fetch users
        const usersQuery = query(collection(db, "users"), orderBy("displayName"));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const userList = snapshot.docs
                .map(doc => doc.data())
                .filter(user => auth.currentUser && user.uid !== auth.currentUser.uid); // Exclude self
            setUsers(userList);
        });
        
        return () => {
            unsubscribeRooms();
            unsubscribeUsers();
        };
    }, []);

    const handleUserSelect = (selectedUser) => {
        const chatId = [auth.currentUser.uid, selectedUser.uid].sort().join("_");
        onSelectChat(chatId, selectedUser.displayName);
    };

    const handleRoomSelect = (roomName) => {
        onSelectChat(roomName, `# ${roomName}`);
    };

    return (
        <aside className="side-panel">
            <div className="panel-header">
                <h3>Chats</h3>
                <button onClick={onCreateRoom} className="create-room-btn" title="Create New Room">
                    ➕
                </button>
            </div>
            <div className="list-container">
                <h4>Public Rooms</h4>
                <ul>
                    {rooms.map((roomName) => (
                        <li
                            key={roomName}
                            className={roomName === currentChat ? "active" : ""}
                            onClick={() => handleRoomSelect(roomName)}
                        >
                            # {roomName}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="list-container">
                <h4>Direct Messages</h4>
                <ul>
                    {users.map((user) => {
                        const chatId = [auth.currentUser.uid, user.uid].sort().join("_");
                        return (
                            <li
                                key={user.uid}
                                className={chatId === currentChat ? "active" : ""}
                                onClick={() => handleUserSelect(user)}
                            >
                                {user.displayName}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </aside>
    );
};