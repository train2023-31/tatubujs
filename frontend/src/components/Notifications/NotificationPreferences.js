import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bell, BellOff, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.tatubu.com';

const NotificationPreferences = () => {
  const { token } = useAuth();
  const { subscribeToPush, unsubscribeFromPush, isSubscribed } = useNotifications();
  
  const [preferences, setPreferences] = useState({
    attendance_enabled: true,
    bus_enabled: true,
    behavior_enabled: true,
    timetable_enabled: true,
    substitution_enabled: true,
    news_enabled: true,
    general_enabled: true,
    push_enabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/notifications/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPreferences(response.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('فشل في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePushToggle = async () => {
    const newValue = !preferences.push_enabled;
    
    if (newValue && !isSubscribed) {
      // Subscribe to push notifications
      const success = await subscribeToPush();
      if (success) {
        setPreferences((prev) => ({ ...prev, push_enabled: true }));
      }
    } else if (!newValue && isSubscribed) {
      // Unsubscribe from push notifications
      await unsubscribeFromPush();
      setPreferences((prev) => ({ ...prev, push_enabled: false }));
    } else {
      setPreferences((prev) => ({ ...prev, push_enabled: newValue }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(
        `${API_URL}/api/notifications/preferences`,
        preferences,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const preferenceItems = [
    {
      key: 'attendance_enabled',
      label: 'إشعارات الحضور والغياب',
      description: 'استلام إشعارات عند تسجيل الحضور أو الغياب',
      icon: '📝',
    },
    {
      key: 'bus_enabled',
      label: 'إشعارات الحافلة',
      description: 'استلام إشعارات عند ركوب أو نزول الطلاب من الحافلة',
      icon: '🚌',
    },
    {
      key: 'behavior_enabled',
      label: 'إشعارات السلوك',
      description: 'استلام إشعارات عند إضافة ملاحظات سلوكية',
      icon: '⚠️',
    },
    {
      key: 'timetable_enabled',
      label: 'إشعارات الجدول الدراسي',
      description: 'استلام إشعارات عند تحديث الجدول الدراسي',
      icon: '📅',
    },
    {
      key: 'substitution_enabled',
      label: 'إشعارات الاستبدال',
      description: 'استلام إشعارات عند إضافة أو تعديل استبدالات المعلمين',
      icon: '🔄',
    },
    {
      key: 'news_enabled',
      label: 'إشعارات الأخبار',
      description: 'استلام إشعارات عند نشر أخبار جديدة',
      icon: '📰',
    },
    {
      key: 'general_enabled',
      label: 'الإشعارات العامة',
      description: 'استلام الإشعارات العامة من المدرسة',
      icon: '📢',
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Bell className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">إعدادات الإشعارات</h2>
            <p className="text-sm text-gray-600 mt-1">
              قم بتخصيص الإشعارات التي تريد استلامها
            </p>
          </div>
        </div>
      </div>

      {/* Push Notifications Section */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${preferences.push_enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              {preferences.push_enabled ? (
                <Bell className="w-5 h-5 text-green-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                الإشعارات الفورية (Push Notifications)
              </h3>
              <p className="text-sm text-gray-600 mt-0.5">
                استلام الإشعارات على الهاتف حتى عند إغلاق التطبيق
              </p>
            </div>
          </div>
          <button
            onClick={handlePushToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.push_enabled ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.push_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preferences List */}
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">أنواع الإشعارات</h3>
        <div className="space-y-3">
          {preferenceItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences[item.key] ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
