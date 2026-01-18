import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export { NotificationContext };

const API_URL = process.env.REACT_APP_API_URL || 'https://api.tatubu.com';

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
      return false;
    }

    try {
      // Request permission first
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        toast.error('يجب السماح بالإشعارات أولاً');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || 
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SGeUmo6GNfhPNGa4VB91iZKqQ5SDMIpOUwfEhvJZ-8N5-P2iEzDQXCw'
        ),
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
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('فشل في الاشتراك في الإشعارات');
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
  }, [pushSubscription, getAxiosConfig]);

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
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
