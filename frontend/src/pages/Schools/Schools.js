import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Building, Edit, Trash2, ToggleLeft, ToggleRight, Eye } from 'lucide-react';
import { classesAPI, authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Schools = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);

  // Fetch schools data
  const { data: schools, isLoading: schoolsLoading } = useQuery(
    'schools',
    classesAPI.getAllSchools,
    { enabled: !!user && user.role === 'admin' }
  );

  // Fetch logs data
  const { data: logs, isLoading: logsLoading } = useQuery(
    'logs',
    authAPI.viewLogs,
    { enabled: !!user && isLogsModalOpen }
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

      {/* Data Table */}
      <DataTable
        data={schools || []}
        columns={columns}
        loading={schoolsLoading}
        emptyMessage="لا توجد مدارس"
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

export default Schools;

