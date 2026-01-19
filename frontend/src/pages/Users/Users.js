import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, UserPlus, Users as UsersIcon, Eye } from 'lucide-react';
import { usersAPI, authAPI, classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDisplayName, getRoleColor, formatPhoneNumber } from '../../utils/helpers';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import SearchableSelect from '../../components/UI/SearchableSelect';
import Tabs from '../../components/UI/Tabs';
import toast from 'react-hot-toast';

// Email validation function
const validateEmailFormat = (email) => {
  if (!email) return { isValid: true, suggestion: null };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidFormat = emailRegex.test(email);
  
  if (!isValidFormat) {
    // Extract the part before @ if it exists
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
  
  // Check if it ends with @tatubu.com
  if (!email.endsWith('@tatubu.com')) {
    const localPart = email.split('@')[0];
    return {
      isValid: false,
      suggestion: `${localPart}@tatubu.com`
    };
  }
  
  return { isValid: true, suggestion: null };
};

const Users = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    jobName: '',
    sortBy: 'fullName',
    sortOrder: 'asc'
  });

  // Fetch users data - using only my-school endpoint
  const { data: allUsers, isLoading: usersLoading } = useQuery(
    'mySchoolUsers',
    usersAPI.getMySchoolUsers,
    {
      enabled: !!user,
      retry: 3, // Retry more on mobile networks
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
      staleTime: 30000, // Cache for 30 seconds to reduce mobile network usage
      refetchOnMount: true, // Always fetch fresh data
      refetchOnReconnect: true, // Refetch when connection restored
    }
  );

  // Fetch individual user details
  const { data: userDetails, isLoading: userDetailsLoading } = useQuery(
    ['userDetails', selectedUser?.id],
    () => authAPI.getUserById(selectedUser.id),
    {
      enabled: !!selectedUser?.id && isViewModalOpen,
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId) => authAPI.deleteUser(userId),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('mySchoolUsers');
        const message = response.data?.message || 'تم حذف المستخدم بنجاح';
        toast.success(message);
      },
      onError: (error) => {
        const errorData = error.response?.data;
        let errorMessage = 'فشل في حذف المستخدم';
        
        if (errorData?.message) {
          errorMessage = errorData.message;
          
          // If there are additional details, show them in a more detailed toast
          if (errorData.details) {
            const details = errorData.details;
            let detailMessage = '';
            
            if (details.reason === 'معلم مرتبط بفصول دراسية') {
              detailMessage = `المعلم مرتبط بـ ${details.associated_classes_count} فصل دراسي`;
            } else if (details.reason === 'طالب لديه سجلات حضور') {
              detailMessage = `الطالب لديه ${details.attendance_records_count} سجل حضور`;
            } else if (details.reason === 'مستخدم لديه سجلات في النظام') {
              detailMessage = `المستخدم لديه ${details.logs_count} سجل في النظام`;
            }
            
            if (detailMessage) {
              errorMessage += `\n${detailMessage}`;
            }
          }
        }
        
        toast.error(errorMessage, {
          duration: 6000, // Show longer for detailed messages
          style: {
            whiteSpace: 'pre-line', // Allow line breaks
            maxWidth: '500px'
          }
        });
      },
    }
  );

  // Get current data based on selected tab - filter from single API response
  const getCurrentData = () => {
    if (!allUsers) return [];
    
    switch (selectedTab) {
      case 'teachers':
        return allUsers.filter(user => user.role === 'teacher');
      case 'students':
        return allUsers.filter(user => user.role === 'student');
      case 'drivers':
        return allUsers.filter(user => user.role === 'driver');
      default:
        return allUsers;
    }
  };

  const getCurrentLoading = () => {
    return usersLoading;
  };

  // Reset filters when tab changes
  useEffect(() => {
    setFilters({
      role: '',
      status: '',
      jobName: '',
      sortBy: 'fullName',
      sortOrder: 'asc'
    });
  }, [selectedTab]);

  // Filter and sort data based on search term and filters
  const filteredData = getCurrentData()
    .filter((user) => {
      // Search term filter
      const matchesSearch = !searchTerm || 
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.job_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter (only apply if not already filtered by tab)
      const matchesRole = !filters.role || user.role === filters.role;
      
      // Status filter
      const matchesStatus = !filters.status || 
        (filters.status === 'active' && user.is_active) ||
        (filters.status === 'inactive' && !user.is_active);
      
      // Job name filter (only relevant for teachers and data analysts)
      const matchesJobName = !filters.jobName || 
        user.job_name?.toLowerCase().includes(filters.jobName.toLowerCase());
      
      return matchesSearch && matchesRole && matchesStatus && matchesJobName;
    })
    .sort((a, b) => {
      const aValue = a[filters.sortBy] || '';
      const bValue = b[filters.sortBy] || '';
      
      if (filters.sortOrder === 'asc') {
        return aValue.toString().localeCompare(bValue.toString(), 'ar');
      } else {
        return bValue.toString().localeCompare(aValue.toString(), 'ar');
      }
    });

  // Table columns configuration
  const columns = [
    {
      key: 'fullName',
      header: 'الاسم الكامل',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
            <UsersIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900">{row.fullName}</p>
            <p className="text-sm text-gray-500">{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      render: (row) => (
        <div>
          <p className="text-sm text-gray-900">{row.email}</p>
          {row.phone_number && (
            <p className="text-sm text-gray-500">{formatPhoneNumber(row.phone_number)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'الدور',
      render: (row) => (
        <div>
          <span className={`badge ${getRoleColor(row.role)}`}>
            {getRoleDisplayName(row.role)}
          </span>
          {row.role === 'teacher' && row.job_name && (
            <p className="text-xs text-gray-500 mt-1">{row.job_name}</p>
          )}
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
          {/* <button
            onClick={() => {
              setSelectedUser(row);
              setIsViewModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900 ml-2"
            title="عرض التفاصيل"
          >
            <Eye className="h-4 w-4" />
          </button> */}
          <button
            onClick={() => {
              setSelectedUser(row);
              setIsEditModalOpen(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="تعديل"
          >
            <Edit className="h-4 w-4 ml-2" />
          </button>
          <button
            onClick={() => {
              const confirmMessage = `هل أنت متأكد من حذف المستخدم "${row.fullName}"؟\n\nملاحظة: لا يمكن حذف المستخدمين الذين لديهم سجلات مرتبطة (فصول دراسية، سجلات حضور، إلخ)`;
              if (window.confirm(confirmMessage)) {
                deleteUserMutation.mutate(row.id);
              }
            }}
            className="text-red-600 hover:text-red-900"
            title="حذف"
            disabled={deleteUserMutation.isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const tabs = [
    { id: 'all', name: 'جميع المستخدمين', count: allUsers?.length || 0 },
    { id: 'teachers', name: 'المعلمين', count: allUsers?.filter(user => user.role === 'teacher').length || 0 },
    { id: 'students', name: 'الطلاب', count: allUsers?.filter(user => user.role === 'student').length || 0 },
    { id: 'drivers', name: 'السائقين', count: allUsers?.filter(user => user.role === 'driver').length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-gray-600">إدارة المعلمين والطلاب في المدرسة</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          إضافة مستخدم جديد
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        variant="modern"
        className="mb-6"
      />

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
            selectedTab === 'students' ? 'lg:grid-cols-4' : 'lg:grid-cols-6'
          }`}>
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="label">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    selectedTab === 'teachers' 
                      ? 'البحث في المعلمين (الاسم، المادة، البريد الإلكتروني)...'
                      : selectedTab === 'students'
                      ? 'البحث في الطلاب (الاسم، اسم المستخدم، البريد الإلكتروني)...'
                      : 'البحث في الاسم، اسم المستخدم، البريد الإلكتروني...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>

            {/* Role Filter - Dynamic based on selected tab */}
            <div>
              <label className="label">الدور</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({...filters, role: e.target.value})}
                className="input"
                disabled={selectedTab !== 'all'}
              >
                {selectedTab === 'all' ? (
                  <>
                    <option value="">جميع الأدوار</option>
                    <option value="teacher">معلم</option>
                    <option value="student">طالب</option>
                    <option value="school_admin">مدير مدرسة</option>
                    <option value="data_analyst">محلل بيانات</option>
                  </>
                ) : selectedTab === 'teachers' ? (
                  <>
                    <option value="">جميع المعلمين</option>
                    <option value="teacher">معلم</option>
                    <option value="school_admin">مدير مدرسة</option>
                    <option value="data_analyst">محلل بيانات</option>
                  </>
                ) : selectedTab === 'students' ? (
                  <>
                    <option value="">جميع الطلاب</option>
                    <option value="student">طالب</option>
                  </>
                ) : selectedTab === 'drivers' ? (
                  <>
                    <option value="">جميع السائقين</option>
                    <option value="driver">سائق</option>
                  </>
                ) : null}
              </select>
              {selectedTab !== 'all' && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedTab === 'teachers' ? 'محدد تلقائياً للمعلمين' : 'محدد تلقائياً للطلاب'}
                </p>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <label className="label">الحالة</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="input"
              >
                <option value="">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>

            {/* Job Name Filter - Only show for teachers tab or all tab */}
            {(selectedTab === 'all' || selectedTab === 'teachers') && (
              <div>
                <label className="label">
                  {selectedTab === 'teachers' ? 'المادة التدرسية' : 'الوظيفة/المادة'}
                </label>
                <input
                  type="text"
                  placeholder={selectedTab === 'teachers' ? 'البحث في المادة التدرسية...' : 'البحث في الوظيفة...'}
                  value={filters.jobName}
                  onChange={(e) => setFilters({...filters, jobName: e.target.value})}
                  className="input"
                />
              </div>
            )}

            {/* Sort Options */}
            <div>
              <label className="label">ترتيب حسب</label>
              <div className="flex space-x-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                  className="input flex-1"
                >
                  <option value="fullName">الاسم</option>
                  <option value="username">اسم المستخدم</option>
                  <option value="email">البريد الإلكتروني</option>
                  <option value="role">الدور</option>
                  <option value="job_name">الوظيفة</option>
                </select>
                <button
                  onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                  className="btn btn-outline px-3"
                  title={filters.sortOrder === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
                >
                  {filters.sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || filters.role || filters.status || filters.jobName) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">الفلاتر النشطة:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    البحث: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mr-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.role && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    الدور: {getRoleDisplayName(filters.role)}
                    <button
                      onClick={() => setFilters({...filters, role: ''})}
                      className="mr-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    الحالة: {filters.status === 'active' ? 'نشط' : 'غير نشط'}
                    <button
                      onClick={() => setFilters({...filters, status: ''})}
                      className="mr-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.jobName && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    الوظيفة: "{filters.jobName}"
                    <button
                      onClick={() => setFilters({...filters, jobName: ''})}
                      className="mr-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Filters - Context aware based on selected tab */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center flex-wrap gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">فلتر سريع:</span>
              
              {selectedTab === 'all' && (
                <>
                  <button
                    onClick={() => setFilters({...filters, role: 'teacher'})}
                    className="btn btn-outline btn-sm"
                  >
                    المعلمين فقط
                  </button>
                  <button
                    onClick={() => setFilters({...filters, role: 'student'})}
                    className="btn btn-outline btn-sm"
                  >
                    الطلاب فقط
                  </button>
                  <button
                    onClick={() => setFilters({...filters, role: 'school_admin'})}
                    className="btn btn-outline btn-sm"
                  >
                    مدراء المدارس
                  </button>
                  <button
                    onClick={() => setFilters({...filters, role: 'data_analyst'})}
                    className="btn btn-outline btn-sm"
                  >
                    محللي البيانات
                  </button>
                </>
              )}
              
              {selectedTab === 'teachers' && (
                <>
                  <button
                    onClick={() => setFilters({...filters, role: 'teacher'})}
                    className="btn btn-outline btn-sm"
                  >
                    المعلمين العاديين
                  </button>
                  <button
                    onClick={() => setFilters({...filters, role: 'school_admin'})}
                    className="btn btn-outline btn-sm"
                  >
                    مدراء المدارس
                  </button>
                  <button
                    onClick={() => setFilters({...filters, role: 'data_analyst'})}
                    className="btn btn-outline btn-sm"
                  >
                    محللي البيانات
                  </button>
                </>
              )}
              
              {/* Status filters - available for all tabs */}
              <button
                onClick={() => setFilters({...filters, status: 'active'})}
                className="btn btn-outline btn-sm"
              >
                النشطين فقط
              </button>
              <button
                onClick={() => setFilters({...filters, status: 'inactive'})}
                className="btn btn-outline btn-sm"
              >
                غير النشطين
              </button>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>عدد النتائج: <strong className="text-gray-900">{filteredData.length}</strong></span>
                {(searchTerm || filters.role || filters.status || filters.jobName) && (
                  <span>من أصل <strong className="text-gray-900">{getCurrentData().length}</strong> مستخدم</span>
                )}
                {selectedTab !== 'all' && (
                  <span className="text-blue-600">
                    (محدد تلقائياً: {selectedTab === 'teachers' ? 'المعلمين' : 'الطلاب'})
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    role: '',
                    status: '',
                    jobName: '',
                    sortBy: 'fullName',
                    sortOrder: 'asc'
                  });
                }}
                className="btn btn-outline btn-sm"
              >
                مسح جميع الفلاتر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        loading={getCurrentLoading()}
        emptyMessage="لا توجد مستخدمين"
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة مستخدم جديد"
        size="lg"
      >
        <AddUserForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries('mySchoolUsers');
          }}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل المستخدم"
        size="lg"
      >
        {selectedUser && (
          <EditUserForm
            user={selectedUser}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries('mySchoolUsers');
            }}
          />
        )}
      </Modal>

      {/* View User Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
        title="تفاصيل المستخدم"
        size="lg"
      >
        {selectedUser && (
          <ViewUserDetails
            user={selectedUser}
            userDetails={userDetails}
            loading={userDetailsLoading}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

// Add User Form Component
const AddUserForm = ({ onClose, onSuccess }) => {
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
    school_id: '',
  });
  const [emailValidation, setEmailValidation] = useState({ isValid: true, suggestion: null });

  // Fetch schools data for admin users
  const { data: schools } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!user && user.role === 'admin' }
  );

  const addUserMutation = useMutation(
    (userData) => {
      // If current user is school_admin, they can add teachers, students, data_analyst, and drivers
      if (user?.role === 'school_admin') {
        switch (userData.role) {
          case 'teacher':
            return authAPI.registerTeacher(userData);
          case 'student':
            return authAPI.registerStudents([userData]);
          case 'data_analyst':
            return authAPI.registerDataAnalyst(userData);
          case 'driver':
            return authAPI.registerDriver(userData); // Use general register for drivers
          default:
            throw new Error('School admin can only add teachers, students, data analysts, and drivers');
        }
      }
      
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
          case 'driver':
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
            {user?.role === 'admin' ? (
              <>
                <option value="student">طالب</option>
                <option value="teacher">معلم</option>
                <option value="school_admin">مدير مدرسة</option>
                <option value="data_analyst">محلل بيانات</option>
                <option value="driver">سائق</option>
              </>
            ) : (
              <>
                <option value="student">طالب</option>
                <option value="teacher">معلم</option>
                <option value="data_analyst">محلل بيانات</option>
                <option value="driver">سائق</option>
              </>
            )}
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
                {formData.role === 'driver' && (
                  <div>
                    <strong className="text-purple-600">سائق:</strong> يمكن للسائق تسجيل الدخول لمسح رموز QR للطلاب عند صعودهم ونزولهم من الحافلة. السائق يمكنه الوصول فقط إلى الحافلة المخصصة له.
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
        {user?.role === 'admin' && (
          <SearchableSelect
            name="school_id"
            value={formData.school_id}
            onChange={handleChange}
            options={schools?.map(school => ({
              value: school.id,
              label: school.name
            })) || []}
            placeholder="اختر المدرسة"
            searchPlaceholder="البحث في المدارس..."
            emptyMessage="لا توجد مدارس"
            noResultsMessage="لا توجد مدارس تطابق البحث"
            required
            label="المدرسة"
          />
        )}
        {user?.role === 'admin' && (
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
        )}
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
                required={user?.role === 'school_admin' && (formData.role === 'teacher' || formData.role === 'data_analyst')}
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

// Edit User Form Component
const EditUserForm = ({ user, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    fullName: user.fullName || '',
    phone_number: user.phone_number || '',
    user_role: user.role || user.user_role || '',
    school_id: user.school_id || '',
    is_active: user.is_active !== undefined ? user.is_active : true,
    password: '', // Password field for updates
    job_name: user.job_name || '',
    week_Classes_Number: user.week_Classes_Number || '',
  });
  const [emailValidation, setEmailValidation] = useState({ isValid: true, suggestion: null });

  // Validate email when component mounts or user changes
  useEffect(() => {
    if (user?.email) {
      const validation = validateEmailFormat(user.email);
      setEmailValidation(validation);
    }
  }, [user]);

  // Fetch schools data for admin users
  const { data: schools } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!currentUser && currentUser.role === 'admin' }
  );

  const editUserMutation = useMutation(
    (userData) => authAPI.updateUser(user.id, userData),
    {
      onSuccess: () => {
        toast.success('تم تحديث المستخدم بنجاح');
        onSuccess();
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تحديث المستخدم');
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
    
    // Prepare data for submission
    const submitData = { ...formData };
    
    // Only include password if it's provided
    if (!submitData.password || submitData.password.trim() === '') {
      delete submitData.password;
    }
    
    editUserMutation.mutate(submitData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
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
            name="user_role"
            value={formData.user_role}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">اختر الدور</option>
            <option value="school_admin">مدير المدرسة</option>
            <option value="teacher">معلم</option>
            <option value="student">طالب</option>
            <option value="data_analyst">محلل بيانات</option>
            <option value="driver">سائق</option>
          </select>
          
          {/* Role Description */}
          {formData.user_role && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-700">
                {formData.user_role === 'student' && (
                  <div>
                    <strong className="text-blue-600">طالب:</strong> يمكن للطالب تسجيل الدخول لعرض معلوماته الشخصية وتاريخ حضوره وغيابه.
                  </div>
                )}
                {formData.user_role === 'teacher' && (
                  <div>
                    <strong className="text-green-600">معلم:</strong> يمكن للمعلم تسجيل حضور الطلاب في فصوله، وعرض التقارير المتعلقة بفصوله، وإدارة ملفه الشخصي.
                  </div>
                )}
                {formData.user_role === 'school_admin' && (
                  <div>
                    <strong className="text-orange-600">مدير مدرسة:</strong> صلاحيات شاملة لإدارة المدرسة بما في ذلك إدارة المعلمين والطلاب والفصول، وعرض جميع التقارير والإحصائيات، وإرسال الإشعارات.
                  </div>
                )}
                {formData.user_role === 'data_analyst' && (
                  <div>
                    <strong className="text-purple-600">محلل بيانات:</strong> صلاحيات متقدمة لتحليل البيانات وعرض التقارير المفصلة والإحصائيات، مع إمكانية الوصول لجميع بيانات الحضور والغياب في المدرسة.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {currentUser?.role === 'admin' && (
          <SearchableSelect
            name="school_id"
            className="h-full"
            value={formData.school_id}
            onChange={handleChange}
            options={schools?.map(school => ({
              value: school.id,
              label: school.name
            })) || []}
            placeholder="اختر المدرسة"
            searchPlaceholder="البحث في المدارس..."
            emptyMessage="لا توجد مدارس"
            noResultsMessage="لا توجد مدارس تطابق البحث"
            label="المدرسة"
          />
        )}
        <div>
          <label className="label">كلمة المرور الجديدة (اختياري)</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="input"
            placeholder="اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور"
          />
        </div>
        {(formData.user_role === 'teacher' || formData.user_role === 'school_admin' || formData.user_role === 'data_analyst') && (
          <>
            <div>
              <label className="label">المادة التدرسية</label>
              <input
                type="text"
                name="job_name"
                value={formData.job_name}
                onChange={handleChange}
                className="input"
                placeholder={formData.user_role === 'school_admin' ? 'مدير مدرسة' : formData.user_role === 'data_analyst' ? 'محلل بيانات' : 'المادة التدرسية'}
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
                placeholder={formData.user_role === 'school_admin' ? '0' : ''}
              />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">نشط</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline ml-2"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={editUserMutation.isLoading}
          className="btn btn-primary"
        >
          {editUserMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري التحديث...</span>
            </>
          ) : (
            'تحديث المستخدم'
          )}
        </button>
      </div>
    </form>
  );
};

// View User Details Component
const ViewUserDetails = ({ user, userDetails, loading, onClose }) => {
  const displayData = userDetails || user;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل تفاصيل المستخدم...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Avatar and Basic Info */}
      <div className="flex items-center space-x-4">
        <div className="h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center">
          <UsersIcon className="h-10 w-10 text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{displayData.fullName}</h3>
          <p className="text-gray-600">{displayData.username}</p>
          <span className={`badge ${getRoleColor(displayData.role)}`}>
            {getRoleDisplayName(displayData.role)}
          </span>
        </div>
      </div>

      {/* User Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">البريد الإلكتروني</label>
            <p className="text-sm text-gray-900">{displayData.email || 'غير محدد'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">رقم الهاتف</label>
            <p className="text-sm text-gray-900">
              {displayData.phone_number ? formatPhoneNumber(displayData.phone_number) : 'غير محدد'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">الحالة</label>
            <span className={`badge ${displayData.is_active ? 'badge-success' : 'badge-danger'}`}>
              {displayData.is_active ? 'نشط' : 'غير نشط'} {displayData.role}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {displayData.role === 'teacher' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-500">المادة التدرسية</label>
                <p className="text-sm text-gray-900">{displayData.job_name || 'غير محدد'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">عدد الحصص الأسبوعية</label>
                <p className="text-sm text-gray-900">{displayData.week_Classes_Number || 'غير محدد'}</p>
              </div>
            </>
          )}
        
        </div>
      </div>

      {/* Additional Information */}
      {displayData.role === 'student' && (
        <div className="border-t pt-4">
          <h4 className="text-lg font-medium text-gray-900 mb-3">معلومات الطالب</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">اسم الفصل</label>
              <p className="text-sm text-gray-900">{displayData.class_name || 'غير محدد'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">رقم الطالب</label>
              <p className="text-sm text-gray-900">{displayData.student_number || 'غير محدد'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Close Button */}
      <div className="flex items-center justify-end pt-4 border-t">
        <button
          onClick={onClose}
          className="btn btn-outline"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};

export default Users;




