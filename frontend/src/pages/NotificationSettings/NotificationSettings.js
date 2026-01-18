import React from 'react';
import NotificationPreferences from '../../components/Notifications/NotificationPreferences';

const NotificationSettings = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الإشعارات</h1>
        <p className="text-gray-600 mt-2">
          قم بإدارة تفضيلات الإشعارات الخاصة بك
        </p>
      </div>

      <NotificationPreferences />
    </div>
  );
};

export default NotificationSettings;
