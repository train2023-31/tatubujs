import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, Eye, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { timetableAPI, substitutionAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import NewsWidget from '../../components/UI/NewsWidget';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';

const TeacherDashboard = ({ teacherAttendance, loading, selectedDate, setSelectedDate, onNavigateToAttendance, onNavigateToAttendancesDetails }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch teacher timetable
  const { data: timetableData, isLoading: timetableLoading } = useQuery(
    ['teacherTimetable', user?.user_id || user?.id],
    () => timetableAPI.getMyTimetable(),
    {
      enabled: !!(user?.user_id || user?.id) && user?.role === 'teacher',
      refetchInterval: 300000, // Refetch every 5 minutes
      retry: 2
    }
  );
  
  // Fetch teacher substitutions
  const { data: substitutionData, isLoading: substitutionLoading } = useQuery(
    ['teacherSubstitutions', user?.user_id || user?.id],
    () => substitutionAPI.getTeacherSubstitutions(user?.user_id || user?.id),
    {
      enabled: !!(user?.user_id || user?.id) && user?.role === 'teacher',
      refetchInterval: 300000, // Refetch every 5 minutes
      retry: 2
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  const teacherData = teacherAttendance?.data?.[0];
  const timetable = timetableData?.timetable;
  const substitutions = substitutionData?.assignments || [];

  // Helper function to get the date for a specific day based on selectedDate
  const getDateForDay = (dayName) => {
    if (!selectedDate) return null;
    
    const selected = new Date(selectedDate);
    const dayOfWeek = selected.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map day names to JavaScript day numbers
    const dayNameMap = {
      'الأحد': 0,
      'الإثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5,
      'السبت': 6
    };
    
    // Find the target day number
    const targetDayNum = dayNameMap[dayName] !== undefined ? dayNameMap[dayName] : null;
    if (targetDayNum === null) return null;
    
    // Calculate the date for the target day in the same week
    const daysDiff = targetDayNum - dayOfWeek;
    const targetDate = new Date(selected);
    targetDate.setDate(selected.getDate() + daysDiff);
    
    return targetDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };
  
  // Helper function to get schedule for a slot, including substitutions
  // Returns both regular schedule and substitution if both exist
  const getScheduleForSlot = (dayId, periodId, dayName) => {
    if (!timetable || !timetable.schedules) return null;
    
    // Get the date for this day based on selectedDate
    const dayDate = dayName ? getDateForDay(dayName) : null;
    
    // Find regular schedule
    const regularSchedule = timetable.schedules.find(
      s => s.dayId === dayId && s.period === periodId
    );
    
    // Find substitution for this slot
    const substitution = substitutions.find(s => {
      // First match period
      const periodMatch = s.period_xml_id === periodId;
      if (!periodMatch) return false;
      
      // Match by assignment_date - ALL assignments now have this field
      if (s.assignment_date && dayDate) {
        // Normalize assignment_date to YYYY-MM-DD format
        let assignmentDateStr = s.assignment_date;
        if (typeof assignmentDateStr === 'string') {
          assignmentDateStr = assignmentDateStr.split('T')[0]; // Get date part only (YYYY-MM-DD)
        } else if (assignmentDateStr instanceof Date) {
          assignmentDateStr = assignmentDateStr.toISOString().split('T')[0];
        }
        
        // Normalize dayDate to YYYY-MM-DD format (it should already be in this format from getDateForDay)
        let dayDateStr = dayDate;
        if (typeof dayDate === 'string') {
          dayDateStr = dayDate.split('T')[0];
        } else if (dayDate instanceof Date) {
          dayDateStr = dayDate.toISOString().split('T')[0];
        }
        
        // Match ONLY by date
        return assignmentDateStr === dayDateStr;
      }
      
      // Fallback: If no date selected, fall back to day_xml_id matching (for backward compatibility)
      if (!dayDate) {
        const dayMatch = s.day_xml_id === dayId;
        return dayMatch && periodMatch;
      }
      
      // If we have a date but assignment doesn't have assignment_date, don't show it
      return false;
    });
    
    // If both exist, return combined object
    if (regularSchedule && substitution) {
      return {
        ...regularSchedule,
        className: regularSchedule.className,
        subjectName: regularSchedule.subjectName,
        isSubstitution: false,
        hasSubstitution: true,
        substitution: {
          ...substitution,
          className: substitution.class_name,
          subjectName: substitution.subject_name,
          isSubstitution: true,
          assignmentDate: substitution.assignment_date,
          substitutionStartDate: substitution.substitution_start_date,
          substitutionEndDate: substitution.substitution_end_date
        }
      };
    }
    
    // If only substitution exists
    if (substitution) {
      return {
        ...substitution,
        className: substitution.class_name,
        subjectName: substitution.subject_name,
        isSubstitution: true,
        assignmentDate: substitution.assignment_date,
        substitutionStartDate: substitution.substitution_start_date,
        substitutionEndDate: substitution.substitution_end_date
      };
    }
    
    // Otherwise return regular schedule
    return regularSchedule;
  };

  return (
    <div className="space-y-6">
      {/* News Widget */}
      <NewsWidget 
        limit={3} 
        onViewAll={() => navigate('/app/news')}
      />

      {/* Quick Access Cards */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <QuickAccessCard
              title="تسجيل الحضور"
              description="تسجيل حضور الطلاب للفصول اليوم"
              icon={ClipboardList}
              color="blue"
              onClick={onNavigateToAttendance}
            />
            <QuickAccessCard
              title="تقارير الحضور"
              description="عرض تفاصيل الحضور والغياب"
              icon={Eye}
              color="green"
              onClick={onNavigateToAttendancesDetails}
            />
        
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">إحصائيات الأسبوع</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Teacher Stats */}
      {teacherData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="الحصص المسجلة هذا الأسبوع"
            value={teacherData.recorded_class_sessions_this_week}
            icon={ClipboardList}
            color="blue"
          />
          <StatCard
            title="الحصص المطلوبة أسبوعياً"
            value={teacherData.week_Classes_Number || 0}
            icon={Calendar}
            color="green"
          />
          <StatCard
            title="نسبة الإنجاز"
            value={`${Math.round((teacherData.recorded_class_sessions_this_week / (teacherData.week_Classes_Number || 1)) * 100)}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      )}

      {/* Teacher Timetable */}
      {timetableLoading ? (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="mr-3 text-gray-500">جاري تحميل الجدول...</span>
            </div>
          </div>
        </div>
      ) : timetable ? (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-600" />
                <h3 className="text-lg font-medium text-gray-900">جدول الحصص</h3>
                {timetable.timetable_name && (
                  <span className="text-sm text-gray-500">- {timetable.timetable_name}</span>
                )}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>الحصة</span>
                      </div>
                    </th>
                    {timetable.days?.map(day => {
                      const dayDate = getDateForDay(day.name);
                      const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { 
                        day: 'numeric', 
                        month: 'short' 
                      }) : null;
                      
                      return (
                        <th
                          key={day.id}
                          className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[150px]"
                        >
                          <div>
                            <p className="font-medium">{day.name}</p>
                            {day.short && day.short !== day.name && (
                              <p className="text-xs text-gray-500 mt-1">{day.short}</p>
                            )}
                            {dateDisplay && (
                              <p className="text-xs text-blue-600 mt-1 font-medium">
                                {dateDisplay}
                              </p>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timetable.periods?.map(period => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 text-center border-b border-gray-200 sticky right-0 bg-white z-10">
                        <div className="font-medium text-gray-900">{period.number}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {period.startTime} - {period.endTime}
                        </div>
                      </td>
                      {timetable.days?.map(day => {
                        const schedule = getScheduleForSlot(day.id, period.id, day.name);
                        return (
                          <td
                            key={`${day.id}-${period.id}`}
                            className="px-3 py-4 text-center border-b border-gray-200"
                          >
                            {schedule ? (
                              <div className="space-y-2">
                                {/* Regular Schedule - Show if not substitution or if hasSubstitution is true */}
                                {(!schedule.isSubstitution || schedule.hasSubstitution) && (
                                  <div className="p-2 rounded-lg border bg-primary-50 border-primary-200">
                                    <p className="text-sm font-medium text-primary-900">
                                      {schedule.subjectName}
                                    </p>
                                    {schedule.className && (
                                      <p className="text-xs mt-1 text-primary-700">
                                        {schedule.className}
                                      </p>
                                    )}
                                    {schedule.classroomName && (
                                      <p className="text-xs mt-1 text-primary-600">
                                        {schedule.classroomName}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Substitution - Show if isSubstitution is true and not hasSubstitution */}
                                {schedule.isSubstitution && !schedule.hasSubstitution && (
                                  <div className="p-2 rounded-lg border bg-yellow-50 border-yellow-300">
                                    <span className="inline-block px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full mb-1">
                                      إحتياط
                                    </span>
                                    <p className="text-sm font-medium text-yellow-900">
                                      {schedule.subjectName}
                                    </p>
                                    {schedule.className && (
                                      <p className="text-xs mt-1 text-yellow-700">
                                        {schedule.className}
                                      </p>
                                    )}
                                    {schedule.classroomName && (
                                      <p className="text-xs mt-1 text-yellow-600">
                                        {schedule.classroomName}
                                      </p>
                                    )}
                                    {schedule.assignmentDate && (
                                      <p className="text-xs mt-1 text-yellow-600 font-medium">
                                        📅 {new Date(schedule.assignmentDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    )}
                                    {!schedule.assignmentDate && schedule.substitutionStartDate && schedule.substitutionEndDate && (
                                      <p className="text-xs mt-1 text-yellow-600">
                                        📅 {new Date(schedule.substitutionStartDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short'
                                        })} - {new Date(schedule.substitutionEndDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Additional Substitution - Show if both regular and substitution exist */}
                                {schedule.hasSubstitution && schedule.substitution && (
                                  <div className="p-2 rounded-lg border bg-yellow-50 border-yellow-300">
                                    <span className="inline-block px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full mb-1">
                                      إحتياط
                                    </span>
                                    <p className="text-sm font-medium text-yellow-900">
                                      {schedule.substitution.subjectName}
                                    </p>
                                    {schedule.substitution.className && (
                                      <p className="text-xs mt-1 text-yellow-700">
                                        {schedule.substitution.className}
                                      </p>
                                    )}
                                    {schedule.substitution.assignmentDate && (
                                      <p className="text-xs mt-1 text-yellow-600 font-medium">
                                        📅 {new Date(schedule.substitution.assignmentDate).toLocaleDateString('ar-SA', { 
                                          day: 'numeric', 
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>لا يوجد جدول نشط متاح</p>
              <p className="text-sm mt-2">يرجى التواصل مع الإدارة لتفعيل جدول الحصص</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


export default TeacherDashboard;
