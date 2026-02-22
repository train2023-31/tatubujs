import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, ClipboardList, Calendar, UserCheck, Clock, FileText,
  AlertCircle, Eye, EyeOff, CheckCircle, Settings, Phone, MessageCircle,
  BarChart3, Bus, User, QrCode, Upload, TrendingUp
} from 'lucide-react';
import { attendanceAPI, busAPI } from '../../services/api';
import { formatOmanTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import NewsWidget from '../../components/UI/NewsWidget';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';

const SchoolAdminDashboard = ({ schoolStats, teacherAttendance, statsLoading, teacherLoading, selectedDate, setSelectedDate, onNavigateToAttendance, onNavigateToAttendancesDetails, needsSetup, bulkOpsStatus, bulkOpsLoading }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [isStudentListModalOpen, setIsStudentListModalOpen] = useState(false);
  const [selectedStudentList, setSelectedStudentList] = useState(null);
  const [selectedListType, setSelectedListType] = useState('');
  const [isBusStudentsModalOpen, setIsBusStudentsModalOpen] = useState(false);
  const [busStudentsType, setBusStudentsType] = useState(''); // 'board' or 'exit'
  const [showAllQuickAccess, setShowAllQuickAccess] = useState(false);


  // Local function to safely call needsSetup
  const checkNeedsSetup = (status) => {
    if (typeof needsSetup === 'function') {
      return needsSetup(status);
    }
    return false;
  };

  // Fetch attendance summary for class statistics
  const { data: attendanceSummary, isLoading: summaryLoading } = useQuery(
    ['attendanceSummary', selectedDate],
    () => attendanceAPI.getAttendanceSummary({ date: selectedDate }),
    {
      enabled: !!selectedDate,
      refetchInterval: 30000,
    }
  );

  // Fetch bus report for today
  const { data: busReport, isLoading: busReportLoading } = useQuery(
    ['busReport', selectedDate],
    () => busAPI.getDailyBusReport({ date: selectedDate }),
    {
      enabled: !!selectedDate,
      refetchInterval: 30000,
    }
  );

  // Calculate bus statistics
  const busStats = React.useMemo(() => {
    if (!busReport || !Array.isArray(busReport)) {
      return { totalOnBus: 0, totalExited: 0, totalBuses: 0 };
    }
    
    let totalOnBus = 0;
    let totalExited = 0;
    
    busReport.forEach(busData => {
      totalOnBus += busData.currently_on_bus || 0;
      totalExited += busData.exited_count || 0;
    });
    
    return {
      totalOnBus,
      totalExited,
      totalBuses: busReport.length
    };
  }, [busReport]);


  // Handle viewing absent students for a specific class
  const handleViewAbsentStudents = (classData) => {
    setSelectedClassData(classData);
    setIsModalOpen(true);
  };


  // Handle viewing student lists from summary cards
  const handleViewStudentList = (listType) => {
    if (!attendanceSummary?.attendance_summary) return;
    
    // Collect all students of the specified type from all classes
    const allStudents = [];
    attendanceSummary.attendance_summary.forEach(classData => {
      if (classData.absent_students) {
        classData.absent_students.forEach(student => {
          if (listType === 'absent' && student.is_absent) {
            allStudents.push({
              ...student,
              class_name: classData.class_name
            });
          } else if (listType === 'late' && student.is_late) {
            allStudents.push({
              ...student,
              class_name: classData.class_name
            });
          } else if (listType === 'excuse' && student.is_excused) {
            allStudents.push({
              ...student,
              class_name: classData.class_name
            });
          }
        });
      }
    });
    
    setSelectedStudentList(allStudents);
    setSelectedListType(listType);
    setIsStudentListModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClassData(null);
  };

  // Close student list modal
  const handleCloseStudentListModal = () => {
    setIsStudentListModalOpen(false);
    setSelectedStudentList(null);
    setSelectedListType('');
  };

  // Handle viewing bus students
  const handleViewBusStudents = (type) => {
    setBusStudentsType(type);
    setIsBusStudentsModalOpen(true);
  };

  // Close bus students modal
  const handleCloseBusStudentsModal = () => {
    setIsBusStudentsModalOpen(false);
    setBusStudentsType('');
  };

  // Get bus students list for modal
  const getBusStudentsList = () => {
    if (!busReport || !Array.isArray(busReport)) return [];
    
    const studentsList = [];
    
    busReport.forEach(busData => {
      if (!busData.scans || !Array.isArray(busData.scans)) return;
      
      busData.scans.forEach(scan => {
        if (scan.scan_type === busStudentsType) {
          studentsList.push({
            student_name: scan.student_name || scan.student_username || 'غير محدد',
            student_id: scan.student_id,
            bus_number: busData.bus?.bus_number || scan.bus_number || 'غير محدد',
            bus_name: busData.bus?.bus_name || 'غير محدد',
            scan_time: scan.scan_time,
            location: scan.location || '-'
          });
        }
      });
    });
    
    return studentsList;
  };


  const SectionLoader = ({ loading, children, minHeight = '120px' }) => (
    loading ? (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50" style={{ minHeight }}>
        <LoadingSpinner />
        <span className="mr-2 text-sm text-gray-500">جاري التحميل...</span>
      </div>
    ) : children
  );

  return (
    <div className="space-y-6">
      {/* School Setup Guide — shows when bulkOps loaded */}
      {bulkOpsLoading ? (
        <SectionLoader loading minHeight="140px" />
      ) : bulkOpsStatus && checkNeedsSetup(bulkOpsStatus) ? (
        <div className="card border-blue-200 bg-blue-50">
          <div className="card-header bg-blue-100">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-blue-900">مرحباً بك! إعداد مدرستك</h3>
            </div>
          </div>
          <div className="card-body">
            <p className="text-blue-800 mb-2 text-sm">
              يبدو أن هذه هي المرة الأولى التي تدخل فيها إلى النظام. دعنا نساعدك في إعداد مدرستك خطوة بخطوة:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
              {/* Step 1 */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step1_teachers?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step1_teachers?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step1_teachers?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">1</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إضافة المعلمين</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step1_teachers?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step1_teachers.count} معلم`
                    : 'ابدأ بإضافة معلمي مدرستك إلى النظام'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step1_teachers?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations?tab=teachers')} 
                    className="btn btn-sm btn-primary w-full"
                  >
                    <UserCheck className="h-4 w-4 mr-1 ml-1" />
                    إضافة المعلمين
                  </button>
                )}
              </div>

              {/* Step 2 */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step2_students_classes?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step2_students_classes?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step2_students_classes?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">2</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إضافة الطلاب والفصول</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step2_students_classes?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step2_students_classes.students_count} طالب و ${bulkOpsStatus.step_status.step2_students_classes.classes_count} فصل`
                    : 'أضف طلاب مدرستك، قم برفع قوائم الفصول ويتم توزيع الطلاب عليها تلقائياً'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step2_students_classes?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations?tab=assign')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <Users className="h-4 w-4 mr-1 ml-1" />
                    إضافة الطلاب والفصول
                  </button>
                )}
              </div>

              {/* Step 3 - New Phone Numbers Step */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step3_phone_numbers?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step3_phone_numbers?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step3_phone_numbers?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">3</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إضافة أرقام أولياء الأمور</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step3_phone_numbers?.completed 
                    ? `${bulkOpsStatus.step_status.step3_phone_numbers.percentage}% من الطلاب لديهم أرقام هواتف`
                    : 'أضف أرقام هواتف أولياء الأمور للتواصل معهم'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step3_phone_numbers?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations?tab=phones')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <Phone className="h-4 w-4 mr-1 ml-1" />
                    إضافة أرقام الهواتف
                  </button>
                )}
              </div>

              {/* Step 4 */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step4_subjects?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step4_subjects?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step4_subjects?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">4</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إضافة المواد الدراسية</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step4_subjects?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step4_subjects.count} مادة دراسية`
                    : 'أضف المواد الدراسية التي تدرسها في مدرستك'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step4_subjects?.completed && (
                  <button 
                    onClick={() => navigate('/app/classes?tab=subjects')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <BookOpen className="h-4 w-4 mr-1 ml-1" />
                    إدارة المواد
                  </button>
                )}
              </div>

              {/* Step 5: Timetable */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step5_timetable?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step5_timetable?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step5_timetable?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">5</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">رفع الجدول الدراسي</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step5_timetable?.completed 
                    ? `تم رفع ${bulkOpsStatus.step_status.step5_timetable.count || 1} جدول دراسي`
                    : 'قم برفع ملف الجدول الدراسي (XML) من نظام aSc Timetables'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step5_timetable?.completed && (
                  <button 
                    onClick={() => navigate('/app/school-timetable')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <Calendar className="h-4 w-4 mr-1 ml-1" />
                    رفع الجدول
                  </button>
                )}
              </div>

              {/* Step 6: Substitutions (Optional) */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step6_substitutions?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step6_substitutions?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step6_substitutions?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">6</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إدارة الإحتياط </h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step6_substitutions?.completed 
                    ? `تم إعداد نظام الإحتياط `
                    : 'قم بإعداد نظام الإحتياط لإدارة غياب المعلمين'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step6_substitutions?.completed && (
                  <button 
                    onClick={() => navigate('/app/teacher-substitution')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <UserCheck className="h-4 w-4 mr-1 ml-1" />
                    إدارة الإحتياط 
                  </button>
                )}
              </div>

              {/* Step 7: Attendance */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step7_attendance?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step7_attendance?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step7_attendance?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">7</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">بدء تسجيل الحضور</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step7_attendance?.completed 
                    ? `تم تسجيل ${bulkOpsStatus.step_status.step7_attendance?.count || bulkOpsStatus.step_status.step5_attendance?.count || 0} سجل حضور في آخر 1 يوم`
                    : 'بعد إضافة المعلمين والطلاب والمواد، يمكنك البدء في تسجيل الحضور اليومي'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step7_attendance?.completed && (
                  <button 
                    onClick={onNavigateToAttendance}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <ClipboardList className="h-4 w-4 mr-1 ml-1" />
                    تسجيل الحضور
                  </button>
                )}
              </div>

              {/* Step 8: Drivers (Optional) */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step8_drivers?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step8_drivers?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step8_drivers?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">8</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إضافة السائقين (اختياري)</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step8_drivers?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step8_drivers?.count || 0} سائق`
                    : 'أضف سائقين الحافلات في مدرستك'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step8_drivers?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations?tab=drivers')}
                    className="btn btn-sm btn-outline w-full"
                  >
                    <User className="h-4 w-4 mr-1 ml-1" />
                    إضافة السائقين
                  </button>
                )}
              </div>

              {/* Step 9: Buses (Optional) */}
              <div className={`flex flex-col items-center p-2 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step9_buses?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                  bulkOpsStatus?.step_status?.step9_buses?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step9_buses?.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-base font-medium text-blue-600">9</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">إدارة الحافلات (اختياري)</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {bulkOpsStatus?.step_status?.step9_buses?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step9_buses?.count || 0} حافلة`
                    : 'أضف الحافلات وربطها بالسائقين والطلاب'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step9_buses?.completed && (
                  <button 
                    onClick={() => navigate('/app/buses')}
                    className="btn btn-sm btn-outline w-full"
                  >
                    <Bus className="h-4 w-4 mr-1 ml-1" />
                    إدارة الحافلات
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 p-2 bg-blue-100 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-800">
                  <strong>التقدم:</strong> {bulkOpsStatus?.completed_steps || 0} من {bulkOpsStatus?.total_steps || 9} خطوات مكتملة ({bulkOpsStatus?.overall_completion || 0}%)
                </p>
              </div>
              <div className="mt-1.5">
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${bulkOpsStatus?.overall_completion || 0}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-1.5">
                <strong>نصيحة:</strong> يمكنك استخدام رفع الملفات الجماعي لتسريع عملية الإعداد
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* News Widget */}
      
      <NewsWidget 
        limit={3} 
        onViewAll={() => navigate('/app/news')}
      />

      {/* Quick Access Cards */}
      {(() => {
        const quickAccessCards = [
          { title: "تسجيل الحضور", description: "تسجيل حضور الطلاب للفصول اليوم", icon: ClipboardList, color: "blue", onClick: onNavigateToAttendance },
          { title: "تقارير الحضور", description: "عرض تفاصيل الحضور والغياب", icon: Eye, color: "green", onClick: onNavigateToAttendancesDetails },
          { title: "التقرير اليومي", description: "عرض التقرير اليومي للحضور وإشعار اولياء أمور الطلاب الغائبين", icon: FileText, color: "purple", onClick: () => navigate('/app/daily-report') },
          { title: "تقرير المعلمين", description: "عرض تقرير حضور المعلمين", icon: Users, color: "orange", onClick: () => navigate('/app/teacher-report') },
          { title: "جدول الحصص", description: "إدارة ورفع الجدول الدراسي", icon: Calendar, color: "cyan", onClick: () => navigate('/app/school-timetable'), isNew: true },
          { title: "إحتياط المعلمين", description: "إدارة بدائل المعلمين الغائبين", icon: UserCheck, color: "teal", onClick: () => navigate('/app/teacher-substitution'), isNew: true },
          { title: "إدارة الفصول", description: "إدارة الفصول والمواد الدراسية", icon: BookOpen, color: "pink", onClick: () => navigate('/app/classes') },
          { title: "التقارير والإحصائيات", description: "عرض التقارير والإحصائيات الشاملة", icon: BarChart3, color: "cyan", onClick: () => navigate('/app/reports') },
          { title: "إدارة الحافلات", description: "إدارة الحافلات والسائقين والطلاب", icon: Bus, color: "indigo", onClick: () => navigate('/app/buses'), isNew: true },
          { title: "ماسح الحافلة", description: "مسح رموز QR للطلاب على الحافلة", icon: QrCode, color: "green", onClick: () => navigate('/app/bus-scanner'), isNew: true },
          { title: "رفع وتحديث البيانات", description: "رفع الملفات الجماعية للمعلمين والطلاب", icon: Upload, color: "blue", onClick: () => navigate('/app/bulk-operations') },
          { title: "إرسال رسائل مخصصة", description: "إرسال رسائل SMS للطلاب", icon: MessageCircle, color: "indigo", onClick: () => navigate('/app/bulk-messaging') },
          { title: "إعدادات SMS", description: "إعدادات الرسائل القصيرة iBulk SMS", icon: Settings, color: "indigo", onClick: () => navigate('/app/sms-configuration') }
        ];
        const displayedCards = showAllQuickAccess ? quickAccessCards : quickAccessCards.slice(0, 5);
        const hasMore = quickAccessCards.length > 5;
        
        return (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
              {hasMore && (
                <button
                  onClick={() => setShowAllQuickAccess(!showAllQuickAccess)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                >
                  {showAllQuickAccess ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      إخفاء
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      عرض الكل ({quickAccessCards.length})
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {displayedCards.map((card, index) => (
                  <QuickAccessCard
                    key={index}
                    title={card.title}
                    description={card.description}
                    icon={card.icon}
                    color={card.color}
                    onClick={card.onClick}
                    isNew={card.isNew}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Date Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">إحصائيات اليوم</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards — load independently */}
      <SectionLoader loading={statsLoading} minHeight="140px">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="إجمالي الطلاب"
            value={schoolStats?.number_of_students || 0}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="الطلاب الحاضرين"
            value={schoolStats?.number_of_presents || 0}
            icon={UserCheck}
            color="green"
          />
          <StatCard
            title="الطلاب الهاربين"
            value={schoolStats?.number_of_absents || 0}
            icon={Clock}
            color="red"
            showEyeIcon={true}
            onEyeClick={() => handleViewStudentList('absent')}
          />
          <StatCard
            title="الطلاب المتأخرين"
            value={schoolStats?.number_of_lates || 0}
            icon={TrendingUp}
            color="yellow"
            showEyeIcon={true}
            onEyeClick={() => handleViewStudentList('late')}
          />
          <StatCard
            title="الطلاب الغائبين"
            value={schoolStats?.number_of_excus || 0}
            icon={AlertCircle}
            color="orange"
            showEyeIcon={true}
            onEyeClick={() => handleViewStudentList('excuse')}
          />
        </div>
      </SectionLoader>

      {/* Bus Statistics Cards — load independently */}
      {busReportLoading ? (
        <SectionLoader loading minHeight="120px" />
      ) : busStats.totalBuses > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="الطلاب على الحافلات"
            value={busStats.totalOnBus || 0}
            icon={Bus}
            color="indigo"
            showEyeIcon={true}
            onEyeClick={() => handleViewBusStudents('board')}
          />
          <StatCard
            title="الطلاب الذين نزلوا"
            value={busStats.totalExited || 0}
            icon={Bus}
            color="purple"
            showEyeIcon={true}
            onEyeClick={() => handleViewBusStudents('exit')}
          />
        </div>
      ) : null}

      {/* Class Statistics — load independently */}
      {summaryLoading ? (
        <SectionLoader loading minHeight="200px" />
      ) : (schoolStats?.classes && schoolStats.classes.length > 0) || (attendanceSummary?.attendance_summary && attendanceSummary.attendance_summary.length > 0) ? (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">إحصائيات الفصول</h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header shadow-md sticky top-0 z-10">
                  <tr>
                    <th className="table-header-cell text-right">اسم الفصل</th>
                    <th className="table-header-cell text-right">إجمالي الطلاب</th>
                    <th className="table-header-cell text-right">الحاضرين</th>
                    <th className="table-header-cell text-right">الهاربين</th>
                    <th className="table-header-cell text-right">المتأخرين</th>
                    <th className="table-header-cell text-right">الغائبين</th>
                    <th className="table-header-cell text-center">الحصص المسجلة</th>
                    <th className="table-header-cell text-center">الحصص المفقودة</th>
                    <th className="table-header-cell text-center">عرض الغائبين</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {attendanceSummary?.attendance_summary?.map((classData, index) => (
                    <tr key={index}>
                      <td className="table-cell">{classData.class_name}</td>
                      <td className="table-cell">{classData.total_students}</td>
                      <td className="table-cell">
                        <span className="badge badge-success">{(classData.total_present || 0) === 0 ? '-' : (classData.total_students - (classData.total_absent + classData.total_excused) || 0)}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-danger">{(classData.total_absent || 0) === 0 ? '-' : (classData.total_absent || 0)}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-warning">{(classData.total_late || 0) === 0 ? '-' : (classData.total_late || 0)}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-info">{(classData.total_excused || 0) === 0 ? '-' : (classData.total_excused || 0)}</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="badge badge-success">
                          {Array.isArray(classData.class_time_nums) 
                            ? classData.class_time_nums.join(', ') 
                            : (classData.class_time_nums || 0)}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="badge badge-warning">
                          {Array.isArray(classData.not_in_class_time_nums) 
                            ? classData.not_in_class_time_nums.join(', ') 
                            : (classData.not_in_class_time_nums || 0)}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        
                        <button
                          
                          onClick={() => handleViewAbsentStudents(classData)}
                          className="inline-flex items-center justify-center w-8 h-8  hover:bg-blue-200  rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          title="عرض الطلاب الغائبين"
                        >            
                            <Eye className="h-4 w-4 text-blue-600" />
                        </button>
                      </td>
       
                    </tr>
                  )) || schoolStats.classes.sort((a, b) => a.id - b.id).map((classData, index) => (
                    <tr key={index}>
                      <td className="table-cell">{classData.class_name}</td>
                      <td className="table-cell">{classData.teacher_name || '-'}</td>
                      <td className="table-cell">{classData.total_students}</td>
                      <td className="table-cell">
                        <span className="badge badge-success">{(classData.number_of_presents || 0) === 0 ? '-' : classData.number_of_presents}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-danger">{(classData.number_of_absents || 0) === 0 ? '-' : classData.number_of_absents}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-warning">{(classData.number_of_lates || 0) === 0 ? '-' : classData.number_of_lates}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-orange">-</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-purple">-</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="badge badge-info">-</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="badge badge-warning">-</span>
                      </td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => handleViewAbsentStudents(classData)}
                          className="inline-flex items-center justify-center w-8 h-8  hover:bg-blue-600 focus:text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          title="عرض الطلاب الغائبين"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
             
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null }

      {/* Teacher Attendance — load independently */}
      {teacherLoading ? (
        <SectionLoader loading minHeight="180px" />
      ) : teacherAttendance?.data && teacherAttendance.data.length > 0 ? (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">حضور المعلمين هذا الأسبوع</h3>
          <button
            className="btn btn-primary btn-sm ml-2"
            onClick={() => navigate('/app/teacher-report')}
            title="تقرير المعلمين"
          >
            <span className="inline-flex items-center">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              تقرير المعلمين
            </span>
          </button>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header shadow-md sticky top-0 z-10">
                  <tr>
                    <th className="table-header-cell text-right">اسم المعلم</th>
                    <th className="table-header-cell text-right">الوظيفة</th>
                    <th className="table-header-cell text-right">الحصص المسجلة</th>
                    <th className="table-header-cell text-right">الحصص المطلوبة</th>
                    <th className="table-header-cell text-right">النسبة</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {teacherAttendance.data.map((teacher, index) => (
                    <tr key={index}>
                      <td className="table-cell">{teacher.teacher_name}</td>
                      <td className="table-cell">{teacher.job_name}</td>
                      <td className="table-cell">{teacher.recorded_class_sessions_this_week}</td>
                      <td className="table-cell">{teacher.week_Classes_Number || 0}</td>
                      <td className="table-cell">
                        <span className={`badge ${
                          teacher.recorded_class_sessions_this_week >= (teacher.week_Classes_Number || 0) 
                            ? 'badge-success' 
                            : 'badge-warning'
                        }`}>
                          {Math.round((teacher.recorded_class_sessions_this_week / (teacher.week_Classes_Number || 1)) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Absent and Late Students Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={`الطلاب الغائبين والمتأخرين - ${selectedClassData?.class_name || ''}`}
        size="xl"
      >
        <div className="space-y-4">
          {summaryLoading ? (
            <div className="flex items-center justify-center py-9">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل بيانات الطلاب الغائبين والمتأخرين...</span>
            </div>
          ) : selectedClassData?.absent_students ? (
            <div className="space-y-4">
          

              {/* Students List */}
              {selectedClassData.absent_students.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          اسم الطالب
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          حصص الهروب
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          حصص التأخر
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          حصص الغياب
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Group students by student_id and combine their class_time_num
                        const groupedStudents = selectedClassData.absent_students.reduce((acc, student) => {
                          const studentId = student.student_id;
                          
                          if (!acc[studentId]) {
                            acc[studentId] = {
                              student_id: studentId,
                              student_name: student.student_name,
                              is_has_excuse: student.is_has_excuse || student.is_has_exuse || false,
                              class_time_nums: [],
                              late_time_nums: [],
                              excused_time_nums: [],
                              absent_time_nums: []
                            };
                          }
                          
                          // Add class_time_num to the array
                          if (student.class_time_num) {
                            acc[studentId].class_time_nums.push(student.class_time_num);
                          }
                          if (student.is_late) {
                            acc[studentId].late_time_nums.push(student.class_time_num);
                          }
                          if (student.is_excused) {
                            acc[studentId].excused_time_nums.push(student.class_time_num);
                          }
                          if (student.is_absent) {
                            acc[studentId].absent_time_nums.push(student.class_time_num);
                          }
                          
                          return acc;
                        }, {});
                        
                        // Convert to array and sort class_time_nums
                        return Object.values(groupedStudents).map((student, index) => {
                          const sortedPeriods = student.class_time_nums.sort((a, b) => a - b);
                          const sortedLatePeriods = student.late_time_nums.sort((a, b) => a - b);
                          const sortedExcusedPeriods = student.excused_time_nums.sort((a, b) => a - b);
                          const sortedAbsentPeriods = student.absent_time_nums.sort((a, b) => a - b);
                          
                          return (
                            <tr key={student.student_id || index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {student.student_name || 'غير محدد'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {sortedAbsentPeriods.join(', ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  {sortedLatePeriods.join(', ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {sortedExcusedPeriods.join(', ')}
                                </span>
                              </td>
                              {/* <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  student.is_has_excuse 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {student.is_has_excuse ? 'لديه عذر' : 'لا يوجد عذر'}
                                </span>
                              </td> */}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg">🎉</div>
                  <p className="text-gray-500 mt-2">لا يوجد طلاب غائبين أو متأخرين في هذا الفصل</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد بيانات متاحة</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Student List Modal */}
      <Modal
        isOpen={isStudentListModalOpen}
        onClose={handleCloseStudentListModal}
        title={`قائمة الطلاب ${selectedListType === 'absent' ? 'الهاربين' : selectedListType === 'late' ? 'المتأخرين' : 'الغائبين'}`}
        size="xl"
      >
        <div className="space-y-4">
          {summaryLoading ? (
            <div className="flex items-center justify-center py-9">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل بيانات الطلاب...</span>
            </div>
          ) : selectedStudentList && selectedStudentList.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0">
                    {selectedListType === 'absent' && <Clock className="h-5 w-5 text-red-600" />}
                    {selectedListType === 'late' && <TrendingUp className="h-5 w-5 text-yellow-600" />}
                    {selectedListType === 'excuse' && <AlertCircle className="h-5 w-5 text-orange-600" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      إجمالي الطلاب: {selectedStudentList.length}
                    </h4>
                    <p className="text-sm text-blue-700">
                      {selectedListType === 'absent' && 'الطلاب الذين هربوا من الحصص'}
                      {selectedListType === 'late' && 'الطلاب الذين تأخروا عن الحصص'}
                      {selectedListType === 'excuse' && 'الطلاب الغائبين عن الحصص'}
                    </p>
                  </div>
                </div>
                {/* Download Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
                    onClick={() => {
                      // Generate CSV from grouped student data
                      const groupedStudents = selectedStudentList.reduce((acc, student) => {
                        const studentId = student.student_id;
                        if (!acc[studentId]) {
                          acc[studentId] = {
                            student_id: studentId,
                            student_name: student.student_name,
                            class_name: student.class_name,
                            class_time_nums: [],
                            excuse_note: student.excuse_note || ''
                          };
                        }
                        if (student.class_time_num) {
                          acc[studentId].class_time_nums.push(student.class_time_num);
                        }
                        return acc;
                      }, {});

                      const csvRows = [];
                      // Header
                      let header = ['اسم الطالب', 'الفصل', 'الحصص'];
                      if (selectedListType === 'excuse') header.push('ملاحظة العذر');
                      csvRows.push(header.join(','));
                      // Rows
                      Object.values(groupedStudents).forEach(student => {
                        const sortedPeriods = student.class_time_nums.sort((a, b) => a - b);
                        let row = [
                          `"${student.student_name || 'غير محدد'}"`,
                          `"${student.class_name || 'غير محدد'}"`,
                          `"${sortedPeriods.join(', ')}"`
                        ];
                        if (selectedListType === 'excuse') row.push(`"${student.excuse_note || '-'}"`);
                        csvRows.push(row.join(','));
                      });

                      const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Excel UTF-8 support
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);

                      // Dynamic file name
                      let listLabel =
                        selectedListType === 'absent'
                          ? 'الهاربين'
                          : selectedListType === 'late'
                          ? 'المتأخرين'
                          : 'الغائبين';
                      const today = new Date().toISOString().slice(0, 10);

                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `قائمة الطلاب_${listLabel}_${selectedDate}.csv`; 
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => URL.revokeObjectURL(url), 2000);
                    }}
                  >
                    تحميل القائمة كـ CSV
                  </button>
                </div>
              </div>

              {/* Students List */}
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        اسم الطالب
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الفصل
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الحصص
                      </th>
                      {selectedListType === 'excuse' && (
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ملاحظة العذر
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      // Group students by student_id and combine their data
                      const groupedStudents = selectedStudentList.reduce((acc, student) => {
                        const studentId = student.student_id;

                        if (!acc[studentId]) {
                          acc[studentId] = {
                            student_id: studentId,
                            student_name: student.student_name,
                            class_name: student.class_name,
                            class_time_nums: [],
                            excuse_note: student.excuse_note || ''
                          };
                        }

                        // Add class_time_num to the array
                        if (student.class_time_num) {
                          acc[studentId].class_time_nums.push(student.class_time_num);
                        }

                        return acc;
                      }, {});

                      // Convert to array and sort class_time_nums
                      return Object.values(groupedStudents).map((student, index) => {
                        const sortedPeriods = student.class_time_nums.sort((a, b) => a - b);

                        return (
                          <tr key={student.student_id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.student_name || 'غير محدد'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {student.class_name || 'غير محدد'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedListType === 'absent' ? 'bg-red-100 text-red-800' :
                                selectedListType === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {sortedPeriods.join(', ')}
                              </span>
                            </td>
                            {selectedListType === 'excuse' && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {student.excuse_note ? (
                                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {student.excuse_note}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg">🎉</div>
              <p className="text-gray-500 mt-2">
                لا يوجد طلاب {selectedListType === 'absent' ? 'هاربين' : selectedListType === 'late' ? 'متأخرين' : 'غائبين'} اليوم
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Bus Students Modal */}
      <Modal
        isOpen={isBusStudentsModalOpen}
        onClose={handleCloseBusStudentsModal}
        title={`قائمة الطلاب ${busStudentsType === 'board' ? 'على الحافلات' : 'الذين نزلوا من الحافلات'}`}
        size="xl"
      >
        <div className="space-y-4">
          {busReportLoading ? (
            <div className="flex items-center justify-center py-9">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل بيانات الطلاب...</span>
            </div>
          ) : (() => {
            const studentsList = getBusStudentsList();
            return studentsList.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0">
                      <Bus className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900">
                        إجمالي الطلاب: {studentsList.length}
                      </h4>
                      <p className="text-sm text-blue-700">
                        {busStudentsType === 'board' 
                          ? 'الطلاب الذين صعدوا على الحافلات' 
                          : 'الطلاب الذين نزلوا من الحافلات'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          اسم الطالب
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          رقم الحافلة
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          اسم الحافلة
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الوقت
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الموقع
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentsList.map((student, index) => {
                        const timeInfo = formatOmanTime(student.scan_time);
                        return (
                          <tr key={`${student.student_id}-${index}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {student.student_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {student.bus_number}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {student.bus_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                              {timeInfo.time || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {student.location}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg">🚌</div>
                <p className="text-gray-500 mt-2">
                  لا يوجد طلاب {busStudentsType === 'board' ? 'على الحافلات' : 'نزلوا من الحافلات'} اليوم
                </p>
              </div>
            );
          })()}
        </div>
      </Modal>

    </div>
  );
};


export default SchoolAdminDashboard;
