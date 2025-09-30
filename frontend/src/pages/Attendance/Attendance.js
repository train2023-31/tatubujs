import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  Eye
} from 'lucide-react';
import { classesAPI, attendanceAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, getTodayAPI, getClassTimeOptions } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Attendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTime, setSelectedTime] = useState(1);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Update attendance records when subject or time changes
  useEffect(() => {
    if (attendanceRecords.length > 0 && selectedSubject) {
      setAttendanceRecords(prev => 
        prev.map(record => ({
          ...record,
          subject_id: parseInt(selectedSubject),
          class_time_num: selectedTime,
          // When changing time, reset to present if no existing data
          is_present: true,
          is_Acsent: false,
          is_Excus: false,
          is_late: false,
          ExcusNote: '',
        }))
      );
    }
  }, [selectedSubject, selectedTime]);

  // Fetch classes
  const { data: classes, isLoading: classesLoading } = useQuery(
    'classes',
    classesAPI.getMyClasses,
    { enabled: !!user }
  );

  // Fetch subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery(
    'subjects',
    classesAPI.getAllSubjects,
    { enabled: !!user }
  );

  // Fetch class students
  const { data: classStudents, isLoading: studentsLoading } = useQuery(
    ['classStudents', selectedClass],
    () => classesAPI.getClassStudents(selectedClass),
    { 
      enabled: !!selectedClass,
      onSuccess: (data) => {
        // Initialize attendance records
        const initialRecords = data.map(student => ({
          student_id: student.id,
          subject_id: parseInt(selectedSubject),
          class_time_num: selectedTime,
          is_present: true,
          is_Acsent: false,
          is_Excus: false,
          is_late: false,
          ExcusNote: '',
        }));
        setAttendanceRecords(initialRecords);
      }
    }
  );

  // Fetch class attendance when class is selected
  const { data: classAttendance, isLoading: classAttendanceLoading } = useQuery(
    ['classAttendance', selectedDate, selectedClass],
    () => attendanceAPI.getAttendanceByClassAndSubject(selectedClass, {
      date: selectedDate,
    }),
    { 
      enabled: !!selectedClass,
      onSuccess: (data) => {
        // You can process the class attendance data here
      },
      onError: (error) => {
        console.error('Error fetching class attendance:', error);
        toast.error('فشل في تحميل بيانات الحضور للفصل');
      }
    }
  );

  // Fetch existing attendance for the selected date, class, and subject
  const { data: existingAttendance, isLoading: attendanceLoading } = useQuery(
    ['existingAttendance', selectedDate, selectedClass, selectedSubject, selectedTime],
    () => attendanceAPI.getAttendanceByClassAndSubject(selectedClass, {
      date: selectedDate,
      subject_id: selectedSubject,
    }),
    { 
      enabled: !!selectedClass && !!selectedSubject,
      onSuccess: (data) => {
        if (data.class_time_data && data.class_time_data[selectedTime]) {
          const existingRecords = data.class_time_data[selectedTime].attendance || [];
          if (existingRecords.length > 0) {
            // Update with existing data
            const updatedRecords = attendanceRecords.map(record => {
              const existing = existingRecords.find(ex => ex.student_id === record.student_id);
              if (existing) {
                return {
                  ...record,
                  subject_id: parseInt(selectedSubject),
                  class_time_num: selectedTime,
                  is_present: existing.is_present,
                  is_Acsent: existing.is_absent,
                  is_Excus: existing.is_excused,
                  is_late: existing.is_late,
                  ExcusNote: existing.ExcusNote || '',
                };
              }
              return {
                ...record,
                subject_id: parseInt(selectedSubject),
                class_time_num: selectedTime,
              };
            });
            setAttendanceRecords(updatedRecords);
          } else {
            // No existing data for this class time - set all students as present
            const updatedRecords = attendanceRecords.map(record => ({
              ...record,
              subject_id: parseInt(selectedSubject),
              class_time_num: selectedTime,
              is_present: true,
              is_Acsent: false,
              is_Excus: false,
              is_late: false,
              ExcusNote: '',
            }));
            setAttendanceRecords(updatedRecords);
          }
        } else {
          // No class time data at all - set all students as present
          const updatedRecords = attendanceRecords.map(record => ({
            ...record,
            subject_id: parseInt(selectedSubject),
            class_time_num: selectedTime,
            is_present: true,
            is_Acsent: false,
            is_Excus: false,
            is_late: false,
            ExcusNote: '',
          }));
          setAttendanceRecords(updatedRecords);
        }
      }
    }
  );

  // Take attendance mutation
  const takeAttendanceMutation = useMutation(
    (data) => attendanceAPI.takeAttendance(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('existingAttendance');
        toast.success('تم حفظ الحضور بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في حفظ الحضور');
      },
    }
  );

  const handleAttendanceChange = (studentId, field, value) => {
    setAttendanceRecords(prev => 
      prev.map(record => {
        if (record.student_id === studentId) {
          const updated = { ...record, [field]: value };
          
          // Ensure only one status is true at a time
          if (field === 'is_present' && value) {
            updated.is_Acsent = false;
            updated.is_Excus = false;
            updated.is_late = false;
          } else if (field === 'is_Acsent' && value) {
            updated.is_present = false;
            updated.is_Excus = false;
            updated.is_late = false;
          } else if (field === 'is_Excus' && value) {
            updated.is_present = false;
            updated.is_Acsent = false;
            updated.is_late = false;
          } else if (field === 'is_late' && value) {
            updated.is_present = false;
            updated.is_Acsent = false;
            updated.is_Excus = false;
          }
          
          return updated;
        }
        return record;
      })
    );
  };

  const handleSubmit = () => {
    if (!selectedClass || !selectedSubject) {
      toast.error('يرجى اختيار الفصل والمادة');
      return;
    }

    // Validate that all students have attendance status selected
    const unmarkedStudents = attendanceRecords.filter(record => {
      const hasStatus = record.is_present || record.is_Acsent || record.is_Excus || record.is_late;
      return !hasStatus;
    });

    if (unmarkedStudents.length > 0) {
      toast.error(`يرجى تحديد حالة الحضور لجميع الطلاب (${unmarkedStudents.length} طالب لم يتم تحديد حالته)`);
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmSubmit = () => {
    const attendanceData = {
      class_id: parseInt(selectedClass),
      subject_id: parseInt(selectedSubject),
      class_time_num: selectedTime,
      date: selectedDate,
      attendance_records: attendanceRecords,
    };

    takeAttendanceMutation.mutate(attendanceData);
    setShowConfirmDialog(false);
  };

  const getAttendanceStatus = (record) => {
    if (record.is_present) return { status: 'present', color: 'green', text: 'حاضر' };
    if (record.is_Acsent) return { status: 'absent', color: 'red', text: 'هارب' };
    if (record.is_Excus) return { status: 'excused', color: 'blue', text: 'غائب' };
    if (record.is_late) return { status: 'late', color: 'yellow', text: 'متأخر' };
    return { status: 'unknown', color: 'gray', text: 'غير محدد' };
  };

  // Check if all students have attendance status selected
  const allStudentsMarked = () => {
    if (attendanceRecords.length === 0) return false;
    return attendanceRecords.every(record => {
      return record.is_present || record.is_Acsent || record.is_Excus || record.is_late;
    });
  };

  // Get count of unmarked students
  const getUnmarkedCount = () => {
    return attendanceRecords.filter(record => {
      const hasStatus = record.is_present || record.is_Acsent || record.is_Excus || record.is_late;
      return !hasStatus;
    }).length;
  };

  const classTimeOptions = getClassTimeOptions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تسجيل الحضور</h1>
          <p className="text-gray-600">تسجيل حضور الطلاب للفصول والمواد</p>
        </div>
        <button
          onClick={() => setIsViewMode(!isViewMode)}
          className="btn btn-outline"
        >
          <Eye className="h-5 w-5 mr-2" />
          {isViewMode ? 'وضع التعديل' : 'وضع العرض'}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="label">التاريخ</label>
              <input
                type="date"
                disabled={user.role === 'teacher'}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">الفصل</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSubject('');
                  setAttendanceRecords([]);
                }}
                className="input"
                disabled={classesLoading}
              >
                <option value="">اختر الفصل</option>
                {classes?.sort((a, b) => a.id - b.id).map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">المادة</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="input"
                disabled={subjectsLoading}
              >
                <option value="">اختر المادة</option>
                {subjects?.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">الحصة</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(parseInt(e.target.value))}
                className="input"
              >
                {classTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSubmit}
                disabled={!selectedClass || !selectedSubject || takeAttendanceMutation.isLoading || !allStudentsMarked()}
                className={`btn w-full ${
                  allStudentsMarked() 
                    ? 'btn-primary' 
                    : 'btn-secondary opacity-50 cursor-not-allowed'
                }`}
              >
                {takeAttendanceMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="mr-2">جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    {allStudentsMarked() ? 'حفظ الحضور' : `حفظ الحضور (${getUnmarkedCount()} طالب لم يتم تحديد حالته)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Summary */}
      {selectedClass && selectedSubject && attendanceRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-green-600">
                {attendanceRecords.filter(r => r.is_present).length}
              </div>
              <div className="text-sm text-gray-600">حاضر</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-red-600">
                {attendanceRecords.filter(r => r.is_Acsent).length}
              </div>
              <div className="text-sm text-gray-600">هارب</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-blue-600">
                {attendanceRecords.filter(r => r.is_Excus).length}
              </div>
              <div className="text-sm text-gray-600">غائب</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {attendanceRecords.filter(r => r.is_late).length}
              </div>
              <div className="text-sm text-gray-600">متأخر</div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Status */}
      {selectedClass &&  attendanceRecords.length > 0 && (
        <div className="card">
          <div className="card-body">
            {/* Class and Subject Info */}
            <div className="mb-4 pb-4 border-b border-gray-200">
      
              
              {/* All Class Periods with Subjects */}
              <div className="mt-4">
                <h4 className="text-lg font-medium text-gray-700 mb-3"> الحصص اليومية المسجلة:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
                  {classTimeOptions.map((option) => {
                    const isCurrentPeriod = option.value === selectedTime;
                    // Get subject data from class_time_data
                    const periodData = classAttendance?.class_time_data?.[option.value];
                    const periodSubjects = periodData?.subjects || [];
                    const firstSubject = periodSubjects[0]; // Get the first subject if multiple exist
                    
                    return (
                      <div
                        key={option.value}
                        className={`p-2 rounded-lg border text-center ${
                          isCurrentPeriod
                            ? 'bg-primary-50 border-primary-200 text-primary-800'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        <div className="text-xs font-medium">
                          الحصة {option.value}
                        </div>
                    
                        {firstSubject && (
                          <div className={`text-xs font-semibold mt-1 ${
                            isCurrentPeriod ? 'text-primary-600' : 'text-gray-700'
                          }`}>
                            {firstSubject.subject_name}
                          </div>
                        )}
                        {periodSubjects.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            +{periodSubjects.length - 1} مادة أخرى
                          </div>
                        )}
                        {!firstSubject && (
                          <div className="text-xs mt-1 text-red-500">
                           غير مسجلة
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Current Period Highlight */}
                <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-primary-800">
                        الحصة الحالية: {selectedTime}
                      </span>
                      <span className="text-sm text-primary-600 mr-2">
                        ({classTimeOptions.find(opt => opt.value === selectedTime)?.label})
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-primary-700">
                      {(() => {
                        // Get current period data from class_time_data
                        const currentPeriodData = classAttendance?.class_time_data?.[selectedTime];
                        const currentPeriodSubjects = currentPeriodData?.subjects || [];
                        const firstCurrentSubject = currentPeriodSubjects[0];
                        
                        if (firstCurrentSubject) {
                          return firstCurrentSubject.subject_name;
                        } else if (selectedSubject) {
                          // Fallback to selected subject if no data in class_time_data
                          return subjects?.find(s => s.id === parseInt(selectedSubject))?.name || 'غير محدد';
                        } else {
                          return 'غير محدد';
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Warning for Existing Subject */}
                {(() => {
                  const currentPeriodData = classAttendance?.class_time_data?.[selectedTime];
                  const currentPeriodSubjects = currentPeriodData?.subjects || [];
                  const firstCurrentSubject = currentPeriodSubjects[0];
                  const selectedSubjectName = subjects?.find(s => s.id === parseInt(selectedSubject))?.name;
                  
                  // Show warning if there's an existing subject and user has selected a different subject
                  if (firstCurrentSubject && selectedSubject && firstCurrentSubject.subject_id !== parseInt(selectedSubject)) {
                    return (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 ml-2 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-yellow-900">
                              تحذير: الحصة {selectedTime} مسجلة بالفعل
                            </h4>
                            <div className="mt-1 text-sm text-yellow-700">
                              <p>هذه الحصة مسجلة بالفعل للمادة: <span className="font-semibold">{firstCurrentSubject.subject_name}</span></p>
                              <p className="mt-1">المادة المحددة حالياً: <span className="font-semibold">{selectedSubjectName}</span></p>
                              <p className="mt-1 text-xs">يرجى التأكد من اختيار الحصة الصحيحة أو تغيير المادة المحددة.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Show info if there's an existing subject and user has selected the same subject
                  if (firstCurrentSubject && selectedSubject && firstCurrentSubject.subject_id === parseInt(selectedSubject)) {
                    return (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 ml-2 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-green-800">
                              متطابق: الحصة {selectedTime} صحيحة
                            </h4>
                            <div className="mt-1 text-sm text-green-700">
                              <p>هذه الحصة مسجلة للمادة: <span className="font-semibold">{firstCurrentSubject.subject_name}</span></p>
                              <p className="mt-1 text-xs">يمكنك متابعة تسجيل الحضور لهذه المادة.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </div>

            {/* Validation Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {allStudentsMarked() ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-medium text-green-900">جاهز للحفظ</h3>
                      <p className="text-sm text-green-700">تم تحديد حالة الحضور لجميع الطلاب</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                    <div>
                      <h3 className="text-lg font-medium text-orange-900">يحتاج إلى إكمال</h3>
                      <p className="text-sm text-orange-700">
                        {getUnmarkedCount()} طالب لم يتم تحديد حالة الحضور له
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {attendanceRecords.length - getUnmarkedCount()}/{attendanceRecords.length}
                </div>
                <div className="text-sm text-gray-600">طلاب مكتملين</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      {selectedClass && selectedSubject && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">
              قائمة الطلاب - {formatDate(selectedDate, 'dd/MM/yyyy', 'ar-OM')}
            </h3>
          </div>
          <div className="card-body">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="mr-3 text-gray-500">جاري تحميل الطلاب...</span>
              </div>
            ) : classStudents && classStudents.length > 0 ? (
              <>
                {/* Desktop/Tablet Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="table text-right">
                    <thead className="table-header text-right sticky top-0 z-10 bg-white shadow-md">
                      <tr>
                        <th className="table-header-cell text-right">اسم الطالب</th>
                       
                        
                        
                        {/* Class Numbers Header */}
                        {classAttendance?.class_time_data && Object.keys(classAttendance.class_time_data).length > 0 && (
                          <th className="table-header-cell text-center">
                          حصص الغياب/هروب/تأخير
                          </th>
                        )}
                        <th className="table-header-cell text-right text-center">الحالة الحالية</th>
                        
                        {!isViewMode && (
                          <>
                            <th className="table-header-cell text-right">حاضر</th>
                            <th className="table-header-cell text-right">هارب</th>
                            <th className="table-header-cell text-right">غائب</th>
                            <th className="table-header-cell text-right">متأخر</th>
                            <th className="table-header-cell text-right">ملاحظة العذر</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {attendanceRecords.map((record, index) => {
                        const student = classStudents.find(s => s.id === record.student_id);
                        const status = getAttendanceStatus(record);
                        const isUnmarked = !(record.is_present || record.is_Acsent || record.is_Excus || record.is_late);
                        
                        if (!student) return null;
                        
                        return (
                          <tr key={record.student_id} className={isUnmarked ? 'bg-orange-50 border-l-4 border-orange-400' : ''}>
                            <td className="table-cell">
                              <div className="flex items-center">
                                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                                  <Users className="h-4 w-4 text-primary-600" />
                                </div>
                                <span className="mr-2 text-sm font-medium text-gray-900">
                                  {student.fullName}
                                </span>
                              </div>
                            </td>
                        
                            
                            
                            {/* Class Numbers - Only show for absent, excused, or late students */}
                            {classAttendance?.class_time_data && Object.keys(classAttendance.class_time_data).length > 0 && (
                              <td className="table-cell text-center">
                                {(() => {
                                  const problemPeriods = [];
                                  
                                  Object.entries(classAttendance.class_time_data).forEach(([timeNum, timeData]) => {
                                    const studentAttendance = timeData.attendance?.find(a => a.student_id === record.student_id);
                                    
                                    if (studentAttendance && (studentAttendance.is_absent || studentAttendance.is_late || studentAttendance.is_excused)) {
                                      let color = 'text-gray-600';
                                      if (studentAttendance.is_absent) {
                                        color = 'text-red-600 font-semibold';
                                      } else if (studentAttendance.is_late) {
                                        color = 'text-yellow-600 font-semibold';
                                      } else if (studentAttendance.is_excused) {
                                        color = 'text-blue-600 font-semibold';
                                      }
                                      
                                      problemPeriods.push({
                                        number: timeNum,
                                        color: color
                                      });
                                    }
                                  });
                                  
                                  if (problemPeriods.length > 0) {
                                    return (
                                      <div className="flex flex-wrap justify-center gap-1">
                                        {problemPeriods.map((period, index) => (
                                          <span key={period.number} className={`text-sm ${period.color} px-1`}>
                                            {period.number}
                                            {index < problemPeriods.length - 1 && <span className="text-gray-400">,</span>}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  } else {
                                    return <span className="text-gray-400">-</span>;
                                  }
                                })()}
                              </td>
                            )}
                            <td className="table-cell">
                              <span className={`badge badge-${status.color === 'green' ? 'success' : 
                                status.color === 'red' ? 'danger' : 
                                status.color === 'blue' ? 'info' : 
                                status.color === 'yellow' ? 'warning' : 'info'}`}>
                                {status.text}
                              </span>
                            </td>
                            {!isViewMode && (
                              <>
                                <td className="table-cell">
                                  <label className="flex items-center justify-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={record.is_present}
                                      onChange={(e) => handleAttendanceChange(record.student_id, 'is_present', e.target.checked)}
                                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                    />
                                  </label>
                                </td>
                                <td className="table-cell">
                                  <label className="flex items-center justify-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={record.is_Acsent}
                                      onChange={(e) => handleAttendanceChange(record.student_id, 'is_Acsent', e.target.checked)}
                                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                                    />
                                  </label>
                                </td>
                                <td className="table-cell">
                                  <label className="flex items-center justify-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={record.is_Excus}
                                      onChange={(e) => handleAttendanceChange(record.student_id, 'is_Excus', e.target.checked)}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                    />
                                  </label>
                                </td>
                                <td className="table-cell">
                                  <label className="flex items-center justify-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={record.is_late}
                                      onChange={(e) => handleAttendanceChange(record.student_id, 'is_late', e.target.checked)}
                                      className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-2"
                                    />
                                  </label>
                                </td>
                                <td className="table-cell">
                                  <input
                                    type="text"
                                    value={record.ExcusNote}
                                    onChange={(e) => handleAttendanceChange(record.student_id, 'ExcusNote', e.target.value)}
                                    placeholder="ملاحظة العذر"
                                    className="input text-sm"
                                    disabled={!record.is_Excus}
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  <div className="space-y-2">
                    {attendanceRecords.map((record, index) => {
                      const student = classStudents.find(s => s.id === record.student_id);
                      const status = getAttendanceStatus(record);
                      const isUnmarked = !(record.is_present || record.is_Acsent || record.is_Excus || record.is_late);
                      
                      if (!student) return null;
                      
                      return (
                        <div key={record.student_id} className={`bg-white border rounded-lg p-3 shadow-sm ${
                          isUnmarked ? 'border-orange-400 border-l-4 bg-orange-50' : 'border-gray-200'
                        }`}>
                          {/* Student Info */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {student.fullName}
                              </h3>
                              {student.phone_number && (
                                <p className="text-xs text-gray-500 truncate">
                                  {student.phone_number}
                                </p>
                              )}
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                status.color === 'green' ? 'bg-green-100 text-green-800' : 
                                status.color === 'red' ? 'bg-red-100 text-red-800' : 
                                status.color === 'blue' ? 'bg-blue-100 text-blue-800' : 
                                status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {status.text}
                              </span>
                            </div>
                          </div>

                          {/* Class Numbers - Only show for absent, excused, or late students */}
                          {classAttendance?.class_time_data && Object.keys(classAttendance.class_time_data).length > 0 && (
                            <div className="mb-2">
                              {(() => {
                                const problemPeriods = [];
                                
                                Object.entries(classAttendance.class_time_data).forEach(([timeNum, timeData]) => {
                                  const studentAttendance = timeData.attendance?.find(a => a.student_id === record.student_id);
                                  
                                  if (studentAttendance && (studentAttendance.is_absent || studentAttendance.is_late || studentAttendance.is_excused)) {
                                    let bgColor = 'bg-gray-100';
                                    let textColor = 'text-gray-700';
                                    
                                    if (studentAttendance.is_absent) {
                                      bgColor = 'bg-red-100';
                                      textColor = 'text-red-700';
                                    } else if (studentAttendance.is_late) {
                                      bgColor = 'bg-yellow-100';
                                      textColor = 'text-yellow-700';
                                    } else if (studentAttendance.is_excused) {
                                      bgColor = 'bg-blue-100';
                                      textColor = 'text-blue-700';
                                    }
                                    
                                    problemPeriods.push({
                                      number: timeNum,
                                      bgColor: bgColor,
                                      textColor: textColor
                                    });
                                  }
                                });
                                
                                if (problemPeriods.length > 0) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-500">حصص الغياب:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {problemPeriods.map((period) => (
                                          <span key={period.number} className={`text-xs px-1.5 py-0.5 rounded ${period.bgColor} ${period.textColor} font-medium`}>
                                            {period.number}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}

                          {/* Attendance Options */}
                          {!isViewMode && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1">
                                <label className="flex items-center p-1.5 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                                  <input
                                    type="checkbox"
                                    checked={record.is_present}
                                    onChange={(e) => handleAttendanceChange(record.student_id, 'is_present', e.target.checked)}
                                    className="w-3.5 h-3.5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-1 ml-1.5"
                                  />
                                  <span className="text-xs text-green-600">حاضر</span>
                                </label>
                                <label className="flex items-center p-1.5 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                                  <input
                                    type="checkbox"
                                    checked={record.is_Acsent}
                                    onChange={(e) => handleAttendanceChange(record.student_id, 'is_Acsent', e.target.checked)}
                                    className="w-3.5 h-3.5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-1 ml-1.5"
                                  />
                                  <span className="text-xs text-red-600">هارب</span>
                                </label>
                                <label className="flex items-center p-1.5 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                                  <input
                                    type="checkbox"
                                    checked={record.is_Excus}
                                    onChange={(e) => handleAttendanceChange(record.student_id, 'is_Excus', e.target.checked)}
                                    className="w-3.5 h-3.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-1 ml-1.5"
                                  />
                                  <span className="text-xs text-blue-600">غائب</span>
                                </label>
                                <label className="flex items-center p-1.5 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                                  <input
                                    type="checkbox"
                                    checked={record.is_late}
                                    onChange={(e) => handleAttendanceChange(record.student_id, 'is_late', e.target.checked)}
                                    className="w-3.5 h-3.5 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 focus:ring-1 ml-1.5"
                                  />
                                  <span className="text-xs text-yellow-600">متأخر</span>
                                </label>
                              </div>
                              
                              {/* Excuse Note */}
                              {record.is_Excus && (
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    value={record.ExcusNote}
                                    onChange={(e) => handleAttendanceChange(record.student_id, 'ExcusNote', e.target.value)}
                                    placeholder="ملاحظة العذر..."
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد طلاب في هذا الفصل</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-blue-600 ml-3" />
              <h3 className="text-lg font-semibold text-gray-900">تأكيد تسجيل الحضور</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">هل أنت متأكد من تسجيل الحضور للبيانات التالية؟</p>
              
              {/* Warning for Subject Mismatch */}
              {(() => {
                const currentPeriodData = classAttendance?.class_time_data?.[selectedTime];
                const currentPeriodSubjects = currentPeriodData?.subjects || [];
                const firstCurrentSubject = currentPeriodSubjects[0];
                const selectedSubjectName = subjects?.find(s => s.id === parseInt(selectedSubject))?.name;
                
                // Show warning if there's an existing subject and user has selected a different subject
                if (firstCurrentSubject && selectedSubject && firstCurrentSubject.subject_id !== parseInt(selectedSubject)) {
                  return (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 ml-2 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-900">
                            تحذير: الحصة {selectedTime} مسجلة بالفعل
                          </h4>
                          <div className="mt-1 text-sm text-red-700">
                            <p>هذه الحصة مسجلة بالفعل للمادة: <span className="font-semibold">{firstCurrentSubject.subject_name}</span></p>
                            <p className="mt-1">المادة المحددة حالياً: <span className="font-semibold">{selectedSubjectName}</span></p>
                            <p className="mt-1 text-xs">يرجى التأكد من اختيار الحصة الصحيحة أو تغيير المادة المحددة.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">التاريخ:</span>
                  <span className="text-sm text-gray-900">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">الفصل:</span>
                  <span className="text-sm text-gray-900">
                    {classes?.find(c => c.id === parseInt(selectedClass))?.name || 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">المادة:</span>
                  <span className="text-sm text-gray-900">
                    {subjects?.find(s => s.id === parseInt(selectedSubject))?.name || 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">الحصة:</span>
                  <span className="text-sm text-gray-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">عدد الطلاب:</span>
                  <span className="text-sm text-gray-900">{attendanceRecords.length}</span>
                </div>
              </div>
              
              {/* Validation Status */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <CheckCircle className="h-4 w-4 text-blue-600 ml-2" />
                  <h4 className="text-sm font-medium text-blue-900">حالة التحقق</h4>
                </div>
                
                {/* Mobile-friendly compact layout */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {(() => {
                    const unmarkedStudents = attendanceRecords.filter(record => {
                      const hasStatus = record.is_present || record.is_Acsent || record.is_Excus || record.is_late;
                      return !hasStatus;
                    });
                    
                    const presentCount = attendanceRecords.filter(r => r.is_present).length;
                    const absentCount = attendanceRecords.filter(r => r.is_Acsent).length;
                    const excusedCount = attendanceRecords.filter(r => r.is_Excus).length;
                    const lateCount = attendanceRecords.filter(r => r.is_late).length;
                    
                    return (
                      <>
                        <div className="text-center p-2 bg-green-100 rounded">
                          <div className="text-lg font-bold text-green-700">{presentCount}</div>
                          <div className="text-xs text-green-600">حاضر</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 rounded">
                          <div className="text-lg font-bold text-red-700">{absentCount}</div>
                          <div className="text-xs text-red-600">غائب</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-100 rounded">
                          <div className="text-lg font-bold text-yellow-700">{lateCount}</div>
                          <div className="text-xs text-yellow-600">متأخر</div>
                        </div>
                        <div className="text-center p-2 bg-blue-100 rounded">
                          <div className="text-lg font-bold text-blue-700">{excusedCount}</div>
                          <div className="text-xs text-blue-600">معذور</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Summary row */}
                <div className="flex justify-between items-center text-xs text-blue-800 pt-2 border-t border-blue-300">
                  <span>إجمالي الطلاب:</span>
                  <span className="font-semibold text-lg">{attendanceRecords.length}</span>
                </div>
                
                {/* Unmarked students warning */}
                {(() => {
                  const unmarkedStudents = attendanceRecords.filter(record => {
                    const hasStatus = record.is_present || record.is_Acsent || record.is_Excus || record.is_late;
                    return !hasStatus;
                  });
                  
                  if (unmarkedStudents.length > 0) {
                    return (
                      <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded text-center">
                        <span className="text-xs text-orange-700">
                          ⚠️ {unmarkedStudents.length} طالب غير محدد
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            
            <div className="flex items-center justify-between space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="btn btn-outline ml-2"
              >
                إلغاء
              </button>
              <button
                onClick={confirmSubmit}
                disabled={takeAttendanceMutation.isLoading}
                className="btn btn-primary"
              >
                {takeAttendanceMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="mr-2">جاري التسجيل...</span>
                  </>
                ) : (
                  'تأكيد التسجيل'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    
    </div>
  );
};

export default Attendance;

