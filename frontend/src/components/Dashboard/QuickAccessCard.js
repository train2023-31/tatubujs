import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

const QuickAccessCard = ({ title, description, icon: Icon, color, onClick, isNew = false }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white hover:bg-blue-600',
    green: 'bg-green-500 text-white hover:bg-green-600',
    purple: 'bg-purple-500 text-white hover:bg-purple-600',
    orange: 'bg-orange-500 text-white hover:bg-orange-600',
    indigo: 'bg-indigo-500 text-white hover:bg-indigo-600',
    teal: 'bg-teal-500 text-white hover:bg-teal-600',
    pink: 'bg-pink-500 text-white hover:bg-pink-600',
    cyan: 'bg-cyan-500 text-white hover:bg-cyan-600',
  };

  return (
    <button
      onClick={onClick}
      className="group relative p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200 text-right"
    >
      {isNew && (
        <div className="absolute top-0 left-0 right-0 w-full flex justify-end">
          <span className="inline-flex items-center px-2 py-0.5 rounded-tl-md border-l-4 border-yellow-400 text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md animate-pulse">
            <Sparkles className="h-3 w-3 mr-1" />
            جديد
          </span>
        </div>
      )}

      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ml-2 ${colorClasses[color]} flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
          <Icon className="h-5 w-5 " />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
              {title}
            </h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
        <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
};

export default QuickAccessCard;
