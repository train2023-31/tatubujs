import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Plus } from 'lucide-react';
import { useAddToHomeScreen } from '../../hooks/useAddToHomeScreen';
import toast from 'react-hot-toast';

const AddToHomeScreen = () => {
  const {
    canInstall,
    isIOS,
    isStandalone,
    showIOSInstructions,
    promptToInstall,
    showIOSInstallInstructions,
    setShowIOSInstructions,
  } = useAddToHomeScreen();

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user dismissed the prompt in this session
    const hidePrompt = sessionStorage.getItem('hideAddToHomeScreen');
    if (!hidePrompt && canInstall && !isStandalone) {
      // Show after a delay to not interrupt user
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Show after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [canInstall, isStandalone]);

  // Don't show if already installed or can't install
  if (isStandalone || !canInstall || !isVisible) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      showIOSInstallInstructions();
    } else {
      const accepted = await promptToInstall();
      if (accepted) {
        toast.success('تم إضافة التطبيق إلى الشاشة الرئيسية بنجاح!');
      }
    }
  };

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="تتبع" 
                className="w-12 h-12 rounded-lg object-contain"
              />
              <h3 className="text-lg font-bold text-gray-900">إضافة إلى الهاتف كتطبيق</h3>
            </div>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-700">اتبع هذه الخطوات لإضافة التطبيق إلى الشاشة الرئيسية:</p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">اضغط على زر المشاركة</p>
                  <p className="text-gray-600 text-sm mt-1">
                    ابحث عن زر <Share2 className="inline h-4 w-4" /> في أسفل الشاشة
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">اختر "إضافة إلى الشاشة الرئيسية"</p>
                  <p className="text-gray-600 text-sm mt-1">
                    ابحث عن خيار <Plus className="inline h-4 w-4" /> "إضافة إلى الشاشة الرئيسية"
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">اضغط "إضافة"</p>
                  <p className="text-gray-600 text-sm mt-1">
                    سيتم إضافة التطبيق إلى الشاشة الرئيسية
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                💡 <strong>نصيحة:</strong> يمكنك الوصول إلى التطبيق مباشرة من الشاشة الرئيسية بعد الإضافة
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowIOSInstructions(false)}
            className="mt-6 w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
          >
            فهمت
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="تتبع" 
              className="w-12 h-12 rounded-lg object-contain"
            />
            <h3 className="text-lg font-bold text-gray-900">أضف التطبيق إلى الشاشة الرئيسية</h3>
          </div>
          <button
            onClick={() => {
              // Hide for this session
              sessionStorage.setItem('hideAddToHomeScreen', 'true');
              setIsVisible(false);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            احصل على وصول سريع وتجربة أفضل بإضافة التطبيق إلى الشاشة الرئيسية
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>فوائد الإضافة:</strong> وصول سريع، تجربة أفضل، وإشعارات مباشرة
            </p>
          </div>
          
          <button
            onClick={handleInstall}
            className="w-full bg-primary-600 text-white text-sm py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            إضافة الآن
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToHomeScreen;

