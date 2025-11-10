import React from 'react';
import '../styles/MessageMenu.css';

export const MessageMenu = ({ onDelete, onClose, coordinates }) => {
  return (
    <div className="message-menu-backdrop" onClick={onClose}>
      <div 
        className="message-menu" 
        style={{
          top: `${coordinates?.y}px`,
          left: `${coordinates?.x}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ul>
          <li onClick={onDelete}>Delete Message</li>
        </ul>
      </div>
    </div>
  );
};