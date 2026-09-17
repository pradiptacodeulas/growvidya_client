import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearAllUnread } from '../../store/slices/messageNotificationSlice';
import { resolveImageUrl } from '../../utils/url.util';

/**
 * Modern unified Navbar Notification Dropdown
 * Combines School Notices and Direct Chat Message Notifications with tabbed switching.
 */
const NavbarNotificationDropdown = ({
  messagesPath = '/admin/message',
  noticesPath = '/admin/announcement/notice',
  notices = [],
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const notificationRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [hasNoticeUnread, setHasNoticeUnread] = useState(true);

  // Read message notification state from Redux
  const { unreadCount: messageUnreadCount, unreadConversations } = useSelector(
    (state) => state.messageNotification || { unreadCount: 0, unreadConversations: [] }
  );

  // Default active tab
  const [activeTab, setActiveTab] = useState(() => (messageUnreadCount > 0 ? 'messages' : 'notices'));

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next && messageUnreadCount > 0) {
        setActiveTab('messages');
      }
      return next;
    });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenConversation = (contact) => {
    setIsOpen(false);
    if (contact?.id && contact?.role) {
      navigate(`${messagesPath}?contactId=${contact.id}&contactRole=${contact.role}`);
    } else {
      navigate(messagesPath);
    }
  };

  const handleMarkAllRead = () => {
    if (activeTab === 'messages') {
      dispatch(clearAllUnread());
    } else {
      setHasNoticeUnread(false);
    }
  };

  const formatMessageTime = (timeStr) => {
    if (!timeStr) return 'Recent';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return timeStr;
    }
  };

  const hasAnyUnread = messageUnreadCount > 0 || hasNoticeUnread;

  return (
    <div
      className={`pe-1 position-relative ${isOpen ? 'notification-item-show' : ''}`}
      id="notification_item"
      ref={notificationRef}
    >
      {/* Bell Trigger Button */}
      <button
        type="button"
        className="btn btn-outline-light bg-white btn-icon position-relative me-1"
        id="notification_popup"
        onClick={toggleDropdown}
        title="Notifications"
        aria-expanded={isOpen}
      >
        <i className="ti ti-bell"></i>
        {messageUnreadCount > 0 ? (
          <span
            className="badge rounded-pill bg-danger position-absolute text-white fw-bold shadow-xs"
            style={{
              fontSize: '10px',
              minWidth: '17px',
              height: '17px',
              top: '2px',
              right: '2px',
              padding: messageUnreadCount > 9 ? '0 4px' : '0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
          </span>
        ) : hasNoticeUnread && notices.length > 0 ? (
          <span className="notification-status-dot"></span>
        ) : null}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="dropdown-menu dropdown-menu-end notification-dropdown p-3 shadow-lg border show"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 'auto',
            minWidth: '340px',
            maxWidth: 'calc(100vw - 30px)',
            width: '360px',
            display: 'block',
            zIndex: 1050,
          }}
        >
          {/* Header Title & Mark All Read */}
          <div className="d-flex align-items-center justify-content-between pb-2 mb-2 border-bottom">
            <h5 className="notification-title mb-0 fs-15 fw-bold text-dark">
              Notifications
            </h5>
            {hasAnyUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="btn btn-link text-primary p-0 fs-12 text-decoration-none fw-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Segmented Tab Navigation */}
          <div className="p-1 bg-light rounded d-flex mb-3 gap-1">
            <button
              type="button"
              className={`btn btn-sm flex-fill fw-medium d-flex align-items-center justify-content-center gap-1 border-0 py-1 ${
                activeTab === 'messages' ? 'bg-white shadow-xs text-primary fw-bold' : 'text-muted'
              }`}
              onClick={() => setActiveTab('messages')}
            >
              <i className="ti ti-message-dots fs-14"></i>
              <span>Messages</span>
              {messageUnreadCount > 0 && (
                <span className="badge rounded-pill bg-danger text-white ms-1 px-1 py-0 fs-10">
                  {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`btn btn-sm flex-fill fw-medium d-flex align-items-center justify-content-center gap-1 border-0 py-1 ${
                activeTab === 'notices' ? 'bg-white shadow-xs text-primary fw-bold' : 'text-muted'
              }`}
              onClick={() => setActiveTab('notices')}
            >
              <i className="ti ti-speakerphone fs-14"></i>
              <span>Notices</span>
              {notices.length > 0 && (
                <span className="badge rounded-pill bg-light-300 text-dark ms-1 px-1 py-0 fs-10">
                  {notices.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="noti-content" style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {activeTab === 'messages' ? (
              /* ================= MESSAGES TAB ================= */
              unreadConversations.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {unreadConversations.map((contact) => (
                    <div
                      key={`${contact.role}_${contact.id}`}
                      className="p-2 rounded border bg-light-300 transition-all hover-bg cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenConversation(contact)}
                    >
                      <div className="d-flex align-items-center gap-2">
                        {/* Avatar */}
                        <div className="position-relative flex-shrink-0">
                          {contact.picture ? (
                            <img
                              src={resolveImageUrl(contact.picture)}
                              alt={contact.name}
                              className="rounded-circle border"
                              style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span
                            className="avatar avatar-sm bg-primary-transparent text-primary rounded-circle fw-bold d-flex align-items-center justify-content-center"
                            style={{
                              width: '36px',
                              height: '36px',
                              fontSize: '13px',
                              display: contact.picture ? 'none' : 'flex',
                            }}
                          >
                            {(contact.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="overflow-hidden flex-fill">
                          <div className="d-flex align-items-center justify-content-between mb-0">
                            <span className="fs-13 fw-bold text-dark text-truncate">
                              {contact.name}
                            </span>
                            <span className="fs-10 text-muted flex-shrink-0 ms-1">
                              {formatMessageTime(contact.last_message_time)}
                            </span>
                          </div>

                          <div className="d-flex align-items-center justify-content-between mt-1">
                            <p className="mb-0 fs-12 text-muted text-truncate" style={{ maxWidth: '190px' }}>
                              {contact.last_message || 'New message'}
                            </p>
                            {contact.unread_count > 0 && (
                              <span
                                className="badge rounded-pill bg-danger text-white fw-bold ms-1 flex-shrink-0"
                                style={{ fontSize: '10px', padding: '2px 6px' }}
                              >
                                {contact.unread_count > 99 ? '99+' : contact.unread_count} new
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div
                    className="avatar avatar-md bg-light-300 rounded-circle text-primary mx-auto mb-2 d-flex align-items-center justify-content-center"
                    style={{ width: '48px', height: '48px' }}
                  >
                    <i className="ti ti-message-check fs-24"></i>
                  </div>
                  <p className="fs-13 text-muted fw-semibold mb-3">No unread messages</p>
                  <Link
                    to={messagesPath}
                    className="btn btn-sm btn-outline-primary px-3"
                    onClick={() => setIsOpen(false)}
                  >
                    Start a Chat
                  </Link>
                </div>
              )
            ) : (
              /* ================= NOTICES TAB ================= */
              notices.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {notices.slice(0, 5).map((notice, idx) => (
                    <div
                      key={notice.id || idx}
                      className="p-2 rounded border-bottom bg-light-300 transition-all hover-bg"
                    >
                      <div className="d-flex align-items-start gap-2">
                        <span className="avatar avatar-sm bg-primary-transparent text-primary rounded-circle flex-shrink-0 mt-1 d-flex align-items-center justify-content-center">
                          <i className="ti ti-note fs-14"></i>
                        </span>
                        <div className="overflow-hidden flex-fill">
                          <p className="mb-1 fs-13 fw-semibold text-dark text-truncate">
                            {notice.title}
                          </p>
                          {notice.message && (
                            <p className="mb-1 fs-12 text-muted text-truncate">
                              {notice.message}
                            </p>
                          )}
                          <span className="fs-11 text-muted d-block">
                            <i className="ti ti-calendar me-1"></i>
                            {notice.publish_on || notice.notice_date || 'Recent Notice'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div
                    className="avatar avatar-md bg-light-300 rounded-circle text-muted mx-auto mb-2 d-flex align-items-center justify-content-center"
                    style={{ width: '48px', height: '48px' }}
                  >
                    <i className="ti ti-bell-off fs-24"></i>
                  </div>
                  <p className="fs-13 text-muted fw-semibold mb-0">No new notices at this moment</p>
                </div>
              )
            )}
          </div>

          {/* Footer Action Button */}
          <div className="pt-2 mt-2 border-top">
            {activeTab === 'messages' ? (
              <Link
                to={messagesPath}
                className="btn btn-primary btn-sm w-100 fw-medium d-flex align-items-center justify-content-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                <i className="ti ti-messages fs-14"></i>
                <span>Open All Messages</span>
              </Link>
            ) : (
              <Link
                to={noticesPath}
                className="btn btn-primary btn-sm w-100 fw-medium d-flex align-items-center justify-content-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                <i className="ti ti-list-details fs-14"></i>
                <span>View All Notices</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavbarNotificationDropdown;
