import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Edit, Trash2, UserPlus, Users as UsersIcon, Eye } from 'lucide-react';
import { usersAPI, authAPI, classesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDisplayName, getRoleColor, formatPhoneNumber } from '../../utils/helpers';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import SearchableSelect from '../../components/UI/SearchableSelect';
import toast from 'react-hot-toast';

const Users = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch users data
  const { data: allUsers, isLoading: allUsersLoading } = useQuery(
    'allUsers',
    usersAPI.getMySchoolUsers,
    {
      enabled: !!user,
    }
  );

  const { data: teachers, isLoading: teachersLoading } = useQuery(
    'teachers',
    usersAPI.getMySchoolTeachers,
    {
      enabled: !!user,
    }
  );

  const { data: students, isLoading: studentsLoading } = useQuery(
    'students',
    usersAPI.getMySchoolStudents,
    {
      enabled: !!user,
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
      onSuccess: () => {
        queryClient.invalidateQueries('allUsers');
        queryClient.invalidateQueries('teachers');
        queryClient.invalidateQueries('students');
        toast.success('تم حذف المستخدم بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في حذف المستخدم');
      },
    }
  );

  // Get current data based on selected tab
  const getCurrentData = () => {
    switch (selectedTab) {
      case 'teachers':
        return teachers || [];
      case 'students':
        return students || [];
      default:
        return allUsers || [];
    }
  };

  const getCurrentLoading = () => {
    switch (selectedTab) {
      case 'teachers':
        return teachersLoading;
      case 'students':
        return studentsLoading;
      default:
        return allUsersLoading;
    }
  };

  // Filter data based on search term
  const filteredData = getCurrentData().filter((user) =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <span className={`badge ${getRoleColor(row.role)}`}>
          {getRoleDisplayName(row.role)}
        </span>
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
              setSelectedUser(row);
              setIsViewModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900 ml-2"
            title="عرض التفاصيل"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedUser(row);
              setIsEditModalOpen(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="تعديل"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
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
    { id: 'teachers', name: 'المعلمين', count: teachers?.length || 0 },
    { id: 'students', name: 'الطلاب', count: students?.length || 0 },
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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
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

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في المستخدمين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pr-10"
            />
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
            queryClient.invalidateQueries('allUsers');
            queryClient.invalidateQueries('teachers');
            queryClient.invalidateQueries('students');
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
              queryClient.invalidateQueries('allUsers');
              queryClient.invalidateQueries('teachers');
              queryClient.invalidateQueries('students');
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

  // Fetch schools data for admin users
  const { data: schools } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!user && user.role === 'admin' }
  );

  const addUserMutation = useMutation(
    (userData) => {
      switch (userData.role) {
        case 'teacher':
          return authAPI.registerTeacher(userData);
        case 'student':
          return authAPI.registerStudents([userData]);
        case 'school_admin':
          return authAPI.registerUser(userData);
        default:
          return authAPI.registerUser(userData);
      }
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
    addUserMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
            className="input"
            required
          />
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
          </select>
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
        {(formData.role === 'teacher' || formData.role === 'school_admin') && (
          <>
            <div>
              <label className="label">الوظيفة</label>
              <input
                type="text"
                name="job_name"
                value={formData.job_name}
                onChange={handleChange}
                className="input"
                placeholder={formData.role === 'school_admin' ? 'مدير مدرسة' : 'الوظيفة'}
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
  });

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
            className="input"
            required
          />
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
          </select>
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
              {displayData.is_active ? 'نشط' : 'غير نشط'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {displayData.role === 'teacher' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-500">الوظيفة</label>
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




