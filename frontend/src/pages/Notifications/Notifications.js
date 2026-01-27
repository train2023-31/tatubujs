import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, Filter, CheckCheck, Settings, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [selectedType, setSelectedType] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadNotifications();
  }, [selectedType, page]);

  const loadNotifications = async () => {
    const options = {
      page,
      per_page: 20,
    };

    if (selectedType !== 'all') {
      options.type = selectedType;
    }

    const result = await fetchNotifications(options);
    if (result) {
      setTotalPages(result.pages || 1);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to the action URL if available
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation(); // Prevent triggering the click handler
    if (window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      await deleteNotification(notificationId);
      loadNotifications(); // Refresh the list
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-r-4 border-red-500 bg-red-50';
      case 'high':
        return 'border-r-4 border-orange-500 bg-orange-50';
      case 'normal':
        return 'border-r-4 border-blue-500 bg-blue-50';
      case 'low':
        return 'border-r-4 border-gray-500 bg-gray-50';
      default:
        return 'border-r-4 border-blue-500 bg-blue-50';
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      attendance: '📝',
      bus: '🚌',
      behavior: '⚠️',
      timetable: '📅',
      substitution: '🔄',
      news: '📰',
      general: '📢',
    };
    return icons[type] || '📢';
  };

  const getTypeLabel = (type) => {
    const labels = {
      attendance: 'الحضور',
      bus: 'الحافلة',
      behavior: 'السلوك',
      timetable: 'الجدول',
      substitution: 'الاستبدال',
      news: 'الأخبار',
      general: 'عام',
    };
    return labels[type] || 'عام';
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Bell className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  لديك {unreadCount} إشعار غير مقروء
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app/notification-settings')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>الإعدادات</span>
            </button>

            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">تصفية حسب النوع</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'attendance', 'bus', 'timetable', 'substitution', 'behavior', 'news', 'general'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'الكل' : getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري التحميل...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-600">لا توجد إشعارات</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? getPriorityColor(notification.priority) : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        notification.priority === 'urgent' ? 'bg-red-100' :
                        notification.priority === 'high' ? 'bg-orange-100' :
                        'bg-blue-100'
                      }`}>
                        <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className={`text-lg font-semibold ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full"></span>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="حذف الإشعار"
                            aria-label="حذف الإشعار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-3 whitespace-pre-wrap">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="text-lg">{getTypeIcon(notification.type)}</span>
                          {getTypeLabel(notification.type)}
                        </span>
                        <span>•</span>
                        <span>
                          {format(new Date(notification.created_at), 'PPp', { locale: ar })}
                        </span>
                        {notification.priority === 'urgent' && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              عاجل
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>

                  <span className="px-4 py-2 text-sm text-gray-700">
                    صفحة {page} من {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
