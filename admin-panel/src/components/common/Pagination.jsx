import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

export const Pagination = ({
  page = 1,
  limit = 20,
  total = 0,
  totalPages = 1,
  pagination = null,
  onPageChange,
  className = '',
}) => {
  const currentPage = pagination?.page ?? page;
  const currentLimit = pagination?.limit ?? limit;
  const currentTotal = pagination?.total ?? total;
  const currentTotalPages = pagination?.totalPages ?? totalPages;
  const handlePageChange = onPageChange || pagination?.onPageChange;

  if (currentTotal === 0 && currentTotalPages <= 1) return null;

  const startRecord = (currentPage - 1) * currentLimit + 1;
  const endRecord = Math.min(currentPage * currentLimit, currentTotal);

  return (
    <div className={`pagination-container ${className}`}>
      <div className="pagination-info">
        Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of <strong>{currentTotal}</strong> entries
      </div>

      <div className="pagination-controls">
        <button
          onClick={() => handlePageChange && handlePageChange(1)}
          disabled={currentPage <= 1}
          className="pagination-btn"
          title="First Page"
          aria-label="First page"
        >
          <FiChevronsLeft size={16} />
        </button>

        <button
          onClick={() => handlePageChange && handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="pagination-btn"
          title="Previous Page"
          aria-label="Previous page"
        >
          <FiChevronLeft size={16} />
        </button>

        <span style={{ margin: '0 0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>
          Page {currentPage} of {currentTotalPages}
        </span>

        <button
          onClick={() => handlePageChange && handlePageChange(currentPage + 1)}
          disabled={currentPage >= currentTotalPages}
          className="pagination-btn"
          title="Next Page"
          aria-label="Next page"
        >
          <FiChevronRight size={16} />
        </button>

        <button
          onClick={() => handlePageChange && handlePageChange(currentTotalPages)}
          disabled={currentPage >= currentTotalPages}
          className="pagination-btn"
          title="Last Page"
          aria-label="Last page"
        >
          <FiChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
