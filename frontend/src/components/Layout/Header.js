import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, LogOut, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDisplayName } from '../../utils/helpers';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
      className={`bg-white border-b border-gray-200 transition-all duration-300 ease-in-out ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
      } ${isScrolled ? 'shadow-md' : 'shadow-sm'}`} 
      dir="rtl"
    >
      <div className="flex items-center justify-between px-4 py-2 lg:px-6 lg:py-3">
        {/* Right side - Menu button and title */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="text-right ml-4 lg:ml-6">
            <p className="text-sm lg:text-base font-medium text-gray-900 truncate max-w-[200px] lg:max-w-[400px]">{user?.school_name}</p>
            <p className="text-xs lg:text-sm text-gray-500">{getRoleDisplayName(user?.role)}</p>
          </div>
        </div>

        {/* Left side - User menu */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => navigate('/app/version-features')}
            className="p-1.5 lg:p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center gap-1.5 transition-colors duration-200"
            title="ميزات الإصدارات"
          > 
            <Star className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="text-xs lg:text-sm hidden sm:inline">ميزات الإصدارات</span>
          </button>
          
          <button
            onClick={logout}
            className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center gap-1.5"
            title="تسجيل الخروج"
          > 
            <LogOut className="h-4 w-4 lg:h-5 lg:w-5 text-red-700" />
            <span className="text-xs lg:text-sm hidden sm:inline">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
