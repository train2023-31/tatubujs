import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { 
  Calendar, 
  Users, 
  Search, 
  Download, 
  Eye,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  User,
  Printer,
  Edit
} from 'lucide-react';
import { attendanceAPI, usersAPI } from '../../services/api';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import Tabs from '../../components/UI/Tabs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const AttendanceDetails = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('summary');
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const attendanceDetailsRef = useRef(null);
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentSearchRef = useRef(null);
  const [dateRange, setDateRange] = useState({
    start: getTodayAPI(),
    end: getTodayAPI(),
  });
  const [isBehaviorNoteModalOpen, setIsBehaviorNoteModalOpen] = useState(false);
  const [behaviorNote, setBehaviorNote] = useState('');

  // Fetch attendance summary
  const { data: attendanceSummary, isLoading: summaryLoading } = useQuery(
    ['attendanceSummary', selectedDate],
    () => attendanceAPI.getAttendanceSummary({ date: selectedDate }),
    { enabled: !!user && selectedTab === 'summary' }
  );

  // Fetch attendance details by student
  const { data: attendanceDetails, isLoading: detailsLoading } = useQuery(
    ['attendanceDetails', selectedDate],
    () => attendanceAPI.getAttendanceDetailsByStudent({ date: selectedDate }),
    { enabled: !!user && selectedTab === 'details' }
  );

  // Fetch students with excused attendance
  const { data: excusedStudents, isLoading: excusedLoading } = useQuery(
    ['excusedStudents', selectedDate],
    () => attendanceAPI.getStudentsWithExcusedAttendance({ date: selectedDate }),
    { enabled: !!user && selectedTab === 'excused' }
  );

  // Fetch all students for the log tab
  const { data: allStudents, isLoading: studentsLoading } = useQuery(
    'allStudents',
    usersAPI.getMySchoolStudents,
    { enabled: !!user && selectedTab === 'log' }
  );

  // Filter students based on search
  const filteredStudents = allStudents?.filter(student => 
    student.fullName?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.phone_number?.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  // Handle student selection
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setStudentId(student.id.toString());
    setStudentSearch(`${student.fullName}${student.phone_number ? `` : ''}`);
    setShowStudentDropdown(false);
  };

  // Handle opening behavior note modal (only for school admins)
  const handleOpenBehaviorNoteModal = () => {
    if (user?.role !== 'school_admin') {
      toast.error('غير مصرح لك بتعديل ملاحظات السلوك');
      return;
    }
    setBehaviorNote(selectedStudent?.behavior_note || '');
    setIsBehaviorNoteModalOpen(true);
  };

  // Handle updating behavior note (only for school admins)
  const handleUpdateBehaviorNote = () => {
    if (user?.role !== 'school_admin') {
      toast.error('غير مصرح لك بتعديل ملاحظات السلوك');
      return;
    }
    if (selectedStudent) {
      updateBehaviorNoteMutation.mutate({
        studentId: selectedStudent.id,
        behaviorNote: behaviorNote
      });
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setStudentSearch(value);
    setShowStudentDropdown(value.length > 0);
    
    // Clear selection if search is cleared
    if (value === '') {
      setSelectedStudent(null);
      setStudentId('');
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target)) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch student attendance log
  const { data: studentLog, isLoading: logLoading } = useQuery(
    ['studentLog', studentId, dateRange],
    () => attendanceAPI.getStudentAttendanceLog({
      student_id: studentId,
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
    { enabled: !!user && selectedTab === 'log' && !!studentId }
  );

  const queryClient = useQueryClient();

  // Update behavior note mutation (only for school admins)
  const updateBehaviorNoteMutation = useMutation(
    (data) => usersAPI.updateStudentBehaviorNote(data.studentId, data.behaviorNote),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('allStudents');
        toast.success('تم تحديث ملاحظة السلوك بنجاح');
        setIsBehaviorNoteModalOpen(false);
        setBehaviorNote('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تحديث ملاحظة السلوك');
      },
    }
  );

  // Redirect non-admin users away from log tab
  useEffect(() => {
    if (selectedTab === 'log' && user?.role !== 'school_admin') {
      setSelectedTab('summary');
    }
  }, [selectedTab, user?.role]);

  const tabs = [
    { id: 'summary', name: 'ملخص الحضور', icon: Users },
    { id: 'details', name: 'تفاصيل الطلاب', icon: Eye },
    { id: 'excused', name: 'الطلاب المعذورين', icon: AlertCircle },
    // Only show behavior notes log for school admins
    ...(user?.role === 'school_admin' || user?.role === 'data_analyst' ? [{ id: 'log', name: 'سجل ملاحظات الطالب', icon: Calendar }] : []),
  ];

  // PDF Export Function
  const handleDownloadPDF = async () => {
    if (!attendanceDetailsRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      // Hide buttons and other UI elements for PDF
      const buttons = attendanceDetailsRef.current.querySelectorAll('button');
      buttons.forEach(btn => btn.style.display = 'none');
      
      const canvas = await html2canvas(attendanceDetailsRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: attendanceDetailsRef.current.scrollWidth,
        height: attendanceDetailsRef.current.scrollHeight,
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
      
      const fileName = `تفاصيل_الحضور_${selectedTab}_${formatDate(selectedDate, 'dd-MM-yyyy', 'ar')}.pdf`;
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
    if (!attendanceDetailsRef.current) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const printContent = attendanceDetailsRef.current.innerHTML;
    
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
          <title>تفاصيل الحضور</title>
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

  const getCurrentData = () => {
    switch (selectedTab) {
      case 'summary':
        return attendanceSummary?.attendance_summary || [];
      case 'details':
        return attendanceDetails?.attendance_details || [];
      case 'excused':
        return excusedStudents?.students || [];
      case 'log':
        return studentLog || [];
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (selectedTab) {
      case 'summary':
        return summaryLoading;
      case 'details':
        return detailsLoading;
      case 'excused':
        return excusedLoading;
      case 'log':
        return logLoading;
      default:
        return false;
    }
  };

  // Summary columns
  const summaryColumns = [
    {
      key: 'class_name',
      header: 'اسم الفصل',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <span className="mr-2 text-sm font-medium text-gray-900">{row.class_name}</span>
        </div>
      ),
    },
 
    {
      key: 'total_students',
      header: 'إجمالي الطلاب',
      render: (row) => (
        <span className="badge badge-info">{(row.total_students || 0) === 0 ? '-' : row.total_students}</span>
      ),
    },
    {
      key: 'total_present',
      header: 'الحاضرين',
      render: (row) => (
        <span className="badge badge-success">{(row.total_present || 0) === 0 ? '-' : row.total_present}</span>
      ),
    },
    {
      key: 'total_absent',
      header: 'الهاربين',
      render: (row) => (
        <span className="badge badge-danger">{(row.total_absent || 0) === 0 ? '-' : row.total_absent}</span>
      ),
    },
    {
      key: 'total_late',
      header: 'المتأخرين',
      render: (row) => (
        <span className="badge badge-warning">{(row.total_late || 0) === 0 ? '-' : row.total_late}</span>
      ),
    },
    {
      key: 'total_excused',
      header: 'الغائبين',
      render: (row) => (
        <span className="badge badge-info">{(row.total_excused || 0) === 0 ? '-' : row.total_excused}</span>
      ),
    },
  ];

  // Details columns
  const detailsColumns = [
    {
      key: 'student_name',
      header: 'اسم الطالب',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-green-600" />
          </div>
          <div className="mr-2">
            <p className="text-sm font-medium text-gray-900">{row.student_name}</p>
            <p className="text-sm text-gray-500">{row.phone_number}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class_name',
      header: 'الفصل',
      render: (row) => (
        <span className="text-sm text-gray-900">{row.class_name}</span>
      ),
    },
    {
      key: 'absent_times',
      header: 'الحصص الهارب فيها',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.absent_times.map((time, index) => (
            <span key={index} className="badge badge-danger text-xs">
              {time}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'late_times',
      header: 'الحصص المتأخر فيها',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.late_times.map((time, index) => (
            <span key={index} className="badge badge-warning text-xs">
              {time}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'excused_times',
      header: 'الحصص الغائب فيها',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.excused_times.map((time, index) => (
            <span key={index} className="badge badge-info text-xs">
              {time}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'is_has_exuse',
      header: 'لديه عذر',
      render: (row) => (
        <span className={`badge ${row.is_has_exuse ? 'badge-success' : 'badge-danger'}`}>
          {row.is_has_exuse ? 'نعم' : 'لا'}
        </span>
      ),
    },
  ];

  // Excused students columns
  const excusedColumns = [
    {
      key: 'student_name',
      header: 'اسم الطالب',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </div>
          <span className="mr-2 text-sm font-medium text-gray-900">{row.student_name}</span>
        </div>
      ),
    },
    {
      key: 'class_name',
      header: 'الفصل',
      render: (row) => (
        <span className="text-sm text-gray-900">{row.class_name}</span>
      ),
    },
    {
      key: 'subject_name',
      header: 'المادة',
      render: (row) => (
        <span className="text-sm text-gray-900">{row.subject_name}</span>
      ),
    },
    {
      key: 'class_time_num',
      header: 'رقم الحصة',
      render: (row) => (
        <span className="badge badge-info">{(row.class_time_num || 0) === 0 ? '-' : row.class_time_num}</span>
      ),
    },
    {
      key: 'excus_note',
      header: 'ملاحظة العذر',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.excus_note || '-'}</span>
      ),
    },
  ];

  // Student log columns
  const logColumns = [
    {
      key: 'date',
      header: 'التاريخ',
      render: (row) => (
        <span className="text-sm text-gray-900">{row.date}</span>
      ),
    },
    {
      key: 'late_times',
      header: 'الحصص المتأخر فيها',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.late_times.map((time, index) => (
            <span key={index} className="badge badge-warning text-xs">
              {time}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'absent_times',
      header: 'الحصص الهارب فيها',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.absent_times.map((time, index) => (
            <span key={index} className="badge badge-danger text-xs">
              {time}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'excused_times',
      header: 'الحصص الغائب فيها',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.excused_times.map((time, index) => (
            <span key={index} className="badge badge-info text-xs">
              {time}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'subjects',
      header: 'المواد',
      render: (row) => (
        <div className="text-sm text-gray-600">
          {row.subjects.join(', ')}
        </div>
      ),
    },
  ];

  const getColumns = () => {
    switch (selectedTab) {
      case 'summary':
        return summaryColumns;
      case 'details':
        return detailsColumns;
      case 'excused':
        return excusedColumns;
      case 'log':
        return logColumns;
      default:
        return [];
    }
  };

  return (
    <div ref={attendanceDetailsRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تفاصيل الحضور</h1>
          <p className="text-gray-600">عرض تفصيلي لسجلات الحضور والغياب</p>
        </div>
        {(user?.role === 'school_admin' || user?.role === 'data_analyst') && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn btn-outline"
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

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        variant="modern"
        className="mb-6"
      />

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedTab !== 'log' && (
              <div>
                <label className="label">التاريخ</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input"
                />
              </div>
            )}
            
            {selectedTab === 'log' && (
              <>
                <div className="relative">
                  <label className="label">اختر الطالب</label>
                  <div className="relative" ref={studentSearchRef}>
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={handleSearchChange}
                      onFocus={() => setShowStudentDropdown(studentSearch.length > 0)}
                      className="input w-full"
                      placeholder="ابحث عن الطالب بالاسم أو رقم الهاتف"
                      disabled={studentsLoading}
                    />
                    {studentsLoading && (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    
                    {/* Dropdown Results */}
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredStudents.map((student) => (
                          <div
                            key={student.id}
                            onClick={() => handleStudentSelect(student)}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center ml-2">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {student.fullName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {student.phone_number || 'لا يوجد رقم هاتف'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No Results */}
                    {showStudentDropdown && filteredStudents.length === 0 && studentSearch.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        <div className="px-4 py-2 text-sm text-gray-500 text-center">
                          لا توجد نتائج
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">من تاريخ</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">إلى تاريخ</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="input"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {selectedTab === 'summary' && attendanceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-blue-600">
                {attendanceSummary.total_class_time_nums}
              </div>
              <div className="text-sm text-gray-600">إجمالي الحصص</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-red-600">
                {attendanceSummary.total_not_in_class_time_nums}
              </div>
              <div className="text-sm text-gray-600">الحصص المفقودة</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-green-600">
                {attendanceSummary.attendance_summary.length}
              </div>
              <div className="text-sm text-gray-600">عدد الفصول</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {attendanceSummary.attendance_summary.reduce((sum, cls) => sum + cls.total_students, 0)}
              </div>
              <div className="text-sm text-gray-600">إجمالي الطلاب</div>
            </div>
          </div>
        </div>
      )}

      {/* Student Details for Log Tab */}
      {selectedTab === 'log' && selectedStudent && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">تفاصيل الطالب</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">الاسم الكامل</label>
                <p className="text-sm text-gray-900">{selectedStudent.fullName}</p>
              </div>
           
              <div>
                <label className="text-sm font-medium text-gray-500">رقم الهاتف</label>
                <p className="text-sm text-gray-900">{selectedStudent.phone_number || 'غير محدد'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">الفصل</label>
                <p className="text-sm text-gray-900">{selectedStudent.class_name || 'غير محدد'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">الحالة</label>
                <span className={`badge ${selectedStudent.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {selectedStudent.is_active ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-500">ملاحظة السلوك</label>
                  {(user?.role === 'school_admin' || user?.role === 'data_analyst') && (
                    <button
                      onClick={handleOpenBehaviorNoteModal}
                      className="text-primary-600 hover:text-primary-900 flex items-center text-sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      تعديل
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg border">
                  {selectedStudent.behavior_note || 'لا توجد ملاحظات'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={getCurrentData()}
        columns={getColumns()}
        loading={getCurrentLoading()}
        emptyMessage="لا توجد بيانات"
      />

      {/* Behavior Note Modal */}
      <Modal
        isOpen={isBehaviorNoteModalOpen}
        onClose={() => setIsBehaviorNoteModalOpen(false)}
        title="تعديل ملاحظة السلوك"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">ملاحظة السلوك</label>
            <textarea
              value={behaviorNote}
              onChange={(e) => setBehaviorNote(e.target.value)}
              className="input"
              rows={6}
              placeholder="أدخل ملاحظة حول سلوك الطالب..."
            />
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={() => setIsBehaviorNoteModalOpen(false)}
              className="btn btn-outline"
            >
              إلغاء
            </button>
            <button
              onClick={handleUpdateBehaviorNote}
              disabled={updateBehaviorNoteMutation.isLoading}
              className="btn btn-primary"
            >
              {updateBehaviorNoteMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الحفظ...</span>
                </>
              ) : (
                'حفظ الملاحظة'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceDetails;
