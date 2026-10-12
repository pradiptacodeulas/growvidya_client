import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Universal Modern Multi-Select Dropdown Component
 *
 * @param {Array<{value: string|number, label: string, subtitle?: string, badge?: string, disabled?: boolean}>} options
 * @param {Array<string|number>} value - Currently selected values
 * @param {Function} onChange - Callback triggered with updated array of selected values
 * @param {string} placeholder - Placeholder when nothing is selected
 * @param {string} searchPlaceholder - Placeholder for search input inside dropdown
 * @param {boolean} disabled - Whether the dropdown is disabled
 * @param {boolean} isClearable - Whether to show the clear-all button
 * @param {boolean} showSelectAll - Whether to show "Select All" / "Clear All" in the menu
 * @param {number} maxDisplay - Maximum chips to display in the trigger before '+N more' badge (0 for unlimited)
 * @param {string} className - Additional CSS class for outer container
 * @param {boolean|string} error - Error state (highlights border in red)
 * @param {string} id - HTML id
 */
const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = '-- Select --',
  searchPlaceholder = 'Search...',
  disabled = false,
  isClearable = true,
  showSelectAll = true,
  maxDisplay = 3,
  className = '',
  error = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize selected values as an array of strings for consistency
  const selectedValues = useMemo(() => {
    if (!Array.isArray(value)) return [];
    return value.map(String);
  }, [value]);

  // Map options by value for fast lookup
  const optionsMap = useMemo(() => {
    const map = new Map();
    options.forEach((opt) => {
      map.set(String(opt.value), opt);
    });
    return map;
  }, [options]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((opt) => {
      const labelMatch = (opt.label || '').toLowerCase().includes(term);
      const subtitleMatch = (opt.subtitle || '').toLowerCase().includes(term);
      const badgeMatch = (opt.badge || '').toLowerCase().includes(term);
      return labelMatch || subtitleMatch || badgeMatch;
    });
  }, [options, searchTerm]);

  // Selected option objects
  const selectedOptions = useMemo(() => {
    return selectedValues
      .map((val) => optionsMap.get(val))
      .filter(Boolean);
  }, [selectedValues, optionsMap]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Keyboard navigation: Escape closes dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Toggle single item selection
  const handleToggleOption = (optionValue) => {
    const stringVal = String(optionValue);
    let newSelected;
    if (selectedValues.includes(stringVal)) {
      newSelected = selectedValues.filter((v) => v !== stringVal);
    } else {
      newSelected = [...selectedValues, stringVal];
    }
    onChange?.(newSelected);
  };

  // Remove specific item (from tag badge 'x' button)
  const handleRemoveItem = (e, optionValue) => {
    e.stopPropagation();
    const stringVal = String(optionValue);
    const newSelected = selectedValues.filter((v) => v !== stringVal);
    onChange?.(newSelected);
  };

  // Clear all selections
  const handleClearAll = (e) => {
    e?.stopPropagation();
    onChange?.([]);
  };

  // Select all currently filtered options
  const handleSelectAllFiltered = () => {
    const filteredValues = filteredOptions
      .filter((opt) => !opt.disabled)
      .map((opt) => String(opt.value));
    const combined = Array.from(new Set([...selectedValues, ...filteredValues]));
    onChange?.(combined);
  };

  // Deselect all currently filtered options
  const handleDeselectAllFiltered = () => {
    const filteredValueSet = new Set(filteredOptions.map((opt) => String(opt.value)));
    const remaining = selectedValues.filter((v) => !filteredValueSet.has(v));
    onChange?.(remaining);
  };

  const areAllFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions
      .filter((opt) => !opt.disabled)
      .every((opt) => selectedValues.includes(String(opt.value)));

  // Display badges in trigger
  const visibleBadges =
    maxDisplay > 0 ? selectedOptions.slice(0, maxDisplay) : selectedOptions;
  const hiddenCount =
    maxDisplay > 0 && selectedOptions.length > maxDisplay
      ? selectedOptions.length - maxDisplay
      : 0;

  return (
    <div
      ref={containerRef}
      className={`position-relative multiselect-dropdown-container ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Area */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`form-control d-flex align-items-center justify-content-between p-2 ${
          disabled ? 'bg-light text-muted' : 'bg-white'
        } ${error ? 'is-invalid border-danger' : ''}`}
        style={{
          minHeight: '44px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderColor: error ? '#dc3545' : isOpen ? '#3d5ee1' : '#e2e8f0',
          boxShadow: isOpen ? '0 0 0 0.2rem rgba(61, 94, 225, 0.15)' : 'none',
          transition: 'all 0.15s ease-in-out',
        }}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
      >
        {/* Left: Tags or Placeholder */}
        <div className="d-flex flex-wrap align-items-center gap-1 flex-grow-1 overflow-hidden me-2">
          {selectedValues.length === 0 ? (
            <span className="text-muted fs-13 user-select-none">{placeholder}</span>
          ) : (
            <>
              {visibleBadges.map((opt) => (
                <span
                  key={opt.value}
                  className="badge bg-light text-dark border d-inline-flex align-items-center gap-1 px-2 py-1 fs-12 fw-medium rounded"
                  style={{ backgroundColor: '#f1f5f9' }}
                >
                  <span className="text-truncate" style={{ maxWidth: '140px' }}>
                    {opt.label}
                  </span>
                  {!disabled && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="text-muted hover-text-danger d-inline-flex align-items-center cursor-pointer ms-0.5"
                      onClick={(e) => handleRemoveItem(e, opt.value)}
                      title="Remove"
                      style={{ fontSize: '11px', lineHeight: 1 }}
                    >
                      <i className="ti ti-x"></i>
                    </span>
                  )}
                </span>
              ))}

              {hiddenCount > 0 && (
                <span
                  className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fs-12 fw-semibold rounded"
                  title={`${hiddenCount} more selected`}
                >
                  +{hiddenCount} more
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: Clear All Button & Chevron */}
        <div className="d-flex align-items-center gap-1 flex-shrink-0 text-muted">
          {isClearable && selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              className="btn btn-link p-0 text-muted hover-text-danger text-decoration-none d-flex align-items-center"
              style={{ width: '20px', height: '20px' }}
              onClick={handleClearAll}
              title="Clear all"
            >
              <i className="ti ti-x fs-14"></i>
            </button>
          )}
          <span
            className="d-flex align-items-center"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <i className="ti ti-chevron-down fs-14 text-muted"></i>
          </span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-lg overflow-hidden"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1055,
            borderColor: '#e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Search Header */}
          <div className="p-2 border-bottom bg-light-subtle">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="ti ti-search fs-13"></i>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-white border border-start-0 text-muted"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <i className="ti ti-x fs-12"></i>
                </button>
              )}
            </div>
          </div>

          {/* Action Bar (Count + Select All / Clear All) */}
          {showSelectAll && options.length > 0 && (
            <div className="d-flex align-items-center justify-content-between px-3 py-1.5 bg-light border-bottom fs-12">
              <span className="text-muted fw-medium">
                {selectedValues.length} of {options.length} selected
              </span>
              <div className="d-flex gap-2">
                {areAllFilteredSelected ? (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-danger fw-semibold fs-12"
                    onClick={handleDeselectAllFiltered}
                  >
                    Deselect All
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-primary fw-semibold fs-12"
                    onClick={handleSelectAllFiltered}
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            role="listbox"
            aria-multiselectable="true"
            style={{ maxHeight: '230px', overflowY: 'auto' }}
            className="p-1"
          >
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-muted fs-13">
                <i className="ti ti-search-off fs-20 d-block mb-1 text-secondary"></i>
                {searchTerm ? 'No helpers matching search.' : 'No options available.'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(String(opt.value));
                const isOptDisabled = Boolean(opt.disabled);

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`d-flex align-items-center justify-content-between px-3 py-2 rounded mb-1 transition-all ${
                      isOptDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      color: isSelected ? '#1d4ed8' : '#1f2937',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !isOptDisabled) {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !isOptDisabled) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                    onClick={() => {
                      if (!isOptDisabled) handleToggleOption(opt.value);
                    }}
                  >
                    {/* Left: Checkbox + Label + Subtitle */}
                    <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0 flex-shrink-0 cursor-pointer"
                        checked={isSelected}
                        disabled={isOptDisabled}
                        onChange={() => {}} // Handled by parent div onClick
                        style={{ width: '16px', height: '16px' }}
                      />
                      <div className="d-flex flex-column overflow-hidden">
                        <span
                          className={`fs-13 text-truncate ${
                            isSelected ? 'fw-semibold text-primary' : 'text-dark'
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <span className="fs-11 text-muted text-truncate">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Badge / Status Indicator */}
                    <div className="d-flex align-items-center gap-1 ms-2 flex-shrink-0">
                      {opt.badge && (
                        <span className="badge bg-light text-muted border fs-10 px-1.5 py-0.5">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <i className="ti ti-check text-primary fs-14 fw-bold"></i>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with helper tip */}
          {selectedValues.length > 0 && (
            <div className="px-3 py-1.5 bg-light-subtle border-top d-flex align-items-center justify-content-between fs-11 text-muted">
              <span>{selectedValues.length} helper{selectedValues.length > 1 ? 's' : ''} assigned</span>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none text-primary fs-11"
                onClick={() => setIsOpen(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
