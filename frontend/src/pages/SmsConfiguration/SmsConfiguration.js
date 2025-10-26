import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Settings, 
  Smartphone, 
  Save, 
  Eye, 
  EyeOff, 
  TestTube,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

const SmsConfiguration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  console.log('SmsConfiguration component rendered:', { 
    user: user, 
    school_id: user?.school_id,
    user_role: user?.user_role 
  });
  
  // State for SMS configuration
  const [config, setConfig] = useState({
    ibulk_username: '',
    ibulk_password: '',
    ibulk_sender_id: '',
    ibulk_api_url: 'https://ismartsms.net/api/send',
    ibulk_balance_threshold: 10.0
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [testSmsData, setTestSmsData] = useState({
    phone_number: '',
    message: 'هذه رسالة تجريبية من نظام إدارة الحضور'
  });

  // Fetch SMS configuration
  const { data: smsConfig, isLoading, error, refetch } = useQuery(
    ['smsConfig', user?.school_id],
    () => {
      console.log('Fetching SMS config for school_id:', user?.school_id);
      return authAPI.getSmsConfig(user?.school_id);
    },
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onSuccess: (data) => {
        console.log('SMS config fetched successfully:', data);
        const smsConfigData = data.sms_config || {};
        setConfig({
          ibulk_username: smsConfigData.ibulk_username || '',
          ibulk_password: smsConfigData.ibulk_password || '',
          ibulk_sender_id: smsConfigData.ibulk_sender_id || '',
          ibulk_api_url: smsConfigData.ibulk_api_url || 'https://ismartsms.net/api/send',
          ibulk_balance_threshold: smsConfigData.ibulk_balance_threshold || 10.0
        });
        
        // Set balance info if available
        if (smsConfigData.ibulk_current_balance !== undefined) {
          setBalanceInfo({
            current_balance: smsConfigData.ibulk_current_balance,
            last_check: smsConfigData.ibulk_last_balance_check,
            threshold: smsConfigData.ibulk_balance_threshold || 10.0
          });
        }
      },
      onError: (error) => {
        console.error('Error fetching SMS config:', error);
        toast.error('فشل في تحميل إعدادات SMS');
      },
      retry: 2,
      retryDelay: 1000
    }
  );

  // Fetch configuration when component mounts or user changes
  useEffect(() => {
    console.log('SmsConfiguration useEffect triggered:', { 
      school_id: user?.school_id, 
      user: user,
      isLoading 
    });
    
    if (user) {
      console.log('User available, refetching SMS config...');
      refetch();
    } else {
      console.log('No user available, skipping fetch');
    }
  }, [user, refetch]);

  // Update SMS configuration mutation
  const updateConfigMutation = useMutation(
    (configData) => authAPI.updateSmsConfig(configData),
    {
      onSuccess: (response) => {
        toast.success('تم حفظ الإعدادات بنجاح');
        queryClient.invalidateQueries(['smsConfig', user?.school_id]);
        setIsSaving(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في حفظ الإعدادات');
        setIsSaving(false);
      },
    }
  );

  // Test SMS connection mutation
  const testConnectionMutation = useMutation(
    (testData) => authAPI.testSmsConnection(testData),
    {
      onSuccess: (response) => {
        setTestResults({
          success: true,
          message: response.message?.ar || 'تم اختبار الاتصال بنجاح',
          details: response.details || null
        });
        setIsTesting(false);
        toast.success('تم اختبار الاتصال بنجاح');
      },
      onError: (error) => {
        setTestResults({
          success: false,
          message: error.response?.data?.message?.ar || 'فشل في اختبار الاتصال',
          details: error.response?.data?.details || null
        });
        setIsTesting(false);
        toast.error('فشل في اختبار الاتصال');
      },
    }
  );

  // Check SMS balance mutation
  const checkBalanceMutation = useMutation(
    () => authAPI.checkSmsBalance(user?.school_id),
    {
      onSuccess: (response) => {
        setBalanceInfo({
          current_balance: response.current_balance || 0,
          last_check: response.last_check || null,
          threshold: config.ibulk_balance_threshold || 10.0
        });
        setIsCheckingBalance(false);
        toast.success('تم تحديث معلومات الرصيد');
        // Refresh SMS config to get updated balance
        queryClient.invalidateQueries(['smsConfig', user?.school_id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في التحقق من الرصيد');
        setIsCheckingBalance(false);
      },
    }
  );

  // Send test SMS mutation
  const sendTestSmsMutation = useMutation(
    (smsData) => authAPI.sendTestSms(smsData),
    {
      onSuccess: (response) => {
        toast.success(response.message?.ar || 'تم إرسال الرسالة التجريبية بنجاح');
        setIsSendingTestSms(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في إرسال الرسالة التجريبية');
        setIsSendingTestSms(false);
      },
    }
  );

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save configuration
  const handleSave = () => {
    setIsSaving(true);
    updateConfigMutation.mutate({
      school_id: user?.school_id,
      ...config
    });
  };

  // Handle test connection
  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResults(null);
    testConnectionMutation.mutate({
      school_id: user?.school_id,
      ibulk_username: config.ibulk_username,
      ibulk_password: config.ibulk_password,
      ibulk_sender_id: config.ibulk_sender_id,
      ibulk_api_url: config.ibulk_api_url
    });
  };

  // Handle check balance
  const handleCheckBalance = () => {
    setIsCheckingBalance(true);
    checkBalanceMutation.mutate();
  };

  // Handle test SMS data changes
  const handleTestSmsChange = (field, value) => {
    setTestSmsData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle send test SMS
  const handleSendTestSms = () => {
    if (!testSmsData.phone_number.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }

    if (!testSmsData.message.trim()) {
      toast.error('يرجى إدخال الرسالة');
      return;
    }

    // Format phone number to include 968 country code if not present
    let phoneNumber = testSmsData.phone_number.replace(/[^0-9]/g, ''); // Remove all non-numeric characters
    
    // Add 968 country code if not present
    if (!phoneNumber.startsWith('968')) {
      if (phoneNumber.length === 8) {
        phoneNumber = '968' + phoneNumber;
      } else if (phoneNumber.length === 9 && phoneNumber.startsWith('9')) {
        phoneNumber = '968' + phoneNumber;
      }
    }

    setIsSendingTestSms(true);
    sendTestSmsMutation.mutate({
      phone_number: phoneNumber,
      message: testSmsData.message
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'لم يتم التحقق بعد';
    return new Date(dateString).toLocaleString('ar-SA');
  };

  // Get balance status color
  const getBalanceStatusColor = () => {
    if (!balanceInfo) return 'text-gray-500';
    if (balanceInfo.current_balance >= balanceInfo.threshold) return 'text-green-600';
    if (balanceInfo.current_balance > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get balance status text
  const getBalanceStatusText = () => {
    if (!balanceInfo) return 'غير محدد';
    if (balanceInfo.current_balance >= balanceInfo.threshold) return 'رصيد كافي';
    if (balanceInfo.current_balance > 0) return 'رصيد منخفض';
    return 'لا يوجد رصيد';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل إعدادات SMS...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل الإعدادات</h3>
        <p className="text-gray-500">فشل في تحميل إعدادات SMS للمدرسة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
 

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات SMS</h1>
          <p className="text-gray-600">تكوين إعدادات خدمة iBulk SMS للمدرسة</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              console.log('Manual refetch triggered');
              refetch();
            }}
            className="btn btn-outline ml-2"
          >
            <RefreshCw className="h-5 w-5 mr-2 ml-2" />
            إعادة تحميل الإعدادات
          </button>
          <button
            onClick={handleCheckBalance}
            disabled={isCheckingBalance}
            className="btn btn-outline"
          >
            {isCheckingBalance ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="mr-2">جاري التحقق...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2 ml-2" />
                تحديث الرصيد
              </>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="mr-2">جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2 ml-2" />
                حفظ الإعدادات
              </>
            )}
          </button>
        </div>
      </div>

      {/* SMS Status Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">حالة خدمة SMS</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SMS Status */}
            <div className="text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                مفعل دائماً
              </div>
              <p className="text-sm text-gray-600 mt-2">حالة الخدمة</p>
            </div>

            {/* Current Balance */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getBalanceStatusColor()}`}>
                {balanceInfo ? `${balanceInfo.current_balance.toFixed(2)} ر.ع` : 'غير محدد'}
              </div>
              <p className="text-sm text-gray-600 mt-2">الرصيد الحالي</p>
            </div>

            {/* Balance Status */}
            <div className="text-center">
              <div className={`text-lg font-medium ${getBalanceStatusColor()}`}>
                {getBalanceStatusText()}
              </div>
              <p className="text-sm text-gray-600 mt-2">حالة الرصيد</p>
            </div>
          </div>

          {/* Last Balance Check */}
          {balanceInfo?.last_check && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>آخر تحديث للرصيد: {formatDate(balanceInfo.last_check)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">إعدادات iBulk SMS</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={config.ibulk_username}
                onChange={(e) => handleInputChange('ibulk_username', e.target.value)}
                className="input w-full"
                placeholder="أدخل اسم المستخدم"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.ibulk_password}
                  onChange={(e) => handleInputChange('ibulk_password', e.target.value)}
                  className="input w-full pr-10"
                  placeholder="أدخل كلمة المرور"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sender ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                معرف المرسل
              </label>
              <input
                type="text"
                value={config.ibulk_sender_id}
                onChange={(e) => handleInputChange('ibulk_sender_id', e.target.value)}
                className="input w-full"
                placeholder="أدخل معرف المرسل (حد أقصى 11 حرف)"
                maxLength={11}
              />
              <p className="text-xs text-gray-500 mt-1">حد أقصى 11 حرف أبجدي رقمي</p>
            </div>

            {/* API URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط API
              </label>
              <input
                type="url"
                value={config.ibulk_api_url}
                onChange={(e) => handleInputChange('ibulk_api_url', e.target.value)}
                className="input w-full"
                placeholder="https://ismartsms.net/api/send"
              />
            </div>

            {/* Balance Threshold */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حد الرصيد الأدنى
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={config.ibulk_balance_threshold}
                  onChange={(e) => handleInputChange('ibulk_balance_threshold', parseFloat(e.target.value) || 0)}
                  className="input w-full pl-8"
                  placeholder="10.0"
                  min="0"
                  step="0.1"
                />
                <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه عند انخفاض الرصيد عن هذا الحد</p>
            </div>
          </div>

          {/* Test Connection Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.ibulk_username || !config.ibulk_password}
              className="btn btn-outline"
            >
              {isTesting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الاختبار...</span>
                </>
              ) : (
                <>
                  <TestTube className="h-5 w-5 mr-2" />
                  اختبار الاتصال
                </>
              )}
            </button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className={`mt-4 p-4 rounded-lg border ${
              testResults.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {testResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    testResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResults.success ? 'نجح الاختبار' : 'فشل الاختبار'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    testResults.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResults.message}
                  </p>
                  {testResults.details && (
                    <div className="mt-2 text-xs text-gray-600">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(testResults.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test SMS Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">اختبار إرسال SMS</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">اختبار إرسال رسالة SMS:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>أدخل رقم هاتف صحيح لاختبار إرسال الرسالة</li>
                    <li>يمكنك تعديل الرسالة التجريبية أو استخدام الرسالة الافتراضية</li>
                    <li>سيتم إرسال الرسالة باستخدام الإعدادات المحفوظة</li>
                    <li>تأكد من وجود رصيد كافي قبل الاختبار</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف التجريبي
                </label>
                <input
                  type="tel"
                  value={testSmsData.phone_number}
                  onChange={(e) => handleTestSmsChange('phone_number', e.target.value)}
                  className="input w-full"
                  placeholder="96891234567 أو 91234567"
                />
                <p className="text-xs text-gray-500 mt-1">سيتم إضافة رمز الدولة 968 تلقائياً إذا لم يكن موجوداً</p>
              </div>

              {/* Test Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الرسالة التجريبية
                </label>
                <textarea
                  value={testSmsData.message}
                  onChange={(e) => handleTestSmsChange('message', e.target.value)}
                  className="input w-full h-20 resize-none"
                  placeholder="أدخل الرسالة التجريبية..."
                />
                <p className="text-xs text-gray-500 mt-1">يمكنك تعديل الرسالة أو استخدام الرسالة الافتراضية</p>
              </div>
            </div>

            {/* Send Test SMS Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <p>تأكد من صحة الإعدادات قبل إرسال الرسالة التجريبية</p>
              </div>
              <button
                onClick={handleSendTestSms}
                disabled={isSendingTestSms || !testSmsData.phone_number.trim() || !testSmsData.message.trim()}
                className="btn btn-primary"
              >
                {isSendingTestSms ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="mr-2">جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-5 w-5 mr-2" />
                    إرسال رسالة تجريبية
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">تعليمات مهمة</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">خطوات التكوين:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>قم بالتسجيل في خدمة iBulk SMS من موقع ismartsms.net</li>
                <li>احصل على بيانات الاعتماد (اسم المستخدم وكلمة المرور)</li>
                <li>أدخل معرف المرسل المخصص لك (حد أقصى 11 حرف)</li>
                <li>تأكد من صحة رابط API</li>
                <li>اضبط حد الرصيد الأدنى للتنبيهات</li>
                <li>اضغط على "اختبار الاتصال" للتأكد من صحة الإعدادات</li>
                <li>احفظ الإعدادات بعد التأكد من نجاح الاختبار</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">ملاحظات مهمة:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                <li>تأكد من وجود رصيد كافي في حساب iBulk SMS</li>
                <li>معرف المرسل يجب أن يكون معتمداً من قبل مزود الخدمة</li>
                <li>سيتم إرسال تنبيهات عند انخفاض الرصيد عن الحد المحدد</li>
                <li>يمكن اختبار الاتصال في أي وقت للتأكد من صحة الإعدادات</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsConfiguration;
