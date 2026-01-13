import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bus, Plus, Edit, Trash2, Users, UserPlus, MapPin } from 'lucide-react';
import { busAPI, usersAPI } from '../../services/api';
import DataTable from '../../components/UI/DataTable';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const BusManagement = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [assigningBus, setAssigningBus] = useState(null);
  
  // Fetch buses
  const { data: buses, isLoading } = useQuery('buses', busAPI.getBuses);
  
  // Delete mutation
  const deleteBusMutation = useMutation(
    (busId) => busAPI.deleteBus(busId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('buses');
        toast.success('تم حذف الحافلة بنجاح');
      },
      onError: () => toast.error('فشل في حذف الحافلة'),
    }
  );
  
  const columns = [
    {
      key: 'bus_number',
      header: 'رقم الحافلة',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Bus className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="font-medium">{row.bus_number}</span>
        </div>
      ),
    },
    {
      key: 'bus_name',
      header: 'اسم الحافلة',
    },
    {
      key: 'driver_name',
      header: 'السائق',
      render: (row) => row.driver_name || '-',
    },
    {
      key: 'student_count',
      header: 'عدد الطلاب',
      render: (row) => `${row.student_count} / ${row.capacity}`,
    },
    {
      key: 'plate_number',
      header: 'رقم اللوحة',
      render: (row) => row.plate_number || '-',
    },
    {
      key: 'location',
      header: 'موقع الحافلة',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.location ? (
            <>
              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm">{row.location}</span>
            </>
          ) : (
            <span className="text-gray-400">-</span>
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssigningBus(row)}
            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
            title="تعيين طلاب"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setEditingBus(row);
              setIsAddModalOpen(true);
            }}
            className="text-primary-600 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
            title="تعديل / تعيين سائق"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (window.confirm('هل أنت متأكد من حذف هذه الحافلة؟')) {
                deleteBusMutation.mutate(row.id);
              }
            }}
            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">إدارة الحافلات</h1>
          <p className="text-sm sm:text-base text-gray-600">إدارة حافلات المدرسة والسائقين</p>
        </div>
        <button
          onClick={() => {
            setEditingBus(null);
            setIsAddModalOpen(true);
          }}
          className="btn btn-primary w-full sm:w-auto"
        >
          <Plus className="h-5 w-5 mr-2" />
          إضافة حافلة جديدة
        </button>
      </div>
      
      <DataTable
        data={buses || []}
        columns={columns}
        loading={isLoading}
        emptyMessage="لا توجد حافلات"
      />
      
      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBus(null);
        }}
        title={editingBus ? 'تعديل الحافلة' : 'إضافة حافلة جديدة'}
      >
        <BusForm
          bus={editingBus}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingBus(null);
          }}
        />
      </Modal>
      
      {/* Assign Students Modal */}
      {assigningBus && (
        <Modal
          isOpen={!!assigningBus}
          onClose={() => setAssigningBus(null)}
          title={`تعيين طلاب للحافلة ${assigningBus.bus_number}`}
          size="lg"
        >
          <AssignStudentsForm
            bus={assigningBus}
            onClose={() => setAssigningBus(null)}
          />
        </Modal>
      )}
    </div>
  );
};

