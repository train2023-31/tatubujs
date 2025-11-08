import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  User,
  Filter,
  ChevronDown,
  Edit,
  MessageCircle,
  Smartphone,
  Send,
  AlertCircle,
  Download,
  FileText,
  X
} from 'lucide-react';
import { usersAPI, authAPI, attendanceAPI, classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useMutation, useQueryClient } from 'react-query';
import { formatDate, getTodayAPI } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

const StudentNotesLog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isBehaviorNoteModalOpen, setIsBehaviorNoteModalOpen] = useState(false);
  const [behaviorNote, setBehaviorNote] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [showSmsConfirmModal, setShowSmsConfirmModal] = useState(false);
  const [pendingSmsData, setPendingSmsData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: getTodayAPI(),
    end: getTodayAPI(),
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const searchRef = useRef(null);
  const attendanceLogTableRef = useRef(null);

  // Fetch all students
  const { data: allStudents, isLoading: studentsLoading } = useQuery(
    'allStudents',
    usersAPI.getMySchoolStudents,
    { enabled: !!user }
  );

  // Fetch all classes to get class IDs for ordering
  const { data: allClasses, isLoading: classesLoading } = useQuery(
    'allClasses',
    classesAPI.getMyClasses,
    { enabled: !!user }
  );

  // Get unique classes for filter, ordered by class ID
  const uniqueClasses = React.useMemo(() => {
    if (!allStudents) return [];
    
    // Create a map of class names to their IDs from allClasses
    const classIdMap = new Map();
    if (allClasses && Array.isArray(allClasses)) {
      allClasses.forEach(cls => {
        if (cls.name && cls.id) {
          classIdMap.set(cls.name, cls.id);
        }
      });
    }
    
    // Get unique class names from students
    const classNames = new Set();
    allStudents.forEach(student => {
      if (student.class_name) {
        classNames.add(student.class_name);
      }
    });
    
    // Convert to array and sort by class ID
    const classesArray = Array.from(classNames).map(className => ({
      name: className,
      id: classIdMap.get(className) || 999999 // Use large number for classes without ID
    }));
    
    // Sort by ID, then by name if ID is the same
    classesArray.sort((a, b) => {
      if (a.id !== b.id) {
        return a.id - b.id;
      }
      return a.name.localeCompare(b.name, 'ar');
    });
    
    return classesArray.map(cls => cls.name);
  }, [allStudents, allClasses]);

  // Filter students based on search and filters, ordered by student name
  const filteredStudents = React.useMemo(() => {
    if (!allStudents) return [];
    
    const filtered = allStudents.filter(student => {
      // Search filter
      const matchesSearch = !searchTerm || 
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Class filter
      const matchesClass = !filterClass || student.class_name === filterClass;
      
      return matchesSearch && matchesClass;
    });
    
    // Sort by student name (Arabic locale)
    return filtered.sort((a, b) => {
      const nameA = a.fullName || '';
      const nameB = b.fullName || '';
      return nameA.localeCompare(nameB, 'ar', { numeric: true, sensitivity: 'base' });
    });
  }, [allStudents, searchTerm, filterClass]);

  // Fetch student attendance log
  const { data: studentAttendanceLog, isLoading: logLoading } = useQuery(
    ['studentAttendanceLog', selectedStudent?.id, dateRange],
    () => attendanceAPI.getStudentAttendanceLog({
      student_id: selectedStudent.id,
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
    { 
      enabled: !!user && !!selectedStudent?.id && !!dateRange.start && !!dateRange.end,
      retry: 1,
      staleTime: 30000,
    }
  );

  // Handle student selection
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setBehaviorNote(student.behavior_note || '');
  };

  // Student note templates
  const noteTemplates = [
    {
      id: 1,
      title: 'ملاحظة إيجابية',
      content: 'الطالب/ة يظهر سلوكاً إيجابياً ومشاركة نشطة في الفصل.'
    },
    {
      id: 2,
      title: 'حضور ممتاز',
      content: 'الطالب/ة يظهر التزاماً ممتازاً في الحضور:\n- حضور منتظم ومستمر\n- التزام بالدوام المدرسي\n- عدم وجود غياب غير مبرر\n- مشاركة فعالة في جميع الحصص'
    },
    {
      id: 3,
      title: 'تحسين الأداء',
      content: 'يحتاج الطالب/ة إلى تحسين في:\n- الانتباه والتركيز\n- إكمال الواجبات\n- المشاركة في الأنشطة'
    },
    {
      id: 4,
      title: 'سلوك غير مناسب',
      content: 'تم ملاحظة سلوك غير مناسب:\n- عدم احترام القوانين الصفية\n- إزعاج الزملاء\n- عدم الالتزام بالتعليمات'
    },
    {
      id: 5,
      title: 'تحسن ملحوظ',
      content: 'لاحظنا تحسناً ملحوظاً في:\n- السلوك العام\n- المشاركة الصفية\n- الالتزام بالقوانين'
    },
    {
      id: 6,
      title: 'متابعة خاصة',
      content: 'الطالب/ة يحتاج إلى متابعة خاصة في:\n- الحضور والانضباط\n- التفاعل مع المعلمين\n- التعاون مع الزملاء'
    },
    {
      id: 7,
      title: 'إنجاز ممتاز',
      content: 'الطالب/ة يظهر إنجازاً ممتازاً في:\n- التحصيل الدراسي\n- السلوك والانضباط\n- المشاركة والتفاعل'
    }
  ];

  // Handle template selection
  const handleTemplateSelect = (template) => {
    if (behaviorNote && behaviorNote.trim() !== '') {
      setBehaviorNote(behaviorNote + '\n\n' + template.content);
    } else {
      setBehaviorNote(template.content);
    }
    setShowTemplates(false);
    toast.success(`تم إضافة قالب: ${template.title}`);
  };

  // Handle opening behavior note modal
  const handleOpenBehaviorNoteModal = () => {
    if (user?.role !== 'school_admin' && user?.role !== 'data_analyst') {
      toast.error('غير مصرح لك بتعديل ملاحظات السلوك');
      return;
    }
    if (selectedStudent) {
      setBehaviorNote(selectedStudent.behavior_note || '');
      setIsBehaviorNoteModalOpen(true);
    }
  };

  // Update behavior note mutation
  const updateBehaviorNoteMutation = useMutation(
    (data) => usersAPI.updateStudentBehaviorNote(data.studentId, data.behaviorNote),
    {
      onSuccess: (response, variables) => {
        queryClient.invalidateQueries('allStudents');
        
        // Update selected student
        if (selectedStudent && selectedStudent.id === variables.studentId) {
          setSelectedStudent(prev => ({
            ...prev,
            behavior_note: variables.behaviorNote
          }));
        }
        
        // Refetch all students
        queryClient.refetchQueries('allStudents').then(() => {
          const updatedStudents = queryClient.getQueryData('allStudents');
          if (updatedStudents && selectedStudent) {
            const updatedStudent = updatedStudents.find(s => s.id === selectedStudent.id);
            if (updatedStudent) {
              setSelectedStudent(updatedStudent);
            }
          }
        });
        
        toast.success('تم تحديث ملاحظة السلوك بنجاح');
        setIsBehaviorNoteModalOpen(false);
        setBehaviorNote('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تحديث ملاحظة السلوك');
      },
    }
  );

  // Handle updating behavior note
  const handleUpdateBehaviorNote = () => {
    if (selectedStudent) {
      updateBehaviorNoteMutation.mutate({
        studentId: selectedStudent.id,
        behaviorNote: behaviorNote
      });
    }
  };

  // Handle sending behavior note via SMS
  const handleSendBehaviorNoteSms = () => {
    if (!selectedStudent) {
      toast.error('يرجى اختيار طالب أولاً');
      return;
    }

    if (!selectedStudent.phone_number) {
      toast.error('رقم الهاتف غير متوفر لهذا الطالب');
      return;
    }

    if (!selectedStudent.behavior_note || selectedStudent.behavior_note.trim() === '') {
      toast.error('لا توجد ملاحظة سلوك لإرسالها');
      return;
    }

    // Format phone number
    let phoneNumber = selectedStudent.phone_number.replace(/[^0-9]/g, '');
    if (!phoneNumber.startsWith('968')) {
      if (phoneNumber.length === 8) {
        phoneNumber = '968' + phoneNumber;
      } else if (phoneNumber.length === 9 && phoneNumber.startsWith('9')) {
        phoneNumber = '968' + phoneNumber.substring(1);
      }
    }

    const message = `ملاحظة السلوك - ${selectedStudent.fullName}\n${selectedStudent.behavior_note}`;
    
    setPendingSmsData({
      student: selectedStudent,
      phone: phoneNumber,
      message: message
    });
    setShowSmsConfirmModal(true);
  };

  // Confirm and send SMS
  const confirmSendSms = () => {
    if (!pendingSmsData) return;
    
    setIsSendingSms(true);
    authAPI.sendTestSms({
      phone_number: pendingSmsData.phone,
      message: pendingSmsData.message,
      school_id: user?.school_id
    }).then(() => {
      toast.success('تم إرسال الرسالة بنجاح');
      setIsSendingSms(false);
      setShowSmsConfirmModal(false);
      setPendingSmsData(null);
    }).catch((error) => {
      toast.error(error.response?.data?.message?.ar || 'فشل في إرسال الرسالة');
      setIsSendingSms(false);
    });
  };

  // Handle sending behavior note via WhatsApp
  const handleSendBehaviorNoteWhatsApp = () => {
    if (!selectedStudent) {
      toast.error('يرجى اختيار طالب أولاً');
      return;
    }

    if (!selectedStudent.phone_number) {
      toast.error('رقم الهاتف غير متوفر لهذا الطالب');
      return;
    }

    if (!selectedStudent.behavior_note || selectedStudent.behavior_note.trim() === '') {
      toast.error('لا توجد ملاحظة سلوك لإرسالها');
      return;
    }

    // Format phone number
    let phoneNumber = selectedStudent.phone_number.replace(/[^0-9]/g, '');
    if (!phoneNumber.startsWith('968')) {
      if (phoneNumber.length === 8) {
        phoneNumber = '968' + phoneNumber;
      } else if (phoneNumber.length === 9 && phoneNumber.startsWith('9')) {
        phoneNumber = '968' + phoneNumber.substring(1);
      }
    }

    const message = `ملاحظة السلوك - ${selectedStudent.fullName}\n${selectedStudent.behavior_note}`;
    const encodedMessage = encodeURIComponent(message);

    // Detect if mobile or desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // Use wa.me for mobile, web.whatsapp.com for desktop
    const whatsappUrl = isMobile 
      ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;

    const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      toast.error('تم حظر النوافذ المنبثقة. يرجى السماح للمتصفح بفتح النوافذ المنبثقة');
    } else {
      toast.success(`تم فتح WhatsApp للطالب ${selectedStudent.fullName}`);
    }
  };

  // Handle downloading attendance log as CSV
  const handleDownloadAttendanceLog = () => {
    if (!selectedStudent) {
      toast.error('يرجى اختيار طالب أولاً');
      return;
    }

    if (!studentAttendanceLog || studentAttendanceLog.length === 0) {
      toast.error('لا يوجد سجل حضور للتحميل');
      return;
    }

    setIsDownloading(true);

    try {
      // Prepare CSV headers
      const headers = ['التاريخ', 'غائب', 'متأخر', 'معذور', 'المواد', 'الفصول'];
      
      // Prepare CSV rows
      const rows = studentAttendanceLog.map(log => {
        const date = formatDate(log.date);
        const absent = log.absent_times && log.absent_times.length > 0 ? log.absent_times.join(', ') : '-';
        const late = log.late_times && log.late_times.length > 0 ? log.late_times.join(', ') : '-';
        const excused = log.excused_times && log.excused_times.length > 0 ? log.excused_times.join(', ') : '-';
        const subjects = log.subjects && log.subjects.length > 0 ? log.subjects.join(', ') : '-';
        const classes = log.classes && log.classes.length > 0 ? log.classes.join(', ') : '-';
        
        return [date, absent, late, excused, subjects, classes];
      });

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Add BOM for UTF-8 to support Arabic characters in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `سجل_حضور_${selectedStudent.fullName}_${dateRange.start}_${dateRange.end}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('تم تحميل سجل الحضور بنجاح');
    } catch (error) {
      console.error('Error downloading attendance log:', error);
      toast.error('حدث خطأ أثناء تحميل سجل الحضور');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        // Close dropdown if needed
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل ملاحظات الطالب</h1>
          <p className="text-gray-600">عرض وتعديل ملاحظات السلوك للطلاب</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Students List with Filters */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">قائمة الطلاب</h3>
          </div>
          <div className="card-body">
            {/* Search and Filters */}
            <div className="space-y-3 mb-4">
              {/* Search Bar */}
              <div className="relative" ref={searchRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                  placeholder="ابحث عن الطالب بالاسم أو رقم الهاتف أو الصف..."
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {/* Filters Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Filter className="h-4 w-4" />
                  <span>فلاتر</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Active Filters Count */}
                {filterClass && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">الصف: {filterClass}</span>
                    <button
                      onClick={() => setFilterClass('')}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الصف
                    </label>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="input"
                    >
                      <option value="">جميع الصفوف</option>
                      {uniqueClasses.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Students List */}
            {studentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="mr-3 text-gray-500">جاري تحميل الطلاب...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm || filterClass ? 'لا توجد نتائج' : 'لا يوجد طلاب'}
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الطالب</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الصف</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">رقم الهاتف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedStudent?.id === student.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center ml-2">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{student.fullName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.class_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.phone_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Student Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">تفاصيل الطالب</h3>
          </div>
          <div className="card-body">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">الاسم الكامل</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedStudent.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">رقم الهاتف</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedStudent.phone_number || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">الفصل</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedStudent.class_name || 'غير محدد'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">الحالة</label>
                    <span className={`badge ${selectedStudent.is_active ? 'badge-success' : 'badge-danger'} mt-1`}>
                      {selectedStudent.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                </div>

                {/* Behavior Note */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-500">ملاحظة السلوك</label>
                    <div className="flex items-center space-x-2">
                      {selectedStudent.phone_number && selectedStudent.behavior_note && (
                        <>
                          <button
                            onClick={handleSendBehaviorNoteWhatsApp}
                            className="text-green-600 hover:text-green-900 flex items-center text-sm px-2 py-1 rounded hover:bg-green-50 transition-colors"
                            title="إرسال عبر WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </button>
                          <button
                            onClick={handleSendBehaviorNoteSms}
                            className="text-blue-600 hover:text-blue-900 flex items-center text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                            title="إرسال عبر SMS"
                          >
                            <Smartphone className="h-4 w-4 mr-1" />
                            SMS
                          </button>
                        </>
                      )}
                      {(user?.role === 'school_admin' || user?.role === 'data_analyst') && (
                        <button
                          onClick={handleOpenBehaviorNoteModal}
                          className="text-primary-600 hover:text-primary-900 flex items-center text-sm px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          تعديل
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border min-h-[200px]">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedStudent.behavior_note || 'لا توجد ملاحظات'}
                    </p>
                  </div>
                </div>

                {/* Date Range Filter for Attendance Log */}
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">نطاق التاريخ لسجل الحضور</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">من تاريخ</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">إلى تاريخ</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="input text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Attendance Log */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-500">سجل الحضور</label>
                    {studentAttendanceLog && studentAttendanceLog.length > 0 && (
                      <button
                        onClick={handleDownloadAttendanceLog}
                        disabled={isDownloading}
                        className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-900 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                        title="تحميل سجل الحضور"
                      >
                        {isDownloading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>جاري التحميل...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>تحميل</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {logLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="sm" />
                      <span className="mr-3 text-gray-500">جاري تحميل سجل الحضور...</span>
                    </div>
                  ) : studentAttendanceLog && studentAttendanceLog.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto border rounded-lg" ref={attendanceLogTableRef}>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">التاريخ</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">هارب</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">متأخر</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">غائب</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">المواد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {studentAttendanceLog.map((log, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-900">
                                {formatDate(log.date)}
                              </td>
                              <td className="px-3 py-2">
                                {log.absent_times && log.absent_times.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {log.absent_times.map((time, i) => (
                                      <span key={i} className="badge badge-danger text-xs">
                                        {time}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {log.late_times && log.late_times.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {log.late_times.map((time, i) => (
                                      <span key={i} className="badge badge-warning text-xs">
                                        {time}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {log.excused_times && log.excused_times.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {log.excused_times.map((time, i) => (
                                      <span key={i} className="badge badge-info text-xs">
                                        {time}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {log.subjects && log.subjects.length > 0 ? log.subjects.join(', ') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                      <p className="text-sm">لا يوجد سجل حضور في النطاق المحدد</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>اختر طالباً من القائمة لعرض التفاصيل</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Behavior Note Modal */}
      <Modal
        isOpen={isBehaviorNoteModalOpen}
        onClose={() => {
          setIsBehaviorNoteModalOpen(false);
          setShowTemplates(false);
        }}
        title="تعديل ملاحظة السلوك"
        size="lg"
      >
        <div className="space-y-4">
          {/* Templates Section */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">ملاحظة السلوك</label>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-900 px-3 py-1.5 rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                type="button"
              >
                <FileText className="h-4 w-4" />
                <span>{showTemplates ? 'إخفاء القوالب' : 'عرض القوالب'}</span>
              </button>
            </div>
            
            {/* Templates Dropdown */}
            {showTemplates && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">اختر قالباً جاهزاً:</h4>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {noteTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="text-right p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                      type="button"
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1">
                        {template.title}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {template.content}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <textarea
              value={behaviorNote}
              onChange={(e) => setBehaviorNote(e.target.value)}
              className="input"
              rows={6}
              placeholder="أدخل ملاحظة حول سلوك الطالب... أو اختر قالباً جاهزاً من الأعلى"
            />
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setIsBehaviorNoteModalOpen(false);
                setShowTemplates(false);
              }}
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

      {/* SMS Confirmation Modal */}
      <Modal
        isOpen={showSmsConfirmModal}
        onClose={() => {
          setShowSmsConfirmModal(false);
          setPendingSmsData(null);
        }}
        title="تأكيد إرسال SMS"
        size="lg"
      >
        <div className="space-y-6">
          {/* Warning/Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">يرجى مراجعة الرسالة قبل الإرسال:</p>
              </div>
            </div>
          </div>

          {/* Student Info */}
          {pendingSmsData?.student && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">الطالب/ة:</span>
                  <span className="mr-2 text-gray-900">{pendingSmsData.student.fullName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">رقم الهاتف:</span>
                  <span className="mr-2 text-gray-900">{pendingSmsData.phone}</span>
                </div>
              </div>
            </div>
          )}

          {/* Message Preview */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700">معاينة الرسالة:</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
              <pre className="whitespace-pre-wrap text-sm text-gray-900 font-medium" dir="rtl">
                {pendingSmsData?.message || ''}
              </pre>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p>عدد الأحرف: {(pendingSmsData?.message || '').length}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setShowSmsConfirmModal(false);
                setPendingSmsData(null);
              }}
              className="btn btn-outline"
              disabled={isSendingSms}
            >
              إلغاء
            </button>
            <button
              onClick={confirmSendSms}
              disabled={isSendingSms}
              className="btn btn-primary"
            >
              {isSendingSms ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  تأكيد وإرسال
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentNotesLog;

