import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../../../context/SubscriptionContext';

const formatDateShort = (val) => {
  if (!val) return '—';
  const str = String(val).slice(0, 10);
  const parts = str.split('-');
  if (parts.length === 3) {
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return str;
};

const Media = () => {
  const { storageQuota, subscription, loading, refreshSubscription } = useSubscription();

  const usedBytes = Number(storageQuota?.usedBytes) || 0;
  const totalAllowedBytes = Number(storageQuota?.totalAllowedBytes || storageQuota?.allocatedBytes) || 0;
  const usagePercent = Number(storageQuota?.usagePercent) || 0;
  const baseStorageGb = Number(storageQuota?.baseStorageGb ?? subscription?.included_storage_gb) || 0;
  const addonStorageGb = Number(storageQuota?.addonStorageGb) || 0;
  const totalAllowedGb = Number(storageQuota?.totalAllowedGb) || Number((baseStorageGb + addonStorageGb).toFixed(2));
  const usedFormatted = storageQuota?.usedFormatted || '0 MB';
  const allowedFormatted = storageQuota?.allowedFormatted || `${totalAllowedGb} GB`;
  const remainingFormatted =
    storageQuota?.remainingFormatted ||
    (totalAllowedBytes > usedBytes ? storageQuota?.allowedFormatted || '0 MB' : '0 MB');

  const categories = useMemo(
    () => (Array.isArray(storageQuota?.categoriesBreakdown) ? storageQuota.categoriesBreakdown : []),
    [storageQuota?.categoriesBreakdown]
  );

  const branchesUsage = useMemo(
    () => (Array.isArray(storageQuota?.branchesUsage) ? storageQuota.branchesUsage : []),
    [storageQuota?.branchesUsage]
  );

  const activeAddons = useMemo(
    () => (Array.isArray(storageQuota?.activeAddons) ? storageQuota.activeAddons : []),
    [storageQuota?.activeAddons]
  );

  const totalFilesCount = useMemo(
    () => categories.reduce((acc, item) => acc + (Number(item.fileCount) || 0), 0),
    [categories]
  );

  const progressVariant =
    usagePercent >= 90 ? 'bg-danger' : usagePercent >= 75 ? 'bg-warning' : 'bg-primary';

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-4 gap-2">
        <div className="my-auto mb-2 mb-md-0">
          <h3 className="page-title mb-1 text-dark fw-bold">Cloud Storage &amp; Media Usage</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Media &amp; Storage
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-light border text-dark d-inline-flex align-items-center"
            onClick={() => refreshSubscription && refreshSubscription()}
            disabled={loading}
          >
            <i className="ti ti-refresh me-2"></i>
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/subscription?tab=addons"
            className="btn btn-primary d-inline-flex align-items-center fw-semibold"
          >
            <i className="ti ti-cloud-plus me-2"></i>
            <span>Expand Cloud Storage</span>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card border-0 shadow-sm flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fs-12 fw-semibold text-uppercase">Total Allocated</span>
                <span className="avatar avatar-sm bg-primary-subtle text-primary rounded">
                  <i className="ti ti-cloud"></i>
                </span>
              </div>
              <h4 className="fw-bold text-dark mb-1">{loading && !storageQuota ? '...' : allowedFormatted}</h4>
              <p className="text-muted fs-12 mb-0">
                {baseStorageGb} GB Plan {addonStorageGb > 0 ? `+ ${addonStorageGb} GB Add-ons` : 'Included'}
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card border-0 shadow-sm flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fs-12 fw-semibold text-uppercase">Storage Used</span>
                <span className="avatar avatar-sm bg-info-subtle text-info rounded">
                  <i className="ti ti-database"></i>
                </span>
              </div>
              <h4 className="fw-bold text-dark mb-1">{loading && !storageQuota ? '...' : usedFormatted}</h4>
              <p className="text-muted fs-12 mb-0">
                {usagePercent}% utilized across {totalFilesCount.toLocaleString('en-IN')} files
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card border-0 shadow-sm flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fs-12 fw-semibold text-uppercase">Available Space</span>
                <span className="avatar avatar-sm bg-success-subtle text-success rounded">
                  <i className="ti ti-circle-check"></i>
                </span>
              </div>
              <h4 className="fw-bold text-dark mb-1">{loading && !storageQuota ? '...' : remainingFormatted}</h4>
              <p className="text-muted fs-12 mb-0">
                {usagePercent >= 100 ? 'Storage limit reached' : 'Ready for school uploads'}
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-sm-6 d-flex">
          <div className="card border-0 shadow-sm flex-fill">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted fs-12 fw-semibold text-uppercase">Storage Add-ons</span>
                <span className="avatar avatar-sm bg-warning-subtle text-warning rounded">
                  <i className="ti ti-packages"></i>
                </span>
              </div>
              <h4 className="fw-bold text-dark mb-1">{activeAddons.length}</h4>
              <p className="text-muted fs-12 mb-0">
                {activeAddons.length > 0 ? `+${addonStorageGb} GB active expansion` : 'No active storage add-ons'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quota Progress Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div>
              <h6 className="fw-bold text-dark mb-0">
                Institutional Cloud Storage Meter ({subscription?.plan_name || 'Current Plan'})
              </h6>
              <span className="text-muted fs-12">
                {storageQuota?.usedMBFormatted || usedFormatted} used out of {allowedFormatted}
              </span>
            </div>
            <span
              className={`badge rounded-pill px-3 py-1 fs-12 ${
                usagePercent >= 90
                  ? 'bg-danger-subtle text-danger'
                  : usagePercent >= 75
                  ? 'bg-warning-subtle text-warning-emphasis'
                  : 'bg-success-subtle text-success'
              }`}
            >
              {usagePercent}% Used
            </span>
          </div>

          <div className="progress" style={{ height: '10px' }}>
            <div
              className={`progress-bar ${progressVariant}`}
              role="progressbar"
              style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%` }}
              aria-valuenow={usagePercent}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>

          {usagePercent >= 85 && (
            <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3 mb-0 py-2 px-3 fs-13">
              <span>
                <i className="ti ti-alert-circle me-2"></i>
                Your institution is approaching its cloud storage limit. New document and study material uploads are blocked at 100%.
              </span>
              <Link to="/admin/subscription?tab=addons" className="btn btn-sm btn-warning fw-semibold">
                Buy Storage Pack
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Category Breakdown */}
        <div className="col-lg-7 d-flex">
          <div className="card border-0 shadow-sm flex-fill">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold text-dark mb-0">
                <i className="ti ti-folders text-primary me-2"></i>
                Media &amp; Document Category Breakdown
              </h6>
            </div>
            <div className="card-body p-0">
              {categories.length === 0 ? (
                <div className="py-5 text-center text-muted fs-13">
                  <i className="ti ti-photo-off fs-36 d-block mb-2 opacity-50"></i>
                  No uploaded media or document files recorded yet.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr className="fs-11 text-uppercase text-muted">
                        <th className="ps-4">Category</th>
                        <th className="text-end">Files</th>
                        <th className="text-end pe-4">Size</th>
                      </tr>
                    </thead>
                    <tbody className="fs-13">
                      {categories.map((cat) => (
                        <tr key={cat.category}>
                          <td className="ps-4 fw-semibold text-dark">{cat.label || cat.category}</td>
                          <td className="text-end text-muted">
                            {Number(cat.fileCount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="text-end pe-4 fw-bold text-dark">
                            {cat.formatted || cat.mbFormatted || '0 B'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campus Storage & Active Add-on Packs */}
        <div className="col-lg-5 d-flex flex-column gap-4">
          {branchesUsage.length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="fw-bold text-dark mb-0">
                  <i className="ti ti-building-community text-primary me-2"></i>
                  Storage by Campus
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr className="fs-11 text-uppercase text-muted">
                        <th className="ps-4">Campus</th>
                        <th className="text-end">Docs / LMS</th>
                        <th className="text-end pe-4">Used</th>
                      </tr>
                    </thead>
                    <tbody className="fs-13">
                      {branchesUsage.map((b) => (
                        <tr key={b.branch_id}>
                          <td className="ps-4">
                            <div className="fw-semibold text-dark">{b.branch_name}</div>
                            <span className="text-muted fs-11">{b.branch_code}</span>
                          </td>
                          <td className="text-end text-muted fs-12">
                            {(Number(b.documents_count) || 0) + (Number(b.materials_count) || 0)}
                          </td>
                          <td className="text-end pe-4 fw-bold text-dark">
                            {b.formatted || b.mbFormatted || '0 B'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm flex-fill">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
              <h6 className="fw-bold text-dark mb-0">
                <i className="ti ti-server-bolt text-primary me-2"></i>
                Active Storage Expansion Packs
              </h6>
              <Link to="/admin/subscription?tab=addons" className="fs-12 fw-semibold text-primary">
                + Add Pack
              </Link>
            </div>
            <div className="card-body p-3">
              {activeAddons.length === 0 ? (
                <div className="text-center py-4 text-muted fs-13">
                  Running on {baseStorageGb} GB included plan storage.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {activeAddons.map((ad) => (
                    <div
                      key={ad.order_id || ad.order_no}
                      className="p-2 px-3 rounded border bg-light d-flex align-items-center justify-content-between fs-13"
                    >
                      <div>
                        <div className="fw-bold text-dark">{ad.plan_name}</div>
                        <div className="text-muted fs-11">
                          {ad.order_no ? `${ad.order_no} • ` : ''}
                          Valid till {formatDateShort(ad.end_date)}
                        </div>
                      </div>
                      <span className="badge bg-primary-subtle text-primary fw-bold">
                        +{ad.capacity_gb} GB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Media;
