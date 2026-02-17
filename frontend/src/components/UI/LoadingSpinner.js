import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <img
      src="/loading.gif"
      alt="جاري التحميل..."
      className={`inline-block object-contain ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  );
};

export default LoadingSpinner;




