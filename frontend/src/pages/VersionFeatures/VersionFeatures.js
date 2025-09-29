import React, { useState, useEffect } from 'react';
import { 
  Star, 
  CheckCircle, 
  RefreshCw,
  Clock,
  Tag
} from 'lucide-react';
import { BUILD_INFO } from '../../version';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './VersionFeatures.css';

const VersionFeatures = () => {
  const [serverVersion, setServerVersion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch server version info
    const fetchServerVersion = async () => {
      try {
        const response = await fetch('/version.json');
        const data = await response.json();
        setServerVersion(data);
      } catch (error) {
        console.log('Could not fetch server version:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServerVersion();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Recent versions data
  const recentVersions = [
    {
      version: '1.0.1',
      releaseDate: '2024-09-29',
      type: 'current',
      categories: [
        {
          name: 'ميزات جديدة',
          features: [
            'نظام إشعارات الإصدارات',
            'صفحة ميزات الإصدارات', 
            'اضافة سجل ملاحظات الطالب في تقارير الحضور',
            'اضافة اعداد مدرستك في حال استخدام النظام اول مرة للمستخدمين الجدد',
            'اضافة فيديو توضيحي لرفع قوائم الطلبة وارقام الهواتف',
            'اضافة تقرير المعلمين في التقارير والإحصائيات',
          ]
        },
        {
          name: 'تحسينات الأداء',
          features: [
            'تحسين سرعة تحميل الصفحات',
            'تحسين استهلاك الذاكرة',
            'تحسين استجابة النظام'
          ]
        },
        {
          name: 'تحسينات الأمان',
          features: [
            'تحسينات أمان البيانات',
            'تحسينات في الإدارة',
            'تحسينات في التسجيل'
          ]
        },
        {
          name: 'تحسينات التصميم',
          features: [
            'تحسينات في التصميم',
            'تحسينات في الإعدادات',
            'تحسينات في الإشعارات'
          ]
        },
        {
          name: 'تحسينات التقارير',
          features: [
            'تحسينات في التقارير',
            'تحسينات في الإحصائيات'
          ]
        }
      ]
    },
    {
      version: '1.0.0',
      releaseDate: '2024-09-15',
      type: 'previous',
      categories: [
        {
          name: 'الميزات الأساسية',
          features: [
            'نظام إدارة الحضور والغياب',
            'نظام إدارة المستخدمين',
            'نظام التقارير والإحصائيات'
          ]
        },
        {
          name: 'واجهة المستخدم',
          features: [
            'تصميم متجاوب',
            'دعم اللغة العربية'
          ]
        }
      ]
    }
  ];

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="تتبع" 
                className="h-20 w-20 object-contain ml-4"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">الإصدارات الحديثة</h1>
                <p className="mt-2 text-gray-600">
                  آخر التحديثات والميزات الجديدة
                </p>
              </div>
            </div>
     
          </div>
        </div>

        {/* Recent Versions Timeline */}
        <div className="space-y-8">
          {recentVersions.map((version, versionIndex) => (
            <div key={versionIndex} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Version Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-3 w-3 rounded-full ml-3 ${
                      version.type === 'current' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        الإصدار {version.version}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        صدر في {formatDate(version.releaseDate)}
                      </p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                    version.type === 'current' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {version.type === 'current' ? 'الإصدار الحالي' : 'إصدار سابق'}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-6">
                <div className="space-y-6">
                  {version.categories.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                        <Star className="h-5 w-5 ml-2 text-yellow-500" />
                        {category.name}
                      </h4>
                      <ul className="space-y-3">
                        {category.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start text-gray-700">
                            <CheckCircle className="h-5 w-5 text-green-500 ml-3 flex-shrink-0 mt-0.5" />
                            <span className="text-sm leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VersionFeatures;
