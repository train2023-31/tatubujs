import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Building, Edit, Trash2, ToggleLeft, ToggleRight, Eye, FileText, UserPlus, Search, Smartphone, Settings } from 'lucide-react';
import { classesAPI, authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Invoice from '../../components/UI/Invoice';
import SearchableSelect from '../../components/UI/SearchableSelect';
import SmsConfiguration from '../../components/UI/SmsConfiguration';
import SmsOperations from '../../components/UI/SmsOperations';
import toast from 'react-hot-toast';

const Schools = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSmsConfigModalOpen, setIsSmsConfigModalOpen] = useState(false);
  const [isSmsOperationsModalOpen, setIsSmsOperationsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch schools data
  const { data: schools, isLoading: schoolsLoading } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!user && user.role === 'admin' }
  );

  // Filter and sort schools data
  const filteredAndSortedSchools = React.useMemo(() => {
    if (!schools) return [];
    
    let filtered = schools;
    
    // Apply search filter
    if (searchFilter.trim()) {
      filtered = filtered.filter(school => 
        school.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (school.address && school.address.toLowerCase().includes(searchFilter.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(school => school.is_active === isActive);
    }
    
    // Sort by name in descending order (Z to A)
    return filtered.sort((a, b) => b.name.localeCompare(a.name, 'ar'));
  }, [schools, searchFilter, statusFilter]);

  // Fetch logs data for selected school
  const { data: logs, isLoading: logsLoading } = useQuery(
    ['logs', selectedSchool?.id],
    () => authAPI.viewLogs({ school_id: selectedSchool?.id }),
    { enabled: !!user && isLogsModalOpen && !!selectedSchool?.id }
  );

  // Create school mutation
  const createSchoolMutation = useMutation(
    (schoolData) => classesAPI.addSchool(schoolData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('schools');
        toast.success('تم إنشاء المدرسة بنجاح');
        setIsAddModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إنشاء المدرسة');
      },
    }
  );

  // Update school mutation
  const updateSchoolMutation = useMutation(
    (data) => classesAPI.updateSchool(data.schoolId, data.schoolData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('schools');
        toast.success('تم تحديث المدرسة بنجاح');
        setIsEditModalOpen(false);
        setSelectedSchool(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تحديث المدرسة');
      },
    }
  );

  // Toggle school status mutation
  const toggleSchoolStatusMutation = useMutation(
    (schoolId) => authAPI.toggleSchoolStatus(schoolId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('schools');
        toast.success('تم تحديث حالة المدرسة بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تحديث حالة المدرسة');
      },
    }
  );

  // Delete school data mutation
  const deleteSchoolDataMutation = useMutation(
    (options) => authAPI.deleteSchoolData(options),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('schools');
        toast.success('تم حذف بيانات المدرسة بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في حذف بيانات المدرسة');
      },
    }
  );

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      header: 'اسم المدرسة',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Building className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
            <p className="text-sm text-gray-500">{row.address}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'الحالة',
      render: (row) => (
        <span className={`badge ${row.is_active ? 'badge-success' : 'badge-danger'}`}>
          {row.is_active ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedSchool(row);
              setIsEditModalOpen(true);
            }}
            className="text-primary-600 hover:text-primary-900 mr-2 ml-2"
            title="تعديل المدرسة"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSchool(row);
              setIsLogsModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900 mr-2"
            title="عرض السجلات"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSchool(row);
              setIsInvoiceModalOpen(true);
            }}
            className="text-green-600 hover:text-green-900 mr-2"
            title="عرض الفاتورة"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSchool(row);
              setIsSmsConfigModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900 mr-2"
            title="إعدادات SMS"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSchool(row);
              setIsSmsOperationsModalOpen(true);
            }}
            className="text-indigo-600 hover:text-indigo-900 mr-2"
            title="إرسال تقارير SMS"
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedSchool(row);
              setIsAddUserModalOpen(true);
            }}
            className="text-purple-600 hover:text-purple-900 mr-2"
            title="إضافة مستخدم للمدرسة"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleSchoolStatusMutation.mutate(row.id)}
            className={`${row.is_active ? 'text-red-600 hover:text-red-900 mr-2' : 'text-green-600 hover:text-green-900 mr-2'}`}
            title={row.is_active ? 'تعطيل المدرسة' : 'تفعيل المدرسة'}
            disabled={toggleSchoolStatusMutation.isLoading}
          >
            {row.is_active ? <ToggleLeft className="h-4 w-4 mr-2" /> : <ToggleRight className="h-4 w-4 mr-2" />}
          </button>
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من حذف جميع بيانات هذه المدرسة؟')) {
                deleteSchoolDataMutation.mutate(['attendance', 'students', 'teachers', 'classes', 'subjects', 'news', 'logs']);
              }
            }}
            className="text-red-600 hover:text-red-900"
            title="حذف بيانات المدرسة"
            disabled={deleteSchoolDataMutation.isLoading}
          >
            <Trash2 className="h-4 w-4" />
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
          <h1 className="text-2xl font-bold text-gray-900">إدارة المدارس</h1>
          <p className="text-gray-600">إدارة المدارس وحالاتها</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          إضافة مدرسة جديدة
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث عن مدرسة بالاسم أو العنوان..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input mr-2 w-full sm:w-auto"
              >
                <option value="all">جميع المدارس</option>
                <option value="active">المدارس النشطة</option>
                <option value="inactive">المدارس غير النشطة</option>
              </select>
            </div>
            {(searchFilter || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchFilter('');
                  setStatusFilter('all');
                }}
                className="btn btn-outline btn-sm w-full sm:w-auto"
              >
                مسح جميع الفلاتر
              </button>
            )}
          </div>
          {(searchFilter || statusFilter !== 'all') && (
            <div className="mt-2 text-sm text-gray-600">
              عرض {filteredAndSortedSchools.length} من أصل {schools?.length || 0} مدرسة
              {searchFilter && (
                <span className="mr-2">• البحث: "{searchFilter}"</span>
              )}
              {statusFilter !== 'all' && (
                <span className="mr-2">• الحالة: {statusFilter === 'active' ? 'نشطة' : 'غير نشطة'}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredAndSortedSchools}
        columns={columns}
        loading={schoolsLoading}
        emptyMessage={searchFilter ? "لا توجد مدارس تطابق البحث" : "لا توجد مدارس"}
      />

      {/* Add School Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة مدرسة جديدة"
        size="lg"
      >
        <AddSchoolForm
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={createSchoolMutation.mutate}
          loading={createSchoolMutation.isLoading}
        />
      </Modal>

      {/* Edit School Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchool(null);
        }}
        title={`تعديل المدرسة: ${selectedSchool?.name}`}
        size="lg"
      >
        {selectedSchool && (
          <EditSchoolForm
            school={selectedSchool}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedSchool(null);
            }}
            onSubmit={updateSchoolMutation.mutate}
            loading={updateSchoolMutation.isLoading}
          />
        )}
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`سجلات المدرسة: ${selectedSchool?.name}`}
        size="full"
      >
        <LogsViewer
          logs={logs || []}
          loading={logsLoading}
        />
      </Modal>

      {/* Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedSchool(null);
        }}
        title={`فاتورة المدرسة: ${selectedSchool?.name}`}
        size="full"
        showCloseButton={true}
      >
        {selectedSchool && (
          <Invoice
            school={selectedSchool}
            onClose={() => {
              setIsInvoiceModalOpen(false);
              setSelectedSchool(null);
            }}
          />
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setSelectedSchool(null);
        }}
        title={`إضافة مستخدم جديد - ${selectedSchool?.name}`}
        size="lg"
      >
        {selectedSchool && (
          <AddUserForm
            school={selectedSchool}
            onClose={() => {
              setIsAddUserModalOpen(false);
              setSelectedSchool(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries('mySchoolUsers');
            }}
          />
        )}
      </Modal>

      {/* SMS Configuration Modal */}
      <SmsConfiguration
        isOpen={isSmsConfigModalOpen}
        onClose={() => {
          setIsSmsConfigModalOpen(false);
          setSelectedSchool(null);
        }}
        schoolId={selectedSchool?.id}
      />

      {/* SMS Operations Modal */}
      <SmsOperations
        isOpen={isSmsOperationsModalOpen}
        onClose={() => {
          setIsSmsOperationsModalOpen(false);
          setSelectedSchool(null);
        }}
        schoolId={selectedSchool?.id}
        selectedDate={new Date().toISOString().split('T')[0]}
      />
    </div>
  );
};

// Add School Form Component
const AddSchoolForm = ({ onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    password: '',
    is_active: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">اسم المدرسة</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">العنوان</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="input"
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
            placeholder="رقم هاتف المدرسة"
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">كلمة المرور الافتراضية</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input"
            required
            placeholder="كلمة المرور الافتراضية للمعلمين والطلاب"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">المدرسة نشطة</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
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
            'إضافة المدرسة'
          )}
        </button>
      </div>
    </form>
  );
};

// Edit School Form Component
const EditSchoolForm = ({ school, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone_number: '',
    password: '',
    is_active: true,
  });

  // Update form data when school prop changes
  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || '',
        address: school.address || '',
        phone_number: school.phone_number || '',
        password: school.password || '',
        is_active: school.is_active !== undefined ? school.is_active : true,
      });
    }
  }, [school]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      schoolId: school.id,
      schoolData: formData
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">اسم المدرسة</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">العنوان</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="input"
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
            placeholder="رقم هاتف المدرسة"
          />
        </div>
        <div>
          <label className="label">كلمة المرور الجديدة (اختياري)</label>
          <input
            type="text"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input"
            placeholder="اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">المدرسة نشطة</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4">
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
              <span className="mr-2">جاري التحديث...</span>
            </>
          ) : (
            'تحديث المدرسة'
          )}
        </button>
      </div>
    </form>
  );
};

// Logs Viewer Component
const LogsViewer = ({ logs, loading }) => {
  // Handle different data structures - logs might be an object with nested array
  let safeLogs = [];
  
  if (Array.isArray(logs)) {
    safeLogs = logs;
  } else if (logs && typeof logs === 'object') {
    // Check common nested structures
    safeLogs = logs.data || logs.logs || logs.results || logs.items || [];
  }
  

  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل السجلات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
   
      
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell text-right">المستخدم</th>
              <th className="table-header-cell text-right">الدور</th>
              <th className="table-header-cell text-right">الإجراء</th>
              <th className="table-header-cell text-right">الوصف</th>
              <th className="table-header-cell text-right">التاريخ</th>
              <th className="table-header-cell text-right">IP</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {safeLogs.map((log, index) => (
              <tr key={index}>
                <td className="table-cell">{log.user_name}</td>
                <td className="table-cell">
                  <span className="badge badge-info">{log.role}</span>
                </td>
                <td className="table-cell">{log.action_type}</td>
                <td className="table-cell">{log.description}</td>
                <td className="table-cell">{log.timestamp}</td>
                <td className="table-cell text-sm text-gray-500">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {safeLogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد سجلات</p>
        </div>
      )}
    </div>
  );
};

// Add User Form Component (reused from Users page)
const AddUserForm = ({ school, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phone_number: '',
    role: 'student',
    password: '',
    job_name: '',
    week_Classes_Number: '',
    school_id: school?.id || '',
  });
  const [emailValidation, setEmailValidation] = useState({ isValid: true, suggestion: null });

  // Email validation function
  const validateEmailFormat = (email) => {
    if (!email) return { isValid: true, suggestion: null };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidFormat = emailRegex.test(email);
    
    if (!isValidFormat) {
      const atIndex = email.indexOf('@');
      if (atIndex > 0) {
        const localPart = email.substring(0, atIndex);
        return {
          isValid: false,
          suggestion: `${localPart}@tatubu.com`
        };
      } else {
        return {
          isValid: false,
          suggestion: `${email}@tatubu.com`
        };
      }
    }
    
    if (!email.endsWith('@tatubu.com')) {
      const localPart = email.split('@')[0];
      return {
        isValid: false,
        suggestion: `${localPart}@tatubu.com`
      };
    }
    
    return { isValid: true, suggestion: null };
  };

  const addUserMutation = useMutation(
    (userData) => {
      // If current user is admin, they can use the general register endpoint
      if (user?.role === 'admin') {
        switch (userData.role) {
          case 'teacher':
            return authAPI.registerUser(userData);
          case 'student':
            return authAPI.registerStudents([userData]);
          case 'school_admin':
            return authAPI.registerUser(userData);
          case 'data_analyst':
            return authAPI.registerUser(userData);
          default:
            return authAPI.registerUser(userData);
        }
      }
      
      throw new Error('Unauthorized to add users');
    },
    {
      onSuccess: () => {
        toast.success('تم إضافة المستخدم بنجاح');
        onSuccess();
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إضافة المستخدم');
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate email before submission
    const emailValidation = validateEmailFormat(formData.email);
    if (!emailValidation.isValid) {
      setEmailValidation(emailValidation);
      toast.error('يرجى إدخال بريد إلكتروني صحيح ينتهي بـ @tatubu.com');
      return;
    }
    
    addUserMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Validate email when it changes
    if (name === 'email') {
      const validation = validateEmailFormat(value);
      setEmailValidation(validation);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">اسم المستخدم</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">البريد الإلكتروني</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`input ${!emailValidation.isValid ? 'border-red-500 focus:border-red-500' : ''}`}
            required
          />
          {!emailValidation.isValid && emailValidation.suggestion && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>اقتراح:</strong> هل تقصد{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, email: emailValidation.suggestion });
                    setEmailValidation({ isValid: true, suggestion: null });
                  }}
                  className="text-blue-600 underline hover:text-blue-800 font-medium"
                >
                  {emailValidation.suggestion}
                </button>
                ؟
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="label">الاسم الكامل</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className="input"
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
          />
        </div>
        <div>
          <label className="label">الدور</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="student">طالب</option>
            <option value="teacher">معلم</option>
            <option value="school_admin">مدير مدرسة</option>
            <option value="data_analyst">محلل بيانات</option>
          </select>
          
          {/* Role Description */}
          {formData.role && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-700">
                {formData.role === 'student' && (
                  <div>
                    <strong className="text-blue-600">طالب:</strong> يمكن للطالب تسجيل الدخول لعرض معلوماته الشخصية وتاريخ حضوره وغيابه.
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="mr-3">
                          <h3 className="text-sm font-medium text-amber-800">
                            ملاحظة مهمة
                          </h3>
                          <div className="mt-1 text-sm text-amber-700">
                            <p>عند إضافة الطالب من هنا، سيتم إضافته إلى قائمة الطلاب غير المعينين.</p>
                            <p className="mt-1">لتعيين الطالب لفصل معين، يجب الذهاب إلى <strong>إدارة الفصول</strong> واستخدام زر "تعيين طلاب" أو "إضافة طالب جديد".</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {formData.role === 'teacher' && (
                  <div>
                    <strong className="text-green-600">معلم:</strong> يمكن للمعلم تسجيل حضور الطلاب في فصوله، وعرض التقارير المتعلقة بفصوله، وإدارة ملفه الشخصي.
                  </div>
                )}
                {formData.role === 'school_admin' && (
                  <div>
                    <strong className="text-orange-600">مدير مدرسة:</strong> صلاحيات شاملة لإدارة المدرسة بما في ذلك إدارة المعلمين والطلاب والفصول، وعرض جميع التقارير والإحصائيات، وإرسال الإشعارات.
                  </div>
                )}
                {formData.role === 'data_analyst' && (
                  <div>
                    <strong className="text-purple-600">محلل بيانات:</strong> صلاحيات متقدمة لتحليل البيانات وعرض التقارير المفصلة والإحصائيات، مع إمكانية الوصول لجميع بيانات الحضور والغياب في المدرسة.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        {(formData.role === 'teacher' || formData.role === 'school_admin' || formData.role === 'data_analyst') && (
          <>
            <div>
              <label className="label">المادة التدرسية</label>
              <input
                type="text"
                name="job_name"
                value={formData.job_name}
                onChange={handleChange}
                className="input"
                placeholder={formData.role === 'school_admin' ? 'مدير مدرسة' : formData.role === 'data_analyst' ? 'محلل بيانات' : 'الوظيفة'}
                required={formData.role === 'teacher' || formData.role === 'data_analyst'}
              />
            </div>
            <div>
              <label className="label">عدد الحصص الأسبوعية</label>
              <input
                type="number"
                name="week_Classes_Number"
                value={formData.week_Classes_Number}
                onChange={handleChange}
                className="input"
                placeholder={formData.role === 'school_admin' ? '0' : ''}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline mr-2 ml-2"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={addUserMutation.isLoading}
          className="btn btn-primary"
        >
          {addUserMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري الإضافة...</span>
            </>
          ) : (
            'إضافة المستخدم'
          )}
        </button>
      </div>
    </form>
  );
};

export default Schools;

