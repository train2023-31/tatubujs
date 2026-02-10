import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  TrendingUp,
  Calendar,
  School,
  UserCheck,
  Clock,
  FileText,
  AlertCircle,
  Eye,EyeOff ,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Settings,
  Download,
  Printer,
  Phone,
  MessageCircle,
  BarChart3,
  Star,
  Building,
  Newspaper,
  Sparkles,
  Bus,
  User,
  History,
  QrCode,
  MapPin,
  Globe,
  Upload
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { reportsAPI, attendanceAPI, authAPI, busAPI, timetableAPI, substitutionAPI, parentPickupAPI } from '../../services/api';
import { formatDate, getTodayAPI, getRoleDisplayName } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import NewsWidget from '../../components/UI/NewsWidget';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';




// Helper function to format time in Oman MCT timezone
const formatOmanTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format time in 24-hour format
    const timeStr = date.toLocaleString('ar-OM', {
      timeZone: 'Asia/Muscat',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    // Format date
    const dateStr = date.toLocaleString('ar-OM', {
      timeZone: 'Asia/Muscat',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
    
    return { time: timeStr, date: dateStr, full: `${dateStr} - ${timeStr}` };
  } catch (error) {
    return { time: '', date: '', full: '' };
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const dashboardRef = useRef(null);

  // Navigation handlers
  const handleNavigateToAttendance = () => {
    navigate('/app/attendance');
  };

  const handleNavigateToAttendancesDetails = () => {
    navigate('/app/attendance-details');
  };

  // Check if school needs setup using bulk operations status
  const needsSetup = (bulkOpsStatus) => {
    if (!bulkOpsStatus) return false;
    return bulkOpsStatus.needs_setup || false;
  };

  // PDF Export Function
  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Hide buttons and other UI elements for PDF
      const buttons = dashboardRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');
      
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: dashboardRef.current.scrollWidth,
        height: dashboardRef.current.scrollHeight,
      });
      
      // Restore buttons
      buttons.forEach(btn => btn.style.display = '');
      
      const imgData = canvas.toDataURL('image/png', 0.5);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `لوحة_التحكم_${formatDate(selectedDate, 'dd-MM-yyyy', 'ar')}.pdf`;
      pdf.save(fileName);
      
      toast.success('تم تحميل التقرير بنجاح');
    } catch (error) {
      toast.error('فشل في إنشاء ملف PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    if (!dashboardRef.current) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const printContent = dashboardRef.current.innerHTML;
    
    // Get the current styles
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');
    
    // Create the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>لوحة التحكم</title>
          <style>
            ${styles}
            
            /* Print-specific styles */
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
              
              body {
                font-family: 'Noto Sans Arabic', Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: white;
              }
              
              .print-break {
                page-break-before: always;
              }
              
              .print-avoid-break {
                page-break-inside: avoid;
              }
              
              /* Hide elements that shouldn't print */
              button, .btn, .no-print, .card, .stat-card, .grid {
                display: none !important;
              }
              
              /* Table styles for print */
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
              }
              
              th, td {
                border: 1px solid #000;
                padding: 4px;
                text-align: right;
              }
              
              th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  // Fetch school statistics (only for non-student users)
  const { data: schoolStats, isLoading: statsLoading } = useQuery(
    ['schoolStats', selectedDate],
    () => reportsAPI.getSchoolStatistics({ date: selectedDate }),
    {
      enabled: !!user && user.role !== 'student',
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch bulk operations status (only for non-student users)
  const { data: bulkOpsStatus, isLoading: bulkOpsLoading } = useQuery(
    ['bulkOpsStatus'],
    () => reportsAPI.getBulkOperationsStatus(),
    {
      enabled: !!user && user.role !== 'student',
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch teacher attendance for the week
  const { data: teacherAttendance, isLoading: teacherLoading } = useQuery(
    ['teacherAttendance', selectedDate],
    () => reportsAPI.getTeacherAttendanceThisWeek({ date: selectedDate }),
    {
      enabled: !!user && (user.role === 'teacher' || user.role === 'school_admin' || user.role === 'data_analyst'),
      refetchInterval: 30000,
    }
  );

  // Get role-specific dashboard content
  const getDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard schoolStats={schoolStats} loading={statsLoading} />;
      case 'school_admin':
        return (
          <SchoolAdminDashboard 
            schoolStats={schoolStats} 
            teacherAttendance={teacherAttendance}
            loading={statsLoading || teacherLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToAttendancesDetails={handleNavigateToAttendancesDetails}
            needsSetup={needsSetup}
            bulkOpsStatus={bulkOpsStatus}
            bulkOpsLoading={bulkOpsLoading}
          />
        );
      case 'data_analyst':
        return (
          <SchoolAdminDashboard 
            schoolStats={schoolStats} 
            teacherAttendance={teacherAttendance}
            loading={statsLoading || teacherLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToAttendancesDetails={handleNavigateToAttendancesDetails}
            needsSetup={needsSetup}
            bulkOpsStatus={bulkOpsStatus}
            bulkOpsLoading={bulkOpsLoading}
          />
        );
      case 'teacher':
        return (
          <TeacherDashboard 
            teacherAttendance={teacherAttendance}
            loading={teacherLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToAttendancesDetails={ handleNavigateToAttendancesDetails}
          />
        );
      case 'student':
        return (
          <StudentDashboard 
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        );
      case 'driver':
        return (
          <DriverDashboard />
        );
      default:
        return <div>دور غير معروف</div>;
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
            مرحباً، {user?.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 truncate">
            {getRoleDisplayName(user?.role)} - {user?.school_name}
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
            {formatDate(new Date(), 'EEEE, dd MMMM yyyy', 'ar-OM')}
          </div>
          {(user?.role === 'school_admin' || user?.role === 'data_analyst') && (
            <div className="flex items-center space-x-2">
              {/* <button
                onClick={handlePrint}
                className="btn btn-outline mr-2"
              >
                <Printer className="h-5 w-5 mr-2" />
                طباعة
              </button> */}
              {/* <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="btn btn-primary"
              >
                {isGeneratingPDF ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="mr-2">جاري الإنشاء...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    تصدير التقرير
                  </>
                )}
              </button> */}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      {getDashboardContent()}
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ schoolStats, loading }) => {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access Cards */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <QuickAccessCard
              title="إدارة المدارس"
              description="إدارة المدارس المسجلة في النظام"
              icon={Building}
              color="blue"
              onClick={() => navigate('/app/schools')}
            />
            <QuickAccessCard
              title="إدارة المستخدمين"
              description="إدارة المستخدمين والمعلمين"
              icon={Users}
              color="green"
              onClick={() => navigate('/app/users')}
            />
            <QuickAccessCard
              title="التقارير والإحصائيات"
              description="عرض التقارير والإحصائيات الشاملة"
              icon={BarChart3}
              color="purple"
              onClick={() => navigate('/app/reports')}
            />
            <QuickAccessCard
              title="إدارة الأخبار"
              description="إدارة الأخبار والإعلانات"
              icon={Newspaper}
              color="orange"
              onClick={() => navigate('/app/news')}
            />
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المدارس"
          value={schoolStats?.total_schools || 0}
          icon={School}
          color="blue"
        />
        <StatCard
          title="إجمالي الطلاب"
          value={schoolStats?.total_students || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="إجمالي المعلمين"
          value={schoolStats?.total_teachers || 0}
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="إجمالي الفصول"
          value={schoolStats?.total_classes || 0}
          icon={BookOpen}
          color="orange"
        />
      </div>

      {/* News Widget */}
      <NewsWidget 
        limit={3} 
        onViewAll={() => navigate('/app/news')}
      />

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">النشاط الأخير</h3>
        </div>
        <div className="card-body">
          <p className="text-gray-500">لا توجد أنشطة حديثة</p>
        </div>
      </div>
    </div>
  );
};

// School Admin Dashboard Component
const SchoolAdminDashboard = ({ schoolStats, teacherAttendance, loading, selectedDate, setSelectedDate, onNavigateToAttendance, onNavigateToAttendancesDetails, needsSetup, bulkOpsStatus, bulkOpsLoading }) => {
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


  if (loading || summaryLoading || bulkOpsLoading || busReportLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
   
      {/* School Setup Guide */}
      {bulkOpsStatus && checkNeedsSetup(bulkOpsStatus) && (
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
                    ? `تم تسجيل ${bulkOpsStatus.step_status.step7_attendance?.count || bulkOpsStatus.step_status.step5_attendance?.count || 0} سجل حضور في آخر 30 يوم`
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
      )}

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

      {/* Stats Cards */}
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

      {/* Bus Statistics Cards */}
      {busStats.totalBuses > 0 && (
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
      )}

      {/* Class Statistics */}
      {(schoolStats?.classes && schoolStats.classes.length > 0) || (attendanceSummary?.attendance_summary && attendanceSummary.attendance_summary.length > 0) ? (
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
      ) : null}

      {/* Teacher Attendance */}
      {teacherAttendance?.data && teacherAttendance.data.length > 0 && (
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
      )}

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

// Teacher Dashboard Component
const TeacherDashboard = ({ teacherAttendance, loading, selectedDate, setSelectedDate, onNavigateToAttendance, onNavigateToAttendancesDetails }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch teacher timetable
  const { data: timetableData, isLoading: timetableLoading } = useQuery(
    ['teacherTimetable', user?.user_id || user?.id],
    () => timetableAPI.getMyTimetable(),
    {
      enabled: !!(user?.user_id || user?.id) && user?.role === 'teacher',
      refetchInterval: 300000, // Refetch every 5 minutes
      retry: 2
    }
  );
  
  // Fetch teacher substitutions
  const { data: substitutionData, isLoading: substitutionLoading } = useQuery(
    ['teacherSubstitutions', user?.user_id || user?.id],
    () => substitutionAPI.getTeacherSubstitutions(user?.user_id || user?.id),
    {
      enabled: !!(user?.user_id || user?.id) && user?.role === 'teacher',
      refetchInterval: 300000, // Refetch every 5 minutes
      retry: 2
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  const teacherData = teacherAttendance?.data?.[0];
  const timetable = timetableData?.timetable;
  const substitutions = substitutionData?.assignments || [];

  // Helper function to get the date for a specific day based on selectedDate
  const getDateForDay = (dayName) => {
    if (!selectedDate) return null;
    
    const selected = new Date(selectedDate);
    const dayOfWeek = selected.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map day names to JavaScript day numbers
    const dayNameMap = {
      'الأحد': 0,
      'الإثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5,
      'السبت': 6
    };
    
    // Find the target day number
    const targetDayNum = dayNameMap[dayName] !== undefined ? dayNameMap[dayName] : null;
    if (targetDayNum === null) return null;
    
    // Calculate the date for the target day in the same week
    const daysDiff = targetDayNum - dayOfWeek;
    const targetDate = new Date(selected);
    targetDate.setDate(selected.getDate() + daysDiff);
    
    return targetDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };
  
  // Helper function to get schedule for a slot, including substitutions
  // Returns both regular schedule and substitution if both exist
  const getScheduleForSlot = (dayId, periodId, dayName) => {
    if (!timetable || !timetable.schedules) return null;
    
    // Get the date for this day based on selectedDate
    const dayDate = dayName ? getDateForDay(dayName) : null;
    
    // Find regular schedule
    const regularSchedule = timetable.schedules.find(
      s => s.dayId === dayId && s.period === periodId
    );
    
    // Find substitution for this slot
    const substitution = substitutions.find(s => {
      // First match period
      const periodMatch = s.period_xml_id === periodId;
      if (!periodMatch) return false;
      
      // Match by assignment_date - ALL assignments now have this field
      if (s.assignment_date && dayDate) {
        // Normalize assignment_date to YYYY-MM-DD format
        let assignmentDateStr = s.assignment_date;
        if (typeof assignmentDateStr === 'string') {
          assignmentDateStr = assignmentDateStr.split('T')[0]; // Get date part only (YYYY-MM-DD)
        } else if (assignmentDateStr instanceof Date) {
          assignmentDateStr = assignmentDateStr.toISOString().split('T')[0];
        }
        
        // Normalize dayDate to YYYY-MM-DD format (it should already be in this format from getDateForDay)
        let dayDateStr = dayDate;
        if (typeof dayDate === 'string') {
          dayDateStr = dayDate.split('T')[0];
        } else if (dayDate instanceof Date) {
          dayDateStr = dayDate.toISOString().split('T')[0];
        }
        
        // Match ONLY by date
        return assignmentDateStr === dayDateStr;
      }
      
      // Fallback: If no date selected, fall back to day_xml_id matching (for backward compatibility)
      if (!dayDate) {
        const dayMatch = s.day_xml_id === dayId;
        return dayMatch && periodMatch;
      }
      
      // If we have a date but assignment doesn't have assignment_date, don't show it
      return false;
    });
    
    // If both exist, return combined object
    if (regularSchedule && substitution) {
      return {
        ...regularSchedule,
        className: regularSchedule.className,
        subjectName: regularSchedule.subjectName,
        isSubstitution: false,
        hasSubstitution: true,
        substitution: {
          ...substitution,
          className: substitution.class_name,
          subjectName: substitution.subject_name,
          isSubstitution: true,
          assignmentDate: substitution.assignment_date,
          substitutionStartDate: substitution.substitution_start_date,
          substitutionEndDate: substitution.substitution_end_date
        }
      };
    }
    
    // If only substitution exists
    if (substitution) {
      return {
        ...substitution,
        className: substitution.class_name,
        subjectName: substitution.subject_name,
        isSubstitution: true,
        assignmentDate: substitution.assignment_date,
        substitutionStartDate: substitution.substitution_start_date,
        substitutionEndDate: substitution.substitution_end_date
      };
    }
    
    // Otherwise return regular schedule
    return regularSchedule;
  };

  return (
    <div className="space-y-6">
      {/* News Widget */}
      <NewsWidget 
        limit={3} 
        onViewAll={() => navigate('/app/news')}
      />

      {/* Quick Access Cards */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <QuickAccessCard
              title="تسجيل الحضور"
              description="تسجيل حضور الطلاب للفصول اليوم"
              icon={ClipboardList}
              color="blue"
              onClick={onNavigateToAttendance}
            />
            <QuickAccessCard
              title="تقارير الحضور"
              description="عرض تفاصيل الحضور والغياب"
              icon={Eye}
              color="green"
              onClick={onNavigateToAttendancesDetails}
            />
        
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">إحصائيات الأسبوع</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Teacher Stats */}
      {teacherData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="الحصص المسجلة هذا الأسبوع"
            value={teacherData.recorded_class_sessions_this_week}
            icon={ClipboardList}
            color="blue"
          />
          <StatCard
            title="الحصص المطلوبة أسبوعياً"
            value={teacherData.week_Classes_Number || 0}
            icon={Calendar}
            color="green"
          />
          <StatCard
            title="نسبة الإنجاز"
            value={`${Math.round((teacherData.recorded_class_sessions_this_week / (teacherData.week_Classes_Number || 1)) * 100)}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      )}

      {/* Teacher Timetable */}
      {timetableLoading ? (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل الجدول...</span>
            </div>
          </div>
        </div>
      ) : timetable ? (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-medium text-gray-900">جدول الحصص</h3>
                {timetable.timetable_name && (
                  <span className="text-sm text-gray-500">- {timetable.timetable_name}</span>
                )}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>الحصة</span>
                      </div>
                    </th>
                    {timetable.days?.map(day => {
                      const dayDate = getDateForDay(day.name);
                      const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { 
                        day: 'numeric', 
                        month: 'short' 
                      }) : null;
                      
                      return (
                        <th
                          key={day.id}
                          className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[150px]"
                        >
                          <div>
                            <p className="font-medium">{day.name}</p>
                            {day.short && day.short !== day.name && (
                              <p className="text-xs text-gray-500 mt-1">{day.short}</p>
                            )}
                            {dateDisplay && (
                              <p className="text-xs text-blue-600 mt-1 font-medium">
                                {dateDisplay}
                              </p>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timetable.periods?.map(period => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 text-center border-b border-gray-200 sticky right-0 bg-white z-10">
                        <div className="font-medium text-gray-900">{period.number}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {period.startTime} - {period.endTime}
                        </div>
                      </td>
                      {timetable.days?.map(day => {
                        const schedule = getScheduleForSlot(day.id, period.id, day.name);
                        return (
                          <td
                            key={`${day.id}-${period.id}`}
                            className="px-3 py-4 text-center border-b border-gray-200"
                          >
                            {schedule ? (
                              <div className="space-y-2">
                                {/* Regular Schedule - Show if not substitution or if hasSubstitution is true */}
                                {(!schedule.isSubstitution || schedule.hasSubstitution) && (
                                  <div className="p-2 rounded-lg border bg-primary-50 border-primary-200">
                                    <p className="text-sm font-medium text-primary-900">
                                      {schedule.subjectName}
                                    </p>
                                    {schedule.className && (
                                      <p className="text-xs mt-1 text-primary-700">
                                        {schedule.className}
                                      </p>
                                    )}
                                    {schedule.classroomName && (
                                      <p className="text-xs mt-1 text-primary-600">
                                        {schedule.classroomName}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Substitution - Show if isSubstitution is true and not hasSubstitution */}
                                {schedule.isSubstitution && !schedule.hasSubstitution && (
                                  <div className="p-2 rounded-lg border bg-yellow-50 border-yellow-300">
                                    <span className="inline-block px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full mb-1">
                                      إحتياط
                                    </span>
                                    <p className="text-sm font-medium text-yellow-900">
                                      {schedule.subjectName}
                                    </p>
                                    {schedule.className && (
                                      <p className="text-xs mt-1 text-yellow-700">
                                        {schedule.className}
                                      </p>
                                    )}
                                    {schedule.classroomName && (
                                      <p className="text-xs mt-1 text-yellow-600">
                                        {schedule.classroomName}
                                      </p>
                                    )}
                                    {schedule.assignmentDate && (
                                      <p className="text-xs mt-1 text-yellow-600 font-medium">
                                        📅 {new Date(schedule.assignmentDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    )}
                                    {!schedule.assignmentDate && schedule.substitutionStartDate && schedule.substitutionEndDate && (
                                      <p className="text-xs mt-1 text-yellow-600">
                                        📅 {new Date(schedule.substitutionStartDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short'
                                        })} - {new Date(schedule.substitutionEndDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Additional Substitution - Show if both regular and substitution exist */}
                                {schedule.hasSubstitution && schedule.substitution && (
                                  <div className="p-2 rounded-lg border bg-yellow-50 border-yellow-300">
                                    <span className="inline-block px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full mb-1">
                                      إحتياط
                                    </span>
                                    <p className="text-sm font-medium text-yellow-900">
                                      {schedule.substitution.subjectName}
                                    </p>
                                    {schedule.substitution.className && (
                                      <p className="text-xs mt-1 text-yellow-700">
                                        {schedule.substitution.className}
                                      </p>
                                    )}
                                    {schedule.substitution.assignmentDate && (
                                      <p className="text-xs mt-1 text-yellow-600 font-medium">
                                        📅 {new Date(schedule.substitution.assignmentDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>لا يوجد جدول نشط متاح</p>
              <p className="text-sm mt-2">يرجى التواصل مع الإدارة لتفعيل جدول الحصص</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Quick Access Card Component
const QuickAccessCard = ({ title, description, icon: Icon, color, onClick, isNew = false }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white hover:bg-blue-600',
    green: 'bg-green-500 text-white hover:bg-green-600',
    purple: 'bg-purple-500 text-white hover:bg-purple-600',
    orange: 'bg-orange-500 text-white hover:bg-orange-600',
    indigo: 'bg-indigo-500 text-white hover:bg-indigo-600',
    teal: 'bg-teal-500 text-white hover:bg-teal-600',
    pink: 'bg-pink-500 text-white hover:bg-pink-600',
    cyan: 'bg-cyan-500 text-white hover:bg-cyan-600',
  };

  return (
    <button
      onClick={onClick}
      className="group relative p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200 text-right"
    >
      {/* New Feature Badge */}
      {isNew && (
        <div className="absolute top-0 left-0 right-0 w-full flex justify-end">
          <span className="inline-flex items-center px-2 py-0.5 rounded-tl-md border-l-4 border-yellow-400 text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md animate-pulse">
            <Sparkles className="h-3 w-3 mr-1" />
            جديد
          </span>
        </div>
      )}
      
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ml-2 ${colorClasses[color]} flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
          <Icon className="h-5 w-5 " />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
              {title}
            </h4>
        
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
        <ArrowLeft className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, showEyeIcon = false, onEyeClick }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
    indigo: 'bg-indigo-500 text-white',
  };

  return (
    <div className="card">
      <div className="card-body p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
          <div className={`p-2 sm:p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div className="mr-2 sm:mr-4 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{value}</p>
          </div>
          </div>
          {showEyeIcon && (
            <button
              onClick={onEyeClick}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="عرض قائمة الطلاب"
            >
              <Eye className="h-4 w-4 text-gray-600 hover:text-blue-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Driver Dashboard Component
const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch driver's bus
  const { data: driverBusData, isLoading: busLoading } = useQuery(
    ['driverBus', user?.user_id],
    () => busAPI.getDriverBus(),
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000
    }
  );

  const bus = driverBusData?.bus;
  const busId = bus?.id;

  // Fetch current students on bus
  const { data: currentStudentsData, isLoading: currentStudentsLoading } = useQuery(
    ['currentStudentsOnBus', busId],
    () => busAPI.getCurrentStudentsOnBus(busId),
    {
      enabled: !!busId,
      refetchInterval: 10000 // Refresh every 10 seconds
    }
  );

  // Fetch today's scan logs
  const today = new Date().toISOString().split('T')[0];
  const { data: todayScans, isLoading: scansLoading } = useQuery(
    ['todayScans', busId, today],
    () => busAPI.getScans({ bus_id: busId, date: today, limit: 50 }),
    {
      enabled: !!busId,
      refetchInterval: 15000 // Refresh every 15 seconds
    }
  );

  // Fetch all assigned students
  const { data: assignedStudents, isLoading: assignedStudentsLoading } = useQuery(
    ['busStudents', busId],
    () => busAPI.getBusStudents(busId),
    {
      enabled: !!busId,
      refetchInterval: 60000 // Refresh every minute
    }
  );

  if (busLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (!driverBusData?.has_bus || !bus) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد حافلة مسجلة</h3>
          <p className="text-gray-500">لم يتم تعيين حافلة لك. يرجى التواصل مع الإدارة.</p>
        </div>
      </div>
    );
  }

  const currentStudents = currentStudentsData?.students || [];
  const totalAssigned = assignedStudents?.length || 0;
  const onBusCount = currentStudents.length;
  const notOnBusCount = totalAssigned - onBusCount;
  const scansToday = Array.isArray(todayScans) ? todayScans : [];

  // Group scans by type
  const boardScans = scansToday.filter(s => s.scan_type === 'board').length;
  const exitScans = scansToday.filter(s => s.scan_type === 'exit').length;

  return (
    <div className="space-y-6">
      {/* Quick Access */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAccessCard
              title="مسح رموز QR"
              description="مسح رموز QR للطلاب للصعود والنزول"
              icon={QrCode}
              color="blue"
              onClick={() => navigate('/app/bus-scanner')}
            />
           
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          title="إجمالي الطلاب"
          value={totalAssigned}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="على الحافلة"
          value={onBusCount}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="غير موجودين"
          value={notOnBusCount}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          title="صعود اليوم"
          value={boardScans}
          icon={ArrowRight}
          color="green"
        />
        <StatCard
          title="نزول اليوم"
          value={exitScans}
          icon={ArrowLeft}
          color="red"
        />
      </div>

      {/* Bus Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bus Details */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-green-600" />
              <h3 className="card-title">معلومات الحافلة</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">رقم الحافلة</label>
                  <p className="text-gray-900 font-semibold text-lg">{bus.bus_number}</p>
                </div>
                <div>
                  <label className="label">اسم الحافلة</label>
                  <p className="text-gray-900 font-semibold text-lg">{bus.bus_name}</p>
                </div>
                <div>
                  <label className="label">رقم اللوحة</label>
                  <p className="text-gray-900">{bus.plate_number || 'غير محدد'}</p>
                </div>
                <div>
                  <label className="label">السعة</label>
                  <p className="text-gray-900">{bus.capacity} طالب</p>
                </div>
                {bus.location && (
                  <div className="col-span-2">
                    <label className="label">موقع الحافلة</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-900">{bus.location}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">معدل الإشغال</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {totalAssigned > 0 ? Math.round((onBusCount / totalAssigned) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${totalAssigned > 0 ? (onBusCount / totalAssigned) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Students on Bus */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h3 className="card-title">الطلاب على الحافلة</h3>
              </div>
              <span className="badge badge-success">{onBusCount}</span>
            </div>
          </div>
          <div className="card-body">
            {currentStudentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : currentStudents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentStudents.map((student, index) => (
                  <div key={student.id || index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{student.fullName || student.username}</p>
                        {student.class_name && (
                          <p className="text-xs text-gray-600">الفصل: {student.class_name}</p>
                        )}
                        {student.board_time && (
                          <p className="text-xs text-gray-500 mt-1">
                            صعد: {formatDate(student.board_time, 'HH:mm', 'ar')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد طلاب على الحافلة حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Scan Logs */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            <h3 className="card-title">سجل المسح اليوم</h3>
          </div>
        </div>
        <div className="card-body">
          {scansLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : scansToday.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scansToday.map((scan, index) => (
                <div key={scan.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      scan.scan_type === 'board' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {scan.scan_type === 'board' ? (
                        <ArrowRight className="h-6 w-6 text-green-600" />
                      ) : (
                        <ArrowLeft className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {scan.student_name || scan.student_username || 'طالب غير معروف'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(scan.scan_time, 'dd MMMM yyyy - HH:mm', 'ar')}
                      </p>
                      {scan.location && (
                        <p className="text-xs text-gray-500 mt-1">
                          الموقع: {scan.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`badge ${
                    scan.scan_type === 'board' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {scan.scan_type === 'board' ? 'صعود' : 'نزول'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد سجلات مسح اليوم</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Student Dashboard Component
const StudentDashboard = ({ selectedDate, setSelectedDate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickupLoading, setPickupLoading] = useState(false);
  
  // Check if user is in parent mode
  const isParentMode = localStorage.getItem('isParentMode') === 'true';

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

  return (
    <div className="space-y-6">
  

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          title="معدل الحضور"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="أيام الهروب"
          value={totalAbsentDays}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="أيام التأخر"
          value={totalLateDays}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="أيام الغياب"
          value={totalExcusedDays}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="إجمالي السجلات"
          value={totalRecords}
          icon={FileText}
          color="purple"
        />
      </div>

      {/* Parent Pickup Section */}
      {isParentMode && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="card-header bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <h3 className="card-title text-white">استلام الطالب - ولي الأمر</h3>
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

      {/* Behavior Note */}
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
            <div>
              <label className="label">اسم المستخدم</label>
              <p className="text-gray-900">{studentProfile?.username || 'غير محدد'}</p>
            </div>
            <div>
              <label className="label">البريد الإلكتروني</label>
              <p className="text-gray-900">{studentProfile?.email || 'غير محدد'}</p>
            </div>
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
        </div>
      </div>

      {/* QR Code and Bus Information Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <h3 className="card-title">رمز QR الخاص بي</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm mb-4">
                <QRCodeCanvas
                  id={`student-qr-${user?.user_id}`}
                  value={user?.username || ''}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">
                استخدم هذا الرمز للصعود والنزول من الحافلة
              </p>
              <button
                onClick={() => {
                  const canvas = document.getElementById(`student-qr-${user?.user_id}`);
                  if (canvas) {
                    // Create a new canvas for the complete image with student name
                    const cardCanvas = document.createElement('canvas');
                    cardCanvas.width = 400;
                    cardCanvas.height = 500;
                    const ctx = cardCanvas.getContext('2d');
                    
                    // White background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, 400, 500);
                    
                    // Border
                    ctx.strokeStyle = '#E5E7EB';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(10, 10, 380, 480);
                    
                    // School name at top (if available)
                    if (user?.school_name) {
                      ctx.fillStyle = '#1F2937';
                      ctx.font = 'bold 20px Amiri';
                      ctx.textAlign = 'center';
                      ctx.fillText(user.school_name, 200, 40);
                    }
                    
                    // Student name
                    const studentName = studentProfile?.fullName || user?.username || 'الطالب';
                    ctx.fillStyle = '#111827';
                    ctx.font = 'bold 24px Amiri';
                    ctx.textAlign = 'center';
                    ctx.fillText(studentName, 200, 80);
                    
                    // QR Code (centered)
                    const qrImg = new Image();
                    qrImg.onload = () => {
                      const qrSize = 250;
                      const qrX = (400 - qrSize) / 2;
                      const qrY = 110;
                      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                      
                      // Note about QR code usage
                      ctx.fillStyle = '#6B7280';
                      ctx.font = '14px Amiri';
                      ctx.textAlign = 'center';
                      ctx.fillText('هذا الرمز للصعود والنزول من الحافلة QR', 200, 390);
                      
                 
                      
                      // Convert to PNG and download
                      cardCanvas.toBlob((blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          const downloadLink = document.createElement('a');
                          downloadLink.href = url;
                          downloadLink.download = `${studentName.replace(/[<>:"/\\|?*]/g, '_')}_QR.png`;
                          document.body.appendChild(downloadLink);
                          downloadLink.click();
                          downloadLink.remove();
                          URL.revokeObjectURL(url);
                          toast.success('تم تحميل رمز QR بنجاح');
                        }
                      }, 'image/png');
                    };
                    qrImg.onerror = () => {
                      toast.error('حدث خطأ أثناء تحميل الصورة');
                    };
                    qrImg.src = canvas.toDataURL('image/png');
                  }
                }}
                className="btn btn-primary flex items-center gap-2 w-full"
              >
                <Download className="h-4 w-4" />
                تحميل PNG مع الاسم
              </button>
            </div>
          </div>
        </div>

        {/* Bus Details Card */}
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
      </div>

      {/* Driver Information */}
      {busStatus?.current_bus?.driver_name && (
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
      {busStatus == [] && (
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

      {/* All Attendance Records */}
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

      

  
    </div>
  );
};

export default Dashboard;




