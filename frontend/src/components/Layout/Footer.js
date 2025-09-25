import React, { useState, useEffect } from 'react';
import { Heart, Mail, Phone, MapPin, Globe, ChevronUp } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show footer when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } 
      // Hide footer when scrolling down (but not at the very top)
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  return (
    <footer className={`bg-gray-900 text-white transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* System Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="تتبع" 
                className="h-8 w-8 object-contain"
              />
              <h3 className="text-lg font-bold mr-3 zain-font">تتبع</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              نظام إدارة الحضور والغياب المتطور للمدارس. يوفر حلولاً شاملة لإدارة الطلاب والمعلمين والفصول الدراسية.
            </p>
            <div className="flex items-center text-sm text-gray-400">
              <Heart className="h-4 w-4 text-red-500 mr-2" />
              <span>صُنع بحب في سلطنة عُمان</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">روابط سريعة</h4>
            <ul className="space-y-2">
              <li>
                <a href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm">
                  لوحة التحكم
                </a>
              </li>
              <li>
                <a href="/attendance" className="text-gray-300 hover:text-white transition-colors text-sm">
                  إدارة الحضور
                </a>
              </li>
              <li>
                <a href="/reports" className="text-gray-300 hover:text-white transition-colors text-sm">
                  التقارير
                </a>
              </li>
              <li>
                <a href="/classes" className="text-gray-300 hover:text-white transition-colors text-sm">
                  إدارة الفصول
                </a>
              </li>
              <li>
                <a href="/users" className="text-gray-300 hover:text-white transition-colors text-sm">
                  إدارة المستخدمين
                </a>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">المميزات</h4>
            <ul className="space-y-2">
              <li className="text-gray-300 text-sm">تتبع الحضور والغياب</li>
              <li className="text-gray-300 text-sm">إدارة الفصول والمواد</li>
              <li className="text-gray-300 text-sm">تقارير مفصلة</li>
              <li className="text-gray-300 text-sm">رسائل نصية</li>
              <li className="text-gray-300 text-sm">دعم متعدد المستخدمين</li>
              <li className="text-gray-300 text-sm">واجهة سهلة الاستخدام</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">معلومات التواصل</h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-300 text-sm">سلطنة عُمان</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-300 text-sm">info@tatubu.om</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-300 text-sm">+968 1234 5678</span>
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-300 text-sm">www.tatubu.om</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-400">
              © {currentYear} نظام تتبع. جميع الحقوق محفوظة.
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
              <a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a>
              <a href="#" className="hover:text-white transition-colors">الدعم الفني</a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Show Footer Button */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-4 left-4 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 ease-in-out z-50"
          title="إظهار التذييل"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
    </footer>
  );
};

export default Footer;
