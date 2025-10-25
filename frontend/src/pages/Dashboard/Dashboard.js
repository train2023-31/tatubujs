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
  Settings,
  Download,
  Printer,
  Phone
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { reportsAPI, attendanceAPI, authAPI } from '../../services/api';
import { formatDate, getTodayAPI, getRoleDisplayName } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import NewsWidget from '../../components/UI/NewsWidget';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

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
      console.error('Error generating PDF:', error);
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
      default:
        return <div>دور غير معروف</div>;
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مرحباً، {user?.fullName}
          </h1>
          <p className="text-gray-600">
            {getRoleDisplayName(user?.role)} - {user?.school_name}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {formatDate(new Date(), 'EEEE, dd MMMM yyyy', 'ar-OM')}
           
          </div>
          {(user?.role === 'school_admin' || user?.role === 'data_analyst') && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="btn btn-outline mr-2"
              >
                <Printer className="h-5 w-5 mr-2" />
                طباعة
              </button>
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


  if (loading || summaryLoading || bulkOpsLoading) {
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
            <p className="text-blue-800 mb-4">
              يبدو أن هذه هي المرة الأولى التي تدخل فيها إلى النظام. دعنا نساعدك في إعداد مدرستك خطوة بخطوة:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Step 1 */}
              <div className={`flex flex-col items-center p-4 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step1_teachers?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  bulkOpsStatus?.step_status?.step1_teachers?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step1_teachers?.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-medium text-blue-600">1</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">إضافة المعلمين</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {bulkOpsStatus?.step_status?.step1_teachers?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step1_teachers.count} معلم`
                    : 'ابدأ بإضافة معلمي مدرستك إلى النظام'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step1_teachers?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <UserCheck className="h-4 w-4 mr-1 ml-1" />
                    إضافة المعلمين
                  </button>
                )}
              </div>

              {/* Step 2 */}
              <div className={`flex flex-col items-center p-4 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step2_students_classes?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  bulkOpsStatus?.step_status?.step2_students_classes?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step2_students_classes?.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-medium text-blue-600">2</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">إضافة الطلاب والفصول</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {bulkOpsStatus?.step_status?.step2_students_classes?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step2_students_classes.students_count} طالب و ${bulkOpsStatus.step_status.step2_students_classes.classes_count} فصل`
                    : 'أضف طلاب مدرستك، قم برفع قوائم الفصول ويتم توزيع الطلاب عليها تلقائياً'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step2_students_classes?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <Users className="h-4 w-4 mr-1 ml-1" />
                    إضافة الطلاب والفصول
                  </button>
                )}
              </div>

              {/* Step 3 - New Phone Numbers Step */}
              <div className={`flex flex-col items-center p-4 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step3_phone_numbers?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  bulkOpsStatus?.step_status?.step3_phone_numbers?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step3_phone_numbers?.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-medium text-blue-600">3</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">إضافة أرقام أولياء الأمور</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {bulkOpsStatus?.step_status?.step3_phone_numbers?.completed 
                    ? `${bulkOpsStatus.step_status.step3_phone_numbers.percentage}% من الطلاب لديهم أرقام هواتف`
                    : 'أضف أرقام هواتف أولياء الأمور للتواصل معهم'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step3_phone_numbers?.completed && (
                  <button 
                    onClick={() => navigate('/app/bulk-operations')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <Phone className="h-4 w-4 mr-1 ml-1" />
                    إضافة أرقام الهواتف
                  </button>
                )}
              </div>

              {/* Step 4 */}
              <div className={`flex flex-col items-center p-4 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step4_subjects?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  bulkOpsStatus?.step_status?.step4_subjects?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step4_subjects?.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-medium text-blue-600">4</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">إضافة المواد الدراسية</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {bulkOpsStatus?.step_status?.step4_subjects?.completed 
                    ? `تم إضافة ${bulkOpsStatus.step_status.step4_subjects.count} مادة دراسية`
                    : 'أضف المواد الدراسية التي تدرسها في مدرستك'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step4_subjects?.completed && (
                  <button 
                    onClick={() => navigate('/app/classes')}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <BookOpen className="h-4 w-4 mr-1 ml-1" />
                    إدارة المواد
                  </button>
                )}
              </div>

              {/* Step 5 */}
              <div className={`flex flex-col items-center p-4 rounded-lg border text-center ${
                bulkOpsStatus?.step_status?.step5_attendance?.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-blue-200'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  bulkOpsStatus?.step_status?.step5_attendance?.completed 
                    ? 'bg-green-100' 
                    : 'bg-blue-100'
                }`}>
                  {bulkOpsStatus?.step_status?.step5_attendance?.completed ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <span className="text-lg font-medium text-blue-600">5</span>
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">بدء تسجيل الحضور</h4>
                <p className="text-sm text-gray-600 mb-3">
                  {bulkOpsStatus?.step_status?.step5_attendance?.completed 
                    ? `تم تسجيل ${bulkOpsStatus.step_status.step5_attendance.count} سجل حضور في آخر 30 يوم`
                    : 'بعد إضافة المعلمين والطلاب والمواد، يمكنك البدء في تسجيل الحضور اليومي'
                  }
                </p>
                {!bulkOpsStatus?.step_status?.step5_attendance?.completed && (
                  <button 
                    onClick={onNavigateToAttendance}
                    className="btn btn-sm btn-primary w-full"
                  >
                    <ClipboardList className="h-4 w-4 mr-1 ml-1" />
                    تسجيل الحضور
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <strong>التقدم:</strong> {bulkOpsStatus?.completed_steps || 0} من {bulkOpsStatus?.total_steps || 5} خطوات مكتملة ({bulkOpsStatus?.overall_completion || 0}%)
                </p>
              </div>
              <div className="mt-2">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${bulkOpsStatus?.overall_completion || 0}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
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
        size="lg"
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
        size="lg"
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
                      {selectedListType === 'excuse' && 'الطلاب الذين لديهم عذر للغياب'}
                    </p>
                  </div>
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

    </div>
  );
};

// Teacher Dashboard Component
const TeacherDashboard = ({ teacherAttendance, loading, selectedDate, setSelectedDate, onNavigateToAttendance, onNavigateToAttendancesDetails }) => {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  const teacherData = teacherAttendance?.data?.[0];

  return (
    <div className="space-y-6">
      {/* News Widget */}
      <NewsWidget 
        limit={3} 
        onViewAll={() => navigate('/app/news')}
      />

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

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الإجراءات السريعة</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={onNavigateToAttendance} className="btn btn-primary">
              تسجيل حضور جديد
            </button>
            <button onClick={onNavigateToAttendancesDetails} className="btn btn-outline">
              عرض تفاصيل الحضور
            </button>
          </div>
        </div>
      </div>
    </div>
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

// Student Dashboard Component
const StudentDashboard = ({ selectedDate, setSelectedDate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Debug logging
  console.log('StudentDashboard - User object:', user);
  console.log('StudentDashboard - User ID:', user?.user_id);
  console.log('StudentDashboard - User role:', user?.role);
  console.log('StudentDashboard - Enabled condition for queries:', !!user?.user_id);

  // Fetch student attendance history (all data, no date range)
  const { data: studentAttendanceHistory, isLoading: attendanceLoading } = useQuery(
    ['studentAttendanceHistory', user?.user_id],
    () => {
      console.log('StudentDashboard - Query function called for attendance history');
      return attendanceAPI.getMyAttendanceHistory();
    },
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000,
      onSuccess: (data) => {
        console.log('StudentDashboard - Attendance history data loaded:', data);
      },
      onError: (error) => {
        console.error('StudentDashboard - Attendance history error:', error);
      }
    }
  );

  // Fetch student attendance statistics
  const { data: studentAttendanceStats, isLoading: statsLoading } = useQuery(
    ['studentAttendanceStats', user?.user_id],
    () => {
      console.log('StudentDashboard - Query function called for stats');
      return attendanceAPI.getMyAttendanceStats();
    },
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000,
      onSuccess: (data) => {
        console.log('StudentDashboard - Stats data loaded:', data);
      },
      onError: (error) => {
        console.error('StudentDashboard - Stats error:', error);
      }
    }
  );

  // Fetch student profile data
  const { data: studentProfile, isLoading: profileLoading } = useQuery(
    ['studentProfile', user?.user_id],
    () => {
      console.log('StudentDashboard - Query function called for profile');
      return attendanceAPI.getMyProfile();
    },
    {
      enabled: !!user?.user_id,
      onSuccess: (data) => {
        console.log('StudentDashboard - Profile data loaded:', data);
      },
      onError: (error) => {
        console.error('StudentDashboard - Profile error:', error);
      }
    }
  );

  if (attendanceLoading || profileLoading || statsLoading) {
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




