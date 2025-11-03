import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Settings, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Send, 
  DollarSign,
  TestTube,
  Save,
  RefreshCw
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const SmsConfiguration = ({ isOpen, onClose, schoolId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [smsConfig, setSmsConfig] = useState({
    ibulk_username: '',
    ibulk_password: '',
    ibulk_sender_id: '',
    ibulk_api_url: 'https://ismartsms.net/RestApi/api/SMS/PostSMS',
    ibulk_balance_threshold: 10.0
  });
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('رسالة تجريبية من نظام إدارة الحضور');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [balanceInfo, setBalanceInfo] = useState(null);

  // Fetch SMS configuration
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery(
    ['sms-config', schoolId],
    () => authAPI.getSmsConfig(schoolId),
    { 
      enabled: isOpen && !!schoolId,
      onSuccess: (data) => {
        if (data.sms_config) {
          setSmsConfig(prev => ({
            ...prev,
            ...data.sms_config,
            ibulk_password: '' // Don't show password
          }));
        }
      }
    }
  );

  // Update SMS configuration mutation
  const updateConfigMutation = useMutation(
    (configData) => authAPI.updateSmsConfig({
      school_id: schoolId,
      ...configData
    }),
    {
      onSuccess: (data) => {
        toast.success(data.message.ar || 'تم تحديث إعدادات SMS بنجاح');
        refetchConfig();
        queryClient.invalidateQueries(['sms-config', schoolId]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'خطأ في تحديث الإعدادات');
      }
    }
  );

  // Test connection mutation
  const testConnectionMutation = useMutation(
    () => authAPI.testSmsConnection({ school_id: schoolId }),
    {
      onSuccess: (data) => {
        setConnectionStatus(data.connection_status);
        if (data.connection_status.success) {
          toast.success('تم اختبار الاتصال بنجاح');
        } else {
          toast.error('فشل اختبار الاتصال');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'خطأ في اختبار الاتصال');
        setConnectionStatus({ success: false, error: 'خطأ في الاتصال' });
      },
      onSettled: () => {
        setIsTestingConnection(false);
      }
    }
  );

  // Send test SMS mutation
  const sendTestSmsMutation = useMutation(
    (data) => authAPI.sendTestSms({
      school_id: schoolId,
      phone_number: data.phone,
      message: data.message
    }),
    {
      onSuccess: (data) => {
        toast.success(data.message.ar || 'تم إرسال الرسالة التجريبية بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'خطأ في إرسال الرسالة التجريبية');
      },
      onSettled: () => {
        setIsSendingTest(false);
      }
    }
  );

  // Check balance mutation
  const checkBalanceMutation = useMutation(
    () => authAPI.checkSmsBalance(schoolId),
    {
      onSuccess: (data) => {
        setBalanceInfo(data.balance_info);
        toast.success('تم فحص الرصيد بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'خطأ في فحص الرصيد');
      }
    }
  );

  const handleInputChange = (field, value) => {
    setSmsConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(smsConfig);
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    testConnectionMutation.mutate();
  };

  const handleSendTestSms = () => {
    if (!testPhone.trim()) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }
    setIsSendingTest(true);
    sendTestSmsMutation.mutate({
      phone: testPhone,
      message: testMessage
    });
  };

  const handleCheckBalance = () => {
    checkBalanceMutation.mutate();
  };

  const formatBalance = (balance) => {
    return balance ? `${balance.toFixed(2)} OMR` : 'غير متوفر';
  };

  const getStatusIcon = (status) => {
    if (status === null) return <AlertCircle className="w-5 h-5 text-gray-400" />;
    if (status.success) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = (status) => {
    if (status === null) return 'لم يتم الاختبار';
    if (status.success) return 'متصل';
    return 'غير متصل';
  };

  const getStatusColor = (status) => {
    if (status === null) return 'text-gray-500';
    if (status.success) return 'text-green-500';
    return 'text-red-500';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعدادات SMS - iBulk SMS"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">إعدادات خدمة SMS</h3>
            <p className="text-sm text-gray-600">تكوين خدمة iBulk SMS من Omantel</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              {getStatusIcon(connectionStatus)}
              <div>
                <p className="font-medium text-gray-900">حالة الاتصال</p>
                <p className={`text-sm ${getStatusColor(connectionStatus)}`}>
                  {getStatusText(connectionStatus)}
                </p>
              </div>
            </div>
            <div className="flex space-x-2 space-x-reverse">
              <button
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="flex items-center space-x-2 space-x-reverse px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isTestingConnection ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>اختبار الاتصال</span>
              </button>
              <button
                onClick={handleCheckBalance}
                disabled={checkBalanceMutation.isLoading}
                className="flex items-center space-x-2 space-x-reverse px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                <span>فحص الرصيد</span>
              </button>
            </div>
          </div>
          
          {/* Balance Info */}
          {balanceInfo && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">الرصيد الحالي:</span>
                <span className="font-medium text-gray-900">
                  {formatBalance(balanceInfo.balance)}
                </span>
              </div>
              {balanceInfo.balance < smsConfig.ibulk_balance_threshold && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ الرصيد منخفض - أقل من الحد الأدنى ({smsConfig.ibulk_balance_threshold} OMR)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          {/* Enable SMS */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900">خدمة SMS مفعلة</label>
              <p className="text-sm text-gray-600">خدمة إرسال الرسائل النصية مفعلة دائماً</p>
            </div>
            <div className="w-11 h-6 bg-green-500 rounded-full flex items-center justify-end pr-1">
              <div className="w-5 h-5 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={smsConfig.ibulk_username}
              onChange={(e) => handleInputChange('ibulk_username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل اسم المستخدم"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={smsConfig.ibulk_password}
              onChange={(e) => handleInputChange('ibulk_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل كلمة المرور"
            />
            <p className="text-xs text-gray-500 mt-1">
              اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور الحالية
            </p>
          </div>

          {/* Sender ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              معرف المرسل
            </label>
            <input
              type="text"
              value={smsConfig.ibulk_sender_id}
              onChange={(e) => handleInputChange('ibulk_sender_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: SCHOOL"
              maxLength={11}
            />
            <p className="text-xs text-gray-500 mt-1">
              معرف المرسل (حد أقصى 11 حرف)
            </p>
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط API
            </label>
            <input
              type="url"
              value={smsConfig.ibulk_api_url}
              onChange={(e) => handleInputChange('ibulk_api_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://ismartsms.net/RestApi/api/SMS/PostSMS"
            />
          </div>

          {/* Balance Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحد الأدنى للرصيد (OMR)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={smsConfig.ibulk_balance_threshold}
              onChange={(e) => handleInputChange('ibulk_balance_threshold', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              سيتم إشعارك عندما ينخفض الرصيد عن هذا الحد
            </p>
          </div>
        </div>

        {/* Test SMS Section */}
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">اختبار إرسال SMS</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الهاتف للاختبار
              </label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="968XXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الرسالة التجريبية
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="رسالة تجريبية من نظام إدارة الحضور"
              />
            </div>
            <button
              onClick={handleSendTestSms}
              disabled={isSendingTest || !testPhone.trim()}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {isSendingTest ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>إرسال رسالة تجريبية</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            إلغاء
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={updateConfigMutation.isLoading}
            className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {updateConfigMutation.isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SmsConfiguration;
