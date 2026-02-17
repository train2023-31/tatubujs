import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * Mobile-optimized table component that automatically switches between
 * desktop table view and mobile card view based on screen size
 */
const MobileTable = ({
  data = [],
  columns = [],
  loading = false,
  className = '',
  emptyMessage = 'لا توجد بيانات',
  mobileCardTitle = null, // Function to generate card title for mobile
  mobileCardSubtitle = null, // Function to generate card subtitle for mobile
  showActionsOnMobile = true,
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

  // Separate action columns from data columns
  const dataColumns = columns.filter(col => col.key !== 'actions');
  const actionColumns = columns.filter(col => col.key === 'actions');

  return (
    <div className={`card ${className}`} dir="rtl">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="table-header-cell text-right">
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

      {/* Tablet View (Medium screens) */}
      <div className="hidden md:block lg:hidden overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              {columns.slice(0, 4).map((column, index) => (
                <th key={index} className="table-header-cell text-right">
                  {column.header}
                </th>
              ))}
              {actionColumns.length > 0 && (
                <th className="table-header-cell text-right">الإجراءات</th>
              )}
            </tr>
          </thead>
          <tbody className="table-body">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.slice(0, 4).map((column, colIndex) => (
                  <td key={colIndex} className="table-cell text-right">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {actionColumns.length > 0 && (
                  <td className="table-cell text-right">
                    {actionColumns.map((column, colIndex) => (
                      <div key={colIndex} className="flex justify-end space-x-2">
                        {column.render ? column.render(row) : row[column.key]}
                      </div>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div className="space-y-4 p-4">
          {data.map((row, rowIndex) => (
            <div key={rowIndex} className="mobile-card">
              {/* Card Header */}
              {(mobileCardTitle || mobileCardSubtitle) && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  {mobileCardTitle && (
                    <h3 className="text-base font-semibold text-gray-900">
                      {mobileCardTitle(row)}
                    </h3>
                  )}
                  {mobileCardSubtitle && (
                    <p className="text-sm text-gray-500 mt-1">
                      {mobileCardSubtitle(row)}
                    </p>
                  )}
                </div>
              )}

              {/* Card Content */}
              <div className="space-y-3">
                {dataColumns.map((column, colIndex) => {
                  // Skip certain columns on mobile if there are too many
                  if (dataColumns.length > 4 && colIndex > 2 && column.key !== 'name' && column.key !== 'title') {
                    return null;
                  }
                  
                  return (
                    <div key={colIndex} className="mobile-card-row">
                      <span className="mobile-card-label">
                        {column.header}:
                      </span>
                      <div className="mobile-card-value">
                        {column.render ? column.render(row) : row[column.key]}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show remaining columns in a collapsible section if there are many */}
                {dataColumns.length > 4 && (
                  <details className="mt-3">
                    <summary className="text-sm font-medium text-primary-600 cursor-pointer hover:text-primary-700">
                      عرض المزيد
                    </summary>
                    <div className="mt-2 space-y-2">
                      {dataColumns.slice(3).map((column, colIndex) => (
                        <div key={colIndex + 3} className="mobile-card-row">
                          <span className="mobile-card-label">
                            {column.header}:
                          </span>
                          <div className="mobile-card-value">
                            {column.render ? column.render(row) : row[column.key]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              
              {/* Actions */}
              {showActionsOnMobile && actionColumns.length > 0 && (
                <div className="mobile-actions">
                  <div className="flex justify-end space-x-2">
                    {actionColumns.map((column, colIndex) => (
                      <div key={colIndex}>
                        {column.render ? column.render(row) : row[column.key]}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileTable;



