import React from 'react';
import { Eye } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, showEyeIcon = false, onEyeClick }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
    indigo: 'bg-indigo-500 text-white',
  };

  return (
    <div className="card">
      <div className="card-body p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
              <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <div className="mr-2 sm:mr-4 min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
          {showEyeIcon && (
            <button
              onClick={onEyeClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="عرض قائمة الطلاب"
            >
              <Eye className="h-4 w-4 text-gray-600 hover:text-blue-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
