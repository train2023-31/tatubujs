import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  pagination = null,
  onPageChange = () => {},
  className = '',
  emptyMessage = 'لا توجد بيانات',
}) => {
  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-center py-12 gap-3">
            <LoadingSpinner size="md" />
            <span className="mr-0 text-gray-500">جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`} dir="rtl">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="table">
          <thead className="table-header sticky top-0 z-10 bg-white shadow-md">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="table-header-cell text-right bg-gray-50">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="table-body">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="table-cell text-right">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden -mx-2 sm:-mx-4">
        <div className="space-y-3 px-2 sm:px-4">
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="space-y-2.5 sm:space-y-3">
                {columns.map((column, colIndex) => {
                  // Skip action columns on mobile - they will be shown at the bottom
                  if (column.key === 'actions') {
                    return null;
                  }
                  
                  // Special handling for title column (first column usually)
                  if (column.key === 'title') {
                    return (
                      <div key={colIndex} className="mb-3 pb-3 border-b border-gray-100">
                        <div className="text-sm text-gray-900 min-w-0 overflow-hidden">
                          {column.render ? column.render(row) : row[column.key]}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={colIndex} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500 flex-shrink-0">
                        {column.header}:
                      </span>
                      <div className="text-sm text-gray-900 min-w-0 overflow-hidden break-words">
                        {column.render ? column.render(row) : (row[column.key] || '-')}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show actions at the bottom for mobile */}
                {columns.some(col => col.key === 'actions') && (
                  <div className="pt-3 mt-3 border-t border-gray-200">
                    <div className="flex flex-wrap justify-end gap-2">
                      {columns
                        .filter(col => col.key === 'actions')
                        .map((column, colIndex) => (
                          <div key={colIndex} className="flex items-center">
                            {column.render ? column.render(row) : row[column.key]}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <div className="text-sm text-gray-700">
              عرض {pagination.start} إلى {pagination.end} من {pagination.total} نتيجة
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                صفحة {pagination.currentPage} من {pagination.totalPages}
              </span>
              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="btn btn-outline btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
