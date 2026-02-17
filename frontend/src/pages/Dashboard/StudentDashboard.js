import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, AlertCircle, ArrowRight, ArrowLeft, Bus, User, History,
  QrCode, MapPin, BarChart3, Calendar, TrendingUp, Clock, CheckCircle, FileText, Star, Eye, ChevronDown, ChevronUp, ChevronRight, Truck, Lock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { attendanceAPI, busAPI, parentPickupAPI } from '../../services/api';
import { formatDate, formatOmanTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import StatCard from '../../components/Dashboard/StatCard';
import StudentQRCode from '../../components/StudentQRCode/StudentQRCode';
import toast from 'react-hot-toast';

const SECTIONS = {
  PICKUP: 'pickup',
  QR: 'qr',
  ATTENDANCE: 'attendance',
  BUS: 'bus',
  ROUTE: 'route',
  SCANS: 'scans',
  PROFILE: 'profile',
};

const StudentDashboard = ({ selectedDate, setSelectedDate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickupLoading, setPickupLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  // Reset parent PIN (profile, parent mode only)
  const [showResetPinForm, setShowResetPinForm] = useState(false);
  const [resetPinCurrent, setResetPinCurrent] = useState('');
  const [resetPinNew, setResetPinNew] = useState('');
  const [resetPinConfirm, setResetPinConfirm] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  const [resetPinLoading, setResetPinLoading] = useState(false);

  // Check if user is in parent mode
  const isParentMode = localStorage.getItem('isParentMode') === 'true';

  const handleResetParentPin = async (e) => {
    e.preventDefault();
    setResetPinError('');
    if (!/^\d{6}$/.test(resetPinCurrent) || !/^\d{6}$/.test(resetPinNew) || !/^\d{6}$/.test(resetPinConfirm)) {
      setResetPinError('جميع الحقول يجب أن تكون 6 أرقام.');
      return;
    }
    if (resetPinNew !== resetPinConfirm) {
      setResetPinError('الرمز الجديد وتأكيد الرمز غير متطابقتين.');
      return;
    }
    if (resetPinNew === resetPinCurrent) {
      setResetPinError('الرمز الجديد يجب أن يختلف عن الرمز الحالي.');
      return;
    }
    setResetPinLoading(true);
    try {
      await parentPickupAPI.resetParentPin(resetPinCurrent, resetPinNew, resetPinConfirm);
      toast.success('تم تغيير الرمز السري بنجاح.');
      setShowResetPinForm(false);
      setResetPinCurrent('');
      setResetPinNew('');
      setResetPinConfirm('');
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل تغيير الرمز. حاول مرة أخرى.';
      setResetPinError(msg);
    } finally {
      setResetPinLoading(false);
    }
  };

  const toggleSection = (key) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  // Fetch student attendance history (all data, no date range)
  const { data: studentAttendanceHistory, isLoading: attendanceLoading } = useQuery(
    ['studentAttendanceHistory', user?.user_id],
    () => attendanceAPI.getMyAttendanceHistory(),
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000
    }
  );

  // Fetch parent pickup status
  const { data: pickupStatus, isLoading: pickupStatusLoading, refetch: refetchPickupStatus } = useQuery(
    ['pickupStatus', user?.user_id],
    () => parentPickupAPI.getMyPickupStatus(),
    {
      enabled: !!user?.user_id && isParentMode,
      refetchInterval: 15000 // Refresh every 15 seconds for real-time updates
    }
  );

  // Handle pickup request
  const handleRequestPickup = async () => {
    setPickupLoading(true);
    try {
      await parentPickupAPI.requestPickup();
      toast.success('تم إرسال طلب الاستلام بنجاح');
      refetchPickupStatus();
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب';
      toast.error(message);
    } finally {
      setPickupLoading(false);
    }
  };

  // Handle confirm arrival
  const handleConfirmPickup = async () => {
    setPickupLoading(true);
    try {
      await parentPickupAPI.confirmPickup();
      toast.success('تم تأكيد وصولك للمدرسة');
      refetchPickupStatus();
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء التأكيد';
      toast.error(message);
    } finally {
      setPickupLoading(false);
    }
  };

  // Handle complete pickup
  const handleCompletePickup = async () => {
    setPickupLoading(true);
    try {
      await parentPickupAPI.completePickup();
      toast.success('تم تأكيد استلام الطالب بنجاح');
      refetchPickupStatus();
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء إتمام الاستلام';
      toast.error(message);
    } finally {
      setPickupLoading(false);
    }
  };

  // Handle cancel pickup
  const handleCancelPickup = async () => {
    if (!pickupStatus?.pickup?.id) return;
    
    setPickupLoading(true);
    try {
      await parentPickupAPI.cancelPickup(pickupStatus.pickup.id);
      toast.success('تم إلغاء طلب الاستلام');
      refetchPickupStatus();
    } catch (error) {
      const message = error.response?.data?.message || 'حدث خطأ أثناء الإلغاء';
      toast.error(message);
    } finally {
      setPickupLoading(false);
    }
  };

  // Fetch student attendance statistics
  const { data: studentAttendanceStats, isLoading: statsLoading } = useQuery(
    ['studentAttendanceStats', user?.user_id],
    () => attendanceAPI.getMyAttendanceStats(),
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000
    }
  );

  // Fetch student profile data
  const { data: studentProfile, isLoading: profileLoading } = useQuery(
    ['studentProfile', user?.user_id],
    () => attendanceAPI.getMyProfile(),
    {
      enabled: !!user?.user_id
    }
  );

  // Fetch student bus status and details
  const { data: busStatus, isLoading: busLoading } = useQuery(
    ['studentBusStatus', user?.user_id],
    () => busAPI.getStudentBusStatus(user?.user_id),
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000
    }
  );

  // Fetch student bus scan logs
  const { data: scanLogs, isLoading: logsLoading } = useQuery(
    ['studentScanLogs', user?.user_id],
    () => busAPI.getScans({ student_id: user?.user_id, limit: 20 }),
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000
    }
  );

  // Fetch all students on the same bus for route tracking
  const busId = busStatus?.current_bus?.id;
  const { data: busStudents, isLoading: busStudentsLoading } = useQuery(
    ['busStudents', busId],
    () => busAPI.getBusStudents(busId),
    {
      enabled: !!busId,
      refetchInterval: 60000 // Refresh every minute
    }
  );

  // Fetch today's scans for the bus to determine which locations have been scanned
  const today = new Date().toISOString().split('T')[0];
  const { data: todayBusScans, isLoading: todayScansLoading } = useQuery(
    ['todayBusScans', busId, today],
    () => busAPI.getScans({ bus_id: busId, date: today, limit: 1000 }),
    {
      enabled: !!busId,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  if (attendanceLoading || profileLoading || statsLoading || busLoading || logsLoading || busStudentsLoading || todayScansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const attendanceHistory = studentAttendanceHistory?.attendance_history || [];
  const attendanceStats = studentAttendanceStats?.statistics || {};
  
  // Show all attendance data, not filtered by date
  const allAttendance = attendanceHistory;
  
  // Group attendance records by date
  const groupedAttendance = allAttendance.reduce((groups, record) => {
    const date = record.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {});
  
  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedAttendance).sort((a, b) => new Date(b) - new Date(a));

  // Use API stats if available, otherwise calculate from records
  const totalAbsentDays = attendanceStats.absent_count || 0;
  const totalLateDays = attendanceStats.late_count || 0;
  const totalExcusedDays = attendanceStats.excused_count || 0;
  const totalRecords = attendanceStats.total_records || 0;
  const attendanceRate = attendanceStats.attendance_rate || 0;
  const behaviorNote = attendanceStats.behavior_note || "";

  // Service card config - clean look with image background
  const serviceCards = [
    ...(isParentMode ? [{
      key: SECTIONS.PICKUP,
      title: 'طلب استلام',
      subtitle: pickupStatus?.pickup?.status === 'pending' ? 'بانتظار التأكيد' : pickupStatus?.pickup?.status === 'confirmed' ? 'وصلت للمدرسة' : pickupStatus?.pickup?.status === 'completed' ? 'مكتمل' : 'إرسال طلب',
      icon: Truck,
      accent: 'text-blue-600',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-600',
      bgImage: '/111.png',
    }] : []),
    {
      key: SECTIONS.QR,
      title: 'رمز QR الخاص بي',
      subtitle: 'للصعود والنزول من الحافلة',
      icon: QrCode,
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      bgImage: '/222.png',
    },
    {
      key: SECTIONS.ATTENDANCE,
      title: 'سجل الحضور',
      subtitle: `${attendanceRate}% معدل • ${totalRecords} سجل`,
      icon: Calendar,
      accent: 'text-violet-600',
      iconBg: 'bg-violet-500/15',
      iconColor: 'text-violet-600',
      bgImage: '/3.png',
    },
    {
      key: SECTIONS.BUS,
      title: 'معلومات الحافلة',
      subtitle: busStatus?.current_bus ? `حافلة ${busStatus.current_bus.bus_number}` : 'لا توجد حافلة',
      icon: Bus,
      accent: 'text-amber-600',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600',
      bgImage: '/2.png',
    },
    ...(busStatus?.current_bus && busStudents?.length > 0 ? [{
      key: SECTIONS.ROUTE,
      title: 'مسار الحافلة',
      subtitle: 'تتبع الموقع',
      icon: MapPin,
      accent: 'text-cyan-600',
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-600',
      bgImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400',
    }] : []),
    {
      key: SECTIONS.SCANS,
      title: 'سجل الصعود والنزول',
      subtitle: scanLogs?.length ? `${scanLogs.length} عملية` : 'لا توجد سجلات',
      icon: History,
      accent: 'text-rose-600',
      iconBg: 'bg-rose-500/15',
      iconColor: 'text-rose-600',
      bgImage: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400',
    },
    {
      key: SECTIONS.PROFILE,
      title: 'معلوماتي الشخصية',
      subtitle: studentProfile?.fullName || user?.fullName || 'الملف',
      icon: User,
      accent: 'text-slate-600',
      iconBg: 'bg-slate-500/15',
      iconColor: 'text-slate-600',
      bgImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400',
    },
  ];

  const activeCard = expandedSection ? serviceCards.find((c) => c.key === expandedSection) : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* When a card is selected: show only back button + section content */}
      {expandedSection ? (
        <>
          <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setExpandedSection(null)}
              className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-primary-100 hover:bg-primary-200 active:bg-primary-300 text-primary-700 font-medium transition-colors"
              aria-label="رجوع"
            >
              <ChevronRight className="w-5 h-5" />
              <span>رجوع</span>
            </button>
            {activeCard && (
              <h2 className="text-lg font-bold text-gray-900 truncate flex-1 text-right">
                {activeCard.title}
              </h2>
            )}
          </div>
          <div className="space-y-4">
        {/* Parent Pickup Section */}
      {isParentMode && expandedSection === SECTIONS.PICKUP && (
        <div className="card ">
          <div className="card-header bg-primary-100 border-primary-200">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <h3 className="card-title ">استلام الطالب - ولي الأمر</h3>
            </div>
          </div>
          <div className="card-body">
            {pickupStatusLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !pickupStatus?.pickup ? (
              // No pickup request yet today
              (() => {
                const completedCount = pickupStatus?.today_completed_count ?? 0;
                const maxPerDay = 3;
                const limitReached = completedCount >= maxPerDay;
                return (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">
                      {limitReached ? 'تم استخدام الحد الأقصى لطلبات الاستلام اليوم' : 'لم يتم إرسال طلب استلام'}
                    </h4>
                    <p className="text-gray-600 mb-2">
                      {limitReached
                        ? `الحد الأقصى ${maxPerDay} طلبات استلام في اليوم. يمكنك الطلب مجدداً غداً.`
                        : 'قم بإرسال طلب استلام لإعلام المدرسة برغبتك في استلام الطالب'}
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      استلامات اليوم: {completedCount} من {maxPerDay}
                    </p>
                    {!limitReached && (
                      <button
                        onClick={handleRequestPickup}
                        disabled={pickupLoading}
                        className="btn-primary btn-lg inline-flex items-center gap-2"
                      >
                        {pickupLoading ? (
                          <>
                            <LoadingSpinner />
                            <span>جاري الإرسال...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            <span>إرسال طلب استلام</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()
            ) : pickupStatus.pickup.status === 'pending' ? (
              // Pending - waiting for parent to confirm arrival
              <div className="text-center py-8">
                <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  تم إرسال طلب الاستلام
                </h4>
                <p className="text-gray-600 mb-2">
                  تم إرسال الطلب للمدرسة بنجاح
                </p>
                <div className="bg-white rounded-lg p-4 mb-6 inline-block">
                  <p className="text-sm text-gray-500">وقت الطلب</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(pickupStatus.pickup.request_time).toLocaleTimeString('ar-SA', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleConfirmPickup}
                    disabled={pickupLoading}
                    className="btn-lg bg-green-500 text-white hover:bg-green-600 inline-flex items-center gap-2"
                  >
                    {pickupLoading ? (
                      <>
                        <LoadingSpinner />
                        <span>جاري التأكيد...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-5 w-5" />
                        <span>وصلت للمدرسة</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelPickup}
                    disabled={pickupLoading}
                    className="btn-outline btn-lg inline-flex items-center gap-2"
                  >
                    إلغاء الطلب
                  </button>
                </div>
              </div>
            ) : pickupStatus.pickup.status === 'confirmed' ? (
              // Confirmed - parent is at school, waiting to complete pickup
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  تم تأكيد وصولك للمدرسة
                </h4>
                <p className="text-gray-600 mb-2">
                  يرجى انتظار الطالب عند المدخل
                </p>
                <div className="bg-white rounded-lg p-4 mb-6 inline-block">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-500">وقت الطلب</p>
                      <p className="text-md font-semibold text-gray-900">
                        {new Date(pickupStatus.pickup.request_time).toLocaleTimeString('ar-SA', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">وقت الوصول</p>
                      <p className="text-md font-semibold text-gray-900">
                        {new Date(pickupStatus.pickup.confirmation_time).toLocaleTimeString('ar-SA', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 font-medium flex items-center gap-2 justify-center">
                    <AlertCircle className="h-5 w-5" />
                    اسم الطالب سيظهر على شاشة العرض في ساحة المدرسة
                  </p>
                </div>
                <button
                  onClick={handleCompletePickup}
                  disabled={pickupLoading}
                  className="btn-lg bg-green-500 text-white hover:bg-green-600 inline-flex items-center gap-2"
                >
                  {pickupLoading ? (
                    <>
                      <LoadingSpinner />
                      <span>جاري التأكيد...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>تأكيد استلام الطالب</span>
                    </>
                  )}
                </button>
              </div>
            ) : pickupStatus.pickup.status === 'completed' ? (
              // Completed — allow new request (hide previous), max 3 per day
              (() => {
                const completedCount = pickupStatus?.today_completed_count ?? 1;
                const maxPerDay = 3;
                const canRequestMore = completedCount < maxPerDay;
                return (
                  <div className="text-center py-8">
                    <Star className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">
                      تم استلام الطالب بنجاح
                    </h4>
                    <p className="text-gray-600 mb-2">
                      شكراً لاستخدامكم النظام
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      استلامات اليوم: {completedCount} من {maxPerDay}
                    </p>
                    {canRequestMore ? (
                      <button
                        onClick={handleRequestPickup}
                        disabled={pickupLoading}
                        className="btn-primary btn-lg inline-flex items-center gap-2"
                      >
                        {pickupLoading ? (
                          <>
                            <LoadingSpinner />
                            <span>جاري الإرسال...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5" />
                            <span>طلب استلام جديد</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <p className="text-amber-700 font-medium">
                        تم الوصول للحد الأقصى (3 طلبات في اليوم)
                      </p>
                    )}
                  </div>
                );
              })()
            ) : null}
          </div>
        </div>
      )}

      {/* Behavior Note - always visible when present */}
      {behaviorNote && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">ملاحظة السلوك</h3>
          </div>
          <div className="card-body">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
                <div className="mr-2 sm:mr-3">
                  <h4 className="text-xs sm:text-sm font-medium text-yellow-800 mb-1 sm:mb-2">
                    ملاحظة من المعلم
                  </h4>
                  <p className="text-xs sm:text-sm text-yellow-700 leading-relaxed">
                    {behaviorNote}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Information */}
      {expandedSection === SECTIONS.PROFILE && (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">معلوماتي الشخصية</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">الاسم الكامل</label>
              <p className="text-gray-900">{studentProfile?.fullName || 'غير محدد'}</p>
            </div>
            {/* <div>
              <label className="label">اسم المستخدم</label>
              <p className="text-gray-900">{studentProfile?.username || 'غير محدد'}</p>
            </div>
            <div>
              <label className="label">البريد الإلكتروني</label>
              <p className="text-gray-900">{studentProfile?.email || 'غير محدد'}</p>
            </div> */}
            <div>
              <label className="label">رقم الهاتف</label>
              <p className="text-gray-900">{studentProfile?.phone_number || 'غير محدد'}</p>
            </div>
            <div>
              <label className="label">المنطقة السكنية</label>
              <p className="text-gray-900">{studentProfile?.location || 'غير محدد'}</p>
            </div>
            <div>
              <label className="label">عدد الفصول</label>
              <p className="text-gray-900">{studentProfile?.total_classes || 0}</p>
            </div>
            <div>
              <label className="label">الفصول المسجلة</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {studentProfile?.classes?.map((classItem, idx) => (
                  <span key={idx} className="badge badge-outline text-xs">
                    {classItem.class_name}
                  </span>
                )) || <span className="text-gray-500">لا توجد فصول</span>}
              </div>
            </div>
          </div>

          {/* Parent mode: change PIN */}
          {isParentMode && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-slate-600" />
                <h4 className="font-semibold text-gray-800">الرمز السري لتسجيل دخول ولي الأمر</h4>
              </div>
              {!showResetPinForm ? (
                <button
                  type="button"
                  onClick={() => setShowResetPinForm(true)}
                  className="btn-outline btn-sm"
                >
                  تغيير الرمز السري
                </button>
              ) : (
                <form onSubmit={handleResetParentPin} className="space-y-3 max-w-xs">
                  <div>
                    <label className="label text-sm">الرمز الحالي (6 أرقام)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetPinCurrent}
                      onChange={(e) => { setResetPinCurrent(e.target.value); setResetPinError(''); }}
                      className="input w-full text-right"
                      placeholder="••••••"
                      dir="ltr"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">الرمز الجديد (6 أرقام)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetPinNew}
                      onChange={(e) => { setResetPinNew(e.target.value); setResetPinError(''); }}
                      className="input w-full text-right"
                      placeholder="••••••"
                      dir="ltr"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="label text-sm">تأكيد الرمز الجديد</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetPinConfirm}
                      onChange={(e) => { setResetPinConfirm(e.target.value); setResetPinError(''); }}
                      className="input w-full text-right"
                      placeholder="••••••"
                      dir="ltr"
                      autoComplete="new-password"
                    />
                  </div>
                  {resetPinError && (
                    <p className="text-sm text-red-600">{resetPinError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={resetPinLoading}
                      className="btn-primary btn-sm"
                    >
                      {resetPinLoading ? <LoadingSpinner /> : 'حفظ الرمز الجديد'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPinForm(false);
                        setResetPinCurrent('');
                        setResetPinNew('');
                        setResetPinConfirm('');
                        setResetPinError('');
                      }}
                      className="btn-outline btn-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* QR Code Section */}
      {expandedSection === SECTIONS.QR && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              <h3 className="card-title">رمز QR الخاص بي</h3>
            </div>
          </div>
          <div className="card-body flex flex-col items-center">
            <StudentQRCode
              student={{
                id: user?.user_id,
                fullName: studentProfile?.fullName || user?.fullName || 'الطالب',
                username: user?.username
              }}
              schoolName={user?.school_name}
            />
            <p className="text-xs text-gray-500 text-center mt-4">
              استخدم هذا الرمز للصعود والنزول من الحافلة • مرّر لتحميل الصورة
            </p>
          </div>
        </div>
      )}

      {/* Bus Details Section */}
      {expandedSection === SECTIONS.BUS && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-green-600" />
              <h3 className="card-title">معلومات الحافلة</h3>
            </div>
          </div>
          <div className="card-body">
            {busStatus?.current_bus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">رقم الحافلة</label>
                    <p className="text-gray-900 font-semibold">{busStatus.current_bus.bus_number}</p>
                  </div>
                  <div>
                    <label className="label">اسم الحافلة</label>
                    <p className="text-gray-900 font-semibold">{busStatus.current_bus.bus_name}</p>
                  </div>
                  <div>
                    <label className="label">رقم اللوحة</label>
                    <p className="text-gray-900">{busStatus.current_bus.plate_number || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="label">السعة</label>
                    <p className="text-gray-900">{busStatus.current_bus.capacity} طالب</p>
                  </div>
                  {busStatus.current_bus.location && (
                    <div className="col-span-2">
                      <label className="label">موقع الحافلة</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <p className="text-gray-900">{busStatus.current_bus.location}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${busStatus.on_bus ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className={`text-sm font-medium ${busStatus.on_bus ? 'text-green-700' : 'text-gray-600'}`}>
                      {busStatus.on_bus ? 'على الحافلة' : 'غير موجود على الحافلة'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد حافلة مسجلة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Information */}
      {expandedSection === SECTIONS.BUS && busStatus?.current_bus?.driver_name && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <h3 className="card-title">معلومات السائق</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{busStatus.current_bus.driver_name}</h4>
                <p className="text-sm text-gray-600">سائق الحافلة</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bus Route Tracking */}
      {expandedSection === SECTIONS.ROUTE && busStatus?.current_bus && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-blue-600" />
              <h3 className="card-title">مسار الحافلة</h3>
            </div>
          </div>
          <div className="card-body">
            {busStudentsLoading || todayScansLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="mr-3 text-gray-500">جاري تحميل مسار الحافلة...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Route Visualization - Always show route */}
                {(() => {
                  // Always show route, even if no students
                  if (!busStudents || !Array.isArray(busStudents) || busStudents.length === 0) {
                    return (
                      <div className="relative w-full py-8 sm:py-12">
                        <div className="relative w-full" style={{ height: '120px' }}>
                          <svg 
                            className="absolute top-1/2 left-0 w-full transform -translate-y-1/2"
                            style={{ height: '2px' }}
                            preserveAspectRatio="none"
                          >
                            <line
                              x1="0"
                              y1="1"
                              x2="100%"
                              y2="1"
                              stroke="#000000"
                              strokeWidth="2"
                              strokeDasharray="8, 8"
                              className="opacity-60"
                            />
                          </svg>
                          <div className="relative w-full flex items-center justify-between px-2 sm:px-4" style={{ height: '120px' }}>
                            <div className="flex flex-col items-center relative z-10" style={{ flex: '0 0 auto' }}>
                              <div className="relative mb-2">
                                <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-black" />
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
                              </div>
                              <div className="text-center mt-2 max-w-[80px] sm:max-w-[120px]">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">بدء</p>
                                <p className="text-xs text-gray-600 truncate">الرحلة</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-center relative z-10" style={{ flex: '0 0 auto' }}>
                              <div className="relative mb-2">
                                <Bus className="h-10 w-10 sm:h-12 sm:w-12 text-black" />
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
                              </div>
                              <div className="text-center mt-2 max-w-[80px] sm:max-w-[120px]">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">المدرسة</p>
                                <p className="text-xs text-gray-600 truncate">{user?.school_name || 'الوصول'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-2 font-medium">لا توجد بيانات عن الطلاب</p>
                          <p className="text-xs text-gray-400">لم يتم تعيين طلاب على هذه الحافلة بعد</p>
                        </div>
                      </div>
                    );
                  }
                  // Get today's scans to determine which locations have been scanned
                  const scans = todayBusScans || [];
                  const scannedStudentIds = new Set(
                    scans
                      .filter(scan => scan.scan_type === 'board')
                      .map(scan => scan.student_id)
                  );
                  
                  // Separate students into scanned and unscanned
                  const studentsWithLocation = busStudents.filter(s => s.location && s.location.trim());
                  const scannedLocations = studentsWithLocation.filter(s => scannedStudentIds.has(s.id));
                  const unscannedLocations = studentsWithLocation.filter(s => !scannedStudentIds.has(s.id));
                  
                  return (
                    <>
                      {/* Route Line - Always visible */}
                      <div className="relative w-full py-8 sm:py-12">
                        {/* Horizontal Dashed Path */}
                        <div className="relative w-full" style={{ height: '120px' }}>
                          {/* SVG Horizontal Dashed Line */}
                          <svg 
                            className="absolute top-1/2 left-0 w-full transform -translate-y-1/2"
                            style={{ height: '2px' }}
                            preserveAspectRatio="none"
                          >
                            <line
                              x1="0"
                              y1="1"
                              x2="100%"
                              y2="1"
                              stroke="#000000"
                              strokeWidth="2"
                              strokeDasharray="8, 8"
                              className="opacity-60"
                            />
                          </svg>

                          {/* Route Points - Only Scanned Locations on Line */}
                          <div className="relative w-full flex items-center justify-between px-2 sm:px-4" style={{ height: '120px' }}>
                            {/* Start Point */}
                            <div className="flex flex-col items-center relative z-10" style={{ flex: '0 0 auto' }}>
                              <div className="relative mb-2">
                                <MapPin className="h-8 w-8 sm:h-10 sm:w-10 text-black" />
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
                              </div>
                              <div className="text-center mt-2 max-w-[80px] sm:max-w-[120px]">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">بدء</p>
                                <p className="text-xs text-gray-600 truncate">الرحلة</p>
                              </div>
                            </div>

                            {/* Scanned Locations on Route Line */}
                            {scannedLocations.map((student, index) => {
                              const isCurrentUser = student.id === user?.user_id;
                              const totalScanned = scannedLocations.length;
                              const position = totalScanned > 0 ? ((index + 1) / (totalScanned + 1)) * 100 : 50;
                              
                              // Get scan info for this student
                              const studentScans = scans.filter(s => s.student_id === student.id && s.scan_type === 'board');
                              const lastScan = studentScans.length > 0 ? studentScans[studentScans.length - 1] : null;
                              
                              return (
                                <div 
                                  key={student.id || index} 
                                  className="flex flex-col items-center absolute z-10"
                                  style={{ 
                                    left: `${position}%`,
                                    transform: 'translateX(-50%)',
                                    flex: '0 0 auto'
                                  }}
                                >
                                  <div className="relative mb-2">
                                    <MapPin 
                                      className={`h-8 w-8 sm:h-10 sm:w-10 ${isCurrentUser ? 'text-green-600' : 'text-blue-600'}`}
                                    />
                                    <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${isCurrentUser ? 'bg-green-600' : 'bg-blue-600'}`}></div>
                                    {/* Checkmark for scanned */}
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                  <div className="text-center mt-2 max-w-[80px] sm:max-w-[120px]">
                                    <p className={`text-xs sm:text-sm font-semibold truncate ${isCurrentUser ? 'text-green-700' : 'text-blue-900'}`}>
                                      {student.location}
                                    </p>
                                    {student.fullName && (
                                      <p className="text-xs text-gray-600 truncate">{student.fullName}</p>
                                    )}
                                    {lastScan && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {formatOmanTime(lastScan.scan_time).time}
                                      </p>
                                    )}
                                    {isCurrentUser && (
                                      <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                        موقعك
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* School Destination */}
                            <div className="flex flex-col items-center relative z-10" style={{ flex: '0 0 auto' }}>
                              <div className="relative mb-2">
                                <Bus className="h-10 w-10 sm:h-12 sm:w-12 text-black" />
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black rounded-full"></div>
                              </div>
                              <div className="text-center mt-2 max-w-[80px] sm:max-w-[120px]">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">المدرسة</p>
                                <p className="text-xs text-gray-600 truncate">{user?.school_name || 'الوصول'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* On The Way List - Unscanned Locations */}
                      {unscannedLocations.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                            <h4 className="text-lg font-semibold text-gray-900">في الطريق ({unscannedLocations.length})</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {unscannedLocations.map((student, index) => {
                              const isCurrentUser = student.id === user?.user_id;
                              return (
                                <div
                                  key={student.id || index}
                                  className={`p-3 rounded-lg border-2 ${
                                    isCurrentUser 
                                      ? 'bg-yellow-50 border-yellow-300' 
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <MapPin className={`h-5 w-5 flex-shrink-0 ${isCurrentUser ? 'text-yellow-600' : 'text-gray-400'}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-yellow-900' : 'text-gray-700'}`}>
                                        {student.location}
                                      </p>
                                      {student.fullName && (
                                        <p className="text-xs text-gray-600 truncate">{student.fullName}</p>
                                      )}
                                    </div>
                                    {isCurrentUser && (
                                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                                        موقعك
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Route Summary Cards */}
                {busStudents && Array.isArray(busStudents) && busStudents.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border-2 border-blue-200 shadow-sm">
                        <div className="flex items-center justify-center mb-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                          {busStudents.filter(s => s.location && s.location.trim()).length}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">نقاط التوقف</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border-2 border-green-200 shadow-sm">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-green-600">{busStudents.length}</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">إجمالي الطلاب</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border-2 border-purple-200 shadow-sm">
                        <div className="flex items-center justify-center mb-2">
                          <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                          {busStudents.filter(s => s.location && s.location.trim()).length > 0 
                            ? Math.round((busStudents.filter(s => s.location && s.location.trim()).length / busStudents.length) * 100)
                            : 0}%
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">طلاب بمواقع</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center border-2 border-orange-200 shadow-sm">
                        <div className="flex items-center justify-center mb-2">
                          <Bus className="h-5 w-5 text-orange-600" />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-orange-600">{busStatus.current_bus.bus_number}</p>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">رقم الحافلة</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Note for students without location */}
                {busStudents && Array.isArray(busStudents) && busStudents.filter(s => !s.location || !s.location.trim()).length > 0 && (
                  <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-yellow-800 font-medium">
                      {busStudents.filter(s => !s.location || !s.location.trim()).length} طالب بدون منطقة سكنية مسجلة
                    </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bus Scan Logs */}
      {expandedSection === SECTIONS.SCANS && (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            <h3 className="card-title">سجل الصعود والنزول</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">توقيت مسقط (MCT)</span>
          </div>
        </div>
        <div className="card-body">
          {scanLogs && Array.isArray(scanLogs) && scanLogs.length > 0 ? (
            <div className="space-y-2">
              {scanLogs.map((log, index) => {
                const omanTime = formatOmanTime(log.scan_time);
                
                return (
                  <div key={log.id || index} className={`p-2 sm:p-2.5 rounded-lg border ${
                    log.scan_type === 'board' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 text-xs sm:text-sm">
                      {/* Icon */}
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.scan_type === 'board' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {log.scan_type === 'board' ? (
                          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          ) : (
                          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                          )}
                        </div>
                      
                      {/* Type Badge */}
                      <span className={`badge text-xs whitespace-nowrap ${
                              log.scan_type === 'board' ? 'badge-success' : 'badge-danger'
                            }`}>
                              {log.scan_type === 'board' ? 'صعود' : 'نزول'}
                            </span>
                          
                      {/* Time */}
                      <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                            log.scan_type === 'board' 
                              ? 'bg-green-100 text-green-900' 
                              : 'bg-red-100 text-red-900'
                          }`}>
                        <Clock className={`h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 ${
                              log.scan_type === 'board' ? 'text-green-700' : 'text-red-700'
                            }`} />
                        <span className="font-semibold text-xs whitespace-nowrap">
                              {omanTime.time || formatDate(log.scan_time, 'HH:mm', 'ar')}
                            </span>
                        <span className="text-[10px] sm:text-xs font-medium bg-white px-1 sm:px-1.5 py-0.5 rounded whitespace-nowrap">MCT</span>
                          </div>
                          
                      {/* Date - Show on sm screens and up */}
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {omanTime.date || formatDate(log.scan_time, 'dd/MM/yyyy', 'ar')} - 
                      </span>
                          
                      {/* Bus Number */}
                            {log.bus_number && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                          <Bus className="h-3 w-3 flex-shrink-0" />
                          <span>{log.bus_number}</span>
                              </div>
                            )}
                      
                      {/* Location - Takes remaining space, wraps on mobile */}
                            {log.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 flex-1 min-w-[100px] sm:min-w-[150px] md:min-w-0">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{log.location}</span>
                              </div>
                            )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد سجلات صعود أو نزول</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* All Attendance Records */}
      {expandedSection === SECTIONS.ATTENDANCE && (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">سجل الحضور الكامل</h3>
        </div>
        <div className="card-body">
          {allAttendance.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {sortedDates.map((date) => (
                <div key={date} className="border rounded-lg p-3 sm:p-4">
                  <div className="mb-3 sm:mb-4">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      {formatDate(date, 'EEEE, dd MMMM yyyy', 'ar')}
                    </h4>
                    <div className="border-t pt-3 sm:pt-4">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الحصة</th>
                              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الفصل</th>
                              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المادة</th>
                              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المعلم</th>
                              <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">الحالة</th>
                              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">ملاحظة العذر</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {groupedAttendance[date].map((record, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {record.class_time_num}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {record.class_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {record.subject_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {record.teacher_name}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {record.is_absent && (
                                    <span className="badge badge-danger">
                                      هارب
                                    </span>
                                  )}
                                  {record.is_late && (
                                    <span className="badge badge-warning">
                                      متأخر
                                    </span>
                                  )}
                                  {record.is_excused && (
                                    <span className="badge badge-success">
                                      غائب
                                    </span>
                                  )}
                                  {record.is_present && !record.is_absent && !record.is_late && !record.is_excused && (
                                    <span className="badge badge-info">
                                      حاضر
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {record.excuse_note && record.excuse_note.trim() ? (
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {record.excuse_note}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-3">
                        {groupedAttendance[date].map((record, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <span className="text-sm font-medium text-gray-600">الحصة:</span>
                                <span className="text-sm font-semibold text-gray-900">{record.class_time_num}</span>
                              </div>
                              <div>
                                {record.is_absent && (
                                  <span className="badge badge-danger text-xs">
                                    هارب
                                  </span>
                                )}
                                {record.is_late && (
                                  <span className="badge badge-warning text-xs">
                                    متأخر
                                  </span>
                                )}
                                {record.is_excused && (
                                  <span className="badge badge-success text-xs">
                                    غائب
                                  </span>
                                )}
                                {record.is_present && !record.is_absent && !record.is_late && !record.is_excused && (
                                  <span className="badge badge-info text-xs">
                                    حاضر
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">الفصل:</span>
                                <span className="text-gray-900">{record.class_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">المادة:</span>
                                <span className="text-gray-900">{record.subject_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">المعلم:</span>
                                <span className="text-gray-900">{record.teacher_name}</span>
                              </div>
                              {record.excuse_note && record.excuse_note.trim() && (
                                <div className="mt-2 pt-2 border-t">
                                  <span className="text-gray-600 text-xs">ملاحظة العذر:</span>
                                  <p className="text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                                    {record.excuse_note}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد سجلات حضور</p>
            </div>
          )}
        </div>
      </div>
      )}

          </div>
        </>
      ) : (
        <>
          {/* Compact Stats - Mobile Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-xl  p-3 sm:p-4 border border-blue-200">
              <p className="text-xs text-blue-700 font-medium">معدل الحضور</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">{attendanceRate}%</p>
            </div>
            <div className="rounded-xl  p-3 sm:p-4 border border-red-200">
              <p className="text-xs text-red-700 font-medium">أيام الهروب</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">{totalAbsentDays}</p>
            </div>
            <div className="rounded-xl  p-3 sm:p-4 border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">أيام التأخر</p>
              <p className="text-lg sm:text-xl font-bold text-amber-600">{totalLateDays}</p>
            </div>
            <div className="rounded-xl  p-3 sm:p-4 border border-green-200">
              <p className="text-xs text-green-700 font-medium">أيام الغياب</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">{totalExcusedDays}</p>
            </div>
          </div>

          {/* Service Cards Grid */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 px-1">الخدمات</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {serviceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.key}
                    onClick={() => toggleSection(card.key)}
                    className="relative min-h-[88px] sm:min-h-[100px] flex flex-col items-start justify-between p-4 rounded-2xl text-right transition-all duration-200 active:scale-[0.98] overflow-hidden shadow-md hover:shadow-xl bg-white/90 hover:bg-white/95"
                  >
                    {/* Image background from internet */}
                    <div
                      className="absolute inset-0 opacity-[0.14] bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: card.bgImage ? `url(${card.bgImage})` : undefined }}
                      aria-hidden
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/40 to-transparent" aria-hidden />
                    <div className="relative z-10 w-full flex flex-col items-start justify-between flex-1">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} />
                      </div>
                      <div className="w-full mt-2">
                        <p className="text-sm font-bold text-gray-900 truncate">{card.title}</p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{card.subtitle}</p>
                      </div>
                      <div className={`w-full flex justify-end mt-2 ${card.accent}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
