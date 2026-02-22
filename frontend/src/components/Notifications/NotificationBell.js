import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationBell = () => {
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

  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const dropdownRef = useRef(null);
  const dropdownContentRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  // Detect mobile device (must be defined before useEffects that use it)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Reset transform when dropdown closes
  useEffect(() => {
    if (!isOpen && dropdownContentRef.current) {
      dropdownContentRef.current.style.transform = '';
      dropdownContentRef.current.style.opacity = '';
    }
  }, [isOpen]);

  // Close dropdown when clicking outside (mobile-friendly)
  useEffect(() => {
    if (!isOpen) return;

    let clickStartTime = 0;
    let clickTarget = null;

    const handleClickOutside = (event) => {
      // On mobile, check if click is on backdrop (which handles its own close)
      if (isMobile) {
        // Only close if clicking directly on backdrop, not if event bubbled from dropdown
        const isBackdrop = event.target.classList?.contains('notification-backdrop') || 
                          (event.target === document.body || event.target === document.documentElement);
        if (isBackdrop && dropdownContentRef.current && !dropdownContentRef.current.contains(event.target)) {
          setIsOpen(false);
        }
        return;
      }

      // Desktop: check if click is outside both button and dropdown
      const isOutsideButton = dropdownRef.current && !dropdownRef.current.contains(event.target);
      const isOutsideDropdown = dropdownContentRef.current && !dropdownContentRef.current.contains(event.target);
      
      if (isOutsideButton && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Use a longer delay on mobile to avoid immediate closure
    const delay = isMobile ? 300 : 100;
    const timeoutId = setTimeout(() => {
      // Support both mouse and touch events
      document.addEventListener('mousedown', handleClickOutside, { passive: true });
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      document.addEventListener('keydown', handleEscape);
    }, delay);
    
    // Prevent body scroll when dropdown is open on mobile
    if (isMobile) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (isMobile) {
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      }
    };
  }, [isOpen, isMobile]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Refresh notifications when opening
      fetchNotifications({ per_page: 20 });
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to the action URL if available
    if (notification.action_url) {
      window.location.href = notification.action_url;
      setIsOpen(false);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation(); // Prevent triggering the click handler
    if (window.confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
      await deleteNotification(notificationId);
      fetchNotifications({ per_page: 20 }); // Refresh the list
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const filteredNotifications = selectedType === 'all'
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'normal':
        return 'text-blue-600 bg-blue-50';
      case 'low':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-blue-600 bg-blue-50';
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
      substitution: 'الإحتياط',
      news: 'الأخبار',
      general: 'عام',
    };
    return labels[type] || 'عام';
  };

  // Handle swipe down to close on mobile
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isOpen || !dropdownContentRef.current) return;
    const touchY = e.touches[0].clientY;
    
    if (touchY > touchStartY.current) {
      // Swiping down
      const diff = touchY - touchStartY.current;
      if (diff > 0) {
        dropdownContentRef.current.style.transform = `translateY(${Math.min(diff, 100)}px)`;
        dropdownContentRef.current.style.opacity = `${Math.max(1 - diff / 200, 0.5)}`;
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (!isMobile || !isOpen || !dropdownContentRef.current) return;
    const touchY = e.changedTouches[0].clientY;
    const diff = touchY - touchStartY.current;
    const timeDiff = Date.now() - touchStartTime.current;
    
    // Reset transform
    dropdownContentRef.current.style.transform = '';
    dropdownContentRef.current.style.opacity = '';
    
    // Close if swiped down more than 100px or fast swipe
    if (diff > 100 || (diff > 50 && timeDiff < 300)) {
      setIsOpen(false);
    }
  };

  // Render dropdown content
  const dropdownContent = isOpen ? (
    <>
      {/* Mobile backdrop - always on top except dropdown */}
      {isMobile && (
        <div 
          className="notification-backdrop fixed inset-0 bg-black bg-opacity-50 z-[9998]"
          onClick={(e) => {
            // Only close if clicking directly on backdrop, not if event bubbled from dropdown
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              setIsOpen(false);
            }
          }}
          onTouchStart={(e) => {
            // Only close if touching directly on backdrop
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              setIsOpen(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="إغلاق الإشعارات"
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        />
      )}
      
      <div 
            ref={dropdownContentRef}
            className={`
              notification-dropdown
              ${isMobile 
                ? 'fixed inset-x-0 bottom-0 top-auto mb-0 rounded-t-2xl rounded-b-none max-h-[85vh] min-h-[50vh] w-full z-[9999]' 
                : 'absolute left-0 mt-2 w-120 max-w-[calc(100vw-2rem)] rounded-lg z-[9999] max-h-[80vh]'
              }
              bg-white shadow-2xl border border-gray-200 flex flex-col
              ${isMobile ? 'transition-transform duration-200 ease-out' : ''}
            `}
            style={isMobile ? { 
              position: 'fixed',
              zIndex: 9999,
              height: '85vh',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              WebkitTransform: 'translateZ(0)', // Hardware acceleration for mobile
              transform: 'translateZ(0)',
              touchAction: 'pan-y' // Allow vertical scrolling, prevent horizontal
            } : {
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (isMobile) {
                handleTouchStart(e);
              }
            }}
            onTouchMove={isMobile ? (e) => {
              e.stopPropagation();
              handleTouchMove(e);
            } : undefined}
            onTouchEnd={isMobile ? (e) => {
              e.stopPropagation();
              handleTouchEnd(e);
            } : undefined}
          >
          {/* Mobile drag handle */}
          {isMobile && (
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
          )}

          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              الإشعارات
              {unreadCount > 0 && (
                <span className="mr-2 text-xs sm:text-sm text-gray-600">
                  ({unreadCount} غير مقروء)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAllAsRead();
                    }}
                    className="text-xs sm:text-sm text-indigo-600 active:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded"
                    style={{ touchAction: 'manipulation' }}
                    title="تحديد الكل كمقروء"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">تحديد الكل كمقروء</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
                        deleteAllNotifications().then(() => fetchNotifications({ per_page: 20 }));
                      }
                    }}
                    className="text-xs sm:text-sm text-red-600 active:text-red-800 flex items-center gap-1 px-2 py-1 rounded"
                    style={{ touchAction: 'manipulation' }}
                    title="حذف الكل"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">حذف الكل</span>
                  </button>
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="text-gray-400 active:text-gray-600 p-1 rounded"
                style={{ touchAction: 'manipulation' }}
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div 
            className="p-2 border-b border-gray-200 bg-gray-50 flex gap-1.5 sm:gap-2 overflow-x-auto sticky top-[60px] sm:top-[73px] z-10 notification-filter-tabs"
            style={{
              ...(isMobile ? {
                scrollbarWidth: 'auto',
                scrollbarColor: '#64748b #e2e8f0',
              } : {
                scrollbarWidth: 'thin',
                scrollbarColor: '#94a3b8 #f1f5f9',
              }),
              WebkitOverflowScrolling: 'touch',
              overflowX: 'auto',
              overflowY: 'hidden',
            }}
          >
            {['all', 'attendance', 'bus', 'timetable', 'substitution', 'news'].map((type) => (
              <button
                key={type}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType(type);
                }}
                className={`px-3 py-1.5 sm:px-3 sm:py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors active:scale-95 ${
                  selectedType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 active:bg-gray-100'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {type === 'all' ? 'الكل' : getTypeLabel(type)}
              </button>
            ))}
          </div>

          {/* Notifications List - Scrollable Container */}
          <div 
            className={`overflow-y-auto overscroll-contain bg-white ${isMobile ? '' : 'flex-1'}`}
            style={{ 
              WebkitOverflowScrolling: 'touch',
              ...(isMobile ? { 
                flex: '1 1 0%',
                height: 'calc(85vh - 250px)',
                minHeight: 'calc(85vh - 250px)',
                maxHeight: 'calc(85vh - 250px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              } : {
                flex: '1 1 0%',
                minHeight: '200px',
                maxHeight: 'calc(80vh - 180px)'
              })
            }}
          >
            {loading && notifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500" style={{ minHeight: isMobile ? '300px' : '200px', display: 'block' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm">جاري التحميل...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500" style={{ minHeight: isMobile ? '300px' : '200px', display: 'block' }}>
                <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">لا توجد إشعارات</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100" style={{ display: 'block', width: '100%', minHeight: isMobile ? '100%' : 'auto' }}>
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(notification);
                    }}
                    className={`p-3 sm:p-4 active:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${getPriorityColor(notification.priority)}`}>
                        <span className="text-base sm:text-lg">{getTypeIcon(notification.type)}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm sm:text-sm font-semibold leading-snug ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                            )}
                            <button
                              onClick={(e) => handleDeleteNotification(e, notification.id)}
                              onTouchStart={(e) => e.stopPropagation()}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded transition-colors"
                              style={{ touchAction: 'manipulation' }}
                              title="حذف الإشعار"
                              aria-label="حذف الإشعار"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] sm:text-xs text-gray-500">
                            {format(new Date(notification.created_at), 'PPp', { locale: ar })}
                          </span>
                          {notification.priority === 'urgent' && (
                            <span className="text-[10px] sm:text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              عاجل
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          { (
            <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/app/notifications';
                  setIsOpen(false);
                }}
                className="w-full text-sm text-center text-indigo-600 active:text-indigo-800 font-medium py-2 rounded-lg active:bg-indigo-50"
                style={{ touchAction: 'manipulation' }}
              >
                عرض جميع الإشعارات / الإعدادات
              </button>
            </div>
          )}
      </div>
    </>
  ) : null;

  return (
    <>
      <div className="relative z-[9999]" ref={dropdownRef}>
        {/* Bell Icon Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="relative p-2 sm:p-2.5 text-gray-600 hover:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
          style={{ touchAction: 'manipulation' }}
          aria-label="الإشعارات"
        >
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-1 inline-flex items-center justify-center px-1.5 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[12px] sm:min-w-[20px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Desktop Dropdown - render normally */}
        {isOpen && !isMobile && dropdownContent}
      </div>

      {/* Mobile Dropdown - render via portal to body */}
      {isOpen && isMobile && typeof document !== 'undefined' && createPortal(
        dropdownContent,
        document.body
      )}
    </>
  );
};

export default NotificationBell;
