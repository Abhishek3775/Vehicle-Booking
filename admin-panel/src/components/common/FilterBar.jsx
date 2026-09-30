import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

export const FilterBar = ({
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'Search records...',
  filters = [],
  selectFilters = [],
  onReset = null,
  onClearFilters = null,
  extraActions = null,
  className = '',
}) => {
  const activeFiltersList = selectFilters.length > 0 ? selectFilters : filters;
  const handleClear = onClearFilters || onReset;

  const hasActiveFilters =
    Boolean(searchValue) ||
    activeFiltersList.some((f) => f.value !== '' && f.value !== undefined && f.value !== null);

  return (
    <div className={`filter-bar ${className}`}>
      <div className="filter-group">
        {onSearchChange && (
          <div className="filter-search">
            <FiSearch className="filter-search-icon" size={16} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {activeFiltersList.map((filter) => (
          <select
            key={filter.name || filter.key}
            value={filter.value ?? ''}
            onChange={(e) => filter.onChange(e.target.value)}
            className="filter-select"
            aria-label={filter.placeholder || filter.label}
          >
            <option value="">{filter.placeholder || filter.label || 'All'}</option>
            {(filter.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {hasActiveFilters && handleClear && (
          <button
            onClick={handleClear}
            className="btn btn-secondary btn-sm"
            title="Reset Filters"
          >
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {extraActions && (
        <div className="flex items-center gap-2">
          {extraActions}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
