import React from 'react';

const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center py-5 my-5" style={{ minHeight: '400px' }}>
    <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

export default PageLoader;
