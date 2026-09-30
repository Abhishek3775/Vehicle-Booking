import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import Modal from './Modal';
import { LoadingSpinner } from './LoadingStates';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary', // 'primary' | 'danger'
  isDanger = false,
  loading = false,
  children,
}) => {
  const handleCancel = onCancel || onClose;
  const isDestructive = isDanger || confirmVariant === 'danger';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isDestructive && <FiAlertTriangle style={{ color: 'var(--danger)' }} />}
          <span>{title}</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
          >
            {loading ? <LoadingSpinner size={16} color="#fff" /> : confirmText}
          </button>
        </div>
      }
    >
      {children}
    </Modal>
  );
};

export default ConfirmModal;
