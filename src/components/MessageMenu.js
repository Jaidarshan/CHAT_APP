import React from 'react';
import '../styles/MessageMenu.css';

export const MessageMenu = ({ onDelete, onClose }) => {
  // This setup makes it easy to add more options like "Edit" or "Reply" later
  return (
    <div className="message-menu-backdrop" onClick={onClose}>
      <div className="message-menu">
        <ul>
          <li onClick={onDelete}>Delete Message</li>
        </ul>
      </div>
    </div>
  );
};