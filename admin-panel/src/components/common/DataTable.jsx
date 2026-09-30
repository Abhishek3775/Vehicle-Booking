import React from 'react';
import { Skeleton } from './LoadingStates';
import { EmptyState, ErrorState } from './FeedbackStates';
import Pagination from './Pagination';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  error = null,
  onRetry = null,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display.',
  emptyMessage = null,
  keyField = 'id',
  pagination = null,
  onPageChange = null,
  className = '',
}) => {
  return (
    <div className={`table-container ${className}`}>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || col.accessor || idx}
                  style={{
                    width: col.width || 'auto',
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton rows during loading state
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`loading-row-${rIdx}`}>
                  {columns.map((col, cIdx) => (
                    <td key={`loading-col-${cIdx}`} style={{ textAlign: col.align || 'left' }}>
                      <Skeleton height="18px" width={cIdx === 0 ? '70%' : '85%'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem 1rem' }}>
                  <ErrorState message={error} onRetry={onRetry} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '2rem 1rem' }}>
                  <EmptyState title={emptyTitle} description={emptyMessage || emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const rowKey = row[keyField] || row._id || row.id || rIdx;
                return (
                  <tr key={rowKey}>
                    {columns.map((col, cIdx) => (
                      <td
                        key={col.key || col.accessor || cIdx}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(row, rIdx) : (row[col.accessor || col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          pagination={pagination}
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange || pagination.onPageChange}
        />
      )}
    </div>
  );
};

export default DataTable;
