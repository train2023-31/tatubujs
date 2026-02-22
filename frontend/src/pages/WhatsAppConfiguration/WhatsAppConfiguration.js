import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Settings,
  Save,
  Eye,
  EyeOff,
  TestTube,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  Wifi,
  WifiOff,
  QrCode,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  Send,
  Smartphone,
  Power,
  PlusCircle,
  Terminal,
  Building,
  Search,
} from 'lucide-react';
import { authAPI, classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  open: 'text-green-600 bg-green-50 border-green-200',
  connecting: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  close: 'text-red-600 bg-red-50 border-red-200',
  disconnected: 'text-red-600 bg-red-50 border-red-200',
  not_configured: 'text-gray-500 bg-gray-50 border-gray-200',
  unknown: 'text-gray-500 bg-gray-50 border-gray-200',
};

const STATUS_LABELS = {
  open: 'متصل ✅',
  connecting: 'جاري الاتصال...',
  close: 'غير متصل',
  disconnected: 'غير متصل',
  not_configured: 'غير مكوَّن',
  unknown: 'غير معروف',
  pending: 'في انتظار الموافقة',
};

const STATUS_BADGE_CLASS = {
  open: 'bg-green-100 text-green-800 border-green-200',
  connecting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  close: 'bg-red-100 text-red-800 border-red-200',
  disconnected: 'bg-red-100 text-red-800 border-red-200',
  not_configured: 'bg-gray-100 text-gray-700 border-gray-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
};

// Order for table: waiting admin first, then not connected, then connecting, then connected
const STATUS_SORT_ORDER = { 
  open: 0,
  connecting: 1,
  unknown: 2,
  disconnected: 3,
  close: 4,
  not_configured: 5,
  pending: 6,
};
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'pending', label: 'في انتظار الموافقة' },
  { value: 'not_connected', label: 'غير متصل' },
  { value: 'connecting', label: 'جاري الاتصال' },
  { value: 'connected', label: 'متصل' },
];

