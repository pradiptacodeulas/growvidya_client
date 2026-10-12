import React from 'react';
import noDataDefault from '../../assets/no_data.png';

const NoData = ({
  title,
  message,
  image = noDataDefault,
  imageHeight = 120,
  action = null,
  className = '',
  py = 4,
}) => {
  // Resolve exactly ONE clean display message across all portals
  let displayText = 'No Data Found';

  const cleanTitle = typeof title === 'string' ? title.trim() : title;
  const cleanMessage = typeof message === 'string' ? message.trim() : message;

  if (cleanTitle && cleanMessage) {
    if (cleanMessage === 'No records found matching your criteria.' || cleanMessage === '') {
      displayText = cleanTitle;
    } else if (cleanTitle === 'No Data Found') {
      displayText = cleanMessage;
    } else {
      // Pick the more specific one
      displayText = cleanMessage.length >= cleanTitle.length ? cleanMessage : cleanTitle;
    }
  } else if (cleanTitle) {
    displayText = cleanTitle;
  } else if (cleanMessage) {
    displayText = cleanMessage;
  }

  return (
    <div className={`d-flex flex-column align-items-center justify-content-center text-center py-${py} ${className}`}>
      <img
        src={image}
        alt={typeof displayText === 'string' ? displayText : 'No data'}
        className="img-fluid mb-2"
        style={{ maxHeight: `${imageHeight}px`, width: 'auto', objectFit: 'contain' }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      <h6 className="fw-semibold text-muted mb-0 fs-14">{displayText}</h6>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};

export default NoData;
