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
  deleteDoc,
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
  
  // This ref tracks if the user has manually scrolled up
  const userHasScrolledUp = useRef(false);

  // This effect handles fetching messages when the room changes
  useEffect(() => {
    if (!room) return;

    // Reset scroll state for new chat room
    userHasScrolledUp.current = false;
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
        const isInitialLoad = messages.length === 0;
        const fetchedMessages = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setMessages(fetchedMessages);

        // Show "new messages" button only if new messages arrive AND user has scrolled up
        const hasNewMessages = snapshot.docChanges().some(change => change.type === 'added');
        if (userHasScrolledUp.current && hasNewMessages && !isInitialLoad) {
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
    if (list && !userHasScrolledUp.current) {
        // By directly setting scrollTop, we avoid fighting with the user's scroll
        list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newMessage.trim() === "") return;

    userHasScrolledUp.current = false;
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

  const handleScroll = () => {
    const list = messagesListRef.current;
    if (!list) return;

    const { scrollTop, scrollHeight, clientHeight } = list;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 5; // Using a small buffer

    // If the user scrolls up, set the ref to true.
    // It will only be reset by sending a message or clicking the "scroll to bottom" button.
    if (!isAtBottom) {
        userHasScrolledUp.current = true;
    } else {
        // If user scrolls back to the bottom, hide the notification
        userHasScrolledUp.current = false;
        setHasUnreadMessages(false);
    }
  };

  const scrollToBottom = () => {
    userHasScrolledUp.current = false;
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
      await deleteDoc(messageRef);
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
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveMessageMenu({
      id: messageId,
      x: rect.left - 150,
      y: rect.top + window.scrollY,
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
        <div style={{ position: 'absolute', top: activeMessageMenu.y, left: activeMessageMenu.x, zIndex: 101 }}>
          <MessageMenu
            onDelete={() => requestDeleteMessage(activeMessageMenu.id)}
            onClose={() => setActiveMessageMenu(null)}
          />
        </div>
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
      
      <div className="messages-list" ref={messagesListRef} onScroll={handleScroll}>
        {Object.keys(groupedMessages).map(date => (
          <React.Fragment key={date}>
            <div className="date-separator"><span>{date}</span></div>
            {groupedMessages[date].map((message) => (
              <div key={message.id} className={`message ${message.uid === auth.currentUser.uid ? "sent" : "received"}`}>
                {message.uid === auth.currentUser.uid && (
                  <button className="message-options-btn" onClick={(e) => handleMessageMenu(e, message.id)}>&#x22EE;</button>
                )}
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