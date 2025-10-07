import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  Settings
} from 'lucide-react';
import { authAPI, classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import SearchableSelect from '../../components/UI/SearchableSelect';
import toast from 'react-hot-toast';

const WhatsAppMessaging = () => {
  const { user } = useAuth();
  const [selectedSchool, setSelectedSchool] = useState('');
  const [daysBack, setDaysBack] = useState(7);
  const [customMessage, setCustomMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch schools data for admin users
  const { data: schools } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!user && user.role === 'admin' }
  );

  // Fetch absence statistics
  const { data: absenceStats, isLoading: statsLoading, refetch: refetchStats } = useQuery(
    ['absenceStats', selectedSchool, daysBack],
    () => authAPI.getAbsenceStats({
      school_id: selectedSchool || undefined,
      days_back: daysBack
    }),
    {
      enabled: !!user && ['school_admin', 'data_analyst', 'admin'].includes(user.role),
    }
  );

  // Send notifications mutation
  const sendNotificationsMutation = useMutation(
    (data) => authAPI.sendAbsenceNotifications(data),
    {
      onSuccess: (response) => {
        const message = response.data.message;
        const schoolPhone = response.data.school_phone;
        
        if (schoolPhone) {
          toast.success(`${message}\nرقم المدرسة المستخدم: ${schoolPhone}`, {
            duration: 8000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          });
        } else {
          toast.success(message);
        }
        
        refetchStats(); // Refresh stats after sending
        setIsSending(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إرسال الإشعارات');
        setIsSending(false);
      },
    }
  );

  const handleSendNotifications = async () => {
    if (!absenceStats || absenceStats.students_with_phone_numbers === 0) {
      toast.error('لا توجد طلاب لديهم أرقام هواتف للإرسال إليها');
      return;
    }

    setIsSending(true);
    
    const data = {
      school_id: selectedSchool || null,
      days_back: daysBack,
      custom_message: customMessage.trim() || null
    };

    sendNotificationsMutation.mutate(data);
  };

  const defaultMessageTemplate = `*تقرير الحضور اليومي*

*المدرسة:* [اسم المدرسة]
*الطالب/ة:* {name}
*الصف:* [اسم الصف]
*التاريخ:* [التاريخ]
*حالة الحضور:* [حالة الحضور - غائب/متأخر]
*حالة العذر:* [حالة العذر]

---
تم إرسال هذا التقرير من نظام إدارة الحضور`;

  const previewMessage = customMessage.trim() || defaultMessageTemplate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إرسال إشعارات الغياب عبر WhatsApp</h1>
          <p className="text-gray-600">إرسال رسائل تلقائية لأولياء أمور الطلاب المتغيبين</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <MessageCircle className="h-5 w-5" />
          <span>WhatsApp Web Automation</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">تعليمات الاستخدام:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>تأكد من أن WhatsApp Web مفتوح في متصفح Chrome</li>
              <li>قم بمسح رمز QR إذا لم تكن مسجل الدخول</li>
              <li>لا تغلق نافذة المتصفح أثناء عملية الإرسال</li>
              <li>سيتم إرسال الرسائل تلقائياً مع توقف 3 ثوان بين كل رسالة</li>
              <li>الرسائل ستُرسل من رقم المدرسة المسجل في النظام</li>
              <li>يشمل النظام الهارب والغائب والمتأخر</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              إعدادات الإرسال
            </h3>

            {/* School Selection (for admins) */}
            {user?.role === 'admin' && (
              <div className="mb-4">
                <SearchableSelect
                  name="school_id"
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  options={schools?.map(school => ({
                    value: school.id,
                    label: school.name
                  })) || []}
                  placeholder="اختر المدرسة (اختياري)"
                  searchPlaceholder="البحث في المدارس..."
                  emptyMessage="لا توجد مدارس"
                  noResultsMessage="لا توجد مدارس تطابق البحث"
                  label="المدرسة"
                />
              </div>
            )}

            {/* Days Back Selection */}
            <div className="mb-4">
              <label className="label">عدد الأيام للبحث عن الغيابات</label>
              <select
                value={daysBack}
                onChange={(e) => setDaysBack(parseInt(e.target.value))}
                className="input"
              >
                <option value={1}>آخر يوم</option>
                <option value={3}>آخر 3 أيام</option>
                <option value={7}>آخر أسبوع</option>
                <option value={14}>آخر أسبوعين</option>
                <option value={30}>آخر شهر</option>
              </select>
            </div>

            {/* Custom Message */}
            <div className="mb-4">
              <label className="label">الرسالة المخصصة (اختياري)</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="input h-32 resize-none"
                placeholder="اتركه فارغاً لاستخدام الرسالة الافتراضية"
              />
              <p className="text-xs text-gray-500 mt-1">
                استخدم {`{name}`} لاستبدال اسم الطالب. سيتم ملء باقي المعلومات تلقائياً من النظام (الهارب، الغائب، المتأخر)
              </p>
            </div>

            {/* Preview Button */}
            <button
              onClick={() => setShowPreview(true)}
              className="btn btn-outline w-full mb-4"
            >
              معاينة الرسالة
            </button>

            {/* Send Button */}
            <button
              onClick={handleSendNotifications}
              disabled={isSending || !absenceStats || absenceStats.students_with_phone_numbers === 0}
              className="btn btn-primary w-full"
            >
              {isSending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  إرسال الإشعارات
                </>
              )}
            </button>
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              إحصائيات الغيابات
            </h3>

            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="mr-3 text-gray-500">جاري تحميل الإحصائيات...</span>
              </div>
            ) : absenceStats ? (
              <div className="space-y-4">
                {/* Total Students with Attendance Issues */}
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-700">إجمالي الطلاب (هارب + غائب + متأخر)</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {absenceStats.total_students_with_absences}
                  </span>
                </div>

                {/* Students with Phone Numbers */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">لديهم أرقام هواتف</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {absenceStats.students_with_phone_numbers}
                  </span>
                </div>

                {/* Total Attendance Records */}
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">إجمالي سجلات الحضور (هارب + غائب + متأخر)</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">
                    {absenceStats.total_absence_records}
                  </span>
                </div>

                {/* Days Checked */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">الأيام المفحوصة</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {absenceStats.days_checked} يوم
                  </span>
                </div>

                {/* Absence Distribution */}
                {Object.keys(absenceStats.absence_distribution).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">توزيع الغيابات</h4>
                    <div className="space-y-2">
                      {Object.entries(absenceStats.absence_distribution)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([count, students]) => (
                          <div key={count} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{count} غياب</span>
                            <span className="font-medium text-gray-900">{students} طالب</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>

          {/* Warning */}
          {absenceStats && absenceStats.students_with_phone_numbers === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">لا يمكن الإرسال</p>
                  <p>لا توجد طلاب لديهم أرقام هواتف في الفترة المحددة</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="معاينة الرسالة"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">نص الرسالة:</h4>
            <div className="text-sm text-gray-900 whitespace-pre-line">
              {previewMessage}
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-700 mb-2">مثال على الرسالة المرسلة:</h4>
            <div className="text-sm text-blue-900 whitespace-pre-line">
              {previewMessage
                .replace('{name}', 'أحمد محمد')
                .replace('[اسم المدرسة]', 'مدرسة حازم بن همام')
                .replace('[اسم الصف]', 'الخامس 1')
                .replace('[التاريخ]', 'الاثنين، 06/10/2025')
                .replace('[حالة الحضور - غائب/متأخر]', 'هارب: 2، غائب: 1، متأخر: 1')
                .replace('[حالة العذر]', 'يوجد عذر (1 غياب)')}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowPreview(false)}
              className="btn btn-outline"
            >
              إغلاق
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WhatsAppMessaging;
