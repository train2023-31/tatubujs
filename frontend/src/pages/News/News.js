import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Newspaper, Edit, Trash2, Eye, EyeOff, Calendar, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { hasRole } from '../../utils/helpers';
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
  const [expandedNews, setExpandedNews] = useState(new Set());

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
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{row.title}</p>
            <div className="mt-1">
              <p 
                className="text-xs sm:text-sm text-gray-500"
                style={{
                  ...(expandedNews.has(row.id) ? {} : {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }),
                  wordBreak: 'break-word',
                  lineHeight: '1.5'
                }}
              >
                {row.description}
              </p>
              {row.description && row.description.length > 150 && (
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedNews);
                    if (newExpanded.has(row.id)) {
                      newExpanded.delete(row.id);
                    } else {
                      newExpanded.add(row.id);
                    }
                    setExpandedNews(newExpanded);
                  }}
                  className="mt-1 text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors"
                >
                  {expandedNews.has(row.id) ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      <span>عرض أقل</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      <span>عرض المزيد</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      render: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${row.type === 'global' ? 'badge-info' : 'badge-warning'}`}>
            {row.type === 'global' ? 'عام' : 'مدرسي'}
          </span>
          {row.type === 'global' && !hasRole(user, ['admin']) && (
            <Shield className="h-4 w-4 text-gray-400 flex-shrink-0" title="يتطلب صلاحيات مدير عام" />
          )}
        </div>
      ),
    },
    {
      key: 'created_by_name',
      header: 'المنشئ',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{row.created_by_name || '-'}</p>
          <p className="text-xs text-gray-500 whitespace-nowrap">{row.created_at || '-'}</p>
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
        <div className="flex items-center gap-1 min-w-0">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 truncate">
            {row.end_at || 'لا يوجد'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'الإجراءات',
      render: (row) => {
        // Only admin can edit/delete general news
        const canEdit = row.type === 'global' ? hasRole(user, ['admin']) : hasRole(user, ['admin', 'school_admin']);
        const canDelete = row.type === 'global' ? hasRole(user, ['admin']) : hasRole(user, ['admin', 'school_admin']);
        
        if (!canEdit && !canDelete) {
          return (
            <div className="flex items-center text-gray-400">
              <Shield className="h-4 w-4" />
              <span className="text-xs mr-1">غير مسموح</span>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  setSelectedNews(row);
                  setIsEditModalOpen(true);
                }}
                className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50 transition-colors"
                title="تعديل"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من حذف هذا الخبر؟')) {
                    deleteNewsMutation.mutate(row.id);
                  }
                }}
                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                title="حذف"
                disabled={deleteNewsMutation.isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">إدارة الأخبار</h1>
          <p className="text-sm sm:text-base text-gray-600">إدارة الأخبار والإعلانات</p>
        </div>
        {hasRole(user, ['admin', 'school_admin']) && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            إضافة خبر جديد
          </button>
        )}
      </div>

      {/* Permissions Info */}
      {!hasRole(user, ['admin']) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">معلومات الصلاحيات</h3>
              <p className="text-sm text-blue-700 mt-1">
                يمكنك فقط إضافة وتعديل وحذف الأخبار المدرسية. الأخبار العامة (المميزة بالدرع) تتطلب صلاحيات مدير عام.
              </p>
            </div>
          </div>
        </div>
      )}

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
            className="input w-full"
            required
            placeholder="أدخل عنوان الخبر"
            autoComplete="off"
          />
        </div>
        
        <div>
          <label className="label">وصف الخبر</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="input w-full resize-none"
            rows={4}
            required
            placeholder="أدخل وصف الخبر"
            style={{ minHeight: '100px' }}
          />
        </div>

        <div>
          <label className="label">نوع الخبر</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="input"
            disabled={!hasRole(user, ['admin'])}
          >
            <option value="global">عام (لجميع المدارس)</option>
            <option value="school">مدرسي (للمدرسة فقط)</option>
          </select>
          {!hasRole(user, ['admin']) && (
            <p className="text-sm text-gray-500 mt-1">
              يمكن للمدير العام فقط إنشاء أخبار عامة
            </p>
          )}
        </div>

        <div>
          <label className="label">تاريخ الانتهاء (اختياري)</label>
          <input
            type="date"
            name="end_at"
            value={formData.end_at}
            onChange={handleChange}
            className="input w-full"
            style={{ fontSize: '16px' }}
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline w-full sm:w-auto"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full sm:w-auto"
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

