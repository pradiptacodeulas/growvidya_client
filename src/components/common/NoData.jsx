import React from 'react';

const NoData = ({
  title = 'No Data Found',
  message = 'No records found matching your criteria.',
  image = '/vidya_assets/images/no_data.png',
  imageHeight = 120,
  action = null,
  className = '',
  py = 4,
}) => {
  return (
    <div className={`d-flex flex-column align-items-center justify-content-center text-center py-${py} ${className}`}>
      <img
        src={image}
        alt={title || 'No data'}
        className="img-fluid mb-2"
        style={{ maxHeight: `${imageHeight}px`, width: 'auto', objectFit: 'contain' }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
      {title && <h6 className="fw-bold text-dark mb-1">{title}</h6>}
      {message && <p className="text-muted fs-13 mb-0" style={{ maxWidth: '420px' }}>{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};

export default NoData;
