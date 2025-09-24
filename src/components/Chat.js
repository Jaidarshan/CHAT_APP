// src/components/Chat.js

import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase-config";
import {
  collection,
  addDoc,
  where,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { format } from "date-fns";
import "../styles/Chat.css";

export const Chat = ({ room, header }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesRef = collection(db, "messages");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!room) return;
    const queryMessages = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );

    const unsubscribe = onSnapshot(queryMessages, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [room, messagesRef]); // Re-run effect when the room changes

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newMessage.trim() === "") return;

    await addDoc(messagesRef, {
      text: newMessage,
      createdAt: serverTimestamp(),
      user: auth.currentUser.displayName,
      uid: auth.currentUser.uid,
      room: room,
    });
    setNewMessage("");
  };

  const formatDate = (timestamp) => timestamp ? format(timestamp.toDate(), "MMMM dd, yyyy") : "";
  const formatTime = (timestamp) => timestamp ? timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>{header}</h2>
      </div>
      
      <div className="messages-list">
        {Object.keys(groupedMessages).map(date => (
          <React.Fragment key={date}>
            <div className="date-separator"><span>{date}</span></div>
            {groupedMessages[date].map((message) => (
              <div key={message.id} className={`message ${message.uid === auth.currentUser.uid ? "sent" : "received"}`}>
                <div className="message-bubble">
                  {message.uid !== auth.currentUser.uid && !room.includes('_') && (
                     <div className="user-name">{message.user}</div>
                  )}
                  <div className="message-text">{message.text}</div>
                  <div className="message-time">{formatTime(message.createdAt)}</div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="new-message-form">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="new-message-input"
          placeholder="Type your message..."
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
};