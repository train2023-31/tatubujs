import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, BookOpen, Users, Edit, Trash2, UserPlus, Eye, UserMinus, UserCheck } from 'lucide-react';
import { classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Classes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState('classes');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [isRemoveStudentsModalOpen, setIsRemoveStudentsModalOpen] = useState(false);
  const [isAddNewStudentModalOpen, setIsAddNewStudentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Handle URL parameters on component mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['classes', 'subjects'].includes(tabFromUrl)) {
      setSelectedTab(tabFromUrl);
    }
  }, [searchParams]);

  // Fetch data
  const { data: classes, isLoading: classesLoading } = useQuery(
    'classes',
    classesAPI.getMyClasses,
    { enabled: !!user }
  );

  const { data: subjects, isLoading: subjectsLoading } = useQuery(
    'subjects',
    classesAPI.getAllSubjects,
    { enabled: !!user }
  );

  const { data: unassignedStudents, isLoading: studentsLoading } = useQuery(
    'unassignedStudents',
    classesAPI.getMySchoolStudents,
    { enabled: !!user }
  );

  // Fetch class students when viewing a specific class
  const { data: classStudents, isLoading: classStudentsLoading } = useQuery(
    ['classStudents', selectedItem?.id],
    () => classesAPI.getClassStudents(selectedItem.id),
    { 
      enabled: !!selectedItem?.id && (isViewStudentsModalOpen || isRemoveStudentsModalOpen)
    }
  );

  // Mutations
  const createClassMutation = useMutation(
    (classData) => classesAPI.createClass(classData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        toast.success('تم إنشاء الفصل بنجاح');
        setIsAddModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إنشاء الفصل');
      },
    }
  );

  const createSubjectMutation = useMutation(
    (subjectData) => classesAPI.createSubject(subjectData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subjects');
        toast.success('تم إنشاء المادة بنجاح');
        setIsAddModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إنشاء المادة');
      },
    }
  );

  const assignStudentsMutation = useMutation(
    (data) => classesAPI.assignStudents(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        queryClient.invalidateQueries('unassignedStudents');
        toast.success('تم تعيين الطلاب بنجاح');
        setIsAssignModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تعيين الطلاب');
      },
    }
  );

  const removeStudentsMutation = useMutation(
    (data) => classesAPI.removeStudents(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        queryClient.invalidateQueries('unassignedStudents');
        queryClient.invalidateQueries(['classStudents', selectedItem?.id]);
        toast.success('تم نقل الطلاب إلى قائمة غير المعينين بنجاح');
        setIsRemoveStudentsModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في نقل الطلاب');
      },
    }
  );

  const addNewStudentMutation = useMutation(
    (data) => classesAPI.addNewStudent(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        queryClient.invalidateQueries('unassignedStudents');
        queryClient.invalidateQueries(['classStudents', selectedItem?.id]);
        toast.success('تم إضافة الطالب الجديد بنجاح');
        setIsAddNewStudentModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إضافة الطالب الجديد');
      },
    }
  );

  const tabs = [
    { id: 'classes', name: 'الفصول', count: classes?.length || 0 },
    { id: 'subjects', name: 'المواد', count: subjects?.length || 0 },
  ];

  const getCurrentData = () => {
    switch (selectedTab) {
      case 'subjects':
        return subjects?.sort((a, b) => a.id - b.id) || [];
      default:
        return classes?.sort((a, b) => a.id - b.id) || [];
    }
  };

  const getCurrentLoading = () => {
    switch (selectedTab) {
      case 'subjects':
        return subjectsLoading;
      default:
        return classesLoading;
    }
  };

  // Classes columns
  const classesColumns = [
    {
      key: 'name',
      header: 'اسم الفصل',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'teacher_name',
      header: 'المعلم',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <span className="mr-2 text-sm text-gray-900">{row.teacher_name}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedItem(row);
              setIsViewStudentsModalOpen(true);
            }}
            className="flex items-center text-green-600 hover:text-green-900 text-sm px-2 py-1 rounded border border-green-200 hover:bg-green-50 transition-colors"
            title="عرض الطلاب"
          >
            <Eye className="h-4 w-4 ml-1" />
            عرض الطلاب
          </button>
          <button
            onClick={() => {
              setSelectedItem(row);
              setIsAddNewStudentModalOpen(true);
            }}
            className="flex items-center text-emerald-600 hover:text-emerald-900 text-sm px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-50 transition-colors"
            title="إضافة طالب جديد"
          >
            <UserCheck className="h-4 w-4 ml-1" />
            إضافة طالب جديد
          </button>
          <button
            onClick={() => {
              setSelectedItem(row);
              setIsAssignModalOpen(true);
            }}
            className="flex items-center text-blue-600 hover:text-blue-900 text-sm px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
            title="تعيين طلاب"
          >
            <UserPlus className="h-4 w-4 ml-1" />
            تعيين طلاب
          </button>
          
          <button
            onClick={() => {
              setSelectedItem(row);
              setIsRemoveStudentsModalOpen(true);
            }}
            className="flex items-center text-orange-600 hover:text-orange-900 text-sm px-2 py-1 rounded border border-orange-200 hover:bg-orange-50 transition-colors"
            title="نقل إلى غير المعينين"
          >
            <UserMinus className="h-4 w-4 ml-1" />
            نقل طلاب
          </button>
          <button
            onClick={() => {
              setSelectedItem(row);
              setIsEditModalOpen(true);
            }}
            className="flex items-center text-primary-600 hover:text-primary-900 text-sm px-2 py-1 rounded border border-primary-200 hover:bg-primary-50 transition-colors"
            title="تعديل"
          >
            <Edit className="h-4 w-4 ml-1" />
            تعديل
          </button>
        </div>
      ),
    },
  ];

  // Subjects columns
  const subjectsColumns = [
    {
      key: 'name',
      header: 'اسم المادة',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-green-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'teacher_name',
      header: 'المعلم',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <span className="mr-2 text-sm text-gray-900">{row.teacher_name}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (row) => (
        <div className="flex items-center">
          <button
            onClick={() => {
              setSelectedItem(row);
              setIsEditModalOpen(true);
            }}
            className="flex items-center text-primary-600 hover:text-primary-900 text-sm px-2 py-1 rounded border border-primary-200 hover:bg-primary-50 transition-colors"
            title="تعديل"
          >
            <Edit className="h-4 w-4 ml-1" />
            تعديل
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الفصول والمواد</h1>
          <p className="text-gray-600">إدارة فصول الدراسة والمواد التعليمية</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          إضافة {selectedTab === 'subjects' ? 'مادة جديدة' : 'فصل جديد'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTab(tab.id);
                // Update URL parameters
                setSearchParams({ tab: tab.id });
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Data Table */}
      <DataTable
        data={getCurrentData()}
        columns={selectedTab === 'subjects' ? subjectsColumns : classesColumns}
        loading={getCurrentLoading()}
        emptyMessage={`لا توجد ${selectedTab === 'subjects' ? 'مواد' : 'فصول'}`}
      />

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`إضافة ${selectedTab === 'subjects' ? 'مادة جديدة' : 'فصل جديد'}`}
      >
        {selectedTab === 'subjects' ? (
          <AddSubjectForm
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={createSubjectMutation.mutate}
            loading={createSubjectMutation.isLoading}
            existingSubjects={subjects || []}
          />
        ) : (
          <AddClassForm
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={createClassMutation.mutate}
            loading={createClassMutation.isLoading}
          />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل"
      >
        {selectedItem && (
          <EditForm
            item={selectedItem}
            type={selectedTab}
            onClose={() => setIsEditModalOpen(false)}
          />
        )}
      </Modal>

      {/* Assign Students Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تعيين طلاب للفصل"
        size="lg"
      >
        {selectedItem && (
          <AssignStudentsForm
            classData={selectedItem}
            students={unassignedStudents || []}
            onClose={() => setIsAssignModalOpen(false)}
            onSubmit={assignStudentsMutation.mutate}
            loading={assignStudentsMutation.isLoading}
          />
        )}
      </Modal>

      {/* View Class Students Modal */}
      <Modal
        isOpen={isViewStudentsModalOpen}
        onClose={() => setIsViewStudentsModalOpen(false)}
        title={`طلاب فصل ${selectedItem?.name || ''}`}
        size="lg"
      >
        {selectedItem && (
          <ViewClassStudentsForm
            classData={selectedItem}
            students={classStudents || []}
            loading={classStudentsLoading}
            onClose={() => setIsViewStudentsModalOpen(false)}
          />
        )}
      </Modal>

      {/* Remove Students Modal */}
      <Modal
        isOpen={isRemoveStudentsModalOpen}
        onClose={() => setIsRemoveStudentsModalOpen(false)}
        title={`نقل طلاب من فصل ${selectedItem?.name || ''}`}
        size="lg"
      >
        {selectedItem && (
          <RemoveStudentsForm
            classData={selectedItem}
            students={classStudents || []}
            loading={classStudentsLoading}
            onClose={() => setIsRemoveStudentsModalOpen(false)}
            onSubmit={removeStudentsMutation.mutate}
            submitLoading={removeStudentsMutation.isLoading}
          />
        )}
      </Modal>

      {/* Add New Student Modal */}
      <Modal
        isOpen={isAddNewStudentModalOpen}
        onClose={() => setIsAddNewStudentModalOpen(false)}
        title={`إضافة طالب جديد لفصل ${selectedItem?.name || ''}`}
        size="lg"
      >
        {selectedItem && (
          <AddNewStudentForm
            classData={selectedItem}
            onClose={() => setIsAddNewStudentModalOpen(false)}
            onSubmit={addNewStudentMutation.mutate}
            loading={addNewStudentMutation.isLoading}
          />
        )}
      </Modal>
    </div>
  );
};

// Add Class Form
const AddClassForm = ({ onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">اسم الفصل</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input"
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري الإضافة...</span>
            </>
          ) : (
            'إضافة الفصل'
          )}
        </button>
      </div>
    </form>
  );
};

// Add Subject Form
const AddSubjectForm = ({ onClose, onSubmit, loading, existingSubjects = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
  });
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Common subject suggestions
  const subjectSuggestions = [
    'اللغة العربية',
    'اللغة الإنجليزية',
    'التربية الإسلامية',
    'الرياضيات',
    'العلوم',
    'أحياء',
    'فيزياء',
    'كيمياء',
    'الدراسات الاجتماعية',
    'الجغرافيا',
    'هذا وطني',
    'تقنية المعلومات / الحاسب الآلي',
    'الفنون التشكيلية',
    'المهارات الموسيقية',
    'الرياضة المدرسية',
    'حصة إحتياط'
  ];

  // Normalize Arabic text for comparison (treat ا and أ as same)
  const normalizeArabicText = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/أ/g, 'ا')  // Replace أ with ا
      .replace(/إ/g, 'ا')  // Replace إ with ا
      .replace(/آ/g, 'ا')  // Replace آ with ا
      .replace(/ة/g, 'ه')  // Replace ة with ه
      .replace(/ى/g, 'ي'); // Replace ى with ي
  };

  // Validation function to check if subject already exists
  const isSubjectExists = (subjectName) => {
    const normalizedInput = normalizeArabicText(subjectName);
    return existingSubjects.some(subject => 
      normalizeArabicText(subject.name) === normalizedInput
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    
    const subjectName = formData.name.trim();
    
    if (!subjectName) {
      setValidationError('يرجى إدخال اسم المادة');
      return;
    }
    
    if (isSubjectExists(subjectName)) {
      setValidationError('هذه المادة موجودة بالفعل');
      return;
    }
    
    onSubmit({ name: subjectName });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (!selectedSuggestions.includes(suggestion) && !isSubjectExists(suggestion)) {
      setSelectedSuggestions([...selectedSuggestions, suggestion]);
    }
  };

  const handleRemoveSuggestion = (suggestion) => {
    setSelectedSuggestions(selectedSuggestions.filter(s => s !== suggestion));
  };

  const handleAddSelectedSuggestions = () => {
    // Filter out suggestions that already exist
    const validSuggestions = selectedSuggestions.filter(suggestion => 
      !isSubjectExists(suggestion)
    );
    
    if (validSuggestions.length === 0) {
      setValidationError('جميع المواد المحددة موجودة بالفعل');
      return;
    }
    
    validSuggestions.forEach(suggestion => {
      onSubmit({ name: suggestion });
    });
    setSelectedSuggestions([]);
    setShowSuggestions(false);
  };

  const filteredSuggestions = subjectSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(formData.name.toLowerCase()) && 
    !selectedSuggestions.includes(suggestion) &&
    !isSubjectExists(suggestion)
  );

  return (
    <div className="space-y-6">
      {/* Manual Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">اسم المادة</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`input ${validationError ? 'border-red-500' : ''}`}
            placeholder="أدخل اسم المادة"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          
          {/* Validation Error */}
          {validationError && (
            <div className="mt-1 text-sm text-red-600">
              {validationError}
            </div>
          )}
          
          {/* Suggestions Dropdown */}
          {showSuggestions && formData.name && filteredSuggestions.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, 8).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name.trim()}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="mr-2">جاري الإضافة...</span>
              </>
            ) : (
              'إضافة المادة'
            )}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">أو</span>
        </div>
      </div>

      {/* Suggestions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">اختر من الاقتراحات</h3>
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showSuggestions ? 'إخفاء الاقتراحات' : 'عرض الاقتراحات'}
          </button>
        </div>

        {showSuggestions && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {subjectSuggestions.map((suggestion, index) => {
              const isExisting = isSubjectExists(suggestion);
              const isSelected = selectedSuggestions.includes(suggestion);
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isSelected || isExisting}
                  className={`p-2 text-sm rounded-lg border text-center transition-colors relative ${
                    isSelected
                      ? 'bg-primary-100 border-primary-300 text-primary-700 cursor-not-allowed'
                      : isExisting
                      ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary-300'
                  }`}
                >
                  {suggestion}
                  {isExisting && (
                    <span className="absolute top-1 left-1 text-xs text-gray-400">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Suggestions */}
        {selectedSuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">
                المواد المحددة ({selectedSuggestions.length})
              </h4>
              <button
                type="button"
                onClick={() => setSelectedSuggestions([])}
                className="text-xs text-red-600 hover:text-red-700"
              >
                مسح الكل
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
                >
                  <span className="mr-2">{suggestion}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSuggestion(suggestion)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddSelectedSuggestions}
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الإضافة...</span>
                </>
              ) : (
                `إضافة ${selectedSuggestions.length} مادة`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Edit Form
const EditForm = ({ item, type, onClose }) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
  });

  const editMutation = useMutation(
    (data) => {
      if (type === 'subjects') {
        return classesAPI.updateSubject({ lists: [{ id: item.id, name: data.name }] });
      } else {
        return classesAPI.updateClasses({ lists: [{ id: item.id, name: data.name }] });
      }
    },
    {
      onSuccess: () => {
        toast.success('تم التحديث بنجاح');
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في التحديث');
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    editMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">الاسم</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input"
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={editMutation.isLoading}
          className="btn btn-primary"
        >
          {editMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري التحديث...</span>
            </>
          ) : (
            'تحديث'
          )}
        </button>
      </div>
    </form>
  );
};

