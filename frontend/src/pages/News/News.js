import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Newspaper, Edit, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const News = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);

  // Fetch news data
  const { data: news, isLoading: newsLoading } = useQuery(
    'news',
    reportsAPI.getNews,
    { enabled: !!user }
  );

  // Add news mutation
  const addNewsMutation = useMutation(
    (newsData) => reportsAPI.addNews(newsData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('news');
        toast.success('تم إضافة الخبر بنجاح');
        setIsAddModalOpen(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إضافة الخبر');
      },
    }
  );

  // Delete news mutation
  const deleteNewsMutation = useMutation(
    (newsId) => reportsAPI.deleteNews(newsId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('news');
        toast.success('تم حذف الخبر بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في حذف الخبر');
      },
    }
  );

  // Table columns configuration
  const columns = [
    {
      key: 'title',
      header: 'عنوان الخبر',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-green-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-900">{row.title}</p>
            <p className="text-sm text-gray-500 truncate max-w-xs">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      render: (row) => (
        <span className={`badge ${row.type === 'global' ? 'badge-info' : 'badge-warning'}`}>
          {row.type === 'global' ? 'عام' : 'مدرسي'}
        </span>
      ),
    },
    {
      key: 'created_by_name',
      header: 'المنشئ',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{row.created_by_name}</p>
          <p className="text-sm text-gray-500">{row.created_at}</p>
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
      key: 'end_at',
      header: 'تاريخ الانتهاء',
      render: (row) => (
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm text-gray-600">
            {row.end_at || 'لا يوجد'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedNews(row);
              setIsEditModalOpen(true);
            }}
            className="text-primary-600 hover:text-primary-900"
            title="تعديل"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
                deleteNewsMutation.mutate(row.id);
              }
            }}
            className="text-red-600 hover:text-red-900"
            title="حذف"
            disabled={deleteNewsMutation.isLoading}
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
          <h1 className="text-2xl font-bold text-gray-900">إدارة الأخبار</h1>
          <p className="text-gray-600">إدارة الأخبار والإعلانات</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          إضافة خبر جديد
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        data={news || []}
        columns={columns}
        loading={newsLoading}
        emptyMessage="لا توجد أخبار"
      />

      {/* Add News Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة خبر جديد"
        size="lg"
      >
        <NewsForm
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={addNewsMutation.mutate}
          loading={addNewsMutation.isLoading}
        />
      </Modal>

      {/* Edit News Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل الخبر"
        size="lg"
      >
        {selectedNews && (
          <NewsForm
            news={selectedNews}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={(data) => {
              // For edit, we would need an update endpoint
              toast.info('تحديث الخبر غير متاح حالياً');
              setIsEditModalOpen(false);
            }}
            loading={false}
          />
        )}
      </Modal>
    </div>
  );
};

// News Form Component
const NewsForm = ({ news, onClose, onSubmit, loading }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: news?.title || '',
    description: news?.description || '',
    type: news?.type || (user?.role === 'admin' ? 'global' : 'school'),
    is_active: news?.is_active !== undefined ? news.is_active : true,
    end_at: news?.end_at || '',
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
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="label">عنوان الخبر</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="input"
            required
            placeholder="أدخل عنوان الخبر"
          />
        </div>
        
        <div>
          <label className="label">وصف الخبر</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="input"
            rows={4}
            required
            placeholder="أدخل وصف الخبر"
          />
        </div>

        {user?.role === 'admin' && (
          <div>
            <label className="label">نوع الخبر</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="input"
            >
              <option value="global">عام (لجميع المدارس)</option>
              <option value="school">مدرسي (للمدرسة فقط)</option>
            </select>
          </div>
        )}

        <div>
          <label className="label">تاريخ الانتهاء (اختياري)</label>
          <input
            type="date"
            name="end_at"
            value={formData.end_at}
            onChange={handleChange}
            className="input"
          />
          <p className="text-sm text-gray-500 mt-1">
            إذا لم تحدد تاريخ انتهاء، سيظهر الخبر دائماً
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">نشط</span>
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
              <span className="mr-2">جاري الحفظ...</span>
            </>
          ) : (
            news ? 'تحديث الخبر' : 'إضافة الخبر'
          )}
        </button>
      </div>
    </form>
  );
};

export default News;

