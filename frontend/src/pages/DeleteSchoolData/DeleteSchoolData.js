import React, { useState } from 'react';
import { useMutation } from 'react-query';
import { Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';

const DeleteSchoolData = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteOptions, setDeleteOptions] = useState({
    students: false,
    teachers: false,
    classes: false,
    subjects: false,
    attendance: false,
    logs: false,
    news: false,
    deleteAll: false
  });
  const [confirmationText, setConfirmationText] = useState('');

  const deleteSchoolDataMutation = useMutation(
    (options) => authAPI.deleteSchoolData(options),
    {
      onSuccess: (response) => {
        toast.success('تم حذف بيانات المدرسة بنجاح');
        setIsModalOpen(false);
        setDeleteOptions({
          students: false,
          teachers: false,
          classes: false,
          subjects: false,
          attendance: false,
          logs: false,
          news: false,
          deleteAll: false
        });
        setConfirmationText('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء حذف البيانات');
      }
    }
  );

  const handleOptionChange = (option) => {
    if (option === 'deleteAll') {
      const newValue = !deleteOptions.deleteAll;
      setDeleteOptions({
        students: newValue,
        teachers: newValue,
        classes: newValue,
        subjects: newValue,
        attendance: newValue,
        logs: newValue,
        news: newValue,
        deleteAll: newValue
      });
    } else {
      setDeleteOptions(prev => ({
        ...prev,
        [option]: !prev[option],
        deleteAll: false // Uncheck "delete all" if any individual option is changed
      }));
    }
  };

  const validateDeletionOrder = (selectedOptions) => {
    const deletionOrder = [
      'attendance',
      'students', 
      'classes',
      'subjects',
      'logs',
      'news',
      'teachers'
    ];

    // Check if attendance is selected when students, classes, or subjects are selected
    const requiresAttendance = ['students', 'classes', 'subjects'];
    const hasRequiresAttendance = selectedOptions.some(option => requiresAttendance.includes(option));
    const hasAttendance = selectedOptions.includes('attendance');

  

    // Check if students are selected when teachers are selected
    const hasStudents = selectedOptions.includes('students');
    const hasTeachers = selectedOptions.includes('teachers');


    // Check if classes or subjects are selected when students are selected
    const hasClasses = selectedOptions.includes('classes');
    const hasSubjects = selectedOptions.includes('subjects');


    return true;
  };

  const handleDelete = () => {
    if (confirmationText !== 'تأكيد الحذف') {
      toast.error('يرجى كتابة "تأكيد الحذف" للتأكيد');
      return;
    }

    const selectedOptions = Object.entries(deleteOptions)
      .filter(([key, value]) => value && key !== 'deleteAll')
      .map(([key]) => key);

    if (selectedOptions.length === 0) {
      toast.error('يرجى اختيار نوع البيانات المراد حذفها');
      return;
    }

    // Validate deletion order
    if (!validateDeletionOrder(selectedOptions)) {
      return;
    }

    // Sort options according to deletion order
    const deletionOrder = [
      'attendance',
      'classes',
      'subjects', 
      'logs',
      'news',
      'students',
      'teachers'
    ];

    const sortedOptions = selectedOptions.sort((a, b) => {
      return deletionOrder.indexOf(a) - deletionOrder.indexOf(b);
    });

    deleteSchoolDataMutation.mutate(sortedOptions);
  };

  const hasSelectedOptions = Object.values(deleteOptions).some(value => value);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">حذف بيانات المدرسة</h1>
              <p className="text-gray-600">احذف البيانات المحددة من المدرسة</p>
              <p className="text-gray-600"> بداية كل سنة دراسية</p>
            </div>
          </div>
        </div>

        {/* Warning Card */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">تحذير مهم</h3>
              <p className="text-red-700 mb-3">
                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف البيانات المحددة نهائياً من النظام.
              </p>
              <ul className="text-red-700 space-y-1">
                <li>• تأكد من عمل نسخة احتياطية من البيانات المهمة</li>
                <li>• تأكد من عدم وجود بيانات مهمة في العناصر المحددة</li>
                <li>• هذا الإجراء سيؤثر على جميع المستخدمين في المدرسة</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Deletion Order Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">ترتيب الحذف المطلوب</h3>
              <p className="text-blue-700 mb-3">
                يجب اتباع الترتيب الصحيح للحذف لتجنب أخطاء النظام:
              </p>
              <div className="bg-blue-100 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">الترتيب المطلوب:</h4>
                <ol className="text-blue-700 space-y-1 list-decimal list-inside">
                  <li><strong>سجلات الحضور والغياب</strong> - يجب حذفها أولاً</li>
                  <li><strong>الفصول والمواد الدراسية</strong> - يمكن حذفها بعد سجلات الحضور</li>
                  <li><strong>التقارير والأخبار</strong> - يمكن حذفها في أي وقت</li>
                  <li><strong>الطلاب</strong> - يجب حذفهم بعد حذف الفصول والمواد</li>
                  <li><strong>المعلمين</strong> - يجب حذفهم أخيراً بعد حذف الطلاب</li>
                </ol>
              </div>
              <p className="text-blue-700 mt-3 text-sm">
                💡 <strong>نصيحة:</strong> إذا كنت تريد حذف الطلاب أو المعلمين، تأكد من تحديد "سجلات الحضور والغياب" أيضاً.
              </p>
            </div>
          </div>
        </div>

        {/* Delete Options */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">اختر البيانات المراد حذفها</h2>
          
          <div className="space-y-4">
            {/* Delete All Option */}
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteOptions.deleteAll}
                  onChange={() => handleOptionChange('deleteAll')}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-lg font-semibold text-red-600">حذف جميع البيانات</span>
                </div>
              </label>
              <p className="text-gray-600 mt-2 mr-8">حذف جميع البيانات التالية معاً</p>
            </div>

            {/* Individual Options */}
            <div className="space-y-3">
              {/* Priority 1: Attendance */}
              <div className="border-l-4 border-green-500 bg-green-50 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteOptions.attendance}
                    onChange={() => handleOptionChange('attendance')}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">1</span>
                    <span className="text-gray-700 font-medium">سجلات الحضور والغياب</span>
                    <span className="text-green-600 text-xs">(أولاً)</span>
                  </div>
                </label>
              </div>

              {/* Priority 2: Classes and Subjects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border-l-4 border-blue-500 bg-blue-50 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteOptions.classes}
                      onChange={() => handleOptionChange('classes')}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">2</span>
                      <span className="text-gray-700">الفصول</span>
                    </div>
                  </label>
                </div>

                <div className="border-l-4 border-blue-500 bg-blue-50 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteOptions.subjects}
                      onChange={() => handleOptionChange('subjects')}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">2</span>
                      <span className="text-gray-700">المواد الدراسية</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Priority 3: Reports and News */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border-l-4 border-yellow-500 bg-yellow-50 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteOptions.logs}
                      onChange={() => handleOptionChange('logs')}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">3</span>
                      <span className="text-gray-700">التقارير</span>
                    </div>
                  </label>
                </div>

                <div className="border-l-4 border-yellow-500 bg-yellow-50 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteOptions.news}
                      onChange={() => handleOptionChange('news')}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">3</span>
                      <span className="text-gray-700">الأخبار</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Priority 4: Students */}
              <div className="border-l-4 border-orange-500 bg-orange-50 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteOptions.students}
                    onChange={() => handleOptionChange('students')}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full">4</span>
                    <span className="text-gray-700 font-medium">الطلاب</span>
                    <span className="text-orange-600 text-xs">(قبل المعلمين)</span>
                  </div>
                </label>
              </div>

              {/* Priority 5: Teachers */}
              <div className="border-l-4 border-red-500 bg-red-50 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteOptions.teachers}
                    onChange={() => handleOptionChange('teachers')}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">5</span>
                    <span className="text-gray-700 font-medium">المعلمين</span>
                    <span className="text-red-600 text-xs">(أخيراً)</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!hasSelectedOptions}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              hasSelectedOptions
                ? 'bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-200'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trash2 className="w-5 h-5" />
              حذف البيانات المحددة
            </div>
          </button>
        </div>

        {/* Confirmation Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="تأكيد حذف البيانات"
        >
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">تحذير نهائي</h3>
              </div>
              <p className="text-gray-700 mb-4">
                أنت على وشك حذف البيانات التالية نهائياً:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                {deleteOptions.students && <li>جميع الطلاب</li>}
                {deleteOptions.teachers && <li>جميع المعلمين</li>}
                {deleteOptions.classes && <li>جميع الفصول</li>}
                {deleteOptions.subjects && <li>جميع المواد الدراسية</li>}
                {deleteOptions.attendance && <li>جميع سجلات الحضور والغياب</li>}
                {deleteOptions.logs && <li>جميع التقارير</li>}
                {deleteOptions.news && <li>جميع الأخبار</li>}
              </ul>
              <p className="text-red-700 font-semibold">
                هذا الإجراء لا يمكن التراجع عنه!
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اكتب "تأكيد الحذف" للتأكيد:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="تأكيد الحذف"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                dir="rtl"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSchoolDataMutation.isLoading || confirmationText !== 'تأكيد الحذف'}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold text-white transition-colors ${
                  deleteSchoolDataMutation.isLoading || confirmationText !== 'تأكيد الحذف'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-200'
                }`}
              >
                {deleteSchoolDataMutation.isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    جاري الحذف...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    حذف نهائي
                  </div>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DeleteSchoolData;