const WhatsAppConfiguration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin'; // Super admin
  const isSchoolAdmin = !isAdmin; // School admin
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [showSchoolsStatusDialog, setShowSchoolsStatusDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [schoolsStatusSearch, setSchoolsStatusSearch] = useState('');
  const [schoolsStatusFilter, setSchoolsStatusFilter] = useState('all');
  const effectiveSchoolId = isAdmin ? selectedSchoolId : user?.school_id;

  const { data: schools } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!user && isAdmin }
  );

  const { data: schoolsStatusData, refetch: refetchStatus } = useQuery(
    'schoolsWhatsAppStatus',
    authAPI.getSchoolsWhatsAppStatus,
    { enabled: !!user && isAdmin }
  );
  const schoolsStatus = schoolsStatusData?.schools || [];
  const schoolsStatusFiltered = (() => {
    let list = schoolsStatus;
    if (schoolsStatusSearch.trim()) {
      const q = schoolsStatusSearch.trim().toLowerCase();
      list = list.filter((s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.status_label && s.status_label.toLowerCase().includes(q)) ||
        (s.evolution_phone_number && String(s.evolution_phone_number).toLowerCase().includes(q)) ||
        (s.evolution_instance_name && s.evolution_instance_name.toLowerCase().includes(q))
      );
    }
    if (schoolsStatusFilter !== 'all') {
      if (schoolsStatusFilter === 'not_connected') {
        list = list.filter((s) => ['not_configured', 'close', 'disconnected'].includes(s.status_badge));
      } else if (schoolsStatusFilter === 'connected') {
        list = list.filter((s) => s.status_badge === 'open');
      } else {
        list = list.filter((s) => s.status_badge === schoolsStatusFilter);
      }
    }
    return [...list].sort((a, b) => {
      const orderA = STATUS_SORT_ORDER[a.status_badge] ?? 99;
      const orderB = STATUS_SORT_ORDER[b.status_badge] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  })();

  const [config, setConfig] = useState({
    evolution_whatsapp_enabled: false,
    evolution_api_url: '',
    evolution_api_key: '',
    evolution_instance_name: '',
    evolution_phone_number: '',
    has_api_config: false,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [instanceCreateResult, setInstanceCreateResult] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [instanceStatus, setInstanceStatus] = useState('unknown');
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(true); // Open by default so school admin sees steps
  const [testMsgPhone, setTestMsgPhone] = useState('');
  const [testMsgText, setTestMsgText] = useState('رسالة تجريبية من نظام تتبع الحضور ✅');

  const { data: whatsappConfig, isLoading, error, refetch } = useQuery(
    ['whatsappConfig', effectiveSchoolId],
    () => authAPI.getWhatsAppConfig(effectiveSchoolId),
    {
      enabled: !!user && !!effectiveSchoolId,
      staleTime: 5 * 60 * 1000,
      onError: () => toast.error('فشل في تحميل إعدادات WhatsApp'),
    }
  );

  // Sync form state from query data whenever school or data changes (fixes wrong data when reopening dialog or switching schools)
  useEffect(() => {
    if (!effectiveSchoolId || !whatsappConfig?.whatsapp_config) return;
    const cfg = whatsappConfig.whatsapp_config;
    setConfig((prev) => ({
      ...prev,
      evolution_whatsapp_enabled: cfg.evolution_whatsapp_enabled || false,
      evolution_api_url: cfg.evolution_api_url || '',
      evolution_api_key: cfg.evolution_api_key || '',
      evolution_instance_name: cfg.evolution_instance_name || '',
      evolution_phone_number: cfg.evolution_phone_number || '',
      has_api_config: cfg.has_api_config || false,
    }));
    setInstanceStatus(cfg.evolution_instance_status || 'unknown');
  }, [effectiveSchoolId, whatsappConfig]);

  const updateConfigMutation = useMutation(
    (data) => authAPI.updateWhatsAppConfig(data),
    {
      onSuccess: () => {
        toast.success('تم حفظ الإعدادات بنجاح');
        queryClient.invalidateQueries(['whatsappConfig', effectiveSchoolId]);
        queryClient.invalidateQueries('schoolsWhatsAppStatus');
        setIsSaving(false);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message?.ar || 'فشل في حفظ الإعدادات');
        setIsSaving(false);
      },
    }
  );

  const handleInputChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    updateConfigMutation.mutate({ school_id: effectiveSchoolId, ...config });
  };

  const handleToggleWhatsAppEnabled = () => {
    const newValue = !config.evolution_whatsapp_enabled;
    setConfig(prev => ({ ...prev, evolution_whatsapp_enabled: newValue }));
    setIsSaving(true);
    updateConfigMutation.mutate({
      school_id: effectiveSchoolId,
      ...config,
      evolution_whatsapp_enabled: newValue,
    });
  };

  const handleCreateInstance = async () => {
    if (!config.evolution_api_url || !config.evolution_api_key || !config.evolution_instance_name) {
      toast.error('يرجى إدخال رابط API ومفتاح API واسم الـ Instance أولاً');
      return;
    }
    setIsCreatingInstance(true);
    setInstanceCreateResult(null);
    try {
      const res = await authAPI.createWhatsAppInstance({
        school_id: effectiveSchoolId,
        evolution_api_url: config.evolution_api_url,
        evolution_api_key: config.evolution_api_key,
        evolution_instance_name: config.evolution_instance_name,
      });
      setInstanceCreateResult({ success: true, message: res.message?.ar || 'تم إنشاء الـ Instance بنجاح' });
      toast.success(res.message?.ar || 'تم إنشاء الـ Instance بنجاح');
    } catch (err) {
      const msg = err.response?.data?.message?.ar || 'فشل إنشاء الـ Instance';
      setInstanceCreateResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResults(null);
    try {
      const res = await authAPI.testWhatsAppConnection({
        school_id: effectiveSchoolId,
        evolution_api_url: config.evolution_api_url,
        evolution_api_key: config.evolution_api_key,
        evolution_instance_name: config.evolution_instance_name,
      });
      const state = res.connection_status?.state || 'unknown';
      setInstanceStatus(state);
      setTestResults({ success: true, message: res.message?.ar, state });
      toast.success('تم اختبار الاتصال بنجاح');
    } catch (err) {
      const state = err.response?.data?.connection_status?.state || 'error';
      setInstanceStatus(state);
      setTestResults({ success: false, message: err.response?.data?.message?.ar || 'فشل في اختبار الاتصال', state });
      toast.error('فشل في اختبار الاتصال');
    } finally {
      setIsTesting(false);
    }
  };

  const handleGetQR = async () => {
    setIsLoadingQR(true);
    setQrData(null);
    try {
      const res = await authAPI.getWhatsAppQR(effectiveSchoolId);
      if (res.success) {
        setQrData(res.data);
        setInstanceStatus('connecting');
        toast.success('تم توليد رمز QR — قم بمسحه الآن');
      } else {
        toast.error('فشل في توليد رمز QR');
      }
    } catch (err) {
      toast.error(err.response?.data?.message?.ar || 'فشل في توليد رمز QR');
    } finally {
      setIsLoadingQR(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const res = await authAPI.getWhatsAppStatus(effectiveSchoolId);
      setInstanceStatus(res.state || 'unknown');
      if (res.state === 'open') toast.success('WhatsApp متصل بنجاح ✅');
      else toast('الحالة: ' + (STATUS_LABELS[res.state] || res.state));
    } catch (err) {
      toast.error('فشل في التحقق من الحالة');
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testMsgPhone.trim()) { toast.error('يرجى إدخال رقم الهاتف'); return; }
    setIsSendingTest(true);
    try {
      await authAPI.sendWhatsAppTestMessage({
        school_id: effectiveSchoolId,
        phone_number: testMsgPhone.trim(),
        message: testMsgText,
      });
      toast.success('تم إرسال الرسالة التجريبية بنجاح');
    } catch (err) {
      toast.error(err.response?.data?.message?.ar || 'فشل في إرسال الرسالة التجريبية');
    } finally {
      setIsSendingTest(false);
    }
  };

  const statusClass = STATUS_COLORS[instanceStatus] || STATUS_COLORS.unknown;
  const statusLabel = STATUS_LABELS[instanceStatus] || instanceStatus;

  // School admin: step completion for progressive disclosure
  const step1Done = !!(config.evolution_instance_name?.trim() && config.evolution_phone_number?.trim());
  const step2Done = !!config.has_api_config;
  const step3Done = instanceStatus === 'open';
  const currentStep = step3Done ? 4 : step2Done ? 3 : step1Done ? 2 : 1;

  const renderConfigContent = () => {
    if (isSchoolAdmin) {
      return (
        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium ${
                    step < currentStep
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : step === currentStep
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}
                >
                  {step < currentStep ? <CheckCircle className="h-4 w-4" /> : null}
                  <span>الخطوة {step}</span>
                </div>
                {step < 4 && <span className="text-gray-300">←</span>}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: رقم واسم Instance ثم احفظ */}
          <div className="card border-2 border-blue-200">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                أدخل الرقم واسم الـ Instance ثم احفظ
              </h3>
              {step1Done && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-5 w-5" /> تمت</span>}
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم WhatsApp Business المدرسة</label>
                <input type="tel" value={config.evolution_phone_number} onChange={(e) => handleInputChange('evolution_phone_number', e.target.value)} className="input w-full" placeholder="96891234567" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">بدون +</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم الـ Instance</label>
                <input type="text" value={config.evolution_instance_name} onChange={(e) => handleInputChange('evolution_instance_name', e.target.value)} className="input w-full" placeholder="school_2024" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">أحرف إنجليزية وأرقام وشرطة سفلية فقط</p>
              </div>
              <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                {isSaving ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الحفظ...</span></> : <><Save className="h-5 w-5 ml-2" />حفظ الإعدادات</>}
              </button>
            </div>
          </div>

          {/* Step 2: انتظر الموافقة — show only after step 1 done */}
          {step1Done && (
            <div className={`card border-2 ${step2Done ? 'border-green-200' : 'border-amber-200'}`}>
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${step2Done ? 'bg-green-500' : 'bg-amber-500'}`}>2</span>
                  انتظر موافقة مدير النظام
                </h3>
                {step2Done && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-5 w-5" /> تم التفعيل</span>}
              </div>
              {!step2Done && (
                <div className="card-body">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">في انتظار موافقة مدير النظام</p>
                      <p className="text-sm text-amber-800 mt-1">ستصلك إشعار عند تفعيل الخدمة. لا يمكن المتابعة قبل ذلك.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: إنشاء Instance ومسح QR — show only after step 2 done */}
          {step2Done && (
            <div className={`card border-2 ${step3Done ? 'border-green-200' : 'border-indigo-200'}`}>
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${step3Done ? 'bg-green-500' : 'bg-indigo-500'}`}>3</span>
                  إنشاء Instance ومسح رمز QR
                </h3>
                {step3Done && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-5 w-5" /> متصل</span>}
              </div>
              {!step3Done && (
                <div className="card-body space-y-4">
                  <p className="text-sm text-gray-700">اضغط "إنشاء Instance" ثم "عرض رمز QR" وامسح الرمز من تطبيق WhatsApp Business على هاتف المدرسة.</p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={handleCreateInstance} disabled={isCreatingInstance || !config.evolution_instance_name} className="btn btn-outline border-blue-400 text-blue-700 hover:bg-blue-50">
                      {isCreatingInstance ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الإنشاء...</span></> : <><PlusCircle className="h-5 w-5 ml-2" />إنشاء Instance</>}
                    </button>
                    <button onClick={handleGetQR} disabled={isLoadingQR || !config.evolution_instance_name} className="btn btn-primary">
                      {isLoadingQR ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري التوليد...</span></> : <><QrCode className="h-5 w-5 ml-2" />عرض رمز QR</>}
                    </button>
                  </div>
                  {instanceCreateResult && (
                    <div className={`p-3 rounded-lg border text-sm ${instanceCreateResult.success ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <div className="flex items-center gap-2">
                        {instanceCreateResult.success ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                        <span>{instanceCreateResult.message}</span>
                      </div>
                    </div>
                  )}
                  {qrData && (
                    <div className="mt-4 flex flex-col items-center gap-3">
                      {qrData.base64 ? (
                        <div className="p-4 bg-white border-2 border-gray-300 rounded-xl shadow-md inline-block">
                          <img src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`} alt="WhatsApp QR" className="w-56 h-56" />
                        </div>
                      ) : (
                        <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto max-h-32">{JSON.stringify(qrData, null, 2)}</pre>
                      )}
                      <p className="text-sm text-yellow-700">امسح الرمز من WhatsApp Business ثم اضغط "تحديث الحالة"</p>
                      <button onClick={handleRefreshStatus} className="btn btn-outline btn-sm"><RefreshCw className="h-4 w-4 ml-1" />تحديث الحالة</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: تفعيل الإرسال والاختبار — show only after step 3 done */}
          {step3Done && (
            <div className="card border-2 border-green-200">
              <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">4</span>
                  تفعيل الإرسال والاختبار
                </h3>
              </div>
              <div className="card-body space-y-4">
                <div className={`flex items-center justify-between p-4 rounded-lg border ${statusClass}`}>
                  <div className="flex items-center gap-3">
                    <Wifi className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold">حالة الاتصال: {statusLabel}</p>
                      {config.evolution_phone_number && <p className="text-sm opacity-75">الرقم: {config.evolution_phone_number}</p>}
                    </div>
                  </div>
                  <button onClick={handleRefreshStatus} disabled={isRefreshingStatus} className="btn btn-outline btn-sm">
                    {isRefreshingStatus ? <LoadingSpinner size="sm" /> : <><RefreshCw className="h-4 w-4 ml-1" />تحديث</>}
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-medium text-gray-900">تفعيل إرسال WhatsApp</p>
                    <p className="text-sm text-gray-500">إرسال تنبيهات الحضور تلقائياً - بعد التفعيل اضغط على زر حفظ الإعدادات</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config.evolution_whatsapp_enabled} onClick={handleToggleWhatsAppEnabled} readOnly className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-green-900 mb-2">إرسال رسالة تجريبية</p>
                  <div className="flex flex-wrap gap-2">
                    <input type="tel" value={testMsgPhone} onChange={(e) => setTestMsgPhone(e.target.value)} className="input flex-1 min-w-[120px]" placeholder="96891234567" dir="ltr" />
                    <input type="text" value={testMsgText} onChange={(e) => setTestMsgText(e.target.value)} className="input flex-1 min-w-[160px]" placeholder="رسالة تجريبية" />
                    <button onClick={handleSendTestMessage} disabled={isSendingTest || !testMsgPhone.trim()} className="btn btn-primary btn-sm">
                      {isSendingTest ? <LoadingSpinner size="sm" /> : <><Send className="h-4 w-4 ml-1" />إرسال</>}
                    </button>
                  </div>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="btn btn-outline btn-sm">حفظ التغييرات</button>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 text-center">استخدم حساب WhatsApp Business ورقم مخصص للمدرسة.</p>
        </div>
      );
    }

    return (
    <>
      {/* Connection Status Banner */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${statusClass}`}>
        <div className="flex items-center gap-3">
          {instanceStatus === 'open'
            ? <Wifi className="h-6 w-6 text-green-600" />
            : <WifiOff className="h-6 w-6 text-red-500" />}
          <div>
            <p className="font-semibold">حالة الاتصال: {statusLabel}</p>
            {config.evolution_phone_number && (
              <p className="text-sm opacity-75">الرقم المتصل: {config.evolution_phone_number}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefreshStatus}
          disabled={isRefreshingStatus}
          className="btn btn-outline btn-sm"
        >
          {isRefreshingStatus
            ? <LoadingSpinner size="sm" />
            : <><RefreshCw className="h-4 w-4 ml-1" />تحديث الحالة</>}
        </button>
      </div>

      {/* Instructions - Collapsible */}
      <div className="card">
        <div
          className="card-header cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">تعليمات الإعداد</h3>
            </div>
            {isInstructionsExpanded ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
          </div>
        </div>
        {isInstructionsExpanded && (
          <div className="card-body">
            {isSchoolAdmin ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-green-900 mb-2 flex items-center">
                  <Settings className="h-5 w-5 ml-2" />
                  دليل الربط خطوة بخطوة — سهل ومختصر
                </h4>
                <p className="text-sm text-green-800 mb-4">اتبع الخطوات بالترتيب. كل خطوة توضح بالضبط ماذا تفعل.</p>
                <div className="space-y-4">
                  {[
                    {
                      color: 'blue',
                      title: 'الخطوة ١: أدخل الرقم واسم الـ Instance ثم احفظ',
                      body: 'في الأسفل في قسم "إعدادات WhatsApp للمدرسة":',
                      items: [
                        'في حقل "رقم WhatsApp Business المدرسة" اكتب رقم الهاتف بدون + (مثال: 96891234567)',
                        'في حقل "اسم الـ Instance" اكتب اسماً فريداً بالإنجليزي (مثال: school_2024 أو my_school_wa)',
                        'اضغط زر "حفظ الإعدادات"'
                      ],
                      note: 'اسم الـ Instance: أحرف إنجليزية وأرقام وشرطة سفلية فقط.'
                    },
                    {
                      color: 'amber',
                      title: 'الخطوة ٢: انتظر موافقة مدير النظام',
                      body: 'بعد الحفظ:',
                      items: [
                        'ستظهر رسالة "في انتظار موافقة مدير النظام" — هذا طبيعي',
                        'مدير النظام (Super Admin) سيقوم بإضافة رابط API ومفتاح API لمدرستك',
                        'ستصلك إشعار في الموقع عند التفعيل — عندها انتقل للخطوة ٣'
                      ],
                      note: 'لا يمكن المتابعة قبل أن يفعّل مدير النظام الخدمة.'
                    },
                    {
                      color: 'green',
                      title: 'الخطوة ٣: إنشاء Instance ومسح رمز QR',
                      body: 'بعد وصول إشعار التفعيل:',
                      items: [
                        'اضغط زر "إنشاء Instance" وانتظر حتى تظهر رسالة النجاح',
                        'اضغط زر "عرض رمز QR" ليظهر الرمز على الشاشة',
                        'على هاتف المدرسة: افتح تطبيق WhatsApp Business → الإعدادات → الأجهزة المرتبطة → ربط جهاز → امسح رمز QR من الشاشة',
                        'انتظر حتى تتحول الحالة إلى "متصل ✅"'
                      ],
                      note: 'يجب استخدام حساب WhatsApp Business ورقم مخصص للمدرسة.'
                    },
                    {
                      color: 'purple',
                      title: 'الخطوة ٤: تفعيل الإرسال والاختبار',
                      body: 'بعد ظهور "متصل ✅":',
                      items: [
                        'فعّل المفتاح "تفعيل إرسال WhatsApp" في أعلى نموذج الإعدادات',
                        'احفظ الإعدادات إن لزم',
                        'في قسم "إرسال رسالة تجريبية" أدخل رقماً وأرسل رسالة للتأكد من وصولها'
                      ],
                      note: null
                    }
                  ].map((step, i) => (
                    <div key={i} className={`bg-white rounded-lg p-4 border-l-4 border-${step.color}-500 shadow-sm`}>
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 w-9 h-9 bg-${step.color}-500 text-white rounded-full flex items-center justify-center font-bold text-sm ml-3`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 mb-2">{step.title}</h5>
                          <p className="text-sm text-gray-700 mb-2">{step.body}</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {step.items.map((item, j) => (
                              <li key={j}>{item}</li>
                            ))}
                          </ul>
                          {step.note && <p className="text-xs text-gray-500 mt-2 italic">ملاحظة: {step.note}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <strong>ملاحظة:</strong> إذا لم تظهر لديك حقول الإعداد أو تظهر رسالة انتظار الموافقة، تواصل مع مدير النظام لتفعيل WhatsApp لمدرستك أولاً.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-green-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 ml-2" />
                  دليل مدير النظام — تفعيل WhatsApp للمدارس
                </h4>
                <div className="space-y-4">
                  {[
                    { color: 'blue', title: '١. تشغيل web.whatsapp (مرة واحدة)', body: 'في مجلد evolution-api/ نفّذ: docker-compose -f docker-compose-tatubu.yml up -d\nثم أنشئ قاعدة بيانات MySQL: CREATE DATABASE evolution_api;', note: 'هذه الخطوة تتم مرة واحدة فقط.' },
                    { color: 'green', title: '٢. إعداد المدرسة والموافقة على الطلب', body: 'اختر المدرسة من القائمة، أدخل رابط API ومفتاح API، ثم احفظ. هذا يفعّل إمكانية ربط WhatsApp لهذه المدرسة.', note: 'المدارس ستتلقى إشعاراً وستتمكن من إكمال الإعداد (Instance + مسح QR).' },
                    { color: 'yellow', title: '٣. المدرسة تكمل الإعداد', body: 'المدرسة تضيف رقم الهاتف واسم الـ Instance، تنشئ الـ Instance، تمسح رمز QR، وتفعّل الإرسال.', note: 'لا تحتاج لتنفيذ هذه الخطوة بنفسك.' },
                  ].map((step, i) => (
                    <div key={i} className={`bg-white rounded-lg p-4 border-l-4 border-${step.color}-500 shadow-sm`}>
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 w-8 h-8 bg-${step.color}-500 text-white rounded-full flex items-center justify-center font-bold text-sm ml-3`}>
                          {i + 1}
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-1">{step.title}</h5>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{step.body}</p>
                          {step.note && <p className="text-xs text-gray-500 mt-1 italic">ملاحظة: {step.note}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">تنبيهات مهمة:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                <li><strong>يجب استخدام حساب WhatsApp Business</strong> وليس الحساب الشخصي</li>
                <li>استخدم رقم هاتف مخصص للمدرسة وليس رقماً شخصياً</li>
                <li>لا تستخدم الرقم في جهاز WhatsApp آخر بعد الربط</li>
                <li>إذا انقطع الاتصال، كرر عملية مسح رمز QR</li>
                <li>الإرسال المجمع يتم بتأخير بين كل رسالة لتجنب الحظر</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* School admin: Waiting for approval banner */}
      {isSchoolAdmin && (!config.evolution_api_url || !config.evolution_api_key) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">في انتظار موافقة مدير النظام</p>
            <p className="text-sm text-amber-800 mt-1">
              لم يتم تفعيل WhatsApp لمدرستك بعد. يرجى التواصل مع مدير النظام لتفعيل الخدمة. بعد الموافقة ستتمكن من إضافة رقم الهاتف واسم الـ Instance ومسح رمز QR.
            </p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {isSchoolAdmin ? 'إعدادات WhatsApp للمدرسة' : 'إعدادات web.whatsapp'}
            </h3>
          </div>
        </div>
        <div className="card-body space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Power className={`h-5 w-5 ${config.evolution_whatsapp_enabled ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <p className="font-medium text-gray-900">تفعيل إرسال WhatsApp</p>
                <p className="text-sm text-gray-500">عند التفعيل سيتم إرسال تنبيهات الحضور تلقائياً عبر WhatsApp</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={config.evolution_whatsapp_enabled} onClick={handleToggleWhatsAppEnabled} readOnly className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رابط web.whatsapp</label>
                <input type="url" value={config.evolution_api_url} onChange={(e) => handleInputChange('evolution_api_url', e.target.value)} className="input w-full" placeholder="https://evolution.yourserver.com" dir="ltr" />
                <p className="text-xs text-gray-500 mt-1">رابط خادم web.whatsapp بدون شرطة مائلة في النهاية</p>
              </div>
            )}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">مفتاح API (API Key)</label>
                <div className="relative">
                  <input type={showApiKey ? 'text' : 'password'} value={config.evolution_api_key} onChange={(e) => handleInputChange('evolution_api_key', e.target.value)} className="input w-full pl-10" placeholder="أدخل مفتاح API" dir="ltr" />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">المفتاح العام للـ web.whatsapp (من إعدادات الخادم)</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اسم الـ Instance</label>
              <input type="text" value={config.evolution_instance_name} onChange={(e) => handleInputChange('evolution_instance_name', e.target.value)} className="input w-full" placeholder="school_name_2024" dir="ltr" />
              <p className="text-xs text-gray-500 mt-1">اسم فريد لمدرستك — أحرف إنجليزية وأرقام وشرطة سفلية فقط</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم WhatsApp Business المدرسة</label>
              <input type="tel" value={config.evolution_phone_number} onChange={(e) => handleInputChange('evolution_phone_number', e.target.value)} className="input w-full" placeholder="96891234567" dir="ltr" />
              <p className="text-xs text-gray-500 mt-1">رقم حساب WhatsApp Business للمدرسة (بدون +)</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {isSchoolAdmin ? (
              <>
                <p className="text-sm font-medium text-gray-600">بعد الحفظ، اضغط "إنشاء Instance" ثم "عرض رمز QR":</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleCreateInstance} disabled={isCreatingInstance || !config.evolution_instance_name || !config.evolution_api_url || !config.evolution_api_key} className="btn btn-outline border-blue-400 text-blue-700 hover:bg-blue-50" title={(!config.evolution_api_url || !config.evolution_api_key) ? 'في انتظار موافقة مدير النظام' : ''}>
                    {isCreatingInstance ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الإنشاء...</span></> : <><PlusCircle className="h-5 w-5 ml-2" />إنشاء Instance</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">بعد الحفظ، اتبع هذه الخطوات بالترتيب:</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleCreateInstance} disabled={isCreatingInstance || !config.evolution_api_url || !config.evolution_api_key || !config.evolution_instance_name} className="btn btn-outline border-blue-400 text-blue-700 hover:bg-blue-50">
                    {isCreatingInstance ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الإنشاء...</span></> : <><PlusCircle className="h-5 w-5 ml-2" />1. إنشاء Instance</>}
                  </button>
                  <button onClick={handleTestConnection} disabled={isTesting || !config.evolution_api_url || !config.evolution_api_key || !config.evolution_instance_name} className="btn btn-outline">
                    {isTesting ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الاختبار...</span></> : <><TestTube className="h-5 w-5 ml-2" />2. اختبار الاتصال</>}
                  </button>
                </div>
              </>
            )}
            {instanceCreateResult && (
              <div className={`p-3 rounded-lg border text-sm ${instanceCreateResult.success ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="flex items-center gap-2">
                  {instanceCreateResult.success ? <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" /> : <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                  <span>{instanceCreateResult.message}</span>
                </div>
              </div>
            )}
          </div>
          {testResults && (
            <div className={`p-4 rounded-lg border ${testResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-3">
                {testResults.success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                <div>
                  <p className={`font-medium ${testResults.success ? 'text-green-800' : 'text-red-800'}`}>{testResults.success ? 'نجح الاختبار' : 'فشل الاختبار'}</p>
                  <p className={`text-sm mt-1 ${testResults.success ? 'text-green-700' : 'text-red-700'}`}>{testResults.message}</p>
                  {testResults.state && <p className="text-xs text-gray-500 mt-1">حالة الـ Instance: {STATUS_LABELS[testResults.state] || testResults.state}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <QrCode className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">ربط رقم WhatsApp (QR Code)</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">كيفية ربط الرقم:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>أضف رقم الهاتف واسم الـ Instance واحفظ</li>
                  <li>اضغط "إنشاء Instance" ثم "عرض رمز QR"</li>
                  <li>افتح تطبيق WhatsApp Business على هاتف المدرسة → الإعدادات → الأجهزة المرتبطة → ربط جهاز</li>
                  <li>امسح رمز QR المعروض وانتظر حتى تتحول الحالة إلى "متصل ✅"</li>
                </ol>
              </div>
            </div>
          </div>
          <button onClick={handleGetQR} disabled={isLoadingQR || !config.evolution_instance_name} className="btn btn-primary">
            {isLoadingQR ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري التوليد...</span></> : <><QrCode className="h-5 w-5 ml-2" />عرض رمز QR</>}
          </button>
          {qrData && (
            <div className="mt-6 flex flex-col items-center gap-4">
              {qrData.base64 ? (
                <div className="p-4 bg-white border-2 border-gray-300 rounded-xl shadow-md inline-block">
                  <img src={qrData.base64.startsWith('data:') ? qrData.base64 : `data:image/png;base64,${qrData.base64}`} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 w-full">
                  <p className="font-medium mb-2">بيانات الـ QR:</p>
                  <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-40">{JSON.stringify(qrData, null, 2)}</pre>
                </div>
              )}
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">⏳ رمز QR صالح لمدة قصيرة. إذا انتهت الصلاحية، اضغط "عرض رمز QR" مرة أخرى.</p>
              <button onClick={handleRefreshStatus} className="btn btn-outline btn-sm"><RefreshCw className="h-4 w-4 ml-2" /> تحديث حالة الاتصال</button>
            </div>
          )}
        </div>
      </div>

      {/* Test Message Section */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">إرسال رسالة تجريبية</h3>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">تأكد من أن حالة الاتصال "متصل ✅" قبل إرسال الرسالة التجريبية.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف (بالصيغة الدولية)</label>
              <input type="tel" value={testMsgPhone} onChange={(e) => setTestMsgPhone(e.target.value)} className="input w-full" placeholder="96891234567" dir="ltr" />
              <p className="text-xs text-gray-500 mt-1">مثال: 96891234567 (بدون + أو مسافات)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نص الرسالة</label>
              <textarea value={testMsgText} onChange={(e) => setTestMsgText(e.target.value)} className="input w-full h-20 resize-none" placeholder="أدخل نص الرسالة التجريبية..." />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button onClick={handleSendTestMessage} disabled={isSendingTest || !testMsgPhone.trim() || !testMsgText.trim()} className="btn btn-primary">
              {isSendingTest ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الإرسال...</span></> : <><Send className="h-5 w-5 ml-2" />إرسال رسالة تجريبية</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل إعدادات WhatsApp...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل الإعدادات</h3>
        <p className="text-gray-500">فشل في تحميل إعدادات WhatsApp للمدرسة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إعدادات WhatsApp</h1>
          <p className="text-gray-600">ربط رقم WhatsApp الخاص بمدرستك عبر web.whatsapp لإرسال تنبيهات الحضور</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => refetch()} className="btn btn-outline">
            <RefreshCw className="h-5 w-5 ml-2" />
            إعادة تحميل
          </button>
        </div>
      </div>

      {/* Inline schools status table (super admin only) */}
      {isAdmin && (
        <div className="card">
          <div className="card-header flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">حالة WhatsApp للمدارس</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={schoolsStatusFilter}
                onChange={(e) => setSchoolsStatusFilter(e.target.value)}
                className="input py-1.5 text-sm max-w-[180px]"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowSchoolsStatusDialog(true)} className="btn btn-outline btn-sm">
                <Search className="h-4 w-4 ml-1" /> عرض في نافذة (بحث)
              </button>
            </div>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">المدرسة</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">مفعّل</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700">رقم / Instance</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-700 w-28">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {schoolsStatus.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">لا توجد مدارس أو جاري التحميل...</td></tr>
                )}
                {schoolsStatus.length > 0 && schoolsStatusFiltered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">لا توجد نتائج للتصفية.</td></tr>
                )}
                {schoolsStatusFiltered.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${STATUS_BADGE_CLASS[s.status_badge] || STATUS_BADGE_CLASS.unknown}`}>
                        {s.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.evolution_whatsapp_enabled ? <span className="text-green-600">نعم</span> : <span className="text-gray-400">لا</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm dir-ltr">
                      {s.evolution_phone_number || '—'} {s.evolution_instance_name ? ` / ${s.evolution_instance_name}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setSelectedSchoolId(s.id); setShowConfigDialog(true); }}
                        className="btn btn-outline btn-sm"
                      >
                        <Settings className="h-4 w-4 ml-1" /> إعدادات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schools WhatsApp status dialog (super admin only) */}
      {isAdmin && (
        <Modal
          isOpen={showSchoolsStatusDialog}
          onClose={() => { setShowSchoolsStatusDialog(false); setSchoolsStatusSearch(''); setSchoolsStatusFilter('all'); }}
          title="حالة WhatsApp للمدارس"
          size="full"
        >
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={schoolsStatusSearch}
                    onChange={(e) => setSchoolsStatusSearch(e.target.value)}
                    placeholder="بحث بالاسم، الحالة، الرقم أو Instance..."
                    className="input w-full pr-10"
                    dir="rtl"
                  />
                </div>
                <select
                  value={schoolsStatusFilter}
                  onChange={(e) => setSchoolsStatusFilter(e.target.value)}
                  className="input py-2 text-sm max-w-[180px]"
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => refetchStatus()} className="btn btn-outline btn-sm">
                <RefreshCw className="h-4 w-4 ml-1" /> تحديث
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-sm font-medium text-gray-700">المدرسة</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-700">الحالة</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-700">مفعّل الإرسال</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-700">رقم الواتساب</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-700">Instance</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolsStatus.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">لا توجد مدارس أو جاري التحميل...</td></tr>
                  )}
                  {schoolsStatus.length > 0 && schoolsStatusFiltered.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">لا توجد نتائج للبحث.</td></tr>
                  )}
                  {schoolsStatusFiltered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => {
                        setSelectedSchoolId(s.id);
                        setShowSchoolsStatusDialog(false);
                        setSchoolsStatusSearch('');
                      }}
                      className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${STATUS_BADGE_CLASS[s.status_badge] || STATUS_BADGE_CLASS.unknown}`}>
                          {s.status_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.evolution_whatsapp_enabled ? <span className="text-green-600">نعم</span> : <span className="text-gray-400">لا</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dir-ltr">{s.evolution_phone_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dir-ltr">{s.evolution_instance_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500">انقر على مدرسة لاختيارها وتعديل إعدادات WhatsApp ثم إغلاق النافذة.</p>
          </div>
        </Modal>
      )}

      {/* School selector for super admin + activation note */}
      {isAdmin && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
            <Building className="h-5 w-5 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">المدرسة (للتعديل):</label>
            <select
              value={effectiveSchoolId ?? ''}
              onChange={(e) => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
              className="input max-w-xs"
            >
              <option value="">-- اختر المدرسة --</option>
              {(schools || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>تفعيل WhatsApp لمدرسة:</strong> اختر المدرسة، أدخل رابط API ومفتاح API، ثم احفظ. بعد ذلك ستتمكن المدرسة من إضافة رقم الهاتف واسم الـ Instance ومسح رمز QR.
          </div>
        </div>
      )}

      {effectiveSchoolId && !isAdmin && renderConfigContent()}
      {effectiveSchoolId && isAdmin && (
        <>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border flex-wrap">
            <span className="text-sm text-gray-700">المدرسة المختارة: <strong>{(schools || []).find(s => s.id === effectiveSchoolId)?.name}</strong></span>
            <button type="button" onClick={() => setShowConfigDialog(true)} className="btn btn-primary btn-sm">
              <Settings className="h-4 w-4 ml-1" /> تعديل إعدادات WhatsApp
            </button>
          </div>
          <Modal
            isOpen={showConfigDialog}
            onClose={() => setShowConfigDialog(false)}
            title={`إعدادات WhatsApp - ${(schools || []).find(s => s.id === effectiveSchoolId)?.name || 'المدرسة'}`}
            size="full"
          >
            <div className="p-4 space-y-6 overflow-y-auto max-h-[85vh]">
              <div className="flex justify-end gap-2 border-b border-gray-200 pb-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? <><LoadingSpinner size="sm" /><span className="mr-2">جاري الحفظ...</span></> : <><Save className="h-5 w-5 ml-2" />حفظ الإعدادات</>}
                </button>
              </div>
              {renderConfigContent()}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default WhatsAppConfiguration;
