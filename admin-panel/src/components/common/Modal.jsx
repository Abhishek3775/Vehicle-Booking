import React, { useEffect } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { LoadingSpinner } from './LoadingStates';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  size = 'medium', // 'medium' | 'large'
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal-container ${size === 'large' ? 'large' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close modal"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
