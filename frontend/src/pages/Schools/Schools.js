import React, { useState } from 'react';
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
              setIsLogsModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="عرض السجلات"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleSchoolStatusMutation.mutate(row.id)}
            className={`${row.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
            title={row.is_active ? 'تعطيل المدرسة' : 'تفعيل المدرسة'}
            disabled={toggleSchoolStatusMutation.isLoading}
          >
            {row.is_active ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
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

      {/* Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`سجلات المدرسة: ${selectedSchool?.name}`}
        size="xl"
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
    password: '',
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

// Logs Viewer Component
const LogsViewer = ({ logs, loading }) => {
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
              <th className="table-header-cell">المستخدم</th>
              <th className="table-header-cell">الدور</th>
              <th className="table-header-cell">الإجراء</th>
              <th className="table-header-cell">الوصف</th>
              <th className="table-header-cell">التاريخ</th>
              <th className="table-header-cell">IP</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {logs.map((log, index) => (
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
      
      {logs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">لا توجد سجلات</p>
        </div>
      )}
    </div>
  );
};

export default Schools;

