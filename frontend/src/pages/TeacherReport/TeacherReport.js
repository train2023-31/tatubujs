import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import { 
  Download, 
  Eye, 
  Calendar, 
  FileText, 
  Printer,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  History,
  Search,
  Filter,
  XCircle
} from 'lucide-react';
import { attendanceAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import TeacherHistoryDialog from './TeacherHistoryDialog';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './TeacherReport.css';

const TeacherReport = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    jobFilter: '',
    classFilter: ''
  });
  const reportRef = useRef(null);

  // Fetch teacher report data
  const { data: teacherData, isLoading } = useQuery(
    ['teacherReport', selectedDate],
    () => attendanceAPI.getTeacherReport({ date: selectedDate }),
    { 
      enabled: !!user,
      onError: (error) => {
        toast.error('فشل في تحميل بيانات تقرير المعلمين');
      }
    }
  );

  // Filter teachers based on current filters
  const filteredTeachers = React.useMemo(() => {
    if (!teacherData?.teacher_summary) return [];
    
    return teacherData.teacher_summary.filter(teacher => {
      // Search term filter (teacher name or job)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const teacherName = (teacher.teacher_name || '').toLowerCase();
        const jobName = (teacher.job_name || '').toLowerCase();
        if (!teacherName.includes(searchLower) && !jobName.includes(searchLower)) {
          return false;
        }
      }
      
      // Job filter
      if (filters.jobFilter && teacher.job_name !== filters.jobFilter) {
        return false;
      }
      
      // Class filter
      if (filters.classFilter && !teacher.classes_taught.includes(filters.classFilter)) {
        return false;
      }
      
      return true;
    });
  }, [teacherData, filters]);

  // Get unique jobs and classes for filter dropdowns
  const availableJobs = React.useMemo(() => {
    if (!teacherData?.teacher_summary) return [];
    const jobs = [...new Set(teacherData.teacher_summary.map(teacher => teacher.job_name).filter(Boolean))];
    return jobs.sort();
  }, [teacherData]);

  const availableClasses = React.useMemo(() => {
    if (!teacherData?.teacher_summary) return [];
    const classes = [...new Set(teacherData.teacher_summary.flatMap(teacher => teacher.classes_taught))];
    return classes.sort();
  }, [teacherData]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      jobFilter: '',
      classFilter: ''
    });
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleViewHistory = (teacher) => {
    setSelectedTeacher(teacher);
    setIsHistoryDialogOpen(true);
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Hide buttons and other UI elements for PDF
      const buttons = reportRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: reportRef.current.scrollWidth,
        height: reportRef.current.scrollHeight,
        fontEmbedCSS: true,
        foreignObjectRendering: true
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
      
      const fileName = `تقرير_المعلمين_${selectedDate}.pdf`;
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
    if (!reportRef.current) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const printContent = reportRef.current.innerHTML;
    
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
          <title>تقرير المعلمين</title>
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
              
              .print-header {
                page-break-after: avoid;
              }
              
              .print-footer {
                page-break-before: avoid;
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
              
              /* Show summary cards in print */
              .summary-cards, .summary-cards .card, .summary-cards .grid {
                display: block !important;
              }
              
               .summary-cards .grid {
                 display: grid !important;
                 grid-template-columns: repeat(6, 1fr) !important;
                 gap: 16px !important;
                 margin-bottom: 20px !important;
               }
              
              .summary-cards .card {
                border: 1px solid #000 !important;
                padding: 12px !important;
                text-align: center !important;
                background: white !important;
                page-break-inside: avoid !important;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تقرير المعلمين</h1>
          <p className="text-gray-600">عرض وتحميل تقرير أداء المعلمين</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <Eye className="h-5 w-5 mr-2" />
            معاينة التقرير
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isLoading || isGeneratingPDF}
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
                تحميل PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">تاريخ التقرير:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="mr-3 text-gray-500">جاري تحميل بيانات التقرير...</span>
        </div>
      )}

       {/* Summary Cards */}
       {!isLoading && teacherData && (
         <div className="summary-cards grid grid-cols-1 md:grid-cols-6 gap-4">
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-blue-600">
                 {teacherData.total_teachers || 0}
               </div>
               <div className="text-sm text-gray-600">إجمالي المعلمين</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-green-600">
                 {teacherData.teacher_summary?.reduce((sum, teacher) => sum + (teacher.weekly_classes || 0), 0) || 0}
               </div>
               <div className="text-sm text-gray-600">إجمالي الحصص المطلوبة</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-purple-600">
                 {teacherData.teacher_summary?.reduce((sum, teacher) => sum + (teacher.actual_classes || 0), 0) || 0}
               </div>
               <div className="text-sm text-gray-600">إجمالي الحصص الفعلية</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-orange-600">
                 {teacherData.teacher_summary?.filter(teacher => teacher.teacher_attendance_percentage >= 80).length || 0}
               </div>
               <div className="text-sm text-gray-600">معلمون بنسبة حضور عالية</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-red-600">
                 {teacherData.teacher_summary?.filter(teacher => teacher.teacher_attendance_percentage < 60).length || 0}
               </div>
               <div className="text-sm text-gray-600">معلمون بنسبة حضور منخفضة</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-yellow-600">
                 {filteredTeachers.length}
               </div>
               <div className="text-sm text-gray-600">المعلمين المفلترين</div>
             </div>
           </div>
         </div>
       )}

      {/* Filters */}
      {!isLoading && teacherData?.teacher_summary && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">فلاتر البحث</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="input pl-10"
                    placeholder="ابحث عن المعلم..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Job Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوظيفة</label>
                <select
                  value={filters.jobFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, jobFilter: e.target.value }))}
                  className="input"
                >
                  <option value="">جميع الوظائف</option>
                  {availableJobs.map(job => (
                    <option key={job} value={job}>{job}</option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصف</label>
                <select
                  value={filters.classFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, classFilter: e.target.value }))}
                  className="input"
                >
                  <option value="">جميع الصفوف</option>
                  {availableClasses.map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="btn btn-outline w-full flex items-center justify-center"
                  disabled={!filters.searchTerm && !filters.jobFilter && !filters.classFilter}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  مسح الفلاتر
                </button>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filters.searchTerm || filters.jobFilter || filters.classFilter) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">الفلاتر النشطة:</span>
                {filters.searchTerm && (
                  <span className="badge badge-info">
                    البحث: {filters.searchTerm}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.jobFilter && (
                  <span className="badge badge-warning">
                    الوظيفة: {filters.jobFilter}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, jobFilter: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.classFilter && (
                  <span className="badge badge-success">
                    الصف: {filters.classFilter}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, classFilter: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teachers Table */}
      {!isLoading && teacherData?.teacher_summary && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">تفاصيل المعلمين</h3>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المعلم/ة
                    </th>
                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                       الوظيفة
                     </th>
                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                       الحصص المطلوبة
                     </th>
                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                       الحصص الفعلية
                     </th>
                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                       نسبة الحضور
                     </th>
                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                       إجمالي الطلاب
                     </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحضور
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الغياب
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النسبة
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <tr key={teacher.teacher_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="mr-4">
                              <div className="text-sm font-medium text-gray-900">
                                {teacher.teacher_name}
                              </div>
                            </div>
                          </div>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {teacher.job_name || 'غير محدد'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                           {teacher.weekly_classes > 0 ? teacher.weekly_classes : '-'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                           {teacher.actual_classes > 0 ? teacher.actual_classes : '-'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center">
                           <div className="flex items-center justify-center">
                             <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                             <span className={`text-sm font-medium ${
                               teacher.teacher_attendance_percentage >= 80 ? 'text-green-600' :
                               teacher.teacher_attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                             }`}>
                               {teacher.teacher_attendance_percentage}%
                             </span>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                           {teacher.total_students}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center">
                           {teacher.present_students > 0 ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               <UserCheck className="h-3 w-3 mr-1" />
                               {teacher.present_students}
                             </span>
                           ) : (
                             <span className="text-gray-400">-</span>
                           )}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-center">
                           {teacher.absent_students > 0 ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                               <UserX className="h-3 w-3 mr-1" />
                               {teacher.absent_students}
                             </span>
                           ) : (
                             <span className="text-gray-400">-</span>
                           )}
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                            <span className={`text-sm font-medium ${
                              teacher.attendance_percentage >= 80 ? 'text-green-600' :
                              teacher.attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {teacher.attendance_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleViewHistory(teacher)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <History className="h-3 w-3 mr-1" />
                            السجل
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                        لا توجد بيانات للمعلمين لهذا اليوم أو لا يوجد معلمون مطابقون للفلاتر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="معاينة تقرير المعلمين"
        size="full"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              تقرير المعلمين ليوم {formatDate(selectedDate, 'dd/MM/yyyy', 'ar')}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="btn btn-primary btn-sm"
              >
                {isGeneratingPDF ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="mr-2">جاري الإنشاء...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    تحميل PDF
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="btn btn-outline btn-sm"
              >
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </button>
            </div>
          </div>
          
          {/* Report Content */}
          <div ref={reportRef} className="bg-white p-8 print:p-4" dir="rtl" style={{ minHeight: '297mm' }}>
            <ReportContent 
              data={teacherData} 
              filteredData={filteredTeachers}
              selectedDate={selectedDate}
              schoolName={user?.school_name || 'المدرسة'}
            />
          </div>
        </div>
      </Modal>

      {/* Teacher History Dialog */}
      <TeacherHistoryDialog
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        teacher={selectedTeacher}
      />
    </div>
  );
};

// Report Content Component
const ReportContent = ({ data, filteredData, selectedDate, schoolName }) => {
  return (
    <div className="report-container max-w-5xl mx-auto">
      {/* Header */}
      <div className="report-header text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="w-20 h-20">
            <img 
              src="/logo.png" 
              alt="تتبع" 
              className="h-20 w-20 sm:h-20 sm:w-20 object-contain"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {schoolName}
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          تقرير المعلمين
        </h2>
        <p className="text-gray-600 text-lg">
          التاريخ: {formatDate(selectedDate, 'dd/MM/yyyy', 'ar')}
        </p>
      </div>

       {/* Summary Cards */}
       {data && (
         <div className="summary-cards grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-blue-600">
                 {data.total_teachers || 0}
               </div>
               <div className="text-sm text-gray-600">إجمالي المعلمين</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-green-600">
                 {data.teacher_summary?.reduce((sum, teacher) => sum + (teacher.weekly_classes || 0), 0) || 0}
               </div>
               <div className="text-sm text-gray-600">إجمالي الحصص المطلوبة</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-purple-600">
                 {data.teacher_summary?.reduce((sum, teacher) => sum + (teacher.actual_classes || 0), 0) || 0}
               </div>
               <div className="text-sm text-gray-600">إجمالي الحصص الفعلية</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-orange-600">
                 {data.teacher_summary?.filter(teacher => teacher.teacher_attendance_percentage >= 80).length || 0}
               </div>
               <div className="text-sm text-gray-600">معلمون بنسبة حضور عالية</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-red-600">
                 {data.teacher_summary?.filter(teacher => teacher.teacher_attendance_percentage < 60).length || 0}
               </div>
               <div className="text-sm text-gray-600">معلمون بنسبة حضور منخفضة</div>
             </div>
           </div>
           <div className="card">
             <div className="card-body text-center">
               <div className="text-2xl font-bold text-yellow-600">
                 {filteredData.length}
               </div>
               <div className="text-sm text-gray-600">المعلمين المفلترين</div>
             </div>
           </div>
         </div>
       )}

      {/* Report Table */}
      <div className="">
        <table className="report-table w-full">
          <thead className="bg-blue-600 text-white sticky top-0 z-10 shadow-md">
            <tr>
               <th className="px-6 py-4 text-right font-bold text-lg">المعلم/ة</th>
               <th className="px-6 py-4 text-center font-bold text-lg">الوظيفة</th>
               <th className="px-6 py-4 text-center font-bold text-lg">الحصص المطلوبة</th>
               <th className="px-6 py-4 text-center font-bold text-lg">الحصص الفعلية</th>
               <th className="px-6 py-4 text-center font-bold text-lg">نسبة الحضور</th>
               <th className="px-6 py-4 text-center font-bold text-lg">إجمالي الطلاب</th>
               <th className="px-6 py-4 text-center font-bold text-lg">الحضور</th>
               <th className="px-6 py-4 text-center font-bold text-lg">الغياب</th>
               <th className="px-6 py-4 text-center font-bold text-lg">النسبة</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((teacher) => (
                <tr key={teacher.teacher_id} className="student-row">
                  <td className="px-6 py-4 text-right student-name text-base">
                    {teacher.teacher_name}
                  </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.job_name || 'غير محدد'}
                   </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.weekly_classes > 0 ? teacher.weekly_classes : '-'}
                   </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.actual_classes > 0 ? teacher.actual_classes : '-'}
                   </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.teacher_attendance_percentage}%
                   </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.total_students}
                   </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.present_students > 0 ? teacher.present_students : '-'}
                   </td>
                   <td className="px-6 py-4 text-center text-base">
                     {teacher.absent_students > 0 ? teacher.absent_students : '-'}
                   </td>
                  <td className="px-6 py-4 text-center text-base">
                    {teacher.attendance_percentage}%
                  </td>
                </tr>
              ))
            ) : (
               <tr className="bg-gray-50">
                 <td colSpan="9" className="px-6 py-4 text-center text-yellow-700 text-base italic">
                   لا توجد بيانات متاحة
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="report-footer mt-8 text-center text-sm text-gray-500">
        <p>تم إنشاء هذا التقرير تلقائياً من نظام إدارة الحضور</p>
        <p>تاريخ الإنشاء: {new Date().toLocaleString('ar-OM')}</p>
      </div>
    </div>
  );
};

export default TeacherReport;