// Bus Form Component
const BusForm = ({ bus, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    bus_number: bus?.bus_number || '',
    bus_name: bus?.bus_name || '',
    capacity: bus?.capacity || 50,
    plate_number: bus?.plate_number || '',
    location: bus?.location || '',
    driver_id: bus?.driver_id || '',
    is_active: bus?.is_active !== undefined ? bus.is_active : true,
  });
  
  // Fetch drivers for selection
  const { data: allUsers } = useQuery('mySchoolUsers', usersAPI.getMySchoolUsers);
  const drivers = allUsers?.filter(user => user.role === 'driver') || [];

  const saveMutation = useMutation(
    (data) => bus ? busAPI.updateBus(bus.id, data) : busAPI.createBus(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('buses');
        toast.success(bus ? 'تم تحديث الحافلة بنجاح' : 'تم إضافة الحافلة بنجاح');
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في حفظ الحافلة');
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">رقم الحافلة *</label>
        <input
          type="text"
          value={formData.bus_number}
          onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
          className="input w-full"
          required
          placeholder="مثال: 101"
        />
      </div>

      <div>
        <label className="label">اسم الحافلة *</label>
        <input
          type="text"
          value={formData.bus_name}
          onChange={(e) => setFormData({ ...formData, bus_name: e.target.value })}
          className="input w-full"
          required
          placeholder="مثال: حافلة الطلاب 1"
        />
      </div>

      <div>
        <label className="label">السعة *</label>
        <input
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
          className="input w-full"
          required
          min="1"
          placeholder="50"
        />
      </div>

      <div>
        <label className="label">رقم اللوحة</label>
        <input
          type="text"
          value={formData.plate_number}
          onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
          className="input w-full"
          placeholder="مثال: ABC-1234"
        />
      </div>

      <div>
        <label className="label">موقع الحافلة</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="input w-full"
          placeholder="مثال: منطقة السيب، مسقط"
        />
      </div>

      <div>
        <label className="label">السائق</label>
        <select
          value={formData.driver_id}
          onChange={(e) => setFormData({ ...formData, driver_id: e.target.value || null })}
          className="input w-full"
          style={{ fontSize: '16px' }}
        >
          <option value="">-- لا يوجد سائق --</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.fullName} ({driver.username})
            </option>
          ))}
        </select>
        {drivers.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            لا يوجد سائقين مسجلين. يرجى إضافة سائق من صفحة إدارة المستخدمين أولاً.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">نشط</span>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline w-full sm:w-auto"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={saveMutation.isLoading}
          className="btn btn-primary w-full sm:w-auto"
        >
          {saveMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري الحفظ...</span>
            </>
          ) : (
            bus ? 'تحديث الحافلة' : 'إضافة الحافلة'
          )}
        </button>
      </div>
    </form>
  );
};

