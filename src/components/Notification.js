import React, { useEffect } from 'react';
import '../styles/Notification.css';

export const Notification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // The notification will disappear after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="notification-container">
      <div className="notification-message">{message}</div>
    </div>
  );
};