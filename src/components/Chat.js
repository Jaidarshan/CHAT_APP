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
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import "../styles/Chat.css";

export const Chat = ({ room, header }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesRef = collection(db, "messages");
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
  if (!room) return;

  setShouldAutoScroll(true);
  setHasUnreadMessages(false);

  let unsubscribe;

  const subscribeToMessages = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userMetadataRef = doc(db, "userChatMetadata", currentUser.uid);
    const userMetadataSnap = await getDoc(userMetadataRef);
    const userMetadata = userMetadataSnap.data();
    const clearTimestamp = userMetadata?.clearedTimestamps?.[room] || null;

    let messagesQuery = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );

    if (clearTimestamp) {
      messagesQuery = query(
        messagesRef,
        where("room", "==", room),
        where("createdAt", ">", clearTimestamp),
        orderBy("createdAt")
      );
    }

    unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setMessages(fetchedMessages);
    });
  };

  subscribeToMessages();

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [room, messagesRef]);

  useEffect(() => {
    const isNearBottom = () => {
      if (!messagesListRef.current) return true;
      const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom < 100;
    };

    if (shouldAutoScroll && (isNearBottom() || messages.length === 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasUnreadMessages(false);
    } else if (!shouldAutoScroll && !isNearBottom()) {
      setHasUnreadMessages(true);
    }
  }, [messages, shouldAutoScroll]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newMessage.trim() === "") return;

    setShouldAutoScroll(true);

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

  const handleScroll = () => {
    if (!messagesListRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    const nearBottom = distanceFromBottom < 100;
    setShouldAutoScroll(nearBottom);

    if (nearBottom) {
      setHasUnreadMessages(false);
    }
  };

  const scrollToBottom = () => {
    setShouldAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasUnreadMessages(false);
  };

  useEffect(() => {
    const messagesContainer = messagesListRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
      return () => messagesContainer.removeEventListener('scroll', handleScroll);
    }
  }, [room]);
  
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const handleClearChat = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to clear the chat history? This cannot be undone."
    );

    if (isConfirmed) {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userMetadataRef = doc(db, "userChatMetadata", currentUser.uid);

      try {
        await setDoc(
          userMetadataRef,
          {
            clearedTimestamps: {
              [room]: serverTimestamp(),
            },
          },
          { merge: true } 
        );
        alert("Chat history has been cleared for you.");
      } catch (error) {
        console.error("Error clearing chat history: ", error);
        alert("Failed to clear chat history. Please try again.");
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>{header}</h2>
        <button onClick={handleClearChat} className="clear-chat-btn" title="Clear Chat History">
          Clear
        </button>
      </div>
      
      <div className="messages-list" ref={messagesListRef}>
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

      {hasUnreadMessages && (
        <button 
          className="scroll-to-bottom-btn" 
          onClick={scrollToBottom}
          title="Scroll to bottom"
        >
          ↓ New messages
        </button>
      )}

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