import React, { useState, useEffect, useRef } from 'react';
import { subscribeConfirmModal } from '../../utils/confirmModal';

const VARIANT_CONFIG = {
  danger: {
    btnClass: 'btn-danger',
    icon: 'ti-alert-triangle text-danger',
    badgeBg: 'bg-danger-subtle',
  },
  warning: {
    btnClass: 'btn-warning text-white',
    icon: 'ti-alert-circle text-warning',
    badgeBg: 'bg-warning-subtle',
  },
  primary: {
    btnClass: 'btn-primary',
    icon: 'ti-info-circle text-primary',
    badgeBg: 'bg-primary-subtle',
  },
  success: {
    btnClass: 'btn-success',
    icon: 'ti-circle-check text-success',
    badgeBg: 'bg-success-subtle',
  },
};

const GlobalConfirmModal = () => {
  const [modalState, setModalState] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    return subscribeConfirmModal((request) => {
      setModalState(request);
      setInputValue(request?.defaultValue || '');
    });
  }, []);

  useEffect(() => {
    if (modalState?.mode === 'prompt') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modalState]);

  useEffect(() => {
    if (!modalState) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        modalState.resolve(modalState.mode === 'prompt' ? null : false);
        setModalState(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState]);

  if (!modalState) return null;

  const vConfig = VARIANT_CONFIG[modalState.variant] || VARIANT_CONFIG.danger;

  const handleCancel = () => {
    modalState.resolve(modalState.mode === 'prompt' ? null : false);
    setModalState(null);
  };

  const handleConfirm = (e) => {
    if (e) e.preventDefault();
    if (modalState.mode === 'prompt') {
      modalState.resolve(inputValue.trim() || null);
    } else {
      modalState.resolve(true);
    }
    setModalState(null);
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 2060 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
        <div className="modal-content border-0 shadow-lg rounded-3">
          <div className="modal-header border-bottom py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <span
                className={`d-inline-flex align-items-center justify-content-center rounded-circle ${vConfig.badgeBg}`}
                style={{ width: '32px', height: '32px' }}
              >
                <i className={`ti ${vConfig.icon} fs-18`}></i>
              </span>
              <h5 className="modal-title fw-bold text-dark mb-0 fs-16">
                {modalState.title}
              </h5>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={handleCancel}
              aria-label="Close"
            ></button>
          </div>

          <form onSubmit={handleConfirm}>
            <div className="modal-body px-4 py-3">
              {modalState.message && (
                <p
                  className="text-dark mb-0 fs-14"
                  style={{ whiteSpace: 'pre-line', lineHeight: '1.55' }}
                >
                  {modalState.message}
                </p>
              )}

              {modalState.mode === 'prompt' && (
                <div className="mt-3">
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control"
                    placeholder={modalState.placeholder || ''}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer border-top px-4 py-2.5 gap-2">
              <button
                type="button"
                className="btn btn-light border me-2"
                onClick={handleCancel}
              >
                {modalState.cancelText || 'Cancel'}
              </button>
              <button type="submit" className={`btn ${vConfig.btnClass}`}>
                {modalState.confirmText || 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GlobalConfirmModal;