// Assign Students Form
const AssignStudentsForm = ({ classData, students, onClose, onSubmit, loading }) => {
  const [selectedStudents, setSelectedStudents] = useState([]);

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      toast.error('يرجى اختيار طالب واحد على الأقل');
      return;
    }
    onSubmit({
      class_id: classData.id,
      student_ids: selectedStudents,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          تعيين طلاب لفصل: {classData.name}
        </h3>
        
        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            لا توجد طلاب غير معينين
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {students.map((student) => (
              <label
                key={student.id}
                className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => handleStudentToggle(student.id)}
                  className="mr-3"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                  {student.phone_number && (
                    <p className="text-sm text-gray-500">{student.phone_number}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading || selectedStudents.length === 0}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري التعيين...</span>
            </>
          ) : (
            `تعيين ${selectedStudents.length} طالب`
          )}
        </button>
      </div>
    </form>
  );
};

// View Class Students Form
const ViewClassStudentsForm = ({ classData, students, loading, onClose }) => {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          طلاب فصل: {classData.name}
        </h3>
        
        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            لا يوجد طلاب معينين في هذا الفصل
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                  {student.phone_number && (
                    <p className="text-sm text-gray-500">{student.phone_number}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};

// Remove Students Form
const RemoveStudentsForm = ({ classData, students, loading, onClose, onSubmit, submitLoading }) => {
  const [selectedStudents, setSelectedStudents] = useState([]);

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      toast.error('يرجى اختيار طالب واحد على الأقل');
      return;
    }
    onSubmit({
      class_id: classData.id,
      student_ids: selectedStudents,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          نقل طلاب من فصل: {classData.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          سيتم نقل الطلاب المحددين إلى قائمة الطلاب غير المعينين
        </p>
        
        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            لا يوجد طلاب معينين في هذا الفصل
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {students.map((student) => (
              <label
                key={student.id}
                className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={() => handleStudentToggle(student.id)}
                  className="mr-3"
                />
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                  {student.phone_number && (
                    <p className="text-sm text-gray-500">{student.phone_number}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={submitLoading || selectedStudents.length === 0}
          className="btn btn-warning"
        >
          {submitLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري النقل...</span>
            </>
          ) : (
            `نقل ${selectedStudents.length} طالب`
          )}
        </button>
      </div>
    </form>
  );
};

// Add New Student Form
const AddNewStudentForm = ({ classData, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone_number: '',
    email: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.username || !formData.fullName) {
      toast.error('يرجى إدخال اسم المستخدم والاسم الكامل');
      return;
    }

    // Prepare data for the API
    const studentData = {
      class_id: classData.id,
      student: {
        username: formData.username,
        fullName: formData.fullName,
        phone_number: formData.phone_number || null,
        email: formData.email || formData.username, // Use username as email if not provided
      }
    };

    onSubmit(studentData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          إضافة طالب جديد لفصل: {classData.name}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">اسم المستخدم *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              placeholder="أدخل اسم المستخدم"
              required
            />
          </div>

          <div>
            <label className="label">الاسم الكامل *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="input"
              placeholder="أدخل الاسم الكامل"
              required
            />
          </div>

          <div>
            <label className="label">رقم الهاتف</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              className="input"
              placeholder="أدخل رقم الهاتف (اختياري)"
            />
          </div>

          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="أدخل البريد الإلكتروني (اختياري)"
            />
            <p className="text-xs text-gray-500 mt-1">
              إذا لم يتم إدخال البريد الإلكتروني، سيتم استخدام اسم المستخدم
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading || !formData.username || !formData.fullName}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري الإضافة...</span>
            </>
          ) : (
            'إضافة الطالب'
          )}
        </button>
      </div>
    </form>
  );
};

export default Classes;



