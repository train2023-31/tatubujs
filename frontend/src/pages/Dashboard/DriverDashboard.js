import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, AlertCircle, ArrowRight, ArrowLeft, Bus, User, History, QrCode, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { busAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';

const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch driver's bus
  const { data: driverBusData, isLoading: busLoading } = useQuery(
    ['driverBus', user?.user_id],
    () => busAPI.getDriverBus(),
    {
      enabled: !!user?.user_id,
      refetchInterval: 30000
    }
  );

  const bus = driverBusData?.bus;
  const busId = bus?.id;

  // Fetch current students on bus
  const { data: currentStudentsData, isLoading: currentStudentsLoading } = useQuery(
    ['currentStudentsOnBus', busId],
    () => busAPI.getCurrentStudentsOnBus(busId),
    {
      enabled: !!busId,
      refetchInterval: 10000 // Refresh every 10 seconds
    }
  );

  // Fetch today's scan logs
  const today = new Date().toISOString().split('T')[0];
  const { data: todayScans, isLoading: scansLoading } = useQuery(
    ['todayScans', busId, today],
    () => busAPI.getScans({ bus_id: busId, date: today, limit: 50 }),
    {
      enabled: !!busId,
      refetchInterval: 15000 // Refresh every 15 seconds
    }
  );

  // Fetch all assigned students
  const { data: assignedStudents, isLoading: assignedStudentsLoading } = useQuery(
    ['busStudents', busId],
    () => busAPI.getBusStudents(busId),
    {
      enabled: !!busId,
      refetchInterval: 60000 // Refresh every minute
    }
  );

  if (busLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  if (!driverBusData?.has_bus || !bus) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">لا توجد حافلة مسجلة</h3>
          <p className="text-gray-500">لم يتم تعيين حافلة لك. يرجى التواصل مع الإدارة.</p>
        </div>
      </div>
    );
  }

  const currentStudents = currentStudentsData?.students || [];
  const totalAssigned = assignedStudents?.length || 0;
  const onBusCount = currentStudents.length;
  const notOnBusCount = totalAssigned - onBusCount;
  const scansToday = Array.isArray(todayScans) ? todayScans : [];

  // Group scans by type
  const boardScans = scansToday.filter(s => s.scan_type === 'board').length;
  const exitScans = scansToday.filter(s => s.scan_type === 'exit').length;

  return (
    <div className="space-y-6">
      {/* Quick Access */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAccessCard
              title="مسح رموز QR"
              description="مسح رموز QR للطلاب للصعود والنزول"
              icon={QrCode}
              color="blue"
              onClick={() => navigate('/app/bus-scanner')}
            />
           
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          title="إجمالي الطلاب"
          value={totalAssigned}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="على الحافلة"
          value={onBusCount}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="غير موجودين"
          value={notOnBusCount}
          icon={AlertCircle}
          color="orange"
        />
        <StatCard
          title="صعود اليوم"
          value={boardScans}
          icon={ArrowRight}
          color="green"
        />
        <StatCard
          title="نزول اليوم"
          value={exitScans}
          icon={ArrowLeft}
          color="red"
        />
      </div>

      {/* Bus Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bus Details */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-green-600" />
              <h3 className="card-title">معلومات الحافلة</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">رقم الحافلة</label>
                  <p className="text-gray-900 font-semibold text-lg">{bus.bus_number}</p>
                </div>
                <div>
                  <label className="label">اسم الحافلة</label>
                  <p className="text-gray-900 font-semibold text-lg">{bus.bus_name}</p>
                </div>
                <div>
                  <label className="label">رقم اللوحة</label>
                  <p className="text-gray-900">{bus.plate_number || 'غير محدد'}</p>
                </div>
                <div>
                  <label className="label">السعة</label>
                  <p className="text-gray-900">{bus.capacity} طالب</p>
                </div>
                {bus.location && (
                  <div className="col-span-2">
                    <label className="label">موقع الحافلة</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-gray-900">{bus.location}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">معدل الإشغال</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {totalAssigned > 0 ? Math.round((onBusCount / totalAssigned) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${totalAssigned > 0 ? (onBusCount / totalAssigned) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Students on Bus */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h3 className="card-title">الطلاب على الحافلة</h3>
              </div>
              <span className="badge badge-success">{onBusCount}</span>
            </div>
          </div>
          <div className="card-body">
            {currentStudentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : currentStudents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentStudents.map((student, index) => (
                  <div key={student.id || index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{student.fullName || student.username}</p>
                        {student.class_name && (
                          <p className="text-xs text-gray-600">الفصل: {student.class_name}</p>
                        )}
                        {student.board_time && (
                          <p className="text-xs text-gray-500 mt-1">
                            صعد: {formatDate(student.board_time, 'HH:mm', 'ar')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد طلاب على الحافلة حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Scan Logs */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            <h3 className="card-title">سجل المسح اليوم</h3>
          </div>
        </div>
        <div className="card-body">
          {scansLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : scansToday.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scansToday.map((scan, index) => (
                <div key={scan.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      scan.scan_type === 'board' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {scan.scan_type === 'board' ? (
                        <ArrowRight className="h-6 w-6 text-green-600" />
                      ) : (
                        <ArrowLeft className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {scan.student_name || scan.student_username || 'طالب غير معروف'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(scan.scan_time, 'dd MMMM yyyy - HH:mm', 'ar')}
                      </p>
                      {scan.location && (
                        <p className="text-xs text-gray-500 mt-1">
                          الموقع: {scan.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`badge ${
                    scan.scan_type === 'board' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {scan.scan_type === 'board' ? 'صعود' : 'نزول'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد سجلات مسح اليوم</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Student Dashboard Component

export default DriverDashboard;
