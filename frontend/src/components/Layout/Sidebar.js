import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BookOpen, 
  ClipboardList, 
  BarChart3, 
  User,
  X,
  Building,
  Newspaper,
  MessageSquare,
  Eye,
  Upload,
  FileText,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasRole } from '../../utils/helpers';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  // Navigation groups for better organization
  const navigationGroups = [
    {
      title: 'الرئيسية',
      items: [
        {
          name: 'لوحة التحكم',
          href: '/dashboard',
          icon: Home,
          roles: ['admin', 'school_admin', 'teacher'],
        },
      ]
    },
    {
      title: 'الإدارة',
      items: [
        {
          name: 'إدارة المدارس',
          href: '/schools',
          icon: Building,
          roles: ['admin'],
        },
        {
          name: 'إدارة المستخدمين',
          href: '/users',
          icon: Users,
          roles: ['admin', 'school_admin'],
        },
        {
          name: 'إدارة الفصول والمواد',
          href: '/classes',
          icon: BookOpen,
          roles: ['school_admin'],
        },
      ]
    },
    {
      title: 'الحضور',
      items: [
        {
          name: 'تسجيل الحضور',
          href: '/attendance',
          icon: ClipboardList,
          roles: ['teacher', 'school_admin'],
        },
        {
          name: 'تقارير الحضور',
          href: '/attendance-details',
          icon: Eye,
          roles: ['teacher', 'school_admin'],
        },
        {
          name: 'التقرير اليومي',
          href: '/daily-report',
          icon: FileText,
          roles: [ 'school_admin'],
        },
      ]
    },
    {
      title: 'التقارير',
      items: [
        {
          name: 'التقارير والإحصائيات',
          href: '/reports',
          icon: BarChart3,
          roles: ['admin', 'school_admin'],
        },
        
      ]
    },
    {
      title: 'الخدمات',
      items: [
        {
          name: 'إدارة الأخبار',
          href: '/news',
          icon: Newspaper,
          roles: ['admin', 'school_admin'],
        },
        {
          name: 'الرسائل النصية',
          href: '/sms',
          icon: MessageSquare,
          roles: ['school_admin'],
        },
        {
          name: 'رفع وتحديث البيانات',
          href: '/bulk-operations',
          icon: Upload,
          roles: ['school_admin'],
        },
        {
          name: 'حذف بيانات المدرسة',
          href: '/delete-school-data',
          icon: Trash2,
          roles: ['school_admin'],
        },
        {
          name: 'سجلات النظام',
          href: '/view-logs',
          icon: FileText,
          roles: ['admin', 'school_admin'],
        },
      ]
    },
    {
      title: 'الحساب',
      items: [
        {
          name: 'الملف الشخصي',
          href: '/profile',
          icon: User,
          roles: ['admin', 'school_admin', 'teacher'],
        },
      ]
    },
  ];

  // Filter navigation groups based on user roles
  const filteredNavigationGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => hasRole(user, item.roles))
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-72 sm:w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `} dir="rtl">
        <div className="flex items-center justify-between h-12 sm:h-16 px-4 sm:px-6 border-b border-gray-200">
          {/* Logo and System Name */}
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="تتبع" 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
            />
            <div className="text-right mr-3">
              <h2 className="text-sm sm:text-base zain-font">تتبع</h2>
              <p className="text-xs text-gray-500">نظام إدارة الحضور والغياب</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <nav className="mt-4 sm:mt-6 px-2 sm:px-3 overflow-y-auto h-full">
          <div className="space-y-4 sm:space-y-6">
            {filteredNavigationGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-1">
                {/* Group Title */}
                <h3 className="px-2 sm:px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.title}
                </h3>
                
                {/* Separator Line */}
                <div className="border-t border-gray-200 mx-2 sm:mx-3"></div>
                
                {/* Group Items */}
                <div className="space-y-0.5 sm:space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group mr-1 sm:mr-2 flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                            isActive
                              ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                      >
                        <Icon
                          className={`ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                            window.location.pathname === item.href
                              ? 'text-primary-500'
                              : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* User Info */}
        {/* <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{user?.school_name}</p>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
};

export default Sidebar;
