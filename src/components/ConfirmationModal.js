import React from 'react';
import '../styles/ConfirmationModal.css';

export const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button onClick={onConfirm} className="confirm-btn">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};