import React, { useEffect } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import toast from 'react-hot-toast';

/**
 * Example: Push Notification Settings Component
 * 
 * This component demonstrates how to integrate push notification
 * subscription/unsubscription into your app's settings page.
 */
const PushNotificationSettings = () => {
  const {
    permission,
    isSubscribed,
    isLoading,
    error,
    isSupported,
    subscribe,
    unsubscribe,
    toggleSubscription,
    sendTestNotification
  } = usePushNotifications();

  // Show error if any
  useEffect(() => {
    if (error) {
      toast.error(`خطأ: ${error}`);
    }
  }, [error]);

  // Handle browsers that don't support push
  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-semibold mb-2">
          ⚠️ المتصفح غير مدعوم
        </h3>
        <p className="text-yellow-700 text-sm">
          المتصفح الحالي لا يدعم الإشعارات الفورية. يرجى استخدام Chrome أو Firefox أو Safari (iOS 16.4+).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🔔 إعدادات الإشعارات الفورية
        </h2>
        <p className="text-sm text-gray-600">
          استقبل إشعارات فورية عند حدوث تحديثات مهمة حتى عند إغلاق التطبيق
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">حالة الإذن:</span>
          <span className={`text-sm font-semibold ${
            permission === 'granted' ? 'text-green-600' :
            permission === 'denied' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {permission === 'granted' ? '✓ مفعّل' :
             permission === 'denied' ? '✗ مرفوض' :
             '⏳ في الانتظار'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">حالة الاشتراك:</span>
          <span className={`text-sm font-semibold ${
            isSubscribed ? 'text-green-600' : 'text-gray-400'
          }`}>
            {isSubscribed ? '✓ مشترك' : '✗ غير مشترك'}
          </span>
        </div>
      </div>

      {/* Permission Denied Warning */}
      {permission === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium mb-2">
            ⚠️ تم رفض إذن الإشعارات
          </p>
          <p className="text-red-700 text-sm mb-3">
            لتفعيل الإشعارات، يجب تغيير إعدادات المتصفح يدوياً:
          </p>
          <ol className="text-red-700 text-sm space-y-1 list-decimal list-inside">
            <li>انقر على أيقونة القفل في شريط العنوان</li>
            <li>ابحث عن "الإشعارات" أو "Notifications"</li>
            <li>غيّر الإعداد إلى "السماح" أو "Allow"</li>
            <li>أعد تحميل الصفحة</li>
          </ol>
        </div>
      )}

      {/* Main Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={toggleSubscription}
          disabled={isLoading || permission === 'denied'}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            isSubscribed
              ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
              : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
          } disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              جاري المعالجة...
            </span>
          ) : isSubscribed ? (
            '🔕 إلغاء الاشتراك'
          ) : (
            '🔔 تفعيل الإشعارات'
          )}
        </button>

        {/* Test Notification Button */}
        {isSubscribed && (
          <button
            onClick={sendTestNotification}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            📨 اختبار
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
          <span>ℹ️</span>
          <span>معلومات مهمة</span>
        </h4>
        <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
          <li>الإشعارات تعمل حتى عند إغلاق التطبيق</li>
          <li>يمكنك التحكم في أنواع الإشعارات من صفحة الإعدادات</li>
          <li>على iOS: يجب تثبيت التطبيق على الشاشة الرئيسية أولاً</li>
          <li>يمكنك إلغاء الاشتراك في أي وقت</li>
        </ul>
      </div>

      {/* iOS Specific Instructions */}
      {navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')} && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-purple-900 font-semibold mb-2 flex items-center gap-2">
            <span>📱</span>
            <span>خطوات إضافية لأجهزة iOS</span>
          </h4>
          <ol className="text-purple-800 text-sm space-y-2 list-decimal list-inside">
            <li>
              <strong>أضف التطبيق للشاشة الرئيسية:</strong>
              <br />
              <span className="text-xs">اضغط على زر المشاركة (□↑) ثم "إضافة للشاشة الرئيسية"</span>
            </li>
            <li>
              <strong>افتح التطبيق من الشاشة الرئيسية</strong>
              <br />
              <span className="text-xs">(وليس من متصفح Safari)</span>
            </li>
            <li>
              <strong>فعّل الإشعارات من هنا</strong>
            </li>
          </ol>
        </div>
      )}

      {/* Technical Details (collapsible) */}
      <details className="bg-gray-100 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold text-gray-700 select-none">
          🔧 تفاصيل تقنية
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <div>
            <strong>دعم المتصفح:</strong> {isSupported ? '✓ مدعوم' : '✗ غير مدعوم'}
          </div>
          <div>
            <strong>Service Worker:</strong> {
              'serviceWorker' in navigator ? '✓ متاح' : '✗ غير متاح'
            }
          </div>
          <div>
            <strong>Push Manager:</strong> {
              'PushManager' in window ? '✓ متاح' : '✗ غير متاح'
            }
          </div>
          <div>
            <strong>VAPID Public Key:</strong> {
              process.env.REACT_APP_VAPID_PUBLIC_KEY 
                ? `${process.env.REACT_APP_VAPID_PUBLIC_KEY.substring(0, 20)}...` 
                : '✗ غير مكوّن'
            }
          </div>
        </div>
      </details>
    </div>
  );
};

export default PushNotificationSettings;


/**
 * Example 2: Simple Toggle Component
 * 
 * Minimal component for enabling/disabling push notifications
 */
export const SimplePushToggle = () => {
  const { isSubscribed, toggleSubscription, isLoading, isSupported } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      <div>
        <h3 className="font-semibold text-gray-900">الإشعارات الفورية</h3>
        <p className="text-sm text-gray-600">
          {isSubscribed ? 'مفعّلة' : 'غير مفعّلة'}
        </p>
      </div>
      <button
        onClick={toggleSubscription}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isSubscribed ? 'bg-green-500' : 'bg-gray-300'
        } disabled:opacity-50`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isSubscribed ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};


/**
 * Example 3: Auto-Subscribe on Login
 * 
 * Automatically attempt to subscribe when user logs in
 */
export const useAutoSubscribe = (isLoggedIn) => {
  const { subscribe, isSubscribed, isSupported } = usePushNotifications();

  useEffect(() => {
    // Only auto-subscribe if:
    // 1. User is logged in
    // 2. Not already subscribed
    // 3. Push is supported
    // 4. Permission is not denied
    if (
      isLoggedIn && 
      !isSubscribed && 
      isSupported && 
      Notification.permission !== 'denied'
    ) {
      // Wait a bit after login to ask
      const timer = setTimeout(() => {
        subscribe().catch(err => {
          console.warn('Auto-subscribe failed:', err);
          // Fail silently - user can manually enable later
        });
      }, 3000); // Wait 3 seconds after login

      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, isSubscribed, isSupported, subscribe]);
};
