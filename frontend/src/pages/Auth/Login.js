import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Lock, User, School, Users, BookOpen, ClipboardList, BarChart3, Smartphone, Shield, Clock, CheckCircle, Star, Zap } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data, event) => {
    event?.preventDefault(); // Prevent form refresh
    setLoginError(''); // Clear previous errors
    setIsSubmitting(true);
    
    try {
      const result = await login(data);
      
      // If login failed, show error message
      if (result && !result.success) {
        setLoginError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      setLoginError('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-cyan-100 to-cyan-200 animate-gradient-x"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-teal-100 via-violet-100 to-indigo-100 animate-gradient-x"></div>
   
      {/* Interactive Feature Hints */}
      <div className="absolute top-20 left-20 group cursor-pointer">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-300 animate-float">
          <Users className="h-6 w-6 text-white/70" />
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
            <p className="text-xs text-gray-700 whitespace-nowrap">إدارة المستخدمين</p>
          </div>
        </div>
      </div>

      <div className="absolute top-40 right-32 group cursor-pointer">
        <div className="w-14 h-14 bg-white/15 rounded-lg rotate-45 flex items-center justify-center hover:bg-white/25 transition-all duration-300 animate-float-reverse">
          <ClipboardList className="h-5 w-5 text-white/70 rotate-45" />
        </div>
        <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
            <p className="text-xs text-gray-700 whitespace-nowrap">تسجيل الحضور</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-32 left-16 group cursor-pointer">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300 animate-ping">
          <BarChart3 className="h-4 w-4 text-white/70" />
        </div>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
            <p className="text-xs text-gray-700 whitespace-nowrap">التقارير</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 right-20 group cursor-pointer">
        <div className="w-20 h-20 bg-white/10 rounded-lg rotate-12 flex items-center justify-center hover:bg-white/20 transition-all duration-300 animate-float">
          <Smartphone className="h-6 w-6 text-white/70 -rotate-12" />
        </div>
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
            <p className="text-xs text-gray-700 whitespace-nowrap">إشعارات SMS</p>
          </div>
        </div>
      </div>

      <div className="absolute top-60 left-1/2 group cursor-pointer">
        <div className="w-10 h-10 bg-white/25 rounded-full flex items-center justify-center hover:bg-white/35 transition-all duration-300 animate-float-reverse">
          <Shield className="h-4 w-4 text-white/70" />
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
            <p className="text-xs text-gray-700 whitespace-nowrap">الأمان</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-60 right-1/3 group cursor-pointer">
        <div className="w-16 h-16 bg-white/15 rounded-lg rotate-45 flex items-center justify-center hover:bg-white/25 transition-all duration-300 animate-float">
          <BookOpen className="h-5 w-5 text-white/70 -rotate-45" />
        </div>
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-white/30">
            <p className="text-xs text-gray-700 whitespace-nowrap">إدارة الفصول</p>
          </div>
        </div>
      </div>
     
      {/* Content */}
      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 ">
            <img 
              src="/logo.png" 
              alt="تتبع" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <h2 className="mt-6 text-3xl zain-font">
            تتبع
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            نظام إدارة المدرسة
          </p>
        </div>

        {/* System Features - Hidden by default, show on hover */}
        <div className="group relative">
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2  backdrop-blur-sm rounded-full border border-gray-400 cursor-pointer transition-all duration-300 hover:bg-white/30 hover:scale-105">
              <Star className="h-4 w-4  ml-2" />
              <span className="text-sm  font-medium">مميزات النظام</span>
              <Zap className="h-4 w-4  mr-2" />
            </div>
          </div>
          
          {/* Hidden Features Panel */}
          <div className="absolute top-full left-0 right-0 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 z-20">
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/30">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">مميزات نظام تتبع</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Feature 1 */}
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">إدارة الطلاب والمعلمين</h4>
                    <p className="text-xs text-gray-600 mt-1">إضافة وإدارة بيانات الطلاب والمعلمين بسهولة</p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">تسجيل الحضور</h4>
                    <p className="text-xs text-gray-600 mt-1">تسجيل حضور الطلاب والمعلمين يومياً</p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">إدارة الفصول والمواد</h4>
                    <p className="text-xs text-gray-600 mt-1">تنظيم الفصول الدراسية والمواد التعليمية</p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">التقارير والإحصائيات</h4>
                    <p className="text-xs text-gray-600 mt-1">تقارير مفصلة وإحصائيات شاملة</p>
                  </div>
                </div>

                {/* Feature 5 */}
                <div className="flex items-start space-x-3 p-3 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-cyan-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">إشعارات </h4>
                    <p className="text-xs text-gray-600 mt-1">إرسال إشعارات للآباء عبر الرسائل النصية / واتساب</p>
                  </div>
                </div>

                {/* Feature 6 */}
                <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">أمان وحماية</h4>
                    <p className="text-xs text-gray-600 mt-1">نظام أمان متقدم لحماية البيانات</p>
                  </div>
                </div>
              </div>

              {/* Additional Features */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    <CheckCircle className="h-3 w-3 ml-1" />
                    واجهة سهلة الاستخدام
                  </span>
                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    <Clock className="h-3 w-3 ml-1" />
                    متاح 24/7
                  </span>
                  <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    <Zap className="h-3 w-3 ml-1" />
                    سريع وموثوق
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/50 backdrop-blur-lg py-8 px-6 shadow-2xl rounded-2xl relative border border-white/30 text-right">
          {/* Loading Overlay */}
          {(isSubmitting || loading) && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-2 text-sm text-gray-600">جاري تسجيل الدخول...</p>
              </div>
            </div>
          )}
          
          <form 
            className="space-y-6" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
          >
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="label">
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative text-right">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('username', {
                    required: 'اسم المستخدم مطلوب',
                    minLength: {
                      value: 3,
                      message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
                    },
                  })}
                  type="text"
                  className={`input pr-10 ${errors.username ? 'input-error' : ''} text-right`}
                  placeholder="أدخل اسم المستخدم أو البريد الإلكتروني"
                  dir="ltr"
                  onChange={(e) => {
                    if (loginError) setLoginError('');
                    register('username').onChange(e);
                  }}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: 'كلمة المرور مطلوبة',
                    minLength: {
                      value: 6,
                      message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className={`input pr-10 pl-10 ${errors.password ? 'input-error' : ''} text-right`}
                  placeholder="أدخل كلمة المرور"
                  dir="ltr"
                  onChange={(e) => {
                    if (loginError) setLoginError('');
                    register('password').onChange(e);
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Login Error Message */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-red-800">
                      خطأ في تسجيل الدخول
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{loginError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full btn-primary btn-lg flex items-center justify-center"
              >
                {isSubmitting || loading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>
            </div>
          </form>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
             ب في حالة نسيان كلمة المرور، يرجى التواصل مع مدير النظام
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2024 نظام تتبع. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
