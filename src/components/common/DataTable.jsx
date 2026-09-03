import React, { useState, useMemo } from 'react';
import TableActionMenu from './TableActionMenu';

/**
 * Modern, Full-Featured Data Table Component
 * Integrates client/server sorting, search filtering, pagination, selection,
 * modern UI styling, and unclipped Floating UI action menus.
 */
const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  // Search
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchValue = null,
  onSearchChange = null,
  // Pagination
  pagination = true, // boolean (for internal client pagination) or object: { page, limit, total, totalPages, onPageChange, onLimitChange }
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  // Selection
  selectable = false,
  selectedIds = [],
  onSelectRow = null,
  onSelectAll = null,
  idKey = 'id',
  // Custom headers & actions
  title = null,
  subtitle = null,
  headerActions = null,
  // Empty state
  emptyMessage = 'No records found matching your criteria.',
  emptyIcon = 'ti ti-database-off',
  // Styling
  className = '',
  tableClassName = '',
  hoverable = true,
  striped = false,
}) => {
  // Client-side search state if not controlled externally
  const [internalSearch, setInternalSearch] = useState('');
  const activeSearch = searchValue !== null ? searchValue : internalSearch;

  // Client-side sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Client-side pagination state if pagination is boolean
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(defaultPageSize);

  const isServerPagination = typeof pagination === 'object' && pagination !== null;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
      setInternalPage(1);
    }
  };

  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange('');
    } else {
      setInternalSearch('');
      setInternalPage(1);
    }
  };

  const handleSort = (column) => {
    const sortKey = column.accessorKey || column.key;
    if (!sortKey || column.sortable === false) return;

    setSortConfig((prev) => {
      if (prev.key === sortKey) {
        if (prev.direction === 'asc') return { key: sortKey, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key: sortKey, direction: 'asc' };
    });
  };

  // 1. Filter Data (Client-side)
  const filteredData = useMemo(() => {
    if (isServerPagination || !activeSearch.trim()) return data;
    const query = activeSearch.toLowerCase().trim();
    return data.filter((row) => {
      return columns.some((col) => {
        const val = col.accessorKey
          ? row[col.accessorKey]
          : col.accessorFn
          ? col.accessorFn(row)
          : row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, activeSearch, columns, isServerPagination]);

  // 2. Sort Data (Client-side)
  const sortedData = useMemo(() => {
    if (isServerPagination || !sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const col = columns.find((c) => (c.accessorKey || c.key) === sortConfig.key);
      const valA = col?.accessorFn ? col.accessorFn(a) : a[sortConfig.key];
      const valB = col?.accessorFn ? col.accessorFn(b) : b[sortConfig.key];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comp = typeof valA === 'string'
        ? valA.localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' })
        : valA > valB ? 1 : -1;

      return sortConfig.direction === 'asc' ? comp : -comp;
    });
  }, [filteredData, sortConfig, columns, isServerPagination]);

  // 3. Paginate Data
  const currentPage = isServerPagination ? pagination.page || 1 : internalPage;
  const currentLimit = isServerPagination ? pagination.limit || defaultPageSize : internalLimit;
  const totalRecords = isServerPagination ? pagination.total || data.length : sortedData.length;
  const totalPages = isServerPagination
    ? pagination.totalPages || Math.ceil((pagination.total || 1) / currentLimit)
    : Math.max(1, Math.ceil(sortedData.length / currentLimit));

  const displayData = useMemo(() => {
    if (isServerPagination || !pagination) return sortedData;
    const startIdx = (currentPage - 1) * currentLimit;
    return sortedData.slice(startIdx, startIdx + currentLimit);
  }, [sortedData, isServerPagination, pagination, currentPage, currentLimit]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isServerPagination && pagination.onPageChange) {
      pagination.onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    if (isServerPagination && pagination.onLimitChange) {
      pagination.onLimitChange(newLimit);
    } else {
      setInternalLimit(newLimit);
      setInternalPage(1);
    }
  };

  // Selection Check
  const isAllCurrentSelected =
    selectable &&
    displayData.length > 0 &&
    displayData.every((row) => selectedIds.includes(row[idKey]));

  const isSomeCurrentSelected =
    selectable &&
    displayData.some((row) => selectedIds.includes(row[idKey])) &&
    !isAllCurrentSelected;

  return (
    <div className={`datatable-card ${className}`}>
      {/* Header Toolbar */}
      {(title || subtitle || searchable || headerActions) && (
        <div className="datatable-card-header d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            {title && <h5 className="mb-0 fw-bold text-dark fs-16">{title}</h5>}
            {subtitle && <p className="text-muted fs-13 mb-0 mt-1">{subtitle}</p>}
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2 ms-auto">
            {/* Search Input */}
            {searchable && (
              <div className="position-relative" style={{ minWidth: '220px', maxWidth: '320px' }}>
                <i className="ti ti-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-14"></i>
                <input
                  type="text"
                  className="form-control form-control-sm ps-5 pe-4 rounded-3 border"
                  placeholder={searchPlaceholder}
                  value={activeSearch}
                  onChange={handleSearchChange}
                />
                {activeSearch && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-muted position-absolute top-50 end-0 translate-middle-y me-1 p-0 text-decoration-none"
                    onClick={handleClearSearch}
                    title="Clear search"
                  >
                    <i className="ti ti-x fs-14"></i>
                  </button>
                )}
              </div>
            )}

            {/* Custom Header Actions */}
            {headerActions}
          </div>
        </div>
      )}

      {/* Selected Items Notice Bar */}
      {selectable && selectedIds.length > 0 && (
        <div className="bg-primary-subtle border-bottom border-primary-subtle px-3 py-2 d-flex align-items-center justify-content-between text-primary fs-13">
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-checkbox fs-16"></i>
            <span className="fw-semibold">{selectedIds.length}</span> item{selectedIds.length > 1 ? 's' : ''} selected
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="datatable-wrapper">
        <table className={`table-modern ${striped ? 'table-striped' : ''} ${hoverable ? 'table-hover' : ''} ${tableClassName}`}>
          <thead>
            <tr>
              {/* Checkbox Select All */}
              {selectable && (
                <th style={{ width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={isAllCurrentSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeCurrentSelected;
                    }}
                    onChange={() => onSelectAll && onSelectAll()}
                    title="Select All"
                  />
                </th>
              )}

              {/* Column Headers */}
              {columns.map((col, index) => {
                const sortKey = col.accessorKey || col.key;
                const isSortable = col.sortable !== false && !!sortKey;
                const isSorted = sortConfig.key === sortKey;
                const isAsc = isSorted && sortConfig.direction === 'asc';
                const isDesc = isSorted && sortConfig.direction === 'desc';

                return (
                  <th
                    key={col.key || col.accessorKey || index}
                    style={{
                      width: col.width || 'auto',
                      textAlign: col.align || 'left',
                      minWidth: col.minWidth || 'auto',
                    }}
                    className={`${isSortable ? 'sortable' : ''} ${col.className || ''}`}
                    onClick={() => isSortable && handleSort(col)}
                  >
                    <div
                      className={`d-inline-flex align-items-center gap-1.5 ${
                        col.align === 'center'
                          ? 'justify-content-center w-100'
                          : col.align === 'right'
                          ? 'justify-content-end w-100'
                          : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="text-muted d-inline-flex align-items-center fs-11">
                          {isSorted ? (
                            isAsc ? (
                              <i className="ti ti-chevron-up text-primary fw-bold"></i>
                            ) : (
                              <i className="ti ti-chevron-down text-primary fw-bold"></i>
                            )
                          ) : (
                            <i className="ti ti-arrows-sort opacity-40"></i>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              // Loading Skeleton State
              Array.from({ length: Math.min(5, currentLimit) }).map((_, rIdx) => (
                <tr key={`loading-${rIdx}`} className="skeleton-row">
                  {selectable && (
                    <td className="text-center">
                      <div className="skeleton-bar" style={{ width: '18px', margin: '0 auto' }}></div>
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={`loading-col-${cIdx}`}>
                      <div
                        className="skeleton-bar"
                        style={{
                          width: `${Math.floor(40 + ((rIdx + cIdx) % 5) * 12)}%`,
                          margin: col.align === 'center' ? '0 auto' : col.align === 'right' ? '0 0 0 auto' : '0',
                        }}
                      ></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                  <div className="table-empty-state">
                    <div className="table-empty-icon">
                      <i className={emptyIcon}></i>
                    </div>
                    <h6 className="fw-semibold text-dark mb-1">No Data Found</h6>
                    <p className="text-muted fs-13 mb-0">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              displayData.map((row, rIdx) => {
                const rowId = row[idKey] !== undefined ? row[idKey] : rIdx;
                const isSelected = selectable && selectedIds.includes(rowId);

                return (
                  <tr key={rowId} className={isSelected ? 'selected-row' : ''}>
                    {/* Row Selection Checkbox */}
                    {selectable && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(rowId, row)}
                        />
                      </td>
                    )}

                    {/* Cell Columns */}
                    {columns.map((col, cIdx) => {
                      const cellValue = col.accessorKey
                        ? row[col.accessorKey]
                        : col.accessorFn
                        ? col.accessorFn(row)
                        : row[col.key];

                      return (
                        <td
                          key={col.key || col.accessorKey || cIdx}
                          style={{
                            textAlign: col.align || 'left',
                          }}
                          className={col.cellClassName || ''}
                        >
                          {col.cell
                            ? col.cell({
                                row,
                                value: cellValue,
                                index: (currentPage - 1) * currentLimit + rIdx,
                              })
                            : cellValue !== null && cellValue !== undefined
                            ? String(cellValue)
                            : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && !loading && totalRecords > 0 && (
        <div className="datatable-pagination">
          {/* Entries per page & Total Info */}
          <div className="d-flex align-items-center gap-2 text-muted fs-13">
            <span>Show</span>
            <select
              className="form-select form-select-sm border rounded-2"
              style={{ width: '70px' }}
              value={currentLimit}
              onChange={handleLimitChange}
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
            <span>
              entries (Showing {Math.min((currentPage - 1) * currentLimit + 1, totalRecords)} to{' '}
              {Math.min(currentPage * currentLimit, totalRecords)} of {totalRecords})
            </span>
          </div>

          {/* Page Navigation Buttons */}
          {totalPages > 1 && (
            <ul className="pagination-modern">
              <li>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous Page"
                >
                  <i className="ti ti-chevron-left fs-14"></i>
                </button>
              </li>

              {/* Dynamic Page Numbers */}
              {(() => {
                const pages = [];
                const maxButtons = 5;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + maxButtons - 1);

                if (endPage - startPage < maxButtons - 1) {
                  startPage = Math.max(1, endPage - maxButtons + 1);
                }

                if (startPage > 1) {
                  pages.push(
                    <li key={1}>
                      <button
                        type="button"
                        className={`page-btn ${currentPage === 1 ? 'active' : ''}`}
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    </li>
                  );
                  if (startPage > 2) {
                    pages.push(
                      <li key="ellipsis-start">
                        <span className="px-1 text-muted">...</span>
                      </li>
                    );
                  }
                }

                for (let p = startPage; p <= endPage; p++) {
                  pages.push(
                    <li key={p}>
                      <button
                        type="button"
                        className={`page-btn ${currentPage === p ? 'active' : ''}`}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    </li>
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <li key="ellipsis-end">
                        <span className="px-1 text-muted">...</span>
                      </li>
                    );
                  }
                  pages.push(
                    <li key={totalPages}>
                      <button
                        type="button"
                        className={`page-btn ${currentPage === totalPages ? 'active' : ''}`}
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </li>
                  );
                }

                return pages;
              })()}

              <li>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Next Page"
                >
                  <i className="ti ti-chevron-right fs-14"></i>
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default DataTable;
