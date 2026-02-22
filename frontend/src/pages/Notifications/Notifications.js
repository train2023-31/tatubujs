import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { usePushNotifications } from '../../hooks/usePushNotifications';
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
    deleteAllNotifications,
  } = useNotifications();

  const {
    subscribe,
    isSubscribed,
    sendTestNotification,
    isLoading: pushLoading,
    isSupported: pushSupported,
    pushStatusBackend,
    fetchPushStatus,
  } = usePushNotifications();

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
    <div className="container mx-auto px-3 py-3 max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">الإشعارات</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-600 mt-0.5">
                  لديك {unreadCount} إشعار غير مقروء
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/notification-settings')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>الإعدادات</span>
            </button>

            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>تحديد الكل كمقروء</span>
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
                      const ok = await deleteAllNotifications();
                      if (ok) loadNotifications();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الكل</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Push Notifications - Subscribe & Test */}
      {pushSupported && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={subscribe}
              disabled={pushLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                isSubscribed
                  ? 'bg-green-100 text-green-800 cursor-default'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubscribed ? '✓ مشترك في الإشعارات الفورية' : 'تفعيل الإشعارات الفورية'}
            </button>
            {isSubscribed && (
              <>
                <button
                  onClick={sendTestNotification}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  إرسال إشعار تجريبي
                </button>
                <button
                  type="button"
                  onClick={() => fetchPushStatus()}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
                >
                  تحديث الحالة
                </button>
              </>
            )}
          </div>
          {isSubscribed && pushStatusBackend && (
            <p className={`mt-2 text-xs ${pushStatusBackend.subscription_count > 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {pushStatusBackend.subscription_count > 0
                ? `✓ السيرفر: ${pushStatusBackend.message}`
                : '⚠ السيرفر لا يرى اشتراكك — جرّب «تحديث الحالة» أو أعد الاشتراك بعد ثوانٍ'}
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">تصفية حسب النوع</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'attendance', 'bus', 'timetable', 'substitution', 'behavior', 'news', 'general'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setPage(1);
              }}
              className={`px-2.5 py-1 text-sm rounded-md font-medium transition-colors ${
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">جاري التحميل...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-600">لا توجد إشعارات</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-3 py-2.5 hover:bg-gray-50/80 cursor-pointer transition-colors ${
                    !notification.is_read ? getPriorityColor(notification.priority) : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.priority === 'urgent' ? 'bg-red-100' :
                        notification.priority === 'high' ? 'bg-orange-100' :
                        'bg-blue-100'
                      }`}>
                        <span className="text-base">{getTypeIcon(notification.type)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <h3 className={`text-sm font-semibold leading-tight ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="حذف الإشعار"
                            aria-label="حذف الإشعار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mb-1.5 whitespace-pre-wrap break-words">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <span className="text-sm">{getTypeIcon(notification.type)}</span>
                          {getTypeLabel(notification.type)}
                        </span>
                        <span>•</span>
                        <span>
                          {format(new Date(notification.created_at), 'PPp', { locale: ar })}
                        </span>
                        {notification.priority === 'urgent' && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
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
              <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>

                  <span className="px-3 py-1.5 text-xs text-gray-700">
                    صفحة {page} من {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
