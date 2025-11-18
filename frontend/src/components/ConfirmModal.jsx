import React from 'react';
import Modal from './Modal';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Yes, Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "btn-danger",
  size = "small"
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const renderFooter = () => (
    <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '12px' }}>
      <button
        type="button"
        className="modal-btn modal-btn-secondary"
        onClick={handleCancel}
        style={{ minWidth: '100px' }}
      >
        {cancelText}
      </button>
      <button
        type="button"
        className={`modal-btn modal-btn-${confirmButtonClass}`}
        onClick={handleConfirm}
        style={{ minWidth: '130px' }}
      >
        {confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      closeOnOverlayClick={false}
      showCloseButton={true}
    >
      <div style={{ textAlign: 'center' }}>
        <div className="modal-body" style={{
          padding: '32px',
          textAlign: 'center',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '16px',
            lineHeight: '1.4'
          }}>
            {message}
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '32px'
          }}>
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={handleCancel}
              style={{ minWidth: '100px' }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`modal-btn modal-btn-${confirmButtonClass}`}
              onClick={handleConfirm}
              style={{ minWidth: '130px' }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
