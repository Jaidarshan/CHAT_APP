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

  // Reset auto-scroll when changing rooms
  setShouldAutoScroll(true);
  setHasUnreadMessages(false);

  let unsubscribe;

  const subscribeToMessages = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // 1. Get the user's "cleared at" timestamp for this specific room
    const userMetadataRef = doc(db, "userChatMetadata", currentUser.uid);
    const userMetadataSnap = await getDoc(userMetadataRef);
    const userMetadata = userMetadataSnap.data();
    const clearTimestamp = userMetadata?.clearedTimestamps?.[room] || null;

    // 2. Build the query for messages
    let messagesQuery = query(
      messagesRef,
      where("room", "==", room),
      orderBy("createdAt")
    );

    // 3. If a clear timestamp exists, only fetch messages created AFTER it
    if (clearTimestamp) {
      messagesQuery = query(
        messagesRef,
        where("room", "==", room),
        where("createdAt", ">", clearTimestamp),
        orderBy("createdAt")
      );
    }
    
    // 4. Attach the listener
    unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setMessages(fetchedMessages);
    });
  };

  subscribeToMessages();

  // Cleanup function to detach the listener when the component unmounts or room changes
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [room, messagesRef]);

  useEffect(() => {
    // Check if user is near the bottom before auto-scrolling
    const isNearBottom = () => {
      if (!messagesListRef.current) return true;
      const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom < 100; // Within 100px of bottom
    };

    // Only auto-scroll if user is near the bottom or it's the first load
    if (shouldAutoScroll && (isNearBottom() || messages.length === 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasUnreadMessages(false);
    } else if (!shouldAutoScroll && !isNearBottom()) {
      // Show unread indicator if new messages arrive while user is scrolled up
      setHasUnreadMessages(true);
    }
  }, [messages, shouldAutoScroll]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newMessage.trim() === "") return;

    // When user sends a message, always scroll to bottom
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
  
  // Handle scroll events to determine if user is scrolling up
  const handleScroll = () => {
    if (!messagesListRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // If user scrolled away from bottom, disable auto-scroll
    // If user scrolled back to near bottom, enable auto-scroll
    const nearBottom = distanceFromBottom < 100;
    setShouldAutoScroll(nearBottom);
    
    // Clear unread indicator when user scrolls to bottom
    if (nearBottom) {
      setHasUnreadMessages(false);
    }
  };

  // Scroll to bottom when "scroll to bottom" button is clicked
  const scrollToBottom = () => {
    setShouldAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasUnreadMessages(false);
  };

  // Add scroll event listener when component mounts/room changes
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
    // Confirm with the user before clearing
    const isConfirmed = window.confirm(
      "Are you sure you want to clear the chat history? This cannot be undone."
    );

    if (isConfirmed) {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userMetadataRef = doc(db, "userChatMetadata", currentUser.uid);

      try {
        // We use setDoc with merge: true to avoid overwriting other room timestamps.
        // This will create the document if it doesn't exist, or update it if it does.
        await setDoc(
          userMetadataRef,
          {
            clearedTimestamps: {
              [room]: serverTimestamp(), // Using computed property name for the room ID
            },
          },
          { merge: true } // IMPORTANT: This merges the new data with existing data
        );
        // After clearing, the useEffect fetching messages will automatically refetch an empty list.
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

      {/* Scroll to bottom button */}
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