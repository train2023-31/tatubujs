import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import { 
  Bus, 
  Users, 
  Calendar,
  Download,
  Filter,
  TrendingUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { busAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const BusReports = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [selectedBusId, setSelectedBusId] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef(null);

  // Fetch buses for filter
  const { data: buses, isLoading: busesLoading } = useQuery('buses', busAPI.getBuses);

  // Fetch daily bus report
  const { data: busReport, isLoading: reportLoading } = useQuery(
    ['busReport', selectedDate, selectedBusId],
    () => busAPI.getDailyBusReport({
      date: selectedDate,
      bus_id: selectedBusId || undefined
    }),
    { enabled: !!user }
  );

  // Prepare chart data
  const prepareChartData = () => {
    if (!busReport || busReport.length === 0) return [];
    
    return busReport.map(bus => ({
      name: bus.bus?.bus_number || 'غير معروف',
      'المسجلين': bus.assigned_students || 0,
      'الصاعدين': bus.boarded_count || 0,
      'النازلين': bus.exited_count || 0,
      'على الحافلة': bus.currently_on_bus || 0,
    }));
  };

  const chartData = prepareChartData();

  // Calculate totals
  const totals = busReport?.reduce((acc, bus) => ({
    assigned: acc.assigned + (bus.assigned_students || 0),
    boarded: acc.boarded + (bus.boarded_count || 0),
    exited: acc.exited + (bus.exited_count || 0),
    currentlyOnBus: acc.currentlyOnBus + (bus.currently_on_bus || 0),
  }), { assigned: 0, boarded: 0, exited: 0, currentlyOnBus: 0 }) || { assigned: 0, boarded: 0, exited: 0, currentlyOnBus: 0 };

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
      
      const fileName = `تقرير_الحافلات_${formatDate(selectedDate, 'dd-MM-yyyy', 'ar')}.pdf`;
      pdf.save(fileName);
      
      toast.success('تم تحميل التقرير بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('فشل في إنشاء ملف PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div ref={reportRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">تقارير الحافلات</h1>
          <p className="text-sm sm:text-base text-gray-600">عرض وتحليل بيانات الحافلات والطلاب</p>
        </div>
        {(user?.role === 'school_admin' || user?.role === 'admin' || user?.role === 'data_analyst') && (
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
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">فلترة البيانات</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">التاريخ:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input flex-1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">الحافلة:</label>
                <select
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="input flex-1"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">جميع الحافلات</option>
                  {buses?.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.bus_number} - {bus.bus_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDate(getTodayAPI())}
                className="btn btn-outline btn-sm"
              >
                اليوم
              </button>
              <button
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setSelectedDate(yesterday.toISOString().split('T')[0]);
                }}
                className="btn btn-outline btn-sm"
              >
                أمس
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportLoading || busesLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
          <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <SummaryCard
              title="إجمالي المسجلين"
              value={totals.assigned}
              icon={Users}
              color="blue"
            />
            <SummaryCard
              title="إجمالي الصاعدين"
              value={totals.boarded}
              icon={ArrowUp}
              color="green"
            />
            <SummaryCard
              title="إجمالي النازلين"
              value={totals.exited}
              icon={ArrowDown}
              color="orange"
            />
            <SummaryCard
              title="حالياً على الحافلة"
              value={totals.currentlyOnBus}
              icon={Bus}
              color="purple"
            />
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">إحصائيات الحافلات</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="المسجلين" fill="#3B82F6" />
                      <Bar dataKey="الصاعدين" fill="#10B981" />
                      <Bar dataKey="النازلين" fill="#F59E0B" />
                      <Bar dataKey="على الحافلة" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line Chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">اتجاه الصعود والنزول</h3>
                </div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="الصاعدين" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="النازلين" stroke="#F59E0B" strokeWidth={2} />
                      <Line type="monotone" dataKey="على الحافلة" stroke="#8B5CF6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          {busReport && busReport.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">تفاصيل الحافلات</h3>
              </div>
              <div className="card-body">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header text-right">
                      <tr>
                        <th className="table-header-cell text-right">رقم الحافلة</th>
                        <th className="table-header-cell text-right">اسم الحافلة</th>
                        <th className="table-header-cell text-right">السائق</th>
                        <th className="table-header-cell text-right">المسجلين</th>
                        <th className="table-header-cell text-right">الصاعدين</th>
                        <th className="table-header-cell text-right">النازلين</th>
                        <th className="table-header-cell text-right">حالياً على الحافلة</th>
                        <th className="table-header-cell text-right">السعة</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {busReport.map((report, index) => (
                        <tr key={index}>
                          <td className="table-cell font-medium">
                            {report.bus?.bus_number || '-'}
                          </td>
                          <td className="table-cell">{report.bus?.bus_name || '-'}</td>
                          <td className="table-cell">
                            {report.bus?.driver_name || '-'}
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-info">{report.assigned_students || 0}</span>
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-success">{report.boarded_count || 0}</span>
                          </td>
                          <td className="table-cell">
                            <span className="badge badge-warning">{report.exited_count || 0}</span>
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${
                              (report.currently_on_bus || 0) > 0 ? 'badge-primary' : 'badge-secondary'
                            }`}>
                              {report.currently_on_bus || 0}
                            </span>
                          </td>
                          <td className="table-cell">
                            {report.bus?.capacity || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center py-12">
                <Bus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد بيانات متاحة للتاريخ المحدد</p>
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
    orange: 'bg-orange-500 text-white',
    purple: 'bg-purple-500 text-white',
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

export default BusReports;
