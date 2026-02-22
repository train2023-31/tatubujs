import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { formatDate, getTodayAPI, getRoleDisplayName } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { reportsAPI } from '../../services/api';
import AdminDashboard from './AdminDashboard';
import SchoolAdminDashboard from './SchoolAdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import DriverDashboard from './DriverDashboard';
import StudentDashboard from './StudentDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getTodayAPI());
  const dashboardRef = useRef(null);

  // Navigation handlers
  const handleNavigateToAttendance = () => {
    navigate('/app/attendance');
  };

  const handleNavigateToAttendancesDetails = () => {
    navigate('/app/attendance-details');
  };

  // Check if school needs setup using bulk operations status
  const needsSetup = (bulkOpsStatus) => {
    if (!bulkOpsStatus) return false;
    return bulkOpsStatus.needs_setup || false;
  };

  // Fetch school statistics (only for non-student users)
  const { data: schoolStats, isLoading: statsLoading } = useQuery(
    ['schoolStats', selectedDate],
    () => reportsAPI.getSchoolStatistics({ date: selectedDate }),
    {
      enabled: !!user && user.role !== 'student',
      refetchInterval: 60000, // Refetch every 60 seconds
    }
  );

  // Fetch bulk operations status (only for non-student users)
  const { data: bulkOpsStatus, isLoading: bulkOpsLoading } = useQuery(
    ['bulkOpsStatus'],
    () => reportsAPI.getBulkOperationsStatus(),
    {
      enabled: !!user && user.role !== 'student',
      refetchInterval: 100000, // Refetch every 100 seconds
    }
  );

  // Fetch teacher attendance for the week
  const { data: teacherAttendance, isLoading: teacherLoading } = useQuery(
    ['teacherAttendance', selectedDate],
    () => reportsAPI.getTeacherAttendanceThisWeek({ date: selectedDate }),
    {
      enabled: !!user && (user.role === 'teacher' || user.role === 'school_admin' || user.role === 'data_analyst'),
      refetchInterval: 60000,
    }
  );

  // Get role-specific dashboard content
  const getDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard schoolStats={schoolStats} loading={statsLoading} />;
      case 'school_admin':
        return (
          <SchoolAdminDashboard 
            schoolStats={schoolStats} 
            teacherAttendance={teacherAttendance}
            statsLoading={statsLoading}
            teacherLoading={teacherLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToAttendancesDetails={handleNavigateToAttendancesDetails}
            needsSetup={needsSetup}
            bulkOpsStatus={bulkOpsStatus}
            bulkOpsLoading={bulkOpsLoading}
          />
        );
      case 'data_analyst':
        return (
          <SchoolAdminDashboard 
            schoolStats={schoolStats} 
            teacherAttendance={teacherAttendance}
            statsLoading={statsLoading}
            teacherLoading={teacherLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToAttendancesDetails={handleNavigateToAttendancesDetails}
            needsSetup={needsSetup}
            bulkOpsStatus={bulkOpsStatus}
            bulkOpsLoading={bulkOpsLoading}
          />
        );
      case 'teacher':
        return (
          <TeacherDashboard 
            teacherAttendance={teacherAttendance}
            loading={teacherLoading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateToAttendance={handleNavigateToAttendance}
            onNavigateToAttendancesDetails={ handleNavigateToAttendancesDetails}
          />
        );
      case 'student':
        return (
          <StudentDashboard 
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        );
      case 'driver':
        return (
          <DriverDashboard />
        );
      default:
        return <div>دور غير معروف</div>;
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
            مرحباً، {user?.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 truncate">
            {getRoleDisplayName(user?.role)} - {user?.school_name}
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
            {formatDate(new Date(), 'EEEE, dd MMMM yyyy', 'ar-OM')}
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      {getDashboardContent()}
    </div>
  );
};

export default Dashboard;




