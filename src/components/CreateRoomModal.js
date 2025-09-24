// src/components/CreateRoomModal.js

import React, { useState } from 'react';
import { db, auth } from '../firebase-config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import '../styles/CreateRoomModal.css';

export const CreateRoomModal = ({ onClose, onRoomCreated }) => {
    const [roomName, setRoomName] = useState("");
    const [error, setError] = useState("");

    const handleCreate = async (e) => {
        e.preventDefault();
        const trimmedName = roomName.trim();
        if (!trimmedName) {
            setError("Room name cannot be empty!");
            return;
        }

        const roomRef = doc(db, "rooms", trimmedName);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
            setError("A room with this name already exists.");
        } else {
            await setDoc(roomRef, {
                name: trimmedName,
                createdAt: serverTimestamp(),
                creator: auth.currentUser.displayName,
            });
            onRoomCreated(trimmedName); // Notify parent component
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>Create a New Room</h2>
                <form onSubmit={handleCreate}>
                    <input
                        type="text"
                        placeholder="Enter room name"
                        value={roomName}
                        onChange={(e) => {
                            setRoomName(e.target.value);
                            setError("");
                        }}
                        autoFocus
                    />
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
                        <button type="submit" className="create-btn">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
};