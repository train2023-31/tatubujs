import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { User, Lock, Mail, Phone, Building, Save, Eye, EyeOff, MapPin, CreditCard, Calendar } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDisplayName, formatPhoneNumber } from '../../utils/helpers';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Set default tab based on user role
  useEffect(() => {
    if (user?.role === 'student') {
      setActiveTab('password');
    } else {
      setActiveTab('profile');
    }
  }, [user?.role]);

  // Profile update mutation
  const updateProfileMutation = useMutation(
    (data) => authAPI.updateUser(user.id, data),
    {
      onSuccess: (response) => {
        updateUser(response.data.user);
        queryClient.invalidateQueries('user');
        toast.success('تم تحديث الملف الشخصي بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تحديث الملف الشخصي');
      },
    }
  );

  // Password change mutation
  const changePasswordMutation = useMutation(
    (data) => authAPI.changePassword(data),
    {
      onSuccess: () => {
        toast.success('تم تغيير كلمة المرور بنجاح');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'فشل في تغيير كلمة المرور');
      },
    }
  );

  const tabs = [
    ...(user?.role !== 'student' ? [{ id: 'profile', name: 'الملف الشخصي' }] : []),
    { id: 'password', name: 'تغيير كلمة المرور' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الملف الشخصي</h1>
          <p className="text-gray-600">إدارة معلوماتك الشخصية وإعدادات الحساب</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-6">
            <div className="h-20 w-20 bg-primary-600 rounded-full flex items-center justify-center ml-2 mr-2">
              <User className="h-10 w-10 text-white ml-2 mr-2" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.fullName}</h2>
              <p className="text-gray-600">{getRoleDisplayName(user?.role)}</p>
              <p className="text-sm text-gray-500">{user?.school_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <ProfileForm
          user={user}
          onSubmit={updateProfileMutation.mutate}
          loading={updateProfileMutation.isLoading}
        />
      )}

      {activeTab === 'password' && (
        <PasswordForm
          onSubmit={changePasswordMutation.mutate}
          loading={changePasswordMutation.isLoading}
        />
      )}
    </div>
  );
};

// Profile Form Component
const ProfileForm = ({ user, onSubmit, loading }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      fullName: user?.fullName || '',
      phone_number: user?.phone_number || '',
      job_name: user?.job_name || '',
      week_Classes_Number: user?.week_Classes_Number || '',
      license_number: user?.license_number || '',
      license_expiry: user?.license_expiry ? user.license_expiry.split('T')[0] : '',
      location: user?.location || '',
    },
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">معلومات الملف الشخصي</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label className="label">
                <User className="h-4 w-4 inline mr-1" />
                اسم المستخدم
              </label>
              <input
                {...register('username', {
                  required: 'اسم المستخدم مطلوب',
                  disabled: true,
                  minLength: {
                    value: 3,
                    message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل',
                  },
                })}
                type="text"
                className={`input ${errors.username ? 'input-error' : ''}`}
                dir="ltr"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="label">
                <Mail className="h-4 w-4 inline mr-1" />
                البريد الإلكتروني
              </label>
              <input
                {...register('email', {
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'البريد الإلكتروني غير صحيح',
                  },
                })}
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                dir="ltr"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label className="label">الاسم الكامل</label>
              <input
                {...register('fullName', {
                  required: 'الاسم الكامل مطلوب',
                  minLength: {
                    value: 2,
                    message: 'الاسم يجب أن يكون حرفين على الأقل',
                  },
                })}
                type="text"
                className={`input ${errors.fullName ? 'input-error' : ''}`}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="label">
                <Phone className="h-4 w-4 inline mr-1" />
                رقم الهاتف
              </label>
              <input
                {...register('phone_number')}
                type="tel"
                className="input"
                placeholder="+968 XXXX XXXX"
                dir="ltr"
              />
            </div>

            {/* Teacher-specific fields */}
            {user?.role === 'teacher' && (
              <>
                <div>
                  <label className="label">
                    <Building className="h-4 w-4 inline mr-1" />
                    الوظيفة
                  </label>
                  <input
                    {...register('job_name')}
                    type="text"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">عدد الحصص الأسبوعية</label>
                  <input
                    {...register('week_Classes_Number', {
                      min: {
                        value: 0,
                        message: 'عدد الحصص يجب أن يكون أكبر من أو يساوي 0',
                      },
                    })}
                    type="number"
                    className={`input ${errors.week_Classes_Number ? 'input-error' : ''}`}
                  />
                  {errors.week_Classes_Number && (
                    <p className="mt-1 text-sm text-red-600">{errors.week_Classes_Number.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Driver-specific fields */}
            {user?.role === 'driver' && (
              <>
                <div>
                  <label className="label">
                    <CreditCard className="h-4 w-4 inline mr-1" />
                    رقم الرخصة
                  </label>
                  <input
                    {...register('license_number')}
                    type="text"
                    className="input"
                    placeholder="رقم رخصة القيادة"
                  />
                </div>

                <div>
                  <label className="label">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    تاريخ انتهاء الرخصة
                  </label>
                  <input
                    {...register('license_expiry')}
                    type="date"
                    className="input"
                  />
                </div>
              </>
            )}

            {/* Student-specific fields */}
            {user?.role === 'student' && (
              <div>
                <label className="label">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  المنطقة السكنية
                </label>
                <input
                  {...register('location')}
                  type="text"
                  className="input"
                  placeholder="المنطقة السكنية"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Password Form Component
const PasswordForm = ({ onSubmit, loading }) => {
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm();

  const newPassword = watch('new_password');

  const handleFormSubmit = (data) => {
    onSubmit(data);
    reset();
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">تغيير كلمة المرور</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="label">
              <Lock className="h-4 w-4 inline mr-1" />
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <input
                {...register('current_password', {
                  required: 'كلمة المرور الحالية مطلوبة',
                })}
                type={showPasswords.current ? 'text' : 'password'}
                className={`input pr-10 ${errors.current_password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.current ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.current_password && (
              <p className="mt-1 text-sm text-red-600">{errors.current_password.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="label">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                {...register('new_password', {
                  required: 'كلمة المرور الجديدة مطلوبة',
                  minLength: {
                    value: 8,
                    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم',
                  },
                })}
                type={showPasswords.new ? 'text' : 'password'}
                className={`input pr-10 ${errors.new_password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.new ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.new_password && (
              <p className="mt-1 text-sm text-red-600">{errors.new_password.message}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="label">تأكيد كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                {...register('confirm_new_password', {
                  required: 'تأكيد كلمة المرور مطلوب',
                  validate: (value) =>
                    value === newPassword || 'كلمة المرور غير متطابقة',
                })}
                type={showPasswords.confirm ? 'text' : 'password'}
                className={`input pr-10 ${errors.confirm_new_password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirm_new_password && (
              <p className="mt-1 text-sm text-red-600">{errors.confirm_new_password.message}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">متطلبات كلمة المرور:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• يجب أن تكون 8 أحرف على الأقل</li>
              <li>• يجب أن تحتوي على حرف كبير (A-Z)</li>
              <li>• يجب أن تحتوي على حرف صغير (a-z)</li>
              <li>• يجب أن تحتوي على رقم (0-9)</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="mr-2">جاري التغيير...</span>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  تغيير كلمة المرور
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;




