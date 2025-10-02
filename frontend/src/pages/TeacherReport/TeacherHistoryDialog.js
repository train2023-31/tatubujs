import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import { 
  X, 
  Calendar, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Download,
  Printer
} from 'lucide-react';
import { attendanceAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const TeacherHistoryDialog = ({ isOpen, onClose, teacher }) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const historyRef = useRef(null);

  // Fetch teacher history data
  const { data: historyData, isLoading } = useQuery(
    ['teacherHistory', teacher?.teacher_id, dateRange],
    () => attendanceAPI.getTeacherHistory(teacher?.teacher_id, {
      start_date: dateRange.startDate,
      end_date: dateRange.endDate
    }),
    { 
      enabled: !!teacher && isOpen,
      onError: (error) => {
        toast.error('فشل في تحميل سجل المعلم');
      }
    }
  );

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDownloadPDF = async () => {
    if (!historyRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Hide buttons and other UI elements for PDF
      const buttons = historyRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');
      
      const canvas = await html2canvas(historyRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: historyRef.current.scrollWidth,
        height: historyRef.current.scrollHeight,
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
      
      const fileName = `سجل_المعلم_${teacher?.teacher_name}_${dateRange.startDate}_${dateRange.endDate}.pdf`;
      pdf.save(fileName);
      
      toast.success('تم تحميل السجل بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('فشل في إنشاء ملف PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    if (!historyRef.current) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const printContent = historyRef.current.innerHTML;
    
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
          <title>سجل المعلم - ${teacher?.teacher_name}</title>
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
              button, .btn, .no-print {
                display: none !important;
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

  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 h-12 w-12">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                سجل المعلم: {teacher.teacher_name}
              </h2>
              <p className="text-sm text-gray-500">
                {teacher.job_name || 'غير محدد'} - {teacher.weekly_classes + ' حصص أسبوعية'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* <button
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
            </button> */}
            <button
              onClick={handlePrint}
              className="btn btn-outline btn-sm"
            >
              <Printer className="h-4 w-4 mr-2" />
              طباعة
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row space-x-8">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">من تاريخ:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="input"
            />
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">إلى تاريخ:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل سجل المعلم...</span>
            </div>
          ) : historyData ? (
            <div ref={historyRef} className="p-6" dir="rtl">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="card">
                  <div className="card-body text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {historyData.summary.total_days}
                    </div>
                    <div className="text-sm text-gray-600"> إجمالي الأيام المسجلة</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {historyData.summary.total_classes}
                    </div>
                    <div className="text-sm text-gray-600">إجمالي الحصص المسجلة</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {historyData.summary.total_expected_classes || 0}
                    </div>
                    <div className="text-sm text-gray-600">إجمالي الحصص الاسبوعية</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <div className={`text-2xl font-bold ${
                      historyData.summary.teacher_attendance_percentage >= 80 ? 'text-green-600' :
                      historyData.summary.teacher_attendance_percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {historyData.summary.teacher_attendance_percentage || 0}%
                    </div>
                    <div className="text-sm text-gray-600">نسبة حضور المعلم</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {historyData.summary.overall_attendance_percentage}%
                    </div>
                    <div className="text-sm text-gray-600">نسبة حضور الطلاب</div>
                  </div>
                </div>
                {/* <div className="card">
                  <div className="card-body text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {historyData.summary.total_students}
                    </div>
                    <div className="text-sm text-gray-600">إجمالي الطلاب</div>
                  </div>
                </div> */}
              </div>

          

              {/* History Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">التفاصيل اليومية</h3>
                </div>
                <div className="card-body p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            التاريخ
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            عدد الحصص المسجلة
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            إجمالي الطلاب
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الحضور
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الهروب
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            المتأخر
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            الغياب
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            النسبة
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.history.map((dayRecord, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatDate(dayRecord.date, 'dd/MM/yyyy', 'ar')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              <div className="flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-gray-400 ml-2" />
                                {dayRecord.total_classes}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                              {dayRecord.total_students}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {dayRecord.present_students > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <UserCheck className="h-3 w-3 ml-2" />
                                  {dayRecord.present_students}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {dayRecord.absent_students > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <UserX className="h-3 w-3 ml-2" />
                                  {dayRecord.absent_students}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {dayRecord.late_students > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="h-3 w-3 ml-2" />
                                  {dayRecord.late_students}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {dayRecord.excused_students > 0 ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <AlertCircle className="h-3 w-3 ml-2" />
                                  {dayRecord.excused_students}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                                <span className={`text-sm font-medium ${
                                  (dayRecord.present_students / dayRecord.total_students * 100) >= 80 ? 'text-green-600' :
                                  (dayRecord.present_students / dayRecord.total_students * 100) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {dayRecord.total_students > 0 ? 
                                    Math.round((dayRecord.present_students / dayRecord.total_students) * 100) : 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Class Details */}
              {historyData.history.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">تفاصيل الحصص</h3>
                  <div className="space-y-4">
                    {historyData.history.map((dayRecord, dayIndex) => (
                      <div key={dayIndex} className="card">
                        <div className="card-header">
                          <h4 className="text-md font-medium text-gray-900">
                            {formatDate(dayRecord.date, 'dd/MM/yyyy', 'ar')}
                          </h4>
                        </div>
                        <div className="card-body p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                    الصف
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                    المادة
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    رقم الحصة
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    إجمالي الطلاب
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    الحضور
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    الهروب
                                  </th>
                                 
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    المتأخر
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    الغياب
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    النسبة
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {dayRecord.classes.map((classRecord, classIndex) => (
                                  <tr key={classIndex} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {classRecord.class_name}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {classRecord.subject_name}
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-900">
                                      {classRecord.class_time_num}
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-900">
                                      {classRecord.total_students}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {classRecord.present_students > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          {classRecord.present_students}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {classRecord.absent_students > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                          {classRecord.absent_students}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {classRecord.late_students > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                          {classRecord.late_students}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {classRecord.excused_students > 0 ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                          {classRecord.excused_students}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-gray-900">
                                      {classRecord.attendance_percentage}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد بيانات متاحة للفترة المحددة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherHistoryDialog;
