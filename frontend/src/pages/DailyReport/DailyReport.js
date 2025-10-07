import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { 
  Download, 
  Eye, 
  Calendar, 
  FileText, 
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  MessageCircle,
  Search,
  Filter,
  XCircle
} from 'lucide-react';
import { attendanceAPI, classesAPI, authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './DailyReport.css';

const DailyReport = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isUpdatingExcuse, setIsUpdatingExcuse] = useState(false);
  const [excuseForAll, setExcuseForAll] = useState(false);
  const [updatingStudents, setUpdatingStudents] = useState(new Set());
  const [confirmationStatus, setConfirmationStatus] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [filters, setFilters] = useState({
    classFilter: '',
    statusFilter: '',
    searchTerm: '',
    excuseFilter: ''
  });
  const [isSendingBulkWhatsApp, setIsSendingBulkWhatsApp] = useState(false);
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const reportRef = useRef(null);

  // Bulk WhatsApp messaging mutation
  const sendBulkWhatsAppMutation = useMutation(
    (data) => authAPI.sendAbsenceNotifications(data),
    {
      onSuccess: (response) => {
        const message = response.data.message;
        const schoolPhone = response.data.school_phone;
        
        if (schoolPhone) {
          toast.success(`${message}\nرقم المدرسة المستخدم: ${schoolPhone}`, {
            duration: 8000,
            style: {
              whiteSpace: 'pre-line',
              maxWidth: '500px'
            }
          });
        } else {
          toast.success(message);
        }
        
        setIsSendingBulkWhatsApp(false);
        setShowBulkWhatsAppModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إرسال الإشعارات');
        setIsSendingBulkWhatsApp(false);
      },
    }
  );

  // Fetch daily attendance data
  const { data: attendanceData, isLoading } = useQuery(
    ['dailyAttendanceReport', selectedDate],
    () => attendanceAPI.getAttendanceDetailsByStudent({ date: selectedDate }),
    { 
      enabled: !!user,
      onError: (error) => {
        toast.error('فشل في تحميل بيانات التقرير');
      }
    }
  );

  // Fetch all classes
  const { data: allClasses, isLoading: classesLoading } = useQuery(
    'allClasses',
    classesAPI.getMyClasses,
    { 
      enabled: !!user,
      onError: (error) => {
        console.error('Failed to fetch classes:', error);
      }
    }
  );

  // Fetch confirmation status
  const { data: confirmationData, isLoading: confirmationLoading } = useQuery(
    ['confirmationStatus', selectedDate],
    () => attendanceAPI.getConfirmationStatus({ date: selectedDate }),
    { 
      enabled: !!user && (user.role === 'school_admin' || user.role === 'data_analyst'),
      onSuccess: (data) => {
        setConfirmationStatus(data);
      },
      onError: (error) => {
        console.error('Failed to fetch confirmation status:', error);
      }
    }
  );

  // Group students by class
  const groupedData = React.useMemo(() => {
    // Initialize with all classes
    const acc = {};
    
    // Add all classes from the school
    if (allClasses?.classes) {
      allClasses.classes.forEach(classItem => {
        acc[classItem.class_name] = [];
      });
    }
    
    // Add attendance data if available
    if (attendanceData?.attendance_details) {
      attendanceData.attendance_details.forEach(record => {
        const className = record.class_name || 'غير محدد';
        if (!acc[className]) {
          acc[className] = [];
        }
        
        // Only add students with actual attendance records (not "no record yet" status)
        if (record.status !== "no record yet" && record.student_id) {
          acc[className].push(record);
        }
      });
    }
    
    return acc;
  }, [attendanceData, allClasses]);

  // Filter data based on current filters
  const filteredData = React.useMemo(() => {
    if (!attendanceData?.attendance_details) return [];
    
    let filtered = attendanceData.attendance_details.filter(record => {
      // Class filter
      if (filters.classFilter && record.class_name !== filters.classFilter) {
        return false;
      }
      
      // Search term filter (student name or username)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const studentName = (record.student_name || '').toLowerCase();
        const username = (record.username || '').toLowerCase();
        if (!studentName.includes(searchLower) && !username.includes(searchLower)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.statusFilter) {
        const hasAbsent = (record.absent_times || record.absentTimes || record.absent_periods || []).length > 0;
        const hasLate = (record.late_times || record.lateTimes || record.late_periods || []).length > 0;
        const hasExcused = (record.excused_times || record.excusedTimes || record.excused_periods || []).length > 0;
        const isPresent = !hasAbsent && !hasLate && !hasExcused;
        
        switch (filters.statusFilter) {
          case 'present':
            if (!isPresent) return false;
            break;
          case 'absent':
            if (!hasAbsent) return false;
            break;
          case 'late':
            if (!hasLate) return false;
            break;
          case 'excused':
            if (!hasExcused) return false;
            break;
        }
      }
      
      // Excuse filter
      if (filters.excuseFilter) {
        const hasExcuse = record.is_has_exuse || record.is_has_exuse || false;
        if (filters.excuseFilter === 'with_excuse' && !hasExcuse) return false;
        if (filters.excuseFilter === 'without_excuse' && hasExcuse) return false;
      }
      
      return true;
    });
    
    return filtered;
  }, [attendanceData, filters]);

  // Get unique classes for filter dropdown
  const availableClasses = React.useMemo(() => {
    if (allClasses?.classes) {
      return allClasses.classes.map(classItem => classItem.class_name).sort();
    }
    if (attendanceData?.attendance_details) {
      const classes = [...new Set(attendanceData.attendance_details.map(record => record.class_name).filter(Boolean))];
      return classes.sort();
    }
    return [];
  }, [allClasses, attendanceData]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      classFilter: '',
      statusFilter: '',
      searchTerm: '',
      excuseFilter: ''
    });
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleExcuseForAll = async () => {
    if (!attendanceData?.attendance_details) return;
    
    setIsUpdatingExcuse(true);
    try {
      const studentsWithRecords = attendanceData.attendance_details.filter(
        record => record.student_id && record.status !== "no record yet"
      );
      
      if (studentsWithRecords.length === 0) {
        toast.error('لا توجد سجلات طلاب لتحديثها');
        return;
      }

      const updatePromises = studentsWithRecords.map(student => 
         attendanceAPI.updateExcuseForStudent({
           student_id: student.student_id,
           date: selectedDate,
           is_has_exuse: excuseForAll
         })
      );

      await Promise.all(updatePromises);
      
      // Invalidate and refetch the data
      await queryClient.invalidateQueries(['dailyAttendanceReport', selectedDate]);
      
      toast.success(`تم تحديث حالة العذر لـ ${studentsWithRecords.length} طالب بنجاح`);
    } catch (error) {
      console.error('Error updating excuse status:', error);
      toast.error('فشل في تحديث حالة العذر');
    } finally {
      setIsUpdatingExcuse(false);
    }
  };

  const handleIndividualExcuseUpdate = async (studentId, hasExcuse) => {
    setUpdatingStudents(prev => new Set(prev).add(studentId));
    
    try {
      await          attendanceAPI.updateExcuseForStudent({
           student_id: studentId,
           date: selectedDate,
           is_has_exuse: hasExcuse
         });
      
      // Invalidate and refetch the data
      await queryClient.invalidateQueries(['dailyAttendanceReport', selectedDate]);
      
      toast.success('تم تحديث حالة العذر بنجاح');
    } catch (error) {
      console.error('Error updating individual excuse status:', error);
      toast.error('فشل في تحديث حالة العذر');
    } finally {
      setUpdatingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleConfirmDayAbsents = async (isConfirm) => {
    setIsConfirming(true);
    
    try {
      await attendanceAPI.confirmDayAbsents({
        date: selectedDate,
        is_confirm: isConfirm
      });
      
      // Invalidate and refetch the confirmation status
      await queryClient.invalidateQueries(['confirmationStatus', selectedDate]);
      
      toast.success(isConfirm ? 'تم تأكيد غياب اليوم بنجاح' : 'تم إلغاء تأكيد غياب اليوم بنجاح');
    } catch (error) {
      console.error('Error confirming day absents:', error);
      toast.error('فشل في تأكيد غياب اليوم');
    } finally {
      setIsConfirming(false);
    }
  };

  const generateWhatsAppMessage = (record) => {
    const schoolName = user?.school_name || 'المدرسة';
    const studentName = record.student_name || 'الطالب';
    const className = record.class_name || 'الصف';
    const date = formatDate(selectedDate, 'dd/MM/yyyy', 'ar');
    
    const haribTimes = record.absent_times || record.absentTimes || record.absent_periods || [];
    const lateTimes = record.late_times || record.lateTimes || record.late_periods || [];
    const ghaibTimes = record.excused_times || record.excusedTimes || record.excused_periods || [];
     const hasExcuse = record.is_has_exuse || record.is_has_exuse || false;
    
    let attendanceStatus = '';
    
    if (haribTimes.length > 0) {
      attendanceStatus += ` هارب في الحصص: ${haribTimes.sort((a, b) => a - b).join(', ')}\n`;
    }
    
    if (lateTimes.length > 0) {
      attendanceStatus += ` متأخر في الحصص: ${lateTimes.sort((a, b) => a - b).join(', ')}\n`;
    }
    
    if (ghaibTimes.length > 0) {
      attendanceStatus += ` غائب  في الحصص: ${ghaibTimes.sort((a, b) => a - b).join(', ')}\n`;
    }
    
    if (haribTimes.length === 0 && lateTimes.length === 0 && ghaibTimes.length === 0) {
      attendanceStatus = ' حضر جميع الحصص';
    }
    
    const excuseStatus = hasExcuse ? ' لديه عذر' : ' لا يوجد عذر';
    
    const message = ` *تقرير الحضور اليومي*

 *المدرسة:* ${schoolName}
 *الطالب/ة:* ${studentName}
 *الصف:* ${className}
 *التاريخ:* ${date}

 *حالة الحضور:*
${attendanceStatus}

 *حالة العذر:* ${excuseStatus}

--- تم إرسال هذا التقرير من نظام إدارة الحضور`;

    return message;
  };

  const handleWhatsAppClick = (record) => {
    const mssg_Ar = generateWhatsAppMessage(record);
    const phoneNumber = record.phone_number || '';
    
    if (phoneNumber) {
      // If phone number is available, create WhatsApp link with phone number using wa.me format
      const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      // Ensure phone number has country code if not present
      let formattedPhone = cleanPhoneNumber;
      if (!cleanPhoneNumber.startsWith('968') && cleanPhoneNumber.length === 8) {
        formattedPhone = '+968' + cleanPhoneNumber;
      }
      const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(mssg_Ar)}`;
      window.open(url, "_blank");
    } else {
      // If no phone number, open WhatsApp Web with the message
      const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(mssg_Ar)}`;
      window.open(url, "_blank");
    }
  };

  const handleBulkWhatsAppSend = () => {
    setIsSendingBulkWhatsApp(true);
    
    const data = {
      school_id: user?.school_id || null,
      days_back: 1, // Send for today only
      custom_message: null // Use default message template
    };

    sendBulkWhatsAppMutation.mutate(data);
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
      
      const fileName = `تقرير_الحضور_اليومي_${selectedDate}.pdf`;
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
          <title>تقرير الحضور اليومي</title>
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
              
              
              /* Badge styles */
              .badge {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
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

  const getHaribDays = (record) => {
    // هارب = Absent (not excused)
    const haribTimes = record.absent_times || record.absentTimes || record.absent_periods || [];
    if (!haribTimes || haribTimes.length === 0) return '';
    return haribTimes.sort((a, b) => a - b).join(', ');
  };

  const getLateDays = (record) => {
    // متأخر = Late
    const lateTimes = record.late_times || record.lateTimes || record.late_periods || [];
    if (!lateTimes || lateTimes.length === 0) return '';
    return lateTimes.sort((a, b) => a - b).join(', ');
  };

  const getGhaibDays = (record) => {
    // غائب = Excused (not absent)
    const ghaibTimes = record.excused_times || record.excusedTimes || record.excused_periods || [];
    if (!ghaibTimes || ghaibTimes.length === 0) return '';
    return ghaibTimes.sort((a, b) => a - b).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقرير اليومي للحضور</h1>
          <p className="text-gray-600">عرض وتحميل تقرير الحضور اليومي</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePreview}
            disabled={isLoading}
            className="btn btn-outline ml-2"
          >
            <Eye className="h-5 w-5 mr-2" />
            معاينة التقرير
          </button>
          
          {/* <button
            onClick={() => setShowBulkWhatsAppModal(true)}
            disabled={isLoading}
            className="btn btn-primary mr-2"
          >
            <MessageCircle className="h-5 w-5 ml-2" />
            إرسال إشعارات WhatsApp
          </button> */}
          
          {/* <button
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
          </button> */}
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="h-5 w-5 text-gray-400 ml-2" />
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">تاريخ التقرير:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>
            
            {/* Confirmation Status - Only for school_admin */}
            {(user?.role === 'school_admin' || user?.role === 'data_analyst') && (
              <div className="flex items-center space-x-4">
                {confirmationLoading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-500">جاري تحميل حالة التأكيد...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        confirmationStatus?.is_confirm 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {confirmationStatus?.is_confirm ? '✅ تم التأكيد' : '⏳ في انتظار التأكيد'}
                      </span>
                   
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleConfirmDayAbsents(true)}
                        disabled={isConfirming || confirmationStatus?.is_confirm}
                        className={`btn btn-sm btn-primary mr-2 ml-2 ${
                          confirmationStatus?.is_confirm 
                            ? 'btn-success opacity-50 cursor-not-allowed' 
                            : 'btn-success'
                        }`}
                      >
                        {isConfirming ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="mr-1">جاري التأكيد...</span>
                          </>
                        ) : (
                          'تأكيد الغياب'
                        )}
                      </button>
                      
                      
                      {confirmationStatus?.is_confirm && (
                        <button
                          onClick={() => handleConfirmDayAbsents(false)}
                          disabled={isConfirming}
                          className="btn btn-sm btn-outline mr-2 btn-danger"
                        >
                          {isConfirming ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span className="mr-1">جاري الإلغاء...</span>
                            </>
                          ) : (
                            'إلغاء التأكيد'
                          )}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
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
      {!isLoading && attendanceData?.attendance_details && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(groupedData).length}
              </div>
              <div className="text-sm text-gray-600">عدد الفصول</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-green-600">
                {attendanceData.attendance_details.filter(record => record.student_id).length}
              </div>
              <div className="text-sm text-gray-600">إجمالي الطلاب</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-red-600">
                {attendanceData.attendance_details.filter(record => {
                  const haribTimes = record.absent_times || record.absentTimes || record.absent_periods || [];
                  return haribTimes.length > 0;
                }).length}
              </div>
              <div className="text-sm text-gray-600">الطلاب الهاربين</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {attendanceData.attendance_details.filter(record => {
                  const lateTimes = record.late_times || record.lateTimes || record.late_periods || [];
                  return lateTimes.length > 0;
                }).length}
              </div>
              <div className="text-sm text-gray-600">الطلاب المتأخرين</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-purple-600">
                {attendanceData.attendance_details.filter(record => {
                  const hasExcuse = record.is_has_exuse || record.is_has_exuse || false;
                  return hasExcuse;
                }).length}
              </div>
              <div className="text-sm text-gray-600">الطلاب ذوي الأعذار</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-orange-600">
                {attendanceData.attendance_details.filter(record => {
                  const ghaibTimes = record.excused_times || record.excusedTimes || record.excused_periods || [];
                  return ghaibTimes.length > 0;
                }).length}
              </div>
              <div className="text-sm text-gray-600">الطلاب الغائبين</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Summary Table */}
      {!isLoading && !classesLoading && (attendanceData?.attendance_details || allClasses?.classes) && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">تفاصيل الحضور</h3>
          </div>
          
          {/* Filters */}
          <div className="card-body border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search Filter */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">البحث</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="input pl-10"
                    placeholder="ابحث عن الطالب..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
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

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حالة الحضور</label>
                <select
                  value={filters.statusFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                  className="input"
                >
                  <option value="">جميع الحالات</option>
                  {/* <option value="present">حاضر</option> */}
                  <option value="absent">هارب</option>
                  <option value="late">متأخر</option>
                  <option value="excused">غائب</option>
                </select>
              </div>

              {/* Excuse Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حالة العذر</label>
                <select
                  value={filters.excuseFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, excuseFilter: e.target.value }))}
                  className="input"
                >
                  <option value="">جميع الطلاب</option>
                  <option value="with_excuse">ذوي أعذار</option>
                  <option value="without_excuse">بدون أعذار</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="btn btn-outline w-full flex items-center justify-center"
                  disabled={!filters.classFilter && !filters.statusFilter && !filters.searchTerm && !filters.excuseFilter}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  مسح الفلاتر
                </button>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filters.classFilter || filters.statusFilter || filters.searchTerm || filters.excuseFilter) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">الفلاتر النشطة:</span>
                {filters.classFilter && (
                  <span className="badge badge-info">
                    الصف: {filters.classFilter}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, classFilter: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.statusFilter && (
                  <span className="badge badge-warning">
                    الحالة: {filters.statusFilter === 'present' ? 'حاضر' : 
                            filters.statusFilter === 'absent' ? 'هارب' :
                            filters.statusFilter === 'late' ? 'متأخر' : 'غائب'}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.searchTerm && (
                  <span className="badge badge-success">
                    البحث: {filters.searchTerm}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.excuseFilter && (
                  <span className="badge badge-primary">
                    العذر: {filters.excuseFilter === 'with_excuse' ? 'ذوي أعذار' : 'بدون أعذار'}
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, excuseFilter: '' }))}
                      className="ml-1 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="card-body p-0">
            <div className="overflow-x-auto scrollbar-hide overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      الصف ↕
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      الطالب/ة ↕
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      المعلمين/ات ↕
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      هارب ↕
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      متأخر ↕
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      غائب ↕
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-2">
                        <span>بعذر ↕</span>
                        <div className="flex items-center space-x-1">
                         
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData
                    .filter(record => record.student_id && record.status !== "no record yet")
                    .map((record, index) => {
                      const haribTimes = record.absent_times || record.absentTimes || record.absent_periods || [];
                      const lateTimes = record.late_times || record.lateTimes || record.late_periods || [];
                      const ghaibTimes = record.excused_times || record.excusedTimes || record.excused_periods || [];
                      const hasExcuse = record.is_has_exuse || record.is_has_exuse || false;
                      
                       // Determine row color based on attendance status
                       let rowColorClass = "hover:bg-gray-50";
                       if (haribTimes.length > 0) {
                         // Red background for students with absent periods
                         rowColorClass = "bg-red-50 hover:bg-red-100 border-l-4 border-red-400";
                       }  if (hasExcuse) {
                         // Green background for students with excuses
                         rowColorClass = "bg-green-50 hover:bg-green-100 border-l-4 border-green-400";
                       }
                      
                      return (
                        <tr key={record.student_id || index} className={rowColorClass}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.class_name || 'غير محدد'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.student_name || 'غير محدد'}
                          </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {(() => {
                                const teachersByPeriod = record.teachers_by_period;
                                
                                if (!teachersByPeriod || typeof teachersByPeriod !== 'object' || Object.keys(teachersByPeriod).length === 0) {
                                  return <span className="text-gray-400">-</span>;
                                }
                                
                                const teachersList = Object.entries(teachersByPeriod)
                                  .filter(([period, teacher]) => teacher && teacher.trim())
                                  .map(([period, teacher]) => ({ period, teacher: teacher.trim() }))
                                  .sort((a, b) => parseInt(a.period) - parseInt(b.period));
                                
                                if (teachersList.length === 0) {
                                  return <span className="text-gray-400">-</span>;
                                }
                                
                                return (
                                  <div className="relative group">
                                    <div className="flex items-center justify-center">
                                      <Users className="h-5 w-5 text-blue-600 cursor-pointer hover:text-blue-800 transition-colors" />
                                      <span className="mr-1 text-sm text-gray-600">
                                        {teachersList.length}
                                      </span>
                                    </div>
                                    
                                    {/* Dynamic Tooltip */}
                                    <div 
                                      className="absolute left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-max"
                                      ref={(el) => {
                                        if (!el) return;
                                        
                                        const updatePosition = () => {
                                          const trigger = el.parentElement?.querySelector('.flex.items-center');
                                          if (!trigger) return;
                                          
                                          const triggerRect = trigger.getBoundingClientRect();
                                          const tooltipRect = el.getBoundingClientRect();
                                          const viewportHeight = window.innerHeight;
                                          
                                          // Calculate available space above and below
                                          const spaceAbove = triggerRect.top;
                                          const spaceBelow = viewportHeight - triggerRect.bottom;
                                          
                                          // Estimate tooltip height (approximate based on content)
                                          const estimatedTooltipHeight = 60 + (teachersList.length * 20); // Base height + per teacher
                                          
                                          // Determine if tooltip should appear above or below
                                          const shouldShowAbove = spaceBelow < estimatedTooltipHeight && spaceAbove > estimatedTooltipHeight;
                                          
                                          if (shouldShowAbove) {
                                            // Position above
                                            el.style.bottom = '100%';
                                            el.style.top = 'auto';
                                            el.style.marginBottom = '8px';
                                            el.style.marginTop = '0';
                                            
                                            // Update arrow to point down
                                            const arrow = el.querySelector('.tooltip-arrow');
                                            if (arrow) {
                                              arrow.className = 'tooltip-arrow absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700';
                                            }
                                          } else {
                                            // Position below
                                            el.style.top = '100%';
                                            el.style.bottom = 'auto';
                                            el.style.marginTop = '8px';
                                            el.style.marginBottom = '0';
                                            
                                            // Update arrow to point up
                                            const arrow = el.querySelector('.tooltip-arrow');
                                            if (arrow) {
                                              arrow.className = 'tooltip-arrow absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-700';
                                            }
                                          }
                                        };
                                        
                                        // Update position on hover
                                        const parent = el.parentElement;
                                        if (parent) {
                                          parent.addEventListener('mouseenter', updatePosition);
                                          // Also update on window resize
                                          window.addEventListener('resize', updatePosition);
                                        }
                                      }}
                                    >
                                      <div className="space-y-1">
                                        <div className="font-semibold text-center border-b border-gray-700 pb-1 mb-2">
                                          المعلمين/ات
                                        </div>
                                        {teachersList.map(({ period, teacher }) => (
                                          <div key={period} className="flex items-center space-x-2">
                                            <span className="text-blue-300 font-medium min-w-[20px]">
                                              {period}:
                                            </span>
                                            <span>{teacher}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {/* Dynamic Arrow */}
                                      <div className="tooltip-arrow absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {haribTimes.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {haribTimes.sort((a, b) => a - b).join(', ')}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {lateTimes.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {lateTimes.sort((a, b) => a - b).join(', ')}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {ghaibTimes.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {ghaibTimes.sort((a, b) => a - b).join(', ')}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <input
                                type="checkbox"
                                checked={hasExcuse}
                                onChange={(e) => handleIndividualExcuseUpdate(record.student_id, e.target.checked)}
                                disabled={updatingStudents.has(record.student_id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              {updatingStudents.has(record.student_id) ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  hasExcuse 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {hasExcuse ? 'نعم' : 'لا'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleWhatsAppClick(record)}
                              className="inline-flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              title="إرسال تقرير الحضور عبر WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
        title="معاينة التقرير اليومي"
        size="full"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              تقرير الحضور ليوم {formatDate(selectedDate, 'dd/MM/yyyy', 'ar')}
            </h3>
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
            </div>
          </div>
          
          {/* Report Content */}
          <div ref={reportRef} className="bg-white p-8 print:p-4" dir="rtl" style={{ minHeight: '297mm' }}>
          <ReportContent 
            data={groupedData} 
            filteredData={filteredData}
            selectedDate={selectedDate}
            schoolName={user?.school_name || 'المدرسة'}
            filters={filters}
            allClasses={allClasses}
            confirmationStatus={confirmationStatus}
          />
          </div>
        </div>
      </Modal>

      {/* Bulk WhatsApp Modal */}
      <Modal
        isOpen={showBulkWhatsAppModal}
        onClose={() => setShowBulkWhatsAppModal(false)}
        title="إرسال إشعارات WhatsApp للطلاب المتغيبين"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">تعليمات الاستخدام:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>تأكد من أن WhatsApp Web مفتوح في متصفح Chrome</li>
                  <li>قم بمسح رمز QR إذا لم تكن مسجل الدخول</li>
                  <li>لا تغلق نافذة المتصفح أثناء عملية الإرسال</li>
                  <li>سيتم إرسال الرسائل تلقائياً مع توقف 3 ثوان بين كل رسالة</li>
                  <li>الرسائل ستُرسل من رقم المدرسة المسجل في النظام</li>
                  <li>يشمل النظام الهارب والغائب والمتأخر</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">سيتم إرسال الإشعارات للطلاب المتغيبين في:</p>
                <p className="font-bold">{formatDate(selectedDate, 'dd/MM/yyyy', 'ar')}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">تنسيق الرسالة الافتراضي:</h4>
            <div className="text-sm text-gray-900 whitespace-pre-line bg-white p-3 rounded border">
              *تقرير الحضور اليومي*

*المدرسة:* [اسم المدرسة]
*الطالب/ة:* [اسم الطالب]
*الصف:* [اسم الصف]
*التاريخ:* [التاريخ]
*حالة الحضور:* [حالة الحضور - هارب/غائب/متأخر]
*حالة العذر:* [حالة العذر]

---
تم إرسال هذا التقرير من نظام إدارة الحضور
            </div>
          </div>

          <div className="flex items-center justify-between space-x-3">
            <button
              onClick={() => setShowBulkWhatsAppModal(false)}
              className="btn btn-outline"
              disabled={isSendingBulkWhatsApp}
            >
              إلغاء
            </button>
            <button
              onClick={handleBulkWhatsAppSend}
              disabled={isSendingBulkWhatsApp}
              className="btn btn-primary"
            >
              {isSendingBulkWhatsApp ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 mr-2" />
                  إرسال الإشعارات
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Report Content Component
const ReportContent = ({ data, filteredData, selectedDate, schoolName, filters, allClasses, confirmationStatus }) => {
  // Create filtered grouped data for PDF
  const filteredGroupedData = React.useMemo(() => {
    // Initialize with all classes
    const acc = {};
    
    // Add all classes from the school
    if (allClasses?.classes) {
      allClasses.classes.forEach(classItem => {
        acc[classItem.class_name] = [];
      });
    }
    
    // Add filtered attendance data if available
    if (filteredData) {
      filteredData.forEach(record => {
        const className = record.class_name || 'غير محدد';
        if (!acc[className]) {
          acc[className] = [];
        }
        
        // Only add students with actual attendance records (not "no record yet" status)
        if (record.status !== "no record yet" && record.student_id) {
          acc[className].push(record);
        }
      });
    }
    
    return acc;
  }, [filteredData, allClasses]);

  // Check if filters are active
  const hasActiveFilters = filters.classFilter || filters.statusFilter || filters.searchTerm || filters.excuseFilter;

  const getHaribDays = (record) => {
    // هارب = Absent (not excused)
    const haribTimes = record.absent_times || record.absentTimes || record.absent_periods || [];
    if (!haribTimes || haribTimes.length === 0) return '';
    return haribTimes.sort((a, b) => a - b).join(', ');
  };

  const getLateDays = (record) => {
    // متأخر = Late
    const lateTimes = record.late_times || record.lateTimes || record.late_periods || [];
    if (!lateTimes || lateTimes.length === 0) return '';
    return lateTimes.sort((a, b) => a - b).join(', ');
  };

  const getGhaibDays = (record) => {
    // غائب = Excused (not absent)
    const ghaibTimes = record.excused_times || record.excusedTimes || record.excused_periods || [];
    if (!ghaibTimes || ghaibTimes.length === 0) return '';
    return ghaibTimes.sort((a, b) => a - b).join(', ');
  };

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
      
        <p className="text-gray-600 text-lg">
          التاريخ: {new Date().toLocaleString('ar-OM')}  
        </p>
        
        {/* Confirmation Status */}
        {confirmationStatus && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center justify-center space-x-4">
              <span className="text-sm font-semibold text-gray-700">حالة تأكيد الغياب:</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                confirmationStatus.is_confirm 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {confirmationStatus.is_confirm ? '✅ تم التأكيد' : '⏳ في انتظار التأكيد'}
              </span>
             
            </div>
          </div>
        )}
        
        {/* Filter Information */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">الفلاتر المطبقة:</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {filters.classFilter && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">الصف: {filters.classFilter}</span>
              )}
              {filters.statusFilter && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  الحالة: {filters.statusFilter === 'present' ? 'حاضر' : 
                          filters.statusFilter === 'absent' ? 'هارب' :
                          filters.statusFilter === 'late' ? 'متأخر' : 'غائب'}
                </span>
              )}
              {filters.searchTerm && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">البحث: {filters.searchTerm}</span>
              )}
              {filters.excuseFilter && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  العذر: {filters.excuseFilter === 'with_excuse' ? 'ذوي أعذار' : 'بدون أعذار'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Table */}
      <div className="">
        <table className="report-table w-full">
          <thead className="bg-blue-600 text-white sticky top-0 z-10 shadow-md">
            <tr>
              <th className="px-6 py-4 text-right font-bold text-lg">الطالب/ة</th>
              <th className="px-6 py-4 text-center font-bold text-lg">هارب</th>
              <th className="px-6 py-4 text-center font-bold text-lg">متأخر</th>
              <th className="px-6 py-4 text-center font-bold text-lg">غائب</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(hasActiveFilters ? filteredGroupedData : data).map(([className, students]) => (
              <React.Fragment key={className}>
                {/* Class Header */}
                <tr className="class-header">
                  <td colSpan="4" className="px-6 py-3 font-bold text-gray-800 text-lg">
                    {className}
                  </td>
                </tr>
                
                {/* Students */}
                {students.length > 0 ? (
                  students.map((record, index) => {
                    const haribTimes = record.absent_times || record.absentTimes || record.absent_periods || [];
                    const hasExcuse = record.is_has_exuse || record.is_has_exuse || false;
                    
                    // Determine row color based on attendance status for PDF
                    let rowColorClass = "student-row";
                    if (haribTimes.length > 0) {
                      // Red background for students with absent periods
                      rowColorClass = "student-row bg-red-50 border-l-4 border-red-400 text-red-800";
                    }  if (hasExcuse) {
                      // Green background for students with excuses
                      rowColorClass = "student-row bg-green-50 border-l-4 border-green-400 text-green-800";
                    }
                    
                    return (
                      <tr key={record.student_id} className={rowColorClass}>
                        <td className="px-6 py-4 text-right student-name text-base">
                          {record.student_name}
                        </td>
                        <td className="px-6 py-4 text-center harib-days text-base">
                          {getHaribDays(record)}
                        </td>
                        <td className="px-6 py-4 text-center late-days text-base">
                          {getLateDays(record)}
                        </td>
                        <td className="px-6 py-4 text-center ghaib-days text-base">
                          {getGhaibDays(record)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="bg-gray-50">
                    <td colSpan="4" className="px-6 py-4 text-center text-yellow-700 text-base italic">
                      لا توجد سجلات بعد أو لا يوجد غائبين
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {hasActiveFilters && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">ملخص النتائج المفلترة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(filteredGroupedData).reduce((total, students) => total + students.length, 0)}
              </div>
              <div className="text-gray-600">إجمالي الطلاب</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(filteredGroupedData).length}
              </div>
              <div className="text-gray-600">عدد الصفوف</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(filteredGroupedData).reduce((total, students) => 
                  total + students.filter(s => (s.absent_times || s.absentTimes || s.absent_periods || []).length > 0).length, 0)}
              </div>
              <div className="text-gray-600">الطلاب الغائبين</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(filteredGroupedData).reduce((total, students) => 
                   total + students.filter(s => s.is_has_exuse || s.is_has_exuse).length, 0)}
              </div>
              <div className="text-gray-600">الطلاب ذوي الأعذار</div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="report-footer mt-8 text-center text-sm text-gray-500">
        <p>تم إنشاء هذا التقرير تلقائياً من نظام إدارة الحضور</p>
        <p>تاريخ الإنشاء: {new Date().toLocaleString('ar-OM')}</p>
      </div>
    </div>
  );
};

export default DailyReport;