import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, Star, RefreshCw, HelpCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDisplayName } from '../../utils/helpers';
import { useAddToHomeScreen } from '../../hooks/useAddToHomeScreen';
import NotificationBell from '../Notifications/NotificationBell';
import toast from 'react-hot-toast';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { canInstall, isIOS, isStandalone, promptToInstall, showIOSInstallInstructions } = useAddToHomeScreen();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show/hide header based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      
      // Update scroll state for shadow
      setIsScrolled(currentScrollY > 10);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header 
      className={`bg-white border-b border-gray-200 transition-all duration-300 ease-in-out relative z-50 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      } ${isScrolled ? 'shadow-md' : 'shadow-sm'}`} 
      dir="rtl"
    >
      <div className="flex items-center justify-between px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3">
        {/* Right side - Menu button and title */}
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="text-right ml-2 sm:ml-4 lg:ml-6 min-w-0">
            <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[200px] lg:max-w-[400px]"> {user?.school_name}</p>
            <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate">{getRoleDisplayName(user?.role)}</p>
          </div>
        </div>

        {/* Left side - User menu */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-shrink-0 flex-nowrap">

          {/* Notification Bell */}
          <div className="flex-shrink-0">
            <NotificationBell />
          </div>
          
          {/* Add to Home Screen button (mobile only) */}
          {canInstall && !isStandalone && (
            <button
              onClick={async () => {
                if (isIOS) {
                  showIOSInstallInstructions();
                } else {
                  const accepted = await promptToInstall();
                  if (accepted) {
                    toast.success('تم إضافة التطبيق إلى الشاشة الرئيسية بنجاح!');
                  }
                }
              }}
              className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center transition-colors duration-200 flex-shrink-0"
              title="إضافة إلى الشاشة الرئيسية"
            > 
              <Download className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="text-xs lg:text-sm hidden sm:inline mr-1">إضافة للتطبيق</span>
            </button>
          )}
          
          {/* Guide button */}
          <button
            onClick={() => navigate('/app/guide')}
            className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center transition-colors duration-200 flex-shrink-0"
            title="دليل الاستخدام"
          > 
            <HelpCircle className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="text-xs lg:text-sm hidden sm:inline mr-1">دليل الاستخدام</span>
          </button>
          
          {/* Refresh/Cache clear button */}
          <button
            onClick={async () => {
              try {
                toast.loading('جاري مسح ذاكرة التخزين المؤقت...', { id: 'cache-clear' });
                
                // Directly clear cache without confirmation (user clicked button intentionally)
                const cacheManager = await import('../../utils/cacheManager');
                
                if (cacheManager.default?.isMobileDevice()) {
                  // Mobile: Clear with cache busting URL
                  const timestamp = Date.now();
                  const currentUrl = new URL(window.location.href);
                  currentUrl.searchParams.set('cb', timestamp.toString());
                  currentUrl.searchParams.set('_', timestamp.toString());
                  
                  // Clear React Query cache first
                  if (window.queryClient) {
                    cacheManager.default.clearQueryCache(window.queryClient);
                  }
                  
                  // Reload with cache busting (this will bypass all caches)
                  window.location.replace(currentUrl.toString());
                } else {
                  // Desktop: Use full cache clearing
                  if (window.queryClient) {
                    cacheManager.default.clearQueryCache(window.queryClient);
                  }
                  await cacheManager.default.clearCacheAndReload();
                }
              } catch (error) {
                toast.error('فشل مسح ذاكرة التخزين المؤقت', { id: 'cache-clear' });
              }
            }}
            className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center transition-colors duration-200 flex-shrink-0"
            title="مسح ذاكرة التخزين المؤقت وتحديث الصفحة"
          > 
            <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="text-xs lg:text-sm hidden sm:inline mr-1">تحديث</span>
          </button>
          
          {/* Logout button */}
          <button
            onClick={logout}
            className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center flex-shrink-0"
            title="تسجيل الخروج"
          > 
            <LogOut className="h-4 w-4 lg:h-5 lg:w-5 text-red-700" />
            <span className="text-xs lg:text-sm hidden sm:inline mr-1">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
