import React from 'react';
import logoDark from '../../assets/logo_dark.png';

const LoadingScreen = ({ message = 'Loading, please wait...' }) => {
  return (
    <div className="main-wrapper bg-light min-vh-100 d-flex flex-column justify-content-center align-items-center py-4">
      <div className="text-center">
        <div className="mb-3">
          <img
            src={logoDark}
            alt="Growvidya Logo"
            className="img-fluid"
            style={{
              maxHeight: '90px',
              maxWidth: '220px',
              objectFit: 'contain',
            }}
          />
        </div>
        <div className="d-flex justify-content-center align-items-center my-3">
          <div
            className="spinner-border text-primary"
            role="status"
            style={{ width: '2.5rem', height: '2.5rem', borderWidth: '0.25em' }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
        <p className="text-muted fs-14 fw-medium mb-0">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
