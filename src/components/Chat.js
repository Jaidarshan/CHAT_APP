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
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { format } from "date-fns";
import { ConfirmationModal } from "./ConfirmationModal";
import { Notification } from "./Notification";
import { MessageMenu } from "./MessageMenu";
import "../styles/Chat.css";

export const Chat = ({ room, header }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesRef = collection(db, "messages");
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notification, setNotification] = useState('');

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    message: "",
    onConfirm: () => {},
  });

  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  


  // This effect handles fetching messages when the room changes
  useEffect(() => {
    if (!room) return;

    // Reset scroll state for new chat room
    setHasUnreadMessages(false);

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userMetadataRef = doc(db, "userChatMetadata", currentUser.uid);

    const getMessages = async () => {
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

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const list = messagesListRef.current;
        const isScrolledUp = list && (list.scrollHeight - list.scrollTop - list.clientHeight > 200);

        const fetchedMessages = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }))
        .filter((msg) => !msg.hiddenBy || !msg.hiddenBy.includes(currentUser.uid));
        setMessages(fetchedMessages);

        const hasNewMessages = snapshot.docChanges().some(change => change.type === 'added');
        if (isScrolledUp && hasNewMessages) {
            setHasUnreadMessages(true);
        }
      });

      return unsubscribe;
    };

    const unsubscribePromise = getMessages();

    return () => {
      unsubscribePromise.then((unsubscribe) => unsubscribe && unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, messagesRef]);

  // This effect handles the automatic scrolling
  useEffect(() => {
    const list = messagesListRef.current;
    if (list) {
      const { scrollTop, scrollHeight, clientHeight } = list;
      // Only auto-scroll if the user is near the bottom
      if (scrollHeight - scrollTop - clientHeight < 50) { // 200px buffer
        list.scrollTop = list.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newMessage.trim() === "") return;

    setHasUnreadMessages(false);

    await addDoc(messagesRef, {
      text: newMessage,
      createdAt: serverTimestamp(),
      user: auth.currentUser.displayName,
      uid: auth.currentUser.uid,
      room: room,
    });
    setNewMessage("");
  };

  const formatDate = (timestamp) =>
    timestamp ? format(timestamp.toDate(), "MMMM dd, yyyy") : "";
  const formatTime = (timestamp) =>
    timestamp
      ? timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";



  const scrollToBottom = () => {
    setHasUnreadMessages(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const requestDeleteMessage = (messageId) => {
    setActiveMessageMenu(null);
    setConfirmModalProps({
      message: "Are you sure you want to delete this message?",
      onConfirm: () => confirmDeleteMessage(messageId),
    });
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteMessage = async (messageId) => {
    try {
      const messageRef = doc(db, "messages", messageId);
      await updateDoc(messageRef, {
        hiddenBy: arrayUnion(auth.currentUser.uid)
      });
      setNotification("Message deleted successfully.");
    } catch (error) {
      console.error("Error deleting message: ", error);
      setNotification("Failed to delete the message.");
    }
    setIsConfirmModalOpen(false);
  };

  const handleClearChat = () => {
    setIsMenuOpen(false);
    setConfirmModalProps({
      message: "Are you sure you want to clear the chat history? This cannot be undone.",
      onConfirm: confirmClearChatAction,
    });
    setIsConfirmModalOpen(true);
  };

  const confirmClearChatAction = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const userMetadataRef = doc(db, "userChatMetadata", currentUser.uid);
    try {
      await setDoc(userMetadataRef, { clearedTimestamps: { [room]: serverTimestamp() } }, { merge: true });
      setNotification("Chat history has been cleared for you.");
    } catch (error) {
      console.error("Error clearing chat history: ", error);
      setNotification("Failed to clear chat history. Please try again.");
    }
    setIsConfirmModalOpen(false);
  };

  const handleMessageMenu = (event, messageId) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Calculate X position: shift it left by ~150px so it doesn't go off-screen on the right.
    // We use Math.max to ensure it doesn't go off-screen on the left either.
    const x = Math.max(10, rect.right - 150);

    setActiveMessageMenu({
      id: messageId,
      x: x,
      y: rect.bottom + 5, // Add a small 5px gap below the button
    });
  };

  return (
    <div className="chat-container">
      {notification && (
        <Notification message={notification} onClose={() => setNotification('')} />
      )}
      {isConfirmModalOpen && (
        <ConfirmationModal
          message={confirmModalProps.message}
          onConfirm={confirmModalProps.onConfirm}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      )}
      {activeMessageMenu && (
        <MessageMenu
          onDelete={() => requestDeleteMessage(activeMessageMenu.id)}
          onClose={() => setActiveMessageMenu(null)}
          coordinates={activeMessageMenu}
        />
      )}
      <div className="chat-header">
        <h2>{header}</h2>
        <div className="chat-options">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="options-btn">&#x22EE;</button>
          {isMenuOpen && (
            <div className="options-menu">
              <button onClick={handleClearChat} className="menu-item">Clear Chat</button>
            </div>
          )}
        </div>
      </div>
      
      <div className="messages-list" ref={messagesListRef}>
        {Object.keys(groupedMessages).map(date => (
          <React.Fragment key={date}>
            <div className="date-separator"><span>{date}</span></div>
            {groupedMessages[date].map((message) => (
              <div key={message.id} className={`message ${message.uid === auth.currentUser.uid ? "sent" : "received"}`}>
                <button className="message-options-btn" onClick={(e) => handleMessageMenu(e, message.id)}>&#x22EE;</button>
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
        <button className="scroll-to-bottom-btn" onClick={scrollToBottom} title="Scroll to bottom">↓ New messages</button>

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