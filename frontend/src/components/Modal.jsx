import React, { useEffect, useRef } from "react";
import "./Modal.css";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  closeOnOverlayClick = true,
  showCloseButton = true,
  ariaLabel,
  ariaDescribedBy
}) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle keyboard navigation and accessibility
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore later
      previousActiveElement.current = document.activeElement;

      // Focus the modal when it opens
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // Add body scroll lock
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      // Handle tab navigation within modal
      const handleTabNavigation = (e) => {
        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabNavigation);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', handleTabNavigation);
        document.body.style.overflow = 'unset';

        // Restore focus to the previously focused element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  // Determine modal size class
  const sizeClass = size === 'large' ? 'modal-large' :
                   size === 'small' ? 'modal-small' : 'modal-medium';

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={ariaDescribedBy}
    >
      <div
        className={`modal-content ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex="-1"
        aria-label={ariaLabel || title}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          {showCloseButton && (
            <button
              className="modal-close-button"
              onClick={handleClose}
              aria-label="Close modal"
              type="button"
            >
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
