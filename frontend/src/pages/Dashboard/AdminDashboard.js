import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, BarChart3, Newspaper, School, UserCheck, Building } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import QuickAccessCard from '../../components/Dashboard/QuickAccessCard';
import StatCard from '../../components/Dashboard/StatCard';
import NewsWidget from '../../components/UI/NewsWidget';

const AdminDashboard = ({ schoolStats, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
        <span className="mr-3 text-gray-500">جاري تحميل البيانات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Access Cards */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">الوصول السريع</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <QuickAccessCard
              title="إدارة المدارس"
              description="إدارة المدارس المسجلة في النظام"
              icon={Building}
              color="blue"
              onClick={() => navigate('/app/schools')}
            />
            <QuickAccessCard
              title="إدارة المستخدمين"
              description="إدارة المستخدمين والمعلمين"
              icon={Users}
              color="green"
              onClick={() => navigate('/app/users')}
            />
            <QuickAccessCard
              title="التقارير والإحصائيات"
              description="عرض التقارير والإحصائيات الشاملة"
              icon={BarChart3}
              color="purple"
              onClick={() => navigate('/app/reports')}
            />
            <QuickAccessCard
              title="إدارة الأخبار"
              description="إدارة الأخبار والإعلانات"
              icon={Newspaper}
              color="orange"
              onClick={() => navigate('/app/news')}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المدارس"
          value={schoolStats?.total_schools || 0}
          icon={School}
          color="blue"
        />
        <StatCard
          title="إجمالي الطلاب"
          value={schoolStats?.total_students || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="إجمالي المعلمين"
          value={schoolStats?.total_teachers || 0}
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="إجمالي الفصول"
          value={schoolStats?.total_classes || 0}
          icon={BookOpen}
          color="orange"
        />
      </div>

      {/* News Widget */}
      <NewsWidget limit={3} onViewAll={() => navigate('/app/news')} />

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">النشاط الأخير</h3>
        </div>
        <div className="card-body">
          <p className="text-gray-500">لا توجد أنشطة حديثة</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
