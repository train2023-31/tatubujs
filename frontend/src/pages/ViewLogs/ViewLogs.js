import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Calendar, 
  User, 
  Globe, 
  Monitor,
  Plus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  BookOpen,
  Users,
  School,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  Shield,
  Key,
  Mail,
  Phone,
  MapPin,
  Clock,
  Activity
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/UI/DataTable';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

const ViewLogs = () => {
  const { user } = useAuth();
  const logsRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Function to get icon based on action type
  const getActionIcon = (actionType) => {
    const action = actionType?.toLowerCase() || '';
    
    if (action.includes('تسجيل دخول') || action.includes('login')) return LogIn;
    if (action.includes('تسجيل خروج') || action.includes('logout')) return LogOut;
    if (action.includes('إضافة') || action.includes('add') || action.includes('create')) return Plus;
    if (action.includes('تعديل') || action.includes('edit') || action.includes('update')) return Edit;
    if (action.includes('حذف') || action.includes('delete') || action.includes('remove')) return Trash2;
    if (action.includes('عرض') || action.includes('view') || action.includes('get')) return Eye;
    if (action.includes('طباعة') || action.includes('print')) return Printer;
    if (action.includes('تحميل') || action.includes('download') || action.includes('export')) return Download;
    if (action.includes('إعداد') || action.includes('settings') || action.includes('config')) return Settings;
    if (action.includes('فصل') || action.includes('class')) return BookOpen;
    if (action.includes('طالب') || action.includes('student')) return Users;
    if (action.includes('مدرسة') || action.includes('school')) return School;
    if (action.includes('حضور') || action.includes('attendance')) return CheckCircle;
    if (action.includes('غياب') || action.includes('absent')) return XCircle;
    if (action.includes('تقرير') || action.includes('report')) return FileText;
    if (action.includes('تحذير') || action.includes('warning') || action.includes('alert')) return AlertCircle;
    if (action.includes('قاعدة بيانات') || action.includes('database')) return Database;
    if (action.includes('أمان') || action.includes('security') || action.includes('auth')) return Shield;
    if (action.includes('مفتاح') || action.includes('key') || action.includes('password')) return Key;
    if (action.includes('بريد') || action.includes('email') || action.includes('mail')) return Mail;
    if (action.includes('هاتف') || action.includes('phone')) return Phone;
    if (action.includes('موقع') || action.includes('location')) return MapPin;
    if (action.includes('وقت') || action.includes('time') || action.includes('schedule')) return Clock;
    if (action.includes('نشاط') || action.includes('activity')) return Activity;
    
    // Default icon
    return Monitor;
  };

  // Fetch logs data
  const { data: logs, isLoading, error } = useQuery(
    'viewLogs',
    authAPI.viewLogs,
    {
      enabled: !!user && (user.role === 'school_admin' || user.role === 'admin'),
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Filter logs based on search and filters
  const filteredLogs = logs?.filter(log => {
    const matchesSearch = !searchTerm || 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.endpoint?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = !selectedAction || log.action_type === selectedAction;
    const matchesRole = !selectedRole || log.role === selectedRole;

    return matchesSearch && matchesAction && matchesRole;
  }) || [];

  // Get unique action types for filter
  const actionTypes = [...new Set(logs?.map(log => log.action_type).filter(Boolean))] || [];
  const roles = [...new Set(logs?.map(log => log.role).filter(Boolean))] || [];

  // Get status color based on status code
  const getStatusColor = (statusCode) => {
    if (statusCode >= 200 && statusCode < 300) return 'badge-success';
    if (statusCode >= 400 && statusCode < 500) return 'badge-warning';
    if (statusCode >= 500) return 'badge-danger';
    return 'badge-info';
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'tch': 'معلم',
      'std': 'طالب',
      'Asch': 'مدير مدرسة',
      'admin': 'مدير النظام'
    };
    return roleMap[role] || role;
  };

  // Get role color
  const getRoleColor = (role) => {
    const colorMap = {
      'tch': 'badge-primary',
      'std': 'badge-info',
      'Asch': 'badge-warning',
      'admin': 'badge-danger'
    };
    return colorMap[role] || 'badge-secondary';
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!logsRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Hide buttons during PDF generation
      const buttons = logsRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');
      
      const canvas = await html2canvas(logsRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height
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
      
      // Show buttons again
      buttons.forEach(btn => btn.style.display = '');
      
      pdf.save(`سجلات_النظام_${new Date().toLocaleDateString('ar-SA')}.pdf`);
      toast.success('تم تصدير السجلات بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('فشل في تصدير السجلات');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Print function
  const handlePrint = () => {
    if (!logsRef.current) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const printContent = logsRef.current.innerHTML;
    
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
          <title>سجلات النظام</title>
          <style>
            ${styles}
            
            /* Print-specific styles */
            @media print {
              @page {
                size: A4 landscape;
                margin: 1cm;
              }
              
              body {
                font-family: 'Noto Sans Arabic', Arial, sans-serif;
                font-size: 10px;
                line-height: 1.3;
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
                font-size: 9px;
              }
              
              th, td {
                border: 1px solid #000;
                padding: 3px;
                text-align: right;
              }
              
              th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              
              /* Badge styles */
              .badge {
                padding: 1px 4px;
                border-radius: 2px;
                font-size: 8px;
                font-weight: bold;
              }
              
              .badge-success {
                background-color: #d4edda;
                color: #155724;
              }
              
              .badge-danger {
                background-color: #f8d7da;
                color: #721c24;
              }
              
              .badge-warning {
                background-color: #fff3cd;
                color: #856404;
              }
              
              .badge-info {
                background-color: #d1ecf1;
                color: #0c5460;
              }
              
              .badge-primary {
                background-color: #cce5ff;
                color: #004085;
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

  // Table columns configuration
  const columns = [
    {
      key: 'user_info',
      header: 'المستخدم',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900">{row.user_name || 'غير محدد'}</p>
            <p className="text-xs text-gray-500">ID: {row.user_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'الدور',
      render: (row) => (
        <span className={`badge ${getRoleColor(row.role)}`}>
          {getRoleDisplayName(row.role)}
        </span>
      ),
    },
    {
      key: 'action_type',
      header: 'نوع الإجراء',
      render: (row) => {
        const IconComponent = getActionIcon(row.action_type);
        return (
          <div className="flex items-center">
            <IconComponent className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-900 mr-2">{row.action_type}</span>
          </div>
        );
      },
    },
    {
      key: 'endpoint',
      header: 'الإجراء',
      render: (row) => (
        <div className="flex items-center">
         
          <div>
           
            <p className="text-xs text-gray-500">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'timestamp',
      header: 'التاريخ والوقت',
      render: (row) => (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-900">{row.timestamp}</p>
            <p className="text-xs text-gray-500">{row.ip_address}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (row) => (
        <span className={`badge ${getStatusColor(row.status_code)}`}>
          {row.status_code === 0 ? '-' : row.status_code}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">حدث خطأ في تحميل السجلات</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={logsRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجلات النظام</h1>
          <p className="text-gray-600">عرض جميع أنشطة المستخدمين في النظام</p>
        </div>
        
        {user?.role === 'school_admin' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn btn-outline"
            >
              <Printer className="h-5 w-5 mr-2" />
              طباعة
            </button>
            <button
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
                  تصدير PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في السجلات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
          </div>

          {/* Action Type Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="input"
          >
            <option value="">جميع الإجراءات</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input"
          >
            <option value="">جميع الأدوار</option>
            {roles.map(role => (
              <option key={role} value={role}>{getRoleDisplayName(role)}</option>
            ))}
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedAction('');
              setSelectedRole('');
            }}
            className="btn btn-outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            مسح الفلاتر
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500">إجمالي السجلات</p>
              <p className="text-2xl font-bold text-gray-900">{logs?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500">المستخدمين النشطين</p>
              <p className="text-2xl font-bold text-gray-900">
                {[...new Set(logs?.map(log => log.user_id).filter(Boolean))].length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Monitor className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500">أنواع الإجراءات</p>
              <p className="text-2xl font-bold text-gray-900">{actionTypes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-500">السجلات المفلترة</p>
              <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">سجلات النظام</h2>
          <p className="text-sm text-gray-600">
            عرض آخر 30 يوم من أنشطة النظام
          </p>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل السجلات...</span>
            </div>
          ) : (
            <DataTable
              data={filteredLogs}
              columns={columns}
              searchable={false}
              sortable={true}
              pagination={true}
              pageSize={20}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewLogs;

