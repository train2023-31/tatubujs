import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export { NotificationContext };

const API_URL = process.env.REACT_APP_API_URL || 'https://api.tatabu.om';

export const NotificationProvider = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushSubscription, setPushSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Configure axios with token
  const getAxiosConfig = useCallback(() => {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }, [token]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!isAuthenticated || !token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page);
      if (options.per_page) params.append('per_page', options.per_page);
      if (options.unread_only) params.append('unread_only', 'true');
      if (options.type) params.append('type', options.type);

      const response = await axios.get(
        `${API_URL}/api/notifications?${params.toString()}`,
        getAxiosConfig()
      );

      setNotifications(response.data.notifications || []);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, getAxiosConfig]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    try {
      const response = await axios.get(
        `${API_URL}/api/notifications/unread-count`,
        getAxiosConfig()
      );

      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [isAuthenticated, token, getAxiosConfig]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {},
        getAxiosConfig()
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [token, getAxiosConfig]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/api/notifications/mark-all-read`,
        {},
        getAxiosConfig()
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);

      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('فشل في تحديث الإشعارات');
    }
  }, [token, getAxiosConfig]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported');
      toast.error('المتصفح لا يدعم الإشعارات الفورية');
      return false;
    }

    if (!token) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    try {
      // Request permission first
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        toast.error('يجب السماح بالإشعارات أولاً من إعدادات المتصفح');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 
        'otk5B991dGEVuaObktl3OXNPc2jVahdqGa-h_nUtNkuYBD69BL_VvdjAbl-TnK3BavbuVCqywIvUYRsnlTvccg';
      
      if (!vapidPublicKey || vapidPublicKey.trim() === '') {
        console.error('VAPID key is empty');
        toast.error('خطأ في إعدادات الإشعارات. يرجى الاتصال بالدعم الفني.');
        return false;
      }

      // Clean the key (remove whitespace)
      const cleanKey = vapidPublicKey.trim();

      // Validate VAPID key format (should be base64 URL-safe, typically 87 characters)
      if (cleanKey.length < 80 || cleanKey.length > 100) {
        console.error('Invalid VAPID key length:', cleanKey.length, 'Key:', cleanKey.substring(0, 20) + '...');
        toast.error('مفتاح VAPID غير صحيح. يرجى التحقق من الإعدادات.');
        return false;
      }

      // Validate key contains only valid base64 URL-safe characters
      const validChars = /^[A-Za-z0-9_-]+$/;
      if (!validChars.test(cleanKey)) {
        console.error('VAPID key contains invalid characters');
        toast.error('مفتاح VAPID يحتوي على أحرف غير صحيحة.');
        return false;
      }

      let applicationServerKey;
      try {
        applicationServerKey = urlBase64ToUint8Array(cleanKey);
        
        // Validate the converted key length (should be 65 bytes for uncompressed point)
        if (!applicationServerKey || applicationServerKey.length !== 65) {
          console.error('Invalid VAPID key length after conversion:', applicationServerKey?.length);
          console.error('Expected 65 bytes, got:', applicationServerKey?.length);
          toast.error('مفتاح VAPID غير صحيح بعد التحويل.');
          return false;
        }
      } catch (error) {
        console.error('Error converting VAPID key:', error);
        console.error('Key used:', cleanKey.substring(0, 20) + '...');
        toast.error('خطأ في تحويل مفتاح VAPID. يرجى التحقق من الإعدادات.');
        return false;
      }

      // Subscribe to push notifications
      // Note: applicationServerKey must be a Uint8Array of exactly 65 bytes
      // console.log('Subscribing with VAPID key, length:', applicationServerKey.length);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      setPushSubscription(subscription);

      // Send subscription to server
      const response = await axios.post(
        `${API_URL}/api/notifications/subscribe`,
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
          device_name: navigator.userAgent,
        },
        getAxiosConfig()
      );

      if (response.status === 200 || response.status === 201) {
        setIsSubscribed(true);
        toast.success('تم الاشتراك في الإشعارات بنجاح');
        return true;
      } else {
        toast.error('فشل في حفظ الاشتراك على الخادم');
        return false;
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      
      // Provide more specific error messages
      if (error.response) {
        // Server error
        const message = error.response.data?.message || 'فشل في الاشتراك في الإشعارات';
        toast.error(message);
      } else if (error.message?.includes('permission')) {
        toast.error('تم رفض الإذن. يرجى السماح بالإشعارات من إعدادات المتصفح');
      } else if (error.message?.includes('service worker')) {
        toast.error('خطأ في Service Worker. يرجى تحديث الصفحة والمحاولة مرة أخرى');
      } else {
        toast.error('فشل في الاشتراك في الإشعارات. يرجى المحاولة مرة أخرى');
      }
      
      return false;
    }
  }, [token, getAxiosConfig, requestNotificationPermission]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    if (!pushSubscription) return;

    try {
      await pushSubscription.unsubscribe();

      // Notify server
      await axios.post(
        `${API_URL}/api/notifications/unsubscribe`,
        { endpoint: pushSubscription.endpoint },
        getAxiosConfig()
      );

      setPushSubscription(null);
      setIsSubscribed(false);
      toast.success('تم إلغاء الاشتراك في الإشعارات');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('فشل في إلغاء الاشتراك');
    }
  }, [pushSubscription, token, getAxiosConfig]);

  // Check if already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isAuthenticated || !('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          setPushSubscription(subscription);
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error('Error checking push subscription:', error);
      }
    };

    checkSubscription();
  }, [isAuthenticated]);

  // Fetch notifications and unread count on mount and periodically
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications({ per_page: 20 });
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    // Listen for messages from service worker (when push notification is received)
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'NEW_NOTIFICATION') {
        // Refresh notification count when push notification is received
        fetchUnreadCount();
        fetchNotifications({ per_page: 20 });
      } else if (event.data && event.data.type === 'REFRESH_NOTIFICATIONS') {
        // Refresh notifications when requested
        fetchUnreadCount();
        fetchNotifications({ per_page: 20 });
      }
    };

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Listen for visibility change (when app comes to foreground)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App came to foreground, refresh notifications
        fetchUnreadCount();
        fetchNotifications({ per_page: 20 });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  // Delete a notification for the current user
  const deleteNotification = useCallback(async (notificationId) => {
    if (!token) return false;

    try {
      await axios.delete(
        `${API_URL}/api/notifications/${notificationId}/delete`,
        getAxiosConfig()
      );

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      
      // Refresh unread count
      fetchUnreadCount();
      
      toast.success('تم حذف الإشعار');
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('فشل في حذف الإشعار');
      return false;
    }
  }, [token, getAxiosConfig, fetchUnreadCount]);

  // Delete all notifications for the current user (soft delete)
  const deleteAllNotifications = useCallback(async () => {
    if (!token) return false;

    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/delete-all`,
        {},
        getAxiosConfig()
      );

      const count = response.data?.count ?? 0;
      setNotifications([]);
      setUnreadCount(0);
      fetchUnreadCount();

      if (count > 0) {
        toast.success(`تم حذف ${count} إشعار`);
      } else {
        toast.success('لا توجد إشعارات للحذف');
      }
      return true;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('فشل في حذف الإشعارات');
      return false;
    }
  }, [token, getAxiosConfig, fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    loading,
    pushSubscription,
    isSubscribed,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    subscribeToPush,
    unsubscribeFromPush,
    requestNotificationPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Helper functions
function urlBase64ToUint8Array(base64String) {
  // Remove any whitespace
  const cleanString = base64String.trim();
  
  // Add padding if needed (base64 requires length to be multiple of 4)
  const padding = '='.repeat((4 - (cleanString.length % 4)) % 4);
  
  // Convert URL-safe base64 to standard base64
  const base64 = (cleanString + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  try {
    // Decode base64 to binary string
    const rawData = window.atob(base64);
    
    // Convert binary string to Uint8Array
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    // VAPID public key should be exactly 65 bytes (uncompressed EC point)
    // First byte is 0x04 (uncompressed point indicator), followed by 64 bytes of coordinates
    // However, some keys might be 64 bytes (compressed format) or missing the 0x04 prefix
    
    if (outputArray.length === 64) {
      // Key is 64 bytes - likely missing the 0x04 prefix
      // Create a new array with 0x04 prefix
      const paddedArray = new Uint8Array(65);
      paddedArray[0] = 0x04; // Add uncompressed point indicator
      paddedArray.set(outputArray, 1); // Copy the 64 bytes after the prefix
      console.warn('VAPID key was 64 bytes, added 0x04 prefix to make it 65 bytes');
      return paddedArray;
    }
    
    if (outputArray.length !== 65) {
      throw new Error(`Invalid VAPID key length: expected 65 bytes (or 64 bytes), got ${outputArray.length}`);
    }
    
    // Verify first byte is 0x04 (uncompressed point)
    // If not, but length is 65, it might be a valid key with different format
    if (outputArray[0] !== 0x04) {
      console.warn(`VAPID key first byte is 0x${outputArray[0].toString(16)}, expected 0x04. Attempting to use as-is.`);
      // Some valid VAPID keys might not start with 0x04, so we'll allow it but warn
    }
    
    return outputArray;
  } catch (error) {
    console.error('Base64 decoding error:', error);
    console.error('Input string:', cleanString.substring(0, 30) + '...');
    console.error('Key used:', cleanString.substring(0, 20) + '...');
    throw new Error(`Failed to decode VAPID key: ${error.message}`);
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