// Assign Students Form Component
const AssignStudentsForm = ({ bus, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStudentsSearchTerm, setCurrentStudentsSearchTerm] = useState('');
  
  // Fetch all students
  const { data: allStudents, isLoading: studentsLoading } = useQuery(
    'allStudents',
    usersAPI.getMySchoolStudents
  );
  
  // Fetch bus students
  const { data: busStudents, isLoading: busStudentsLoading } = useQuery(
    ['busStudents', bus.id],
    () => busAPI.getBusStudents(bus.id)
  );
  
  // Assign mutation
  const assignMutation = useMutation(
    (studentIds) => busAPI.assignStudents(bus.id, studentIds),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['busStudents', bus.id]);
        queryClient.invalidateQueries('buses');
        toast.success('تم تعيين الطلاب بنجاح');
        setSelectedStudents(new Set());
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تعيين الطلاب');
      },
    }
  );
  
  // Remove mutation
  const removeMutation = useMutation(
    (studentIds) => busAPI.removeStudents(bus.id, studentIds),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['busStudents', bus.id]);
        queryClient.invalidateQueries('buses');
        toast.success('تم إزالة الطلاب بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في إزالة الطلاب');
      },
    }
  );
  
  const busStudentIds = new Set(busStudents?.map(s => s.id) || []);
  
  const availableStudents = allStudents?.filter(s => 
    !busStudentIds.has(s.id) &&
    (searchTerm === '' || 
     s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.location?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];
  
  const handleAssign = () => {
    if (selectedStudents.size === 0) {
      toast.error('يرجى اختيار طلاب');
      return;
    }
    assignMutation.mutate(Array.from(selectedStudents));
  };
  
  const handleRemove = (studentId) => {
    if (window.confirm('هل أنت متأكد من إزالة هذا الطالب من الحافلة؟')) {
      removeMutation.mutate([studentId]);
    }
  };
  
  // Filter current students based on search
  const filteredCurrentStudents = useMemo(() => {
    if (!busStudents) return [];
    
    // Get unique students by ID
    const uniqueStudents = [];
    const seenIds = new Set();
    
    busStudents.forEach((student) => {
      if (!seenIds.has(student.id)) {
        seenIds.add(student.id);
        uniqueStudents.push(student);
      }
    });
    
    // Filter by search term
    if (currentStudentsSearchTerm === '') {
      return uniqueStudents;
    }
    
    const searchLower = currentStudentsSearchTerm.toLowerCase();
    return uniqueStudents.filter(student => 
      student.fullName?.toLowerCase().includes(searchLower) ||
      student.username?.toLowerCase().includes(searchLower) ||
      student.location?.toLowerCase().includes(searchLower)
    );
  }, [busStudents, currentStudentsSearchTerm]);

  return (
    <div className="space-y-4">
      {/* Current Students */}
      <div>
        <h3 className="font-medium text-sm mb-2">الطلاب الحاليون ({busStudents?.length || 0} / {bus.capacity})</h3>
        {busStudents?.length > 0 && (
          <input
            type="text"
            value={currentStudentsSearchTerm}
            onChange={(e) => setCurrentStudentsSearchTerm(e.target.value)}
            className="input w-full mb-2"
            placeholder="ابحث بالاسم، اسم المستخدم، أو الموقع..."
            style={{ fontSize: '16px' }}
          />
        )}
        {busStudentsLoading ? (
          <LoadingSpinner />
        ) : busStudents?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">لا يوجد طلاب مسجلين</p>
        ) : filteredCurrentStudents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">لا توجد نتائج للبحث</p>
        ) : (
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {filteredCurrentStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-2 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{student.fullName || student.username}</span>
                      <span className="text-xs text-gray-500">({student.username})</span>
                    </div>
                    {student.location && (
                      <p className="text-xs text-gray-600 mt-1 truncate">📍 {student.location}</p>
                    )}
                 
                  </div>
                  <button
                    onClick={() => handleRemove(student.id)}
                    className="text-red-600 hover:text-red-900 text-xs mr-2 flex-shrink-0"
                  >
                    إزالة
                  </button>
                </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Students */}
      <div>
        <h3 className="font-medium text-sm mb-2">إضافة طلاب</h3>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full mb-2"
          placeholder="ابحث بالاسم، اسم المستخدم، أو الموقع..."
          style={{ fontSize: '16px' }}
        />
        
        {studentsLoading ? (
          <LoadingSpinner />
        ) : availableStudents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">لا يوجد طلاب متاحين</p>
        ) : (
          <div className="max-h-64 overflow-y-auto border rounded-lg">
            {(() => {
              // Get unique students by ID
              const uniqueStudents = [];
              const seenIds = new Set();
              
              availableStudents.forEach((student) => {
                if (!seenIds.has(student.id)) {
                  seenIds.add(student.id);
                  uniqueStudents.push(student);
                }
              });
              
              return uniqueStudents.map((student) => (
                <div key={student.id} className="flex items-start gap-2 p-2 border-b last:border-b-0 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedStudents);
                      if (e.target.checked) {
                        newSet.add(student.id);
                      } else {
                        newSet.delete(student.id);
                      }
                      setSelectedStudents(newSet);
                    }}
                    className="rounded mt-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{student.fullName || student.username}</span>
                      <span className="text-xs text-gray-500">({student.username})</span>
                    </div>
                    {student.location && (
                      <p className="text-xs text-gray-600 mt-1 truncate">📍 {student.location}</p>
                    )}
                  
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
      
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline w-full sm:w-auto"
        >
          إغلاق
        </button>
        <button
          onClick={handleAssign}
          disabled={selectedStudents.size === 0 || assignMutation.isLoading}
          className="btn btn-primary w-full sm:w-auto"
        >
          {assignMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="mr-2">جاري التعيين...</span>
            </>
          ) : (
            `تعيين (${selectedStudents.size})`
          )}
        </button>
      </div>
    </div>
  );
};

export default BusManagement;

