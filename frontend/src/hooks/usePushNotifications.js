import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing push notifications
 * Handles:
 * - Permission requests
 * - Service worker registration
 * - Push subscription
 * - Subscription management
 */
export const usePushNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pushStatusBackend, setPushStatusBackend] = useState(null); // { subscribed, subscription_count, message }

  // Check if push notifications are supported
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  /**
   * Convert VAPID key from base64 string to Uint8Array
   */
  const urlBase64ToUint8Array = (base64String) => {
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
  };

  /**
   * Check current subscription status
   */
  const checkSubscription = useCallback(async () => {
    if (!isSupported) {
      console.log('Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
        console.log('✅ Already subscribed to push notifications');
      } else {
        setIsSubscribed(false);
        console.log('❌ Not subscribed to push notifications');
      }
      
      return existingSubscription;
    } catch (err) {
      console.error('Error checking subscription:', err);
      setError(err.message);
      return null;
    }
  }, [isSupported]);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Push notifications are not supported in this browser';
      setError(msg);
      toast.error(msg);
      return false;
    }

    try {
      setIsLoading(true);
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        console.log('✅ Notification permission granted');
        toast.success('تم تفعيل الإشعارات');
        return true;
      } else if (result === 'denied') {
        const msg = 'Notification permission denied';
        setError(msg);
        toast.error('تم رفض الإشعارات');
        return false;
      } else {
        console.log('Notification permission dismissed');
        return false;
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError(err.message);
      toast.error('حدث خطأ أثناء طلب الإذن');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Push notifications are not supported';
      setError(msg);
      toast.error(msg);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check permission first
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return null;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured. Add REACT_APP_VAPID_PUBLIC_KEY to .env');
      }

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('✅ Push subscription created:', pushSubscription);

      // Send subscription to backend
      const subscriptionJson = pushSubscription.toJSON();
      await api.post('/notifications/subscribe', subscriptionJson);

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      toast.success('تم الاشتراك في الإشعارات بنجاح');

      return pushSubscription;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err.message);
      toast.error('فشل الاشتراك في الإشعارات');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      console.log('No subscription to unsubscribe from');
      return true;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Unsubscribe from push manager
      const success = await subscription.unsubscribe();

      if (success) {
        // Notify backend
        try {
          await api.post('/notifications/unsubscribe', {
            endpoint: subscription.endpoint
          });
        } catch (err) {
          console.warn('Failed to notify backend of unsubscribe:', err);
        }

        setSubscription(null);
        setIsSubscribed(false);
        toast.success('تم إلغاء الاشتراك في الإشعارات');
        console.log('✅ Unsubscribed from push notifications');
        return true;
      } else {
        throw new Error('Failed to unsubscribe');
      }
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err.message);
      toast.error('فشل إلغاء الاشتراك');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  /**
   * Toggle subscription
   */
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return await unsubscribe();
    } else {
      const sub = await subscribe();
      return sub !== null;
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  /**
   * Fetch push status from backend (how many devices server has for this user)
   */
  const fetchPushStatus = useCallback(async () => {
    try {
      const res = await api.get('/notifications/push-status');
      setPushStatusBackend(res.data);
      return res.data;
    } catch (err) {
      setPushStatusBackend(null);
      return null;
    }
  }, []);

  /**
   * Send a test notification
   */
  const sendTestNotification = useCallback(async () => {
    if (!isSubscribed) {
      toast.error('يجب الاشتراك أولاً');
      return;
    }

    try {
      await api.post('/notifications', {
        title: 'إشعار تجريبي',
        message: 'هذا إشعار تجريبي من نظام تتبع',
        type: 'general',
        priority: 'normal',
        is_test: true  // Backend will target only current user
      });
      toast.success('تم إرسال الإشعار التجريبي - تحقق من هاتفك خلال ثوانٍ');
    } catch (err) {
      console.error('Error sending test notification:', err);
      toast.error('فشل إرسال الإشعار التجريبي');
    }
  }, [isSubscribed]);

  // Check subscription on mount
  useEffect(() => {
    if (isSupported) {
      checkSubscription();
    }
  }, [isSupported, checkSubscription]);

  // When subscribed, fetch backend status so we can show "registered on server"
  useEffect(() => {
    if (isSubscribed && isSupported) {
      fetchPushStatus();
    } else {
      setPushStatusBackend(null);
    }
  }, [isSubscribed, isSupported, fetchPushStatus]);

  // Listen for permission changes
  useEffect(() => {
    if (!isSupported) return;

    const handlePermissionChange = () => {
      setPermission(Notification.permission);
    };

    // Some browsers support this
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
        permissionStatus.addEventListener('change', handlePermissionChange);
        return () => {
          permissionStatus.removeEventListener('change', handlePermissionChange);
        };
      }).catch(console.error);
    }
  }, [isSupported]);

  return {
    // State
    permission,
    subscription,
    isSubscribed,
    isLoading,
    error,
    isSupported,
    pushStatusBackend,

    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription,
    checkSubscription,
    fetchPushStatus,
    sendTestNotification
  };
};

export default usePushNotifications;
