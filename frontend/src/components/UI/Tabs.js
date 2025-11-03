import React from 'react';

const Tabs = ({ 
  tabs = [], 
  selectedTab, 
  onTabChange, 
  className = '',
  variant = 'pills' // 'default', 'pills', 'underline', 'modern'
}) => {
  const getTabStyles = (isActive) => {
    const baseStyles = "relative px-4 py-2 text-sm font-medium transition-all duration-200 ";
    
    switch (variant) {
      case 'pills':
        return `${baseStyles} rounded-full ${
          isActive 
            ? 'border-primary-500 text-white shadow-md' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`;
      
      case 'underline':
        return `${baseStyles} border-b-2 ${
          isActive 
            ? 'border-primary-500 text-primary-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`;
      
      case 'modern':
        return `${baseStyles} rounded-lg ${
          isActive 
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
        }`;
      
      default:
        return `${baseStyles} border-b-2 ${
          isActive 
            ? 'border-primary-500 text-primary-600 bg-primary-50' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
        }`;
    }
  };

  const getContainerStyles = () => {
    switch (variant) {
      case 'pills':
        return "flex flex-wrap gap-2 p-1 bg-gray-100 rounded-full";
      case 'modern':
        return "flex flex-wrap gap-2 p-2 bg-white rounded-xl shadow-sm border border-gray-200";
      default:
        return "border-b border-gray-200";
    }
  };

  return (
    <div className={`${getContainerStyles()} ${className}`} dir="rtl">
      <nav className={variant === 'pills' || variant === 'modern' ? 'flex flex-wrap gap-2' : '-mb-px flex space-x-8'}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={getTabStyles(isActive)}
              disabled={tab.disabled}
            >
              <div className="flex items-center space-x-2">
                {Icon && <Icon className="h-4 w-4 ml-2" />}
                <span className="ml-2">{tab.name}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 text-xs  rounded-full ${
                    isActive 
                      ? 'bg-white bg-opacity-20 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </div>
              
              {/* Modern variant active indicator */}
              {variant === 'modern' && isActive && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 opacity-10 "></div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;

