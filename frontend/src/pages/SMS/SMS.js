import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MessageSquare, Send, Users, Phone, CheckCircle, XCircle } from 'lucide-react';
import { reportsAPI, attendanceAPI, classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const SMS = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [selectedClass, setSelectedClass] = useState('');
  const [smsData, setSmsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch classes
  const { data: classes } = useQuery(
    'myClasses',
    () => classesAPI.getMyClasses(),
    { enabled: !!user }
  );

  // Fetch attendance details for SMS
  const { data: attendanceDetails, isLoading: attendanceLoading } = useQuery(
    ['attendanceDetails', selectedDate],
    () => attendanceAPI.getAttendanceDetailsByStudent({ date: selectedDate }),
    { 
      enabled: !!user && !!selectedDate,
      onSuccess: (data) => {
        // Process data for SMS
        const processedData = data.attendance_details
          .filter(item => item.student_id && (item.absent_times.length > 0 || item.excused_times.length > 0))
          .map(item => ({
            student_name: item.student_name,
            phone_number: item.phone_number,
            absent_times: item.absent_times,
            excused_times: item.excused_times,
            class_name: item.class_name,
          }));
        setSmsData(processedData);
      }
    }
  );

  // Send SMS mutation
  const sendSMSMutation = useMutation(
    (data) => reportsAPI.sendSMS(data),
    {
      onSuccess: (response) => {
        toast.success('تم إرسال الرسائل بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إرسال الرسائل');
      },
    }
  );

  const handleSendSMS = () => {
    if (smsData.length === 0) {
      toast.error('لا توجد بيانات لإرسال الرسائل');
      return;
    }

    const smsPayload = {
      list: smsData,
      date: selectedDate,
    };

    sendSMSMutation.mutate(smsPayload);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إرسال الرسائل النصية</h1>
          <p className="text-gray-600">إرسال رسائل للطلاب الغائبين والمعذورين</p>
        </div>
        <button
          onClick={handleSendSMS}
          disabled={smsData.length === 0 || sendSMSMutation.isLoading}
          className="btn btn-primary"
        >
          {sendSMSMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري الإرسال...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              إرسال الرسائل ({smsData.length})
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">التاريخ</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">الفصل (اختياري)</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="input"
              >
                <option value="">جميع الفصول</option>
                {classes?.sort((a, b) => a.id - b.id).map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SMS Preview */}
      {attendanceLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
        </div>
      ) : smsData.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              معاينة الرسائل - {formatDate(selectedDate, 'dd/MM/yyyy', 'ar')}
            </h3>
            <p className="text-sm text-gray-600">
              سيتم إرسال {smsData.length} رسالة للطلاب الغائبين والمعذورين
            </p>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {smsData.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.student_name}
                        </h4>
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-600">
                            {item.phone_number || 'لا يوجد رقم هاتف'}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">الفصل: </span>
                          <span className="text-sm font-medium text-gray-900">
                            {item.class_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      {item.absent_times.length > 0 && (
                        <div className="mb-1">
                          <span className="text-sm text-red-600 font-medium">
                            غائب عن الحصص: {item.absent_times.join(', ')}
                          </span>
                        </div>
                      )}
                      {item.excused_times.length > 0 && (
                        <div>
                          <span className="text-sm text-blue-600 font-medium">
                            معذور عن الحصص: {item.excused_times.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Message Preview */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600 mb-2">معاينة الرسالة:</p>
                    <div className="text-sm text-gray-800 bg-white p-3 rounded border">
                      <p className="font-medium">{item.student_name} :ولي الأمر الطالب</p>
                      {item.excused_times.length > 0 && (
                        <p>{item.excused_times.join(', ')} :الطالب متغيب/بعذر عن حصص</p>
                      )}
                      {item.absent_times.length > 0 && (
                        <p>{item.absent_times.join(', ')} :الطالب هارب عن حصص</p>
                      )}
                      <p>{formatDate(selectedDate, 'dd/MM/yyyy', 'ar')} :بتاريخ</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد طلاب غائبين أو معذورين في هذا التاريخ</p>
          </div>
        </div>
      )}

      {/* SMS Configuration Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">معلومات إرسال الرسائل</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">الرسائل الناجحة</p>
                <p className="text-sm text-gray-600">سيتم إرسال رسالة لكل طالب غائب أو معذور</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">الرسائل الفاشلة</p>
                <p className="text-sm text-gray-600">الطلاب الذين لا يملكون أرقام هواتف</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMS;

