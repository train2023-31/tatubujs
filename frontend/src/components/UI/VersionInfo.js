import React, { useState, useEffect } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { BUILD_INFO } from '../../version';

const VersionInfo = ({ showDetails = false, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [serverVersion, setServerVersion] = useState(null);

  useEffect(() => {
    // Fetch server version info
    fetch('/version.json')
      .then(response => response.json())
      .then(data => setServerVersion(data))
      .catch(error => console.log('Could not fetch server version:', error));
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Info className="h-4 w-4 text-gray-500 mr-2" />
          <span className="text-sm text-gray-600">
            الإصدار: <span className="font-medium text-gray-900">{BUILD_INFO.version}</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
          <button
            onClick={handleRefresh}
            className="text-xs text-green-600 hover:text-green-800 flex items-center"
            title="تحديث الصفحة"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            تحديث
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">وقت البناء:</span>
              <span className="text-gray-900 mr-2">{formatDate(BUILD_INFO.buildTime)}</span>
            </div>
            <div>
              <span className="text-gray-500">البيئة:</span>
              <span className="text-gray-900 mr-2">{BUILD_INFO.environment}</span>
            </div>
            {serverVersion && (
              <>
                <div>
                  <span className="text-gray-500">إصدار الخادم:</span>
                  <span className="text-gray-900 mr-2">{serverVersion.version}</span>
                </div>
                <div>
                  <span className="text-gray-500">آخر تحديث:</span>
                  <span className="text-gray-900 mr-2">{formatDate(serverVersion.buildTime)}</span>
                </div>
              </>
            )}
          </div>
          
          {serverVersion && serverVersion.buildTimestamp !== BUILD_INFO.buildTimestamp && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ هناك إصدار جديد متاح. يرجى تحديث الصفحة.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VersionInfo;
