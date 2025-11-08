import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { 
  MessageCircle, 
  Smartphone, 
  Send, 
  Search, 
  Users,
  X,
  CheckCircle,
  AlertCircle,
  User,
  Loader,
  Filter,
  ChevronDown,
  Edit,
  Eye,
  Settings,
  ExternalLink
} from 'lucide-react';
import { usersAPI, authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';
import toast from 'react-hot-toast';

const BulkMessaging = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSmsConfirmModal, setShowSmsConfirmModal] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterSelected, setFilterSelected] = useState('all'); // 'all', 'selected', 'unselected'
  const [showFilters, setShowFilters] = useState(false);
  const [customMessages, setCustomMessages] = useState(new Map()); // Store custom messages per student
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingMessage, setEditingMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const searchRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all students
  const { data: allStudents, isLoading: studentsLoading } = useQuery(
    'allStudents',
    usersAPI.getMySchoolStudents,
    { enabled: !!user }
  );

  // Get unique classes for filter
  const uniqueClasses = React.useMemo(() => {
    if (!allStudents) return [];
    const classes = new Set();
    allStudents.forEach(student => {
      if (student.class_name) {
        classes.add(student.class_name);
      }
    });
    return Array.from(classes).sort();
  }, [allStudents]);

  // Filter students based on search and filters
  const filteredStudents = React.useMemo(() => {
    if (!allStudents) return [];
    
    let filtered = allStudents.filter(student => {
      // Search filter
      const matchesSearch = !searchTerm || 
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Class filter
      const matchesClass = !filterClass || student.class_name === filterClass;
      
      // Selected filter
      let matchesSelected = true;
      if (filterSelected === 'selected') {
        matchesSelected = selectedStudents.has(student.id);
      } else if (filterSelected === 'unselected') {
        matchesSelected = !selectedStudents.has(student.id);
      }
      
      return matchesSearch && matchesClass && matchesSelected;
    });
    
    return filtered;
  }, [allStudents, searchTerm, filterClass, filterSelected, selectedStudents]);

  // Filter students with phone numbers
  const studentsWithPhones = filteredStudents.filter(s => s.phone_number);

  // Handle student selection
  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedStudents.size === studentsWithPhones.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(studentsWithPhones.map(s => s.id)));
    }
  };

  // Format phone number
  const formatPhoneNumber = (phone) => {
    let phoneNumber = phone.replace(/[^0-9]/g, '');
    if (!phoneNumber.startsWith('968')) {
      if (phoneNumber.length === 8) {
        phoneNumber = '968' + phoneNumber;
      } else if (phoneNumber.length === 9 && phoneNumber.startsWith('9')) {
        phoneNumber = '968' + phoneNumber.substring(1);
      }
    }
    return phoneNumber;
  };

  // Generate personalized message for a student
  const generatePersonalizedMessage = (student) => {
    // Check if there's a custom message for this student
    if (customMessages.has(student.id)) {
      return customMessages.get(student.id);
    }
    const studentName = student.fullName || 'الطالب';
    return `${studentName}\n${message.trim()}`;
  };

  // Handle edit message for specific student
  const handleEditMessage = (student) => {
    setEditingStudentId(student.id);
    setEditingMessage(generatePersonalizedMessage(student));
    setShowEditModal(true);
  };

  // Save edited message
  const handleSaveEditedMessage = () => {
    if (editingStudentId && editingMessage.trim()) {
      setCustomMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(editingStudentId, editingMessage.trim());
        return newMap;
      });
      setShowEditModal(false);
      setEditingStudentId(null);
      setEditingMessage('');
      toast.success('تم حفظ الرسالة المعدلة');
    }
  };

  // Reset custom message for a student
  const handleResetMessage = (studentId) => {
    setCustomMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(studentId);
      return newMap;
    });
    toast.success('تم إعادة تعيين الرسالة');
  };

  // Handle SMS send
  const handleSendSms = () => {
    if (selectedStudents.size === 0) {
      toast.error('يرجى اختيار طالب واحد على الأقل');
      return;
    }

    if (!message.trim()) {
      toast.error('يرجى كتابة الرسالة');
      return;
    }

    const selectedStudentsData = Array.from(selectedStudents)
      .map(id => allStudents.find(s => s.id === id))
      .filter(s => s && s.phone_number);

    if (selectedStudentsData.length === 0) {
      toast.error('لا يوجد طلاب مختارين لديهم أرقام هواتف');
      return;
    }

    setShowSmsConfirmModal(true);
  };

  // Confirm and send SMS
  const confirmSendSms = () => {
    const selectedStudentsData = Array.from(selectedStudents)
      .map(id => allStudents.find(s => s.id === id))
      .filter(s => s && s.phone_number)
      .map(s => ({
        phone: formatPhoneNumber(s.phone_number),
        message: generatePersonalizedMessage(s)
      }));

    setIsSendingSms(true);
    sendBulkSmsMutation.mutate(selectedStudentsData);
  };

  // Get all messages preview
  const getAllMessagesPreview = () => {
    return selectedStudentsData.map(student => ({
      ...student,
      message: generatePersonalizedMessage(student),
      isCustom: customMessages.has(student.id)
    }));
  };

  // Handle single WhatsApp send
  const handleSendSingleWhatsApp = (student) => {
    if (!message.trim()) {
      toast.error('يرجى كتابة الرسالة');
      return;
    }

    if (!student.phone_number) {
      toast.error('الطالب لا يملك رقم هاتف');
      return;
    }

    const phoneNumber = formatPhoneNumber(student.phone_number);
    const personalizedMessage = generatePersonalizedMessage(student);
    const encodedMessage = encodeURIComponent(personalizedMessage);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    const whatsappUrl = isMobile 
      ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    // Open WhatsApp window - use noopener to avoid popup blocker
    const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Check if window was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      toast.error('تم حظر النوافذ المنبثقة. يرجى السماح للمتصفح بفتح النوافذ المنبثقة');
    } else {
      toast.success(`تم فتح WhatsApp للطالب ${student.fullName}`);
    }
  };


  // Send bulk SMS mutation
  const sendBulkSmsMutation = useMutation(
    (studentData) => authAPI.sendDailySmsReports(studentData),
    {
      onSuccess: (response) => {
        toast.success(response.message?.ar || 'تم إرسال الرسائل عبر SMS بنجاح');
        setIsSendingSms(false);
        setShowSmsConfirmModal(false);
        setSelectedStudents(new Set());
        setMessage('');
        setCustomMessages(new Map()); // Clear custom messages after sending
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في إرسال الرسائل عبر SMS');
        setIsSendingSms(false);
      },
    }
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get selected students data
  const selectedStudentsData = React.useMemo(() => {
    if (!allStudents) return [];
    return Array.from(selectedStudents)
      .map(id => allStudents.find(s => s.id === id))
      .filter(s => s && s.phone_number);
  }, [selectedStudents, allStudents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إرسال رسائل مخصصة</h1>
          <p className="text-gray-600">اختر عدة طلاب وأرسل لهم رسالة واحدة</p>
        </div>
      </div>

      {/* Message Input */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">الرسالة</h3>
        </div>
        <div className="card-body">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input"
            rows={6}
            placeholder="اكتب الرسالة هنا..."
            dir="rtl"
          />
          <div className="mt-2 text-sm text-gray-500">
            عدد الأحرف: {message.length}
          </div>
        

        {/* Action Buttons */}
      <div className="flex items-center justify-end mb-2 ml-2"> 
        <button
          onClick={handleSendSms}
          disabled={selectedStudents.size === 0 || !message.trim() || isSendingSms}
          className={`btn ${selectedStudents.size === 0 || !message.trim() ? 'btn-disabled bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300' : 'btn-primary'}`}
        >
          <Smartphone className="h-5 w-5 mr-2" />
          إرسال عبر SMS
        </button>
      </div></div>
      </div>

      {/* Student Selection */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">اختيار الطلاب</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="btn btn-sm btn-outline"
                disabled={studentsWithPhones.length === 0}
              >
                {selectedStudents.size === studentsWithPhones.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
              <span className="text-sm text-gray-600">
                ({selectedStudents.size} / {studentsWithPhones.length} مختار)
              </span>
            </div>
          </div>
        </div>
        <div className="card-body">
          {/* Search and Filters */}
          <div className="space-y-3 mb-4">
            {/* Search Bar */}
            <div className="relative" ref={searchRef}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowDropdown(searchTerm.length > 0)}
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
              {(filterClass || filterSelected !== 'all') && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {[filterClass && 'الصف', filterSelected !== 'all' && 'الحالة'].filter(Boolean).join('، ')}
                  </span>
                  <button
                    onClick={() => {
                      setFilterClass('');
                      setFilterSelected('all');
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    إلغاء الفلاتر
                  </button>
                </div>
              )}
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class Filter */}
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

                  {/* Selected Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحالة
                    </label>
                    <select
                      value={filterSelected}
                      onChange={(e) => setFilterSelected(e.target.value)}
                      className="input"
                    >
                      <option value="all">الكل</option>
                      <option value="selected">المختارون فقط</option>
                      <option value="unselected">غير المختارين</option>
                    </select>
                  </div>
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
          ) : studentsWithPhones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'لا توجد نتائج' : 'لا يوجد طلاب لديهم أرقام هواتف'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === studentsWithPhones.length && studentsWithPhones.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الطالب</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الصف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">رقم الهاتف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentsWithPhones.map((student) => (
                    <tr
                      key={student.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedStudents.has(student.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectStudent(student.id)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendSingleWhatsApp(student);
                            }}
                            disabled={!message.trim()}
                            className="btn btn-sm bg-green-500 text-white hover:bg-green-600"
                            title="إرسال عبر WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      

      {/* SMS Confirmation Modal */}
      <Modal
        isOpen={showSmsConfirmModal}
        onClose={() => {
          setShowSmsConfirmModal(false);
        }}
        title={`تأكيد إرسال SMS لـ ${selectedStudentsData.length} طالب`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Warning/Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">مراجعة جميع الرسائل قبل الإرسال:</p>
                <p className="text-xs text-blue-700">عدد الطلاب: {selectedStudentsData.length}</p>
                <p className="text-xs text-blue-700 mt-1">يمكنك تعديل رسالة أي طالب قبل الإرسال</p>
              </div>
            </div>
          </div>

          {/* SMS Configuration Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm text-yellow-800">
                <p className="font-medium mb-1">⚠️ تأكد من إعدادات SMS:</p>
                <ul className="list-disc list-inside text-xs text-yellow-700 space-y-1 mt-2">
                  <li>تم إعداد بيانات الاتصال (اسم المستخدم وكلمة المرور)</li>
                  <li>تم إعداد Sender ID (معرّف المرسل) وموافق عليه من مزود الخدمة</li>
                  <li>الرصيد كافٍ لإرسال الرسائل</li>
                  <li>تم اختبار الاتصال بنجاح من صفحة إعدادات SMS</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <button
                    onClick={() => {
                      setShowSmsConfirmModal(false);
                      navigate('/app/sms-configuration');
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-lg transition-colors duration-200"
                  >
                    <Settings className="h-4 w-4 ml-1.5" />
                    <span>فتح صفحة إعدادات SMS</span>
                    <ExternalLink className="h-3 w-3 mr-1.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* All Messages Overview */}
          <div className="bg-white border-2 border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">معاينة جميع الرسائل</h4>
                <span className="text-xs text-gray-500">
                  {customMessages.size > 0 && `${customMessages.size} رسالة معدلة`}
                </span>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">الطالب</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">الرسالة</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">عدد الأحرف</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getAllMessagesPreview().map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center ml-2">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
                            <div className="text-xs text-gray-500">{student.phone_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <pre className="whitespace-pre-wrap text-xs text-gray-700 font-medium" dir="rtl">
                            {student.message}
                          </pre>
                          {student.isCustom && (
                            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                              معدلة
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {student.message.length}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditMessage(student)}
                            className="text-primary-600 hover:text-primary-900 p-1.5 rounded hover:bg-primary-50 transition-colors"
                            title="تعديل الرسالة"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {student.isCustom && (
                            <button
                              onClick={() => handleResetMessage(student.id)}
                              className="text-gray-500 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="إعادة تعيين الرسالة"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowSmsConfirmModal(false)}
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
                  تأكيد وإرسال ({selectedStudentsData.length})
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Message Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStudentId(null);
          setEditingMessage('');
        }}
        title="تعديل رسالة الطالب"
        size="lg"
      >
        <div className="space-y-4">
          {editingStudentId && selectedStudentsData.find(s => s.id === editingStudentId) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">الطالب:</div>
              <div className="text-sm text-gray-900">
                {selectedStudentsData.find(s => s.id === editingStudentId)?.fullName}
              </div>
            </div>
          )}
          
          <div>
            <label className="label">الرسالة</label>
            <textarea
              value={editingMessage}
              onChange={(e) => setEditingMessage(e.target.value)}
              className="input"
              rows={8}
              placeholder="اكتب الرسالة المخصصة للطالب..."
              dir="rtl"
            />
            <div className="mt-2 text-sm text-gray-500">
              عدد الأحرف: {editingMessage.length}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingStudentId(null);
                setEditingMessage('');
              }}
              className="btn btn-outline"
            >
              إلغاء
            </button>
            <button
              onClick={handleSaveEditedMessage}
              disabled={!editingMessage.trim()}
              className="btn btn-primary"
            >
              حفظ التعديل
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default BulkMessaging;

