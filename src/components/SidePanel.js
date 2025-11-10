// src/components/SidePanel.js

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase-config';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ConfirmationModal } from './ConfirmationModal';
import { Notification } from './Notification';
import '../styles/SidePanel.css';

export const SidePanel = ({ onSelectChat, onCreateRoom, currentChat }) => {
    const [rooms, setRooms] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeMenu, setActiveMenu] = useState(null);
    const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    // CHANGED: roomToDelete now stores an object { id, name } instead of just a string
    const [roomToDelete, setRoomToDelete] = useState(null);
    const [notification, setNotification] = useState('');

    useEffect(() => {
        const roomsQuery = query(collection(db, "rooms"), orderBy("name"));
        const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
             setRooms(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
             })));
        });

        const usersQuery = query(collection(db, "users"), orderBy("displayName"));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const userList = snapshot.docs
                .map(doc => doc.data())
                .filter(user => auth.currentUser && user.uid !== auth.currentUser.uid);
            setUsers(userList);
        });

        const handleClickOutside = () => setActiveMenu(null);
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('resize', handleClickOutside);
        
        return () => {
            unsubscribeRooms();
            unsubscribeUsers();
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('resize', handleClickOutside);
        };
    }, []);

    const handleUserSelect = (selectedUser) => {
        const chatId = [auth.currentUser.uid, selectedUser.uid].sort().join("_");
        onSelectChat(chatId, selectedUser.displayName);
    };

    const handleRoomSelect = (roomName) => {
        onSelectChat(roomName, `# ${roomName}`);
    };

    const toggleMenu = (e, roomId) => {
        e.stopPropagation();
        if (activeMenu === roomId) {
            setActiveMenu(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuCoords({
                x: rect.right,
                y: rect.bottom
            });
            setActiveMenu(roomId);
        }
    };

    // CHANGED: Now accepts the whole room object (id and name)
    const initiateDeleteRoom = (room) => {
        setRoomToDelete(room);
        setIsConfirmModalOpen(true);
        setActiveMenu(null);
    };

    const confirmDeleteRoom = async () => {
        if (!roomToDelete) return;

        setIsConfirmModalOpen(false);

        try {
            // CHANGED: Use roomToDelete.id for the database operation
            await deleteDoc(doc(db, "rooms", roomToDelete.id));
            
            setNotification(`Group "${roomToDelete.name}" successfully deleted.`);
            
            // CHANGED: Compare with roomToDelete.name for UI check
            if (currentChat === roomToDelete.name) {
                onSelectChat(null, "Select a chat to begin");
            }
        } catch (error) {
            console.error("Error deleting room:", error);
            if (error.code === 'permission-denied') {
                setNotification("Permission denied: You cannot delete this room.");
            } else {
                 setNotification("Failed to delete the room. Please try again.");
            }
        }
        
        setRoomToDelete(null);
    };

    return (
        <aside className="side-panel">
            {notification && (
                <Notification 
                    message={notification} 
                    onClose={() => setNotification('')} 
                />
            )}

            {isConfirmModalOpen && roomToDelete && (
                <ConfirmationModal
                    // CHANGED: Use roomToDelete.name for display
                    message={`Are you sure you want to delete the group "${roomToDelete.name}"? This will remove it for everyone.`}
                    onConfirm={confirmDeleteRoom}
                    onCancel={() => setIsConfirmModalOpen(false)}
                />
            )}
            
            {activeMenu && (
                <div 
                    className="room-menu-dropdown" 
                    style={{ 
                        top: `${menuCoords.y}px`, 
                        left: `${menuCoords.x}px`,
                    }}
                >
                    {/* The button now needs to find the room object to pass to initiateDeleteRoom */}
                    <button onClick={(e) => {
                        e.stopPropagation();
                        const room = rooms.find(r => r.id === activeMenu);
                        if (room) initiateDeleteRoom(room);
                    }}>
                        Delete Group
                    </button>
                </div>
            )}

            <div className="panel-header">
                <h3>Chats</h3>
                <button onClick={onCreateRoom} className="create-room-btn" title="Create New Room">
                    ➕
                </button>
            </div>
            <div className="list-container">
                <h4>Public Rooms</h4>
                <ul>
                    {rooms.map((room) => (
                        <li
                            key={room.id}
                            className={`room-item ${room.name === currentChat ? "active" : ""}`}
                            onClick={() => handleRoomSelect(room.name)}
                        >
                            <span className="room-name"># {room.name}</span>
                            <div className="room-options">
                                <button 
                                    // CHANGED: Use room.id for menu tracking instead of name
                                    className={`room-menu-btn ${activeMenu === room.id ? 'active' : ''}`}
                                    onClick={(e) => toggleMenu(e, room.id)}
                                >
                                    &#x22EE;
                                </button>
                            </div>
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