import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { 
  Send, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Smartphone,
  FileText
} from 'lucide-react';
import { authAPI } from '../../services/api';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const SmsOperations = ({ isOpen, onClose, schoolId, selectedDate }) => {
  const [date, setDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState(null);

  // Send daily SMS reports mutation
  const sendReportsMutation = useMutation(
    (data) => authAPI.sendDailySmsReports(data),
    {
      onSuccess: (data) => {
        setResults(data.results);
        toast.success(data.message.ar || 'تم إرسال التقارير بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'خطأ في إرسال التقارير');
      },
      onSettled: () => {
        setIsSending(false);
      }
    }
  );

  const handleSendReports = () => {
    setIsSending(true);
    setResults(null);
    sendReportsMutation.mutate({
      school_id: schoolId,
      date: date
    });
  };

  const getStatusIcon = (success) => {
    if (success) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إرسال تقارير الحضور عبر SMS"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">إرسال التقارير اليومية</h3>
            <p className="text-sm text-gray-600">إرسال تقارير الحضور للطلاب الذين لديهم مشاكل في الحضور</p>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 space-x-reverse mb-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <label className="text-sm font-medium text-gray-900">اختيار التاريخ</label>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            سيتم إرسال التقارير للطلاب الذين لديهم غياب أو تأخير في هذا التاريخ
          </p>
        </div>

        {/* Send Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSendReports}
            disabled={isSending}
            className="flex items-center space-x-3 space-x-reverse px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isSending ? 'جاري الإرسال...' : 'إرسال التقارير'}
            </span>
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">نتائج الإرسال</h4>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                <div className="text-sm text-blue-800">إجمالي الرسائل</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{results.success}</div>
                <div className="text-sm text-green-800">تم الإرسال</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                <div className="text-sm text-red-800">فشل الإرسال</div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">معدل النجاح</span>
                <span className="text-sm font-medium text-gray-900">
                  {results.total > 0 ? Math.round((results.success / results.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${results.total > 0 ? (results.success / results.total) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Failed Contacts */}
            {results.failed_contacts && results.failed_contacts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 space-x-reverse mb-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h5 className="font-medium text-red-800">الرسائل الفاشلة</h5>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.failed_contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{contact.name}</span>
                        <span className="text-gray-600 mr-2">({contact.phone})</span>
                      </div>
                      <span className="text-red-600 text-xs">{contact.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Messages */}
            {results.sent_messages && results.sent_messages.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 space-x-reverse mb-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h5 className="font-medium text-green-800">الرسائل المرسلة</h5>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.sent_messages.map((message, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{message.name}</span>
                        <span className="text-gray-600 mr-2">({message.phone})</span>
                      </div>
                      <span className="text-green-600 text-xs">
                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ar-SA') : 'تم الإرسال'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 space-x-reverse pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SmsOperations;
