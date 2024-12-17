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
  getDocs,
} from "firebase/firestore";
import { format } from "date-fns";
import "../styles/Chat.css";

export const Chat = ({ room }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [rooms, setRooms] = useState([]); // List of all available rooms
  const [currentRoom, setCurrentRoom] = useState(room || ""); // Currently selected room
  const [isPanelOpen, setIsPanelOpen] = useState(false); // State for the sliding panel

  const messagesRef = collection(db, "messages");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Fetch available rooms on component mount and listen for updates
  useEffect(() => {
    const fetchRooms = async () => {
      const messagesSnapshot = await getDocs(messagesRef);
      const roomSet = new Set();
      messagesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.room) {
          roomSet.add(data.room);
        }
      });
      setRooms([...roomSet]); // Convert Set to Array
    };

    fetchRooms();

    // Listen for new rooms in real-time
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const roomSet = new Set();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.room) {
          roomSet.add(data.room);
        }
      });
      setRooms([...roomSet]); // Update rooms list
    });

    return () => unsubscribe();
  }, []);

  // Fetch messages for the selected room
  useEffect(() => {
    if (!currentRoom) return;

    const queryMessages = query(
      messagesRef,
      where("room", "==", currentRoom),
      orderBy("createdAt")
    );

    const unsubscribe = onSnapshot(queryMessages, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [currentRoom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle sending a new message
  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedMessage = newMessage.trim();

    if (!trimmedMessage) {
      alert("Message cannot be empty!");
      return;
    }

    await addDoc(messagesRef, {
      text: trimmedMessage,
      createdAt: serverTimestamp(),
      user: auth.currentUser.displayName,
      room: currentRoom,
    });

    setNewMessage("");
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format date for grouping messages
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return format(date, "MMMM dd, yyyy");
  };

  // Group messages by date
  const groupMessagesByDate = (messages) =>
    messages.reduce((groups, message) => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="chat-app">
      {/* Sliding Panel */}
      <div className={`room-panel ${isPanelOpen ? "open" : ""}`}>
        <div className="close-panel-button" onClick={() => setIsPanelOpen(false)}>
          X
        </div>
        <div className="room-list">
          <h3>Available Rooms</h3>
          <ul>
            {rooms.map((roomName) => (
              <li
                key={roomName}
                className={roomName === currentRoom ? "active-room" : ""}
                onClick={() => {
                  setCurrentRoom(roomName);
                  setIsPanelOpen(false); // Close the panel after selecting a room
                }}
              >
                {roomName}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Room Header */}
      <div className="room-header">
        <div className="room-toggle-container">
          {/* Button to open the sliding panel */}
          {!isPanelOpen && (
            <button
              className="toggle-panel-button"
              onClick={() => setIsPanelOpen(true)}
            >
              <img src="/menu-bar.jpg" alt="Menu bar" width='32px'/>
            </button>
          )}
        </div>
        <h2>Room: {currentRoom.toUpperCase()}</h2>
      </div>

      {/* Messages Container */}
      <div
        className="messages"
        ref={messagesContainerRef}
        onScroll={() =>
          setShowScrollButton(
            messagesContainerRef.current.scrollHeight - 
              messagesContainerRef.current.scrollTop > 
              messagesContainerRef.current.clientHeight + 10
          )
        }
      >
        {Object.keys(groupedMessages).map((date) => (
          <div key={date}>
            {/* Date Header */}
            <center>
              <div className="date-header">{date}</div>
            </center>

            {/* Messages for the Date */}
            {groupedMessages[date].map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.user === auth.currentUser.displayName
                    ? "current-user"
                    : "other-user"
                }`}
              >
                <div className="message-header">
                  <span className="user">{message.user}</span>
                </div>
                <div className="message-text">{message.text}</div>
                <span className="timestamp">
                  {formatTimestamp(message.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-Bottom Button */}
      {showScrollButton && (
        <button
          className="scroll-to-bottom-button"
          onClick={scrollToBottom}
        >
          <img src="/downarraowicon.jpg" alt="scroll down" width='24px'/>
        </button>
      )}

      {/* New Message Form */}
      <form onSubmit={handleSubmit} className="new-message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(event) => setNewMessage(event.target.value)}
          className="new-message-input"
          placeholder="Type your message here..."
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};
