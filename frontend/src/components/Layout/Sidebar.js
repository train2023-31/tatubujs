import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
  Trash2,
  Truck,
  Star,
  MessageCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  StickyNote,
  HelpCircle,
  UserCheck,
  ScrollText,
  GraduationCap,
  Phone,
  Database,
  Calendar,
  CheckSquare,
  Bus,
  QrCode,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasRole } from '../../utils/helpers';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Navigation groups for better organization
  const navigationGroups = [
    {
      id: 'main',
      title: 'الرئيسية',
      icon: Home,
      defaultExpanded: true,

      items: [
        {
          name: 'لوحة التحكم',
          href: '/app/dashboard',
          icon: Home,
          roles: ['admin', 'school_admin', 'teacher', 'data_analyst','student' , 'driver'],
        },
      ]
    },
    {
      id: 'school',
      title: 'المدرسة',
      icon: Building,
      defaultExpanded: false,
      items: [
        {
          name: 'إدارة المدارس',
          href: '/app/schools',
          icon: Building,
          roles: ['admin'],
        },
        {
          name: 'إدارة المستخدمين',
          href: '/app/users',
          icon: Users,
          roles: ['admin', 'school_admin'],
        },
        {
          name: 'إدارة الفصول والمواد',
          href: '/app/classes',
          icon: BookOpen,
          roles: ['school_admin'],
        },
        {
          name: 'إدارة الأخبار',
          href: '/app/news',
          icon: Newspaper,
          roles: ['admin', 'school_admin', 'data_analyst'],
        },
        
        {
          name: 'رفع وتحديث البيانات',
          href: '/app/bulk-operations',
          icon: Upload,
          roles: ['school_admin'],
        },
        {
          name: 'حذف بيانات المدرسة',
          href: '/app/delete-school-data',
          icon: Trash2,
          roles: ['school_admin'],
        },
        {
          name: 'إعدادات SMS',
          href: '/app/sms-configuration',
          icon: Phone,
          roles: ['school_admin'],
        },
        {
          name: 'إعدادات WhatsApp',
          href: '/app/whatsapp-configuration',
          icon: MessageSquare,
          roles: ['school_admin'],
        },
        {
          name: 'إرسال رسائل مخصصة',
          href: '/app/bulk-messaging',
          icon: MessageCircle,
          roles: ['admin', 'school_admin', 'data_analyst'],
        }
      ]
    },
    {
      id: 'students',
      title: 'الطلاب',
      icon: GraduationCap,
      defaultExpanded: false,
      items: [
        {
          name: 'تسجيل الحضور',
          href: '/app/attendance',
          icon: ClipboardList,
          roles: ['teacher', 'school_admin', 'data_analyst'],
        },
        {
          name: 'التقرير اليومي',
          href: '/app/daily-report',
          icon: Calendar,
          roles: ['school_admin', 'data_analyst'],
        },
        {
          name: 'تفاصيل الحضور',
          href: '/app/attendance-details',
          icon: Eye,
          roles: ['teacher', 'school_admin', 'data_analyst'],
        },
        {
          name: 'سجل ملاحظات الطالب',
          href: '/app/student-notes-log',
          icon: StickyNote,
          roles: ['school_admin', 'data_analyst'],
        },
        {
          name: 'طلبات الاستلام',
          href: '/app/pickup-display',
          icon: Truck,
          roles: ['school_admin', 'data_analyst'],
        },
        {
          name: 'رموز QR للطلاب',
          href: '/app/student-qrcodes',
          icon: QrCode,
          roles: ['school_admin', 'admin'],
        },
        
      ]
    },
    {
      id: 'teachers',
      title: 'المعلمين',
      icon: UserCheck,
      defaultExpanded: false,
      items: [
        
        {
          name: 'تقرير المعلمين',
          href: '/app/teacher-report',
          icon: UserCheck,
          roles: ['school_admin', 'data_analyst'],
        },
        {
          name: 'التقارير والإحصائيات',
          href: '/app/reports',
          icon: BarChart3,
          roles: ['admin', 'school_admin', 'data_analyst'],
        },
        {
          name: 'جدول الحصص',
          href: '/app/school-timetable',
          icon: CalendarDays,
          roles: ['admin', 'school_admin', 'data_analyst'],
        },
        {
          name: 'إحتياط المعلمين',
          href: '/app/teacher-substitution',
          icon: UserCheck,
          roles: ['admin', 'school_admin', 'data_analyst'],
        },
       
      ]
    },
    {
      id: 'bus',
      title: 'الحافلات',
      icon: Bus,
      defaultExpanded: false,
      items: [
        {
          name: 'إدارة الحافلات',
          href: '/app/buses',
          icon: Bus,
          roles: ['school_admin', 'admin'],
        },
        {
          name: 'ماسح الحافلة',
          href: '/app/bus-scanner',
          icon: QrCode,
          roles: ['school_admin', 'admin', 'driver'],
        },
        {
          name: 'تقارير الحافلات',
          href: '/app/bus-reports',
          icon: FileText,
          roles: ['school_admin', 'admin', 'data_analyst'],
        },
       
      ]
    },
    {
      id: 'system',
      title: 'النظام',
      icon: Settings,
      defaultExpanded: false,
      items: [
        {
          name: 'دليل الاستخدام',
          href: '/app/guide',
          icon: HelpCircle,
          roles: ['school_admin'],
        },
        {
          name: 'سجلات النظام',
          href: '/app/view-logs',
          icon: ScrollText,
          roles: ['admin', 'school_admin', 'data_analyst'],
        },
        {
          name: 'الملف الشخصي',
          href: '/app/profile',
          icon: User,
          roles: ['admin', 'school_admin', 'teacher', 'data_analyst','student'],
        },
        // {
        //   name: 'ميزات الإصدارات',
        //   href: '/app/version-features',
        //   icon: Star,
        //   roles: ['admin', 'school_admin', 'teacher', 'data_analyst'],
        // },
      ]
    },
  ];

  // Initialize expanded categories based on defaultExpanded
  useEffect(() => {
    const initialExpanded = new Set();
    navigationGroups.forEach(group => {
      if (group.defaultExpanded) {
        initialExpanded.add(group.id);
      }
    });
    setExpandedCategories(initialExpanded);
  }, []);

  // Auto-expand category if current route matches an item in it
  useEffect(() => {
    navigationGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => 
        location.pathname === item.href && hasRole(user, item.roles)
      );
      if (hasActiveItem) {
        setExpandedCategories(prev => new Set([...prev, group.id]));
      }
    });
  }, [location.pathname, user]);

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

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
          <Link to="/app/home" className="flex items-center hover:opacity-80 transition-opacity duration-200">
            <img 
              src="/logo.png" 
              alt="تتبع" 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
            />
            <div className="text-right mr-3">
              <h2 className="text-sm sm:text-base zain-font">تتبع</h2>
              <p className="text-xs text-gray-500">نظام إدارة الحضور والغياب</p>
            </div>
          </Link>
          
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 sm:p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <nav className="mt-4 sm:mt-6 px-2 sm:px-3 overflow-y-auto h-full pb-20">
          <div className="space-y-2">
            {filteredNavigationGroups.map((group) => {
              // If category has only one item, render it as a direct menu item
              if (group.items.length === 1) {
                const item = group.items[0];
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={group.id}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                        isActive
                          ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon
                      className={`ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                        isActive
                          ? 'text-primary-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              }
              
              // If category has multiple items, render as expandable category
              const isExpanded = expandedCategories.has(group.id);
              const hasActiveItem = group.items.some(item => 
                location.pathname === item.href && hasRole(user, item.roles)
              );
              
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="space-y-1">
                  {/* Category Header - Clickable */}
                  <button
                    onClick={() => toggleCategory(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider rounded-md transition-colors duration-200 hover:bg-gray-100 ${
                      hasActiveItem ? 'bg-primary-50 text-primary-700' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {GroupIcon && (
                        <GroupIcon className={`h-5 w-5 flex-shrink-0 ${hasActiveItem ? 'text-primary-500' : 'text-gray-500'}`} />
                      )}
                      {group.title}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  
                  {/* Category Items - Collapsible */}
                  {isExpanded && (
                    <div className="space-y-0.5 sm:space-y-1 mr-2 border-b border-gray-200 pb-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `group flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                                isActive
                                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`
                            }
                          >
                            <Icon
                              className={`ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                                isActive
                                  ? 'text-primary-500'
                                  : 'text-gray-400 group-hover:text-gray-500'
                              }`}
                            />
                            <span className="truncate">{item.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
