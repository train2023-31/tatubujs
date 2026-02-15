import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import './WhatsAppSenderAgent.css';

const POLL_INTERVAL_MS = 5000;

function formatPhoneForWa(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('968')) return digits;
  if (digits.length === 8) return '968' + digits;
  if (digits.length === 9 && digits.startsWith('9')) return '968' + digits;
  return digits;
}

const WhatsAppSenderAgent = () => {
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusByIndex, setStatusByIndex] = useState({});
  const [completing, setCompleting] = useState(false);

  const fetchPendingJob = useCallback(async () => {
    if (!user?.school_id) return null;
    try {
      const res = await reportsAPI.getAutoWhatsAppPendingJob({ school_id: user.school_id });
      if (res.pending && res.job_id && res.messages?.length) {
        return { job_id: res.job_id, date: res.date, messages: res.messages };
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [user?.school_id]);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const data = await fetchPendingJob();
      if (mounted) {
        setJob(data);
        setLoading(false);
        if (data) setStatusByIndex({});
      }
    };
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fetchPendingJob]);

  const openWhatsApp = (msg) => {
    const phone = formatPhoneForWa(msg.phone);
    if (!phone) {
      toast.error('رقم الهاتف غير صالح');
      return;
    }
    const text = encodeURIComponent(msg.message || '');
    const url = `https://wa.me/${phone}${text ? `?text=${text}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const markSent = (index) => {
    setStatusByIndex((prev) => ({ ...prev, [index]: 'sent' }));
  };
  const markSkipped = (index) => {
    setStatusByIndex((prev) => ({ ...prev, [index]: 'skipped' }));
  };

  const sentCount = Object.values(statusByIndex).filter((s) => s === 'sent').length;
  const skippedCount = Object.values(statusByIndex).filter((s) => s === 'skipped').length;
  const total = job?.messages?.length || 0;
  const remaining = total - sentCount - skippedCount;

  const handleComplete = async () => {
    if (!job?.job_id) return;
    setCompleting(true);
    try {
      await reportsAPI.completeAutoWhatsAppJob({
        job_id: job.job_id,
        sent: sentCount,
        failed: skippedCount,
        remaining,
      });
      toast.success('تم تسجيل نتيجة الإرسال بنجاح.');
      setJob(null);
      setStatusByIndex({});
    } catch (e) {
      toast.error(e.response?.data?.message || 'فشل في تسجيل النتيجة');
    } finally {
      setCompleting(false);
    }
  };

  if (!user || !['school_admin', 'data_analyst', 'admin'].includes(user.role)) {
    return (
      <div className="p-6 text-center text-gray-600">
        غير مصرح لك بفتح هذه الصفحة.
      </div>
    );
  }

  return (
    <div className="whatsapp-sender-agent container mx-auto p-4 max-w-2xl" dir="rtl">
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h1 className="text-lg font-semibold">وكيل الإرسال — التحقق من المتصفح</h1>
        </div>
        <div className="card-body space-y-4">
          <p className="text-sm text-gray-600">
            افتح هذه الصفحة على نفس الجهاز الذي فيه واتساب ويب. عند وجود طلب إرسال من التقرير اليومي،
            ستظهر هنا قائمة الرسائل. اضغط «فتح واتساب وإرسال» ثم أرسل من واتساب وعدّ الطلب «تم الإرسال».
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !job ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا يوجد طلب إرسال في الانتظار.</p>
              <p className="text-sm mt-1">سيتم التحقق تلقائياً كل بضع ثوانٍ.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>التاريخ: {job.date}</span>
                <span>عدد الرسائل: {total}</span>
              </div>
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {job.messages.map((msg, index) => (
                  <li
                    key={index}
                    className={`border rounded-lg p-3 ${
                      statusByIndex[index] === 'sent'
                        ? 'bg-green-50 border-green-200'
                        : statusByIndex[index] === 'skipped'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{msg.student_name}</p>
                        <p className="text-xs text-gray-500 truncate">{msg.phone}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {statusByIndex[index] !== 'sent' && statusByIndex[index] !== 'skipped' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openWhatsApp(msg)}
                              className="btn btn-sm btn-primary inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              فتح واتساب وإرسال
                            </button>
                            <button
                              type="button"
                              onClick={() => markSent(index)}
                              className="btn btn-sm btn-success inline-flex items-center"
                              title="تم الإرسال"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => markSkipped(index)}
                              className="btn btn-sm btn-outline inline-flex items-center"
                              title="تخطي"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {statusByIndex[index] === 'sent' && (
                          <span className="text-green-600 text-sm flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            تم الإرسال
                          </span>
                        )}
                        {statusByIndex[index] === 'skipped' && (
                          <span className="text-gray-500 text-sm">تخطي</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                <div className="text-sm text-gray-600">
                  تم: {sentCount} — تخطي: {skippedCount} — متبقي: {remaining}
                </div>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  {completing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  إنهاء وتسجيل النتيجة
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSenderAgent;
