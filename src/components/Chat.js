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

export const Chat = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesRef = collection(db, "messages");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const queryMessages = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );
    const unsuscribe = onSnapshot(queryMessages, (snapshot) => {
      let messages = [];
      snapshot.forEach((doc) => {
        messages.push({ ...doc.data(), id: doc.id });
      });
      setMessages(messages);
    });

    return () => unsuscribe();
  }, [room]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const isAtBottom =
      Math.abs(
        messagesContainer.scrollHeight -
        messagesContainer.scrollTop -
        messagesContainer.clientHeight
      ) < 5;

    setShowScrollButton(!isAtBottom);
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newMessage === "") return;
    await addDoc(messagesRef, {
      text: newMessage,
      createdAt: serverTimestamp(),
      user: auth.currentUser.displayName,
      room,
    });

    setNewMessage("");
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return format(date, "MMMM dd, yyyy");
  };

  const groupMessagesByDate = (messages) => {
    return messages.reduce((groups, message) => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="chat-app">
      <div className="room-header">
        <h2>Room: {room.toUpperCase()}</h2>
      </div>
      <div
        className="messages"
        onScroll={handleScroll}
        ref={messagesContainerRef}
      >
        {Object.keys(groupedMessages).map((date) => (
          <div key={date}>
            {/* Date Header */}
            <center><div className="date-header">{date}</div></center>
            {/* Messages for this Date */}
            {groupedMessages[date].map((message) => (
              <div
                key={message.id}
                className={`message ${message.user === auth.currentUser.displayName
                  ? "current-user"
                  : "other-user"
                  }`}
              >
                <span className="user">{message.user}:</span>
                <span>{message.text}</span>
                <span className="timestamp">
                  {formatTimestamp(message.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button
          className="scroll-to-bottom-button"
          onClick={scrollToBottom}
        >
          <img
            src="/downarraowicon.jpg"
            className="down-arrow"
            alt="Scroll Down"
          />
        </button>
      )}
      <form onSubmit={handleSubmit} className="new-message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          className="new-message-input"
          placeholder="Type your message here..."
        />
        <button type="submit" className="send-button">
          <img src="/send_icon_white.png" className="send-icon" />
        </button>
      </form>
    </div>
  );
};
