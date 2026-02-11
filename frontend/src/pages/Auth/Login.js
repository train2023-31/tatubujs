import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Lock, User, School, Users, BookOpen, ClipboardList, BarChart3, Smartphone, Shield, Clock, CheckCircle, Star, Zap, Home, ArrowRight, QrCode, Scan } from 'lucide-react';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Modal from '../../components/UI/Modal';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParentMode, setIsParentMode] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [hasScannedQR, setHasScannedQR] = useState(false);
  const scannerRef = useRef(null);
  const { login, loading } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  // Start/stop QR scanner when modal opens/closes
  useEffect(() => {
    if (showScanModal) {
      const scanner = new Html5QrcodeScanner(
        'login-qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );
      scanner.render(onScanSuccess, onScanError);
      scannerRef.current = scanner;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showScanModal]);

  const onScanSuccess = (decodedText) => {
    if (!decodedText || !decodedText.trim()) return;
    setValue('username', decodedText.trim(), { shouldValidate: true });
    setHasScannedQR(true);
    if (loginError) setLoginError('');
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setShowScanModal(false);
  };

  const clearScannedQR = () => {
    setValue('username', '', { shouldValidate: true });
    setHasScannedQR(false);
  };

  const onScanError = () => {
    // Ignore scan errors (no QR in frame)
  };

  const openScanModal = () => {
    setShowScanModal(true);
  };

  const closeScanModal = () => {
    setShowScanModal(false);
  };

  const onSubmit = async (data, event) => {
    event?.preventDefault(); // Prevent form refresh
    setLoginError(''); // Clear previous errors
    setIsSubmitting(true);
    
    try {
      const result = await login(data, isParentMode);
      
      if (result && result.success) {
        // Login successful - navigate based on role or parent mode
        if (isParentMode) {
          // Parent mode - go to dashboard for student pickup
          navigate('/app/dashboard');
        } else {
          const userRole = result.user?.role;
          
          if (userRole === 'driver') {
            // Redirect drivers directly to scanner
            navigate('/app/bus-scanner');
          } else {
            // Other roles go to dashboard
            navigate('/app/dashboard');
          }
        }
      } else {
        // Login failed - show error message
        setLoginError(result?.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
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
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-cyan-200 to-teal-200 animate-gradient-x"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-teal-200 via-blue-200 to-cyan-100 animate-gradient-x"></div>
   

     
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
          <h2 className="mt-6 text-3xl font-bold">
            تتبع
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            نظام إدارة الحضور والغياب
          </p>
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

          {/* Parent Mode Toggle */}
          <div className="mb-6 flex items-center justify-center space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={() => {
                setIsParentMode(!isParentMode);
                if (isParentMode) {
                  setHasScannedQR(false);
                  setValue('username', '');
                }
              }}
              className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-all ${
                isParentMode 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <QrCode className="h-5 w-5" />
              <span className="text-sm font-medium">
                {isParentMode ? 'تسجيل دخول ولي أمر' : 'تسجيل دخول عادي'}
              </span>
            </button>
          </div>
          
          <form 
            className="space-y-6" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
          >
            {/* Username Field — in parent mode: only scan QR (no username shown); otherwise normal input */}
            {isParentMode ? (
              <div>
                <label className="label">رمز الطالب</label>
                <input
                  {...register('username', {
                    required: isParentMode ? 'يرجى مسح رمز QR الخاص بالطالب' : 'اسم المستخدم مطلوب',
                    minLength: isParentMode ? undefined : { value: 3, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' },
                  })}
                  type="hidden"
                />
                {hasScannedQR ? (
                  <div className="flex items-center gap-2 p-4 rounded-lg border-2 border-green-200 bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-800">تم مسح رمز الطالب</span>
                    <button
                      type="button"
                      onClick={clearScannedQR}
                      className="mr-auto text-xs text-green-700 hover:text-green-900 underline"
                    >
                      مسح وإعادة المسح
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openScanModal}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors"
                  >
                    <Scan className="h-6 w-6" />
                    <span className="font-medium">امسح رمز QR الخاص بالطالب</span>
                  </button>
                )}
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="username" className="label">اسم المستخدم أو البريد الإلكتروني</label>
                <div className="relative text-right">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('username', {
                      required: 'اسم المستخدم مطلوب',
                      minLength: { value: 3, message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' },
                    })}
                    type="text"
                    id="username"
                    className={`input pr-10 ${errors.username ? 'input-error' : ''} text-right w-full`}
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
            )}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                {isParentMode ? 'رقم الهاتف (ولي الأمر)' : 'كلمة المرور'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {isParentMode ? (
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  {...register('password', {
                    required: isParentMode ? 'رقم الهاتف مطلوب' : 'كلمة المرور مطلوبة',
                    minLength: {
                      value: isParentMode ? 8 : 6,
                      message: isParentMode ? 'رقم الهاتف يجب أن يكون 8 أرقام على الأقل' : 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
                    },
                  })}
                  type={showPassword || isParentMode ? 'text' : 'password'}
                  className={`input pr-10 pl-10 ${errors.password ? 'input-error' : ''} text-right`}
                  placeholder={isParentMode ? 'أدخل رقم الهاتف' : 'أدخل كلمة المرور'}
                  dir="ltr"
                  onChange={(e) => {
                    if (loginError) setLoginError('');
                    register('password').onChange(e);
                  }}
                />
                {!isParentMode && (
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
                )}
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
          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-gray-600">
              في حالة نسيان كلمة المرور، يرجى التواصل مع مدير النظام
            </p>
            
            {/* Back to Home Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all duration-200"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة للصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2024 نظام تتبع. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>

      {/* QR Scan Modal */}
      <Modal
        isOpen={showScanModal}
        onClose={closeScanModal}
        title="مسح رمز QR"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            وجّه الكاميرا نحو رمز QR الخاص بالطالب. بعد المسح أدخل رقم الهاتف فقط
          </p>
          <div id="login-qr-reader" className="w-full rounded-lg overflow-hidden bg-gray-100 min-h-[250px]" />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={closeScanModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Login;
