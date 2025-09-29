import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner" />
            <span className="mr-3 text-gray-500">جاري التحميل...</span>
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
      <div className="hidden md:block overflow-x-auto">
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
      <div className="md:hidden">
        <div className="space-y-4 p-4">
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="space-y-3">
                {columns.map((column, colIndex) => {
                  // Skip action columns on mobile for better UX
                  if (column.key === 'actions' && columns.length > 3) {
                    return null;
                  }
                  
                  return (
                    <div key={colIndex} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-500 min-w-0 flex-shrink-0">
                        {column.header}:
                      </span>
                      <div className="text-sm text-gray-900 text-right flex-1 mr-2">
                        {column.render ? column.render(row) : row[column.key]}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show actions at the bottom for mobile */}
                {columns.some(col => col.key === 'actions') && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex justify-end space-x-2">
                      {columns
                        .filter(col => col.key === 'actions')
                        .map((column, colIndex) => (
                          <div key={colIndex}>
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
