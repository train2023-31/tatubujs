import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Filter,
  Printer
} from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI, getCurrentWeekRange, getCurrentMonthRange } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const Reports = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('daily');
  const [dateRange, setDateRange] = useState({
    start: getTodayAPI(),
    end: getTodayAPI(),
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef(null);

  // Fetch school statistics
  const { data: schoolStats, isLoading: statsLoading } = useQuery(
    ['schoolStats', dateRange.start],
    () => reportsAPI.getSchoolStatistics({ date: dateRange.start }),
    { enabled: !!user }
  );

  // Fetch teacher attendance
  const { data: teacherAttendance, isLoading: teacherLoading } = useQuery(
    ['teacherAttendance', dateRange.start],
    () => reportsAPI.getTeacherAttendanceThisWeek({ date: dateRange.start }),
    { enabled: !!user && (user.role === 'school_admin' || user.role === 'admin') }
  );

  // Fetch absence statistics
  const { data: absenceStats, isLoading: absenceLoading } = useQuery(
    ['absenceStats', dateRange],
    () => reportsAPI.getSchoolAbsenceStatistics({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
    { enabled: !!user }
  );

  // Fetch teacher master report
  const { data: teacherMasterReport, isLoading: masterLoading } = useQuery(
    ['teacherMasterReport', dateRange],
    () => reportsAPI.getTeacherMasterReport({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
    { enabled: !!user && (user.role === 'school_admin' || user.role === 'admin') }
  );

  const tabs = [
    { id: 'daily', name: 'التقرير اليومي' },
    { id: 'weekly', name: 'التقرير الأسبوعي' },
    { id: 'monthly', name: 'التقرير الشهري' },
    { id: 'teachers', name: 'تقرير المعلمين' },
  ];

  const getCurrentData = () => {
    switch (selectedTab) {
      case 'weekly':
        return absenceStats?.weekly_by_day || [];
      case 'monthly':
        return absenceStats?.monthly_by_week || [];
      case 'teachers':
        return teacherMasterReport?.data || [];
      default:
        return schoolStats?.classes || [];
    }
  };

  const getCurrentLoading = () => {
    switch (selectedTab) {
      case 'weekly':
      case 'monthly':
        return absenceLoading;
      case 'teachers':
        return masterLoading;
      default:
        return statsLoading;
    }
  };

  // Chart data preparation
  const prepareChartData = () => {
    const data = getCurrentData();
    
    switch (selectedTab) {
      case 'daily':
        return data.map(cls => ({
          name: cls.class_name,
          حاضر: cls.number_of_presents,
          غائب: cls.number_of_absents,
          متأخر: cls.number_of_lates,
          معذور: cls.number_of_excus,
        }));
      
      case 'weekly':
        return data.map(day => ({
          name: formatDate(day.date, 'dd/MM', 'ar'),
          غائب: day.absent,
          متأخر: day.late,
          معذور: day.excused,
        }));
      
      case 'monthly':
        return data.map(week => ({
          name: `${formatDate(week.start, 'dd/MM', 'ar')} - ${formatDate(week.end, 'dd/MM', 'ar')}`,
          غائب: week.absent,
          متأخر: week.late,
          معذور: week.excused,
        }));
      
      case 'teachers':
        return data.map(teacher => ({
          name: teacher.teacher_name,
          'الحصص المسجلة': teacher.recorded_days,
          'الحصص المطلوبة': teacher.working_days,
          'النسبة المئوية': teacher.percentage,
        }));
      
      default:
        return [];
    }
  };

  const chartData = prepareChartData();

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

  // PDF Export Function
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
      
      const fileName = `تقرير_الإحصائيات_${selectedTab}_${formatDate(dateRange.start, 'dd-MM-yyyy', 'ar')}.pdf`;
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
          <title>التقارير والإحصائيات</title>
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
              
              /* Chart containers */
              .recharts-wrapper {
                page-break-inside: avoid;
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

  return (
    <div ref={reportRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">التقارير والإحصائيات</h1>
          <p className="text-sm sm:text-base text-gray-600">عرض وتحليل بيانات الحضور والغياب</p>
        </div>
        {user?.role === 'school_admin' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* <button
              onClick={handlePrint}
              className="btn btn-outline btn-sm sm:btn-sm"
            >
              <Printer className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">طباعة</span>
              <span className="sm:hidden">طباعة</span>
            </button> */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="btn btn-primary btn-sm sm:btn-sm"
            >
              {isGeneratingPDF ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-1 sm:mr-2 hidden sm:inline">جاري الإنشاء...</span>
                  <span className="sm:hidden">جاري...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">تصدير التقرير</span>
                  <span className="sm:hidden">تصدير</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-2 sm:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="card-body">
          <div className="space-y-4">
            {/* Filter Icon and Title */}
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">فلترة التاريخ</span>
            </div>
            
            {/* Date Inputs - Mobile Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">من:</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="input flex-1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">إلى:</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="input flex-1"
                />
              </div>
            </div>
            
            {/* Quick Date Buttons - Mobile Responsive */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDateRange({ start: getTodayAPI(), end: getTodayAPI() })}
                className="btn btn-outline btn-sm"
              >
                اليوم
              </button>
              <button
                onClick={() => {
                  const week = getCurrentWeekRange();
                  setDateRange({ start: week.start, end: week.end });
                }}
                className="btn btn-outline btn-sm"
              >
                هذا الأسبوع
              </button>
              <button
                onClick={() => {
                  const month = getCurrentMonthRange();
                  setDateRange({ start: month.start, end: month.end });
                }}
                className="btn btn-outline btn-sm"
              >
                هذا الشهر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {getCurrentLoading() ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          {selectedTab === 'daily' && schoolStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <SummaryCard
                title="إجمالي الطلاب"
                value={schoolStats.number_of_students}
                icon={Users}
                color="blue"
              />
              <SummaryCard
                title="الطلاب الحاضرين"
                value={schoolStats.number_of_presents}
                icon={TrendingUp}
                color="green"
              />
              <SummaryCard
                title="الطلاب الغائبين"
                value={schoolStats.number_of_absents}
                icon={BarChart3}
                color="red"
              />
              <SummaryCard
                title="الطلاب المتأخرين"
                value={schoolStats.number_of_lates}
                icon={Calendar}
                color="yellow"
              />
            </div>
          )}

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedTab === 'daily' && 'إحصائيات الفصول'}
                    {selectedTab === 'weekly' && 'إحصائيات الأسبوع'}
                    {selectedTab === 'monthly' && 'إحصائيات الشهر'}
                    {selectedTab === 'teachers' && 'إحصائيات المعلمين'}
                  </h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      {selectedTab === 'daily' && (
                        <>
                          <Bar dataKey="حاضر" fill="#10B981" />
                          <Bar dataKey="غائب" fill="#EF4444" />
                          <Bar dataKey="متأخر" fill="#F59E0B" />
                          <Bar dataKey="معذور" fill="#3B82F6" />
                        </>
                      )}
                      {selectedTab === 'weekly' && (
                        <>
                          <Bar dataKey="غائب" fill="#EF4444" />
                          <Bar dataKey="متأخر" fill="#F59E0B" />
                          <Bar dataKey="معذور" fill="#3B82F6" />
                        </>
                      )}
                      {selectedTab === 'monthly' && (
                        <>
                          <Bar dataKey="غائب" fill="#EF4444" />
                          <Bar dataKey="متأخر" fill="#F59E0B" />
                          <Bar dataKey="معذور" fill="#3B82F6" />
                        </>
                      )}
                      {selectedTab === 'teachers' && (
                        <>
                          <Bar dataKey="الحصص المسجلة" fill="#10B981" />
                          <Bar dataKey="الحصص المطلوبة" fill="#3B82F6" />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart for Daily Report */}
              {selectedTab === 'daily' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">توزيع الحضور</h3>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'حاضر', value: schoolStats?.number_of_presents || 0 },
                            { name: 'غائب', value: schoolStats?.number_of_absents || 0 },
                            { name: 'متأخر', value: schoolStats?.number_of_lates || 0 },
                            { name: 'معذور', value: schoolStats?.number_of_excus || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'حاضر', value: schoolStats?.number_of_presents || 0 },
                            { name: 'غائب', value: schoolStats?.number_of_absents || 0 },
                            { name: 'متأخر', value: schoolStats?.number_of_lates || 0 },
                            { name: 'معذور', value: schoolStats?.number_of_excus || 0 },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Line Chart for Weekly/Monthly */}
              {(selectedTab === 'weekly' || selectedTab === 'monthly') && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-lg font-medium text-gray-900">اتجاه الغياب</h3>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="غائب" stroke="#EF4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="متأخر" stroke="#F59E0B" strokeWidth={2} />
                        <Line type="monotone" dataKey="معذور" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Tables */}
          {selectedTab === 'daily' && schoolStats?.classes && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">تفاصيل الفصول</h3>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">اسم الفصل</th>
                        <th className="table-header-cell">المعلم</th>
                        <th className="table-header-cell">إجمالي الطلاب</th>
                        <th className="table-header-cell">الحاضرين</th>
                        <th className="table-header-cell">الغائبين</th>
                        <th className="table-header-cell">المتأخرين</th>
                        <th className="table-header-cell">المعذورين</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {schoolStats.classes.sort((a, b) => a.id - b.id).map((cls, index) => (
                        <tr key={index}>
                          <td className="table-cell">{cls.class_name}</td>
                          <td className="table-cell">{cls.teacher_name}</td>
                          <td className="table-cell">{cls.total_students}</td>
                          <td className="table-cell">
                            <span className="badge badge-success">{cls.number_of_presents}</span>
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-danger">{cls.number_of_absents}</span>
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-warning">{cls.number_of_lates}</span>
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-info">{cls.number_of_excus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'teachers' && teacherMasterReport?.data && (
            <div className="card text-right">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">تقرير المعلمين</h3>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header text-right">
                      <tr>
                        <th className="table-header-cell text-right">اسم المعلم</th>
                        <th className="table-header-cell text-right">الوظيفة</th>
                        <th className="table-header-cell text-right">الأيام المسجلة</th>
                        <th className="table-header-cell text-right">أيام العمل</th>
                        <th className="table-header-cell text-right">الحصص الأسبوعية</th>
                        <th className="table-header-cell text-right">النسبة المئوية</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {teacherMasterReport.data.map((teacher, index) => (
                        <tr key={index}>
                          <td className="table-cell">{teacher.teacher_name}</td>
                          <td className="table-cell">{teacher.job_name}</td>
                          <td className="table-cell">{teacher.recorded_days}</td>
                          <td className="table-cell">{teacher.working_days}</td>
                          <td className="table-cell">{teacher.week_classes}</td>
                          <td className="table-cell">
                            <span className={`badge ${
                              teacher.percentage >= 80 ? 'badge-success' :
                              teacher.percentage >= 60 ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {teacher.percentage}%
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
        </div>
      )}
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="mr-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;




