import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ChatBox from '../../../components/chat/ChatBox';

const Message = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">Real-Time Messaging</h3>
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

      <ChatBox
        currentUserRole="admin"
        currentUserId={user?.id}
        title="Admin & Teacher Chat"
      />
    </div>
  );
};

export default Message;
