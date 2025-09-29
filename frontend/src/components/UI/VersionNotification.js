import React from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const VersionNotification = ({ 
  isVisible, 
  onDismiss, 
  onRefresh, 
  currentVersion, 
  serverVersion 
}) => {
  if (!isVisible) return null;

  const handleRefresh = () => {
    onRefresh();
    toast.success('جاري تحديث الصفحة...');
  };

  const handleDismiss = () => {
    onDismiss();
    toast('تم إخفاء الإشعار. يمكنك تحديث الصفحة لاحقاً.', {
      icon: 'ℹ️',
      duration: 3000
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              إصدار جديد متاح
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              تم إصدار نسخة جديدة من التطبيق. يرجى تحديث الصفحة للحصول على أحدث الميزات.
            </p>
            <div className="mt-2 text-xs text-yellow-600">
              <div>الإصدار الحالي: {currentVersion?.version}</div>
              <div>الإصدار الجديد: {serverVersion?.version}</div>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                تحديث الآن
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-xs font-medium rounded text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                لاحقاً
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-yellow-400 hover:text-yellow-600 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionNotification;
