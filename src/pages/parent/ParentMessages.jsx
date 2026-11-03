import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ChatBox from '../../components/chat/ChatBox';

const ParentMessages = () => {
  const { parent } = useSelector((state) => state.parentAuth);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1 text-dark fw-bold">Teacher Chat</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/parent/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Messages
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <ChatBox
        currentUserRole="parent"
        currentUserId={parent?.id}
        title="Chat with Teachers"
      />
    </div>
  );
};

export default ParentMessages;
