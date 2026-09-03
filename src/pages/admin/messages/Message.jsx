import React from 'react';
import { Link } from 'react-router-dom';

const Message = () => {
  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">Message</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Message
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="card shadow-sm border-0">
        <div className="card-body py-5 text-center text-muted">
          <i className="ti ti-message-dots fs-48 mb-3 d-block text-primary"></i>
          <h5 className="text-dark fw-bold mb-1">Message Management</h5>
          <p className="text-muted fs-13 mb-0">This page is currently being configured.</p>
        </div>
      </div>
    </div>
  );
};

export default Message;
