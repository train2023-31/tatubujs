import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Home.css';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  BarChart3,
  School,
  UserCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  LogOut,
  FileText,
  Newspaper,
  MessageSquare,
  Upload,
  Eye,
  Settings,
  Shield,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  Award,
  Target,
  Zap,
  Globe,
  Smartphone,
  Database,
  Lock,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Download,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Heart,
  ThumbsUp,
  MessageCircle,
  Share2,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hero section slides
  const heroSlides = [
    {
      title: "نظام إدارة الحضور والغياب الذكي",
      subtitle: "حل متكامل لإدارة حضور الطلاب والمعلمين في المدارس",
      description: "نظام تتبع متطور يوفر إدارة شاملة للحضور والغياب مع تقارير مفصلة وإشعارات فورية",
      image: "🎓",
      color: "from-blue-600 to-purple-600",
      backgroundImage: "https://i.pinimg.com/736x/d3/fd/30/d3fd3075a906198427ea0d7112c2f797.jpg"
    },
    {
      title: "تقارير وإحصائيات متقدمة",
      subtitle: "تحليلات شاملة لأداء الطلاب والمعلمين",
      description: "احصل على تقارير مفصلة وإحصائيات دقيقة تساعدك في اتخاذ القرارات الصحيحة",
      image: "📊",
      color: "from-green-600 to-teal-600",
      backgroundImage: "https://www.aljazeera.net/wp-content/uploads/2019/01/56718ca6-3b9b-4fb8-acc9-b1651a5d74b8.jpeg?resize=770%2C513&quality=80"
    },
    {
      title: "إشعارات فورية للآباء",
      subtitle: "تواصل مباشر مع أولياء الأمور",
      description: "إرسال رسائل نصية فورية للآباء عند غياب أو تأخر أبنائهم",
      image: "📱",
      color: "from-orange-600 to-red-600",
      backgroundImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
    }
  ];

  // Features data
  const features = [
    {
      icon: ClipboardList,
      title: "تسجيل الحضور الذكي",
      description: "نظام تسجيل حضور متطور يدعم تسجيل حضور الطلاب والمعلمين بسهولة وسرعة",
      color: "blue",
      benefits: ["تسجيل سريع ودقيق", "دعم متعدد الفصول", "تسجيل المعلمين", "تتبع الحصص"]
    },
    {
      icon: BarChart3,
      title: "تقارير وإحصائيات",
      description: "تقارير شاملة وإحصائيات مفصلة عن حضور الطلاب وأداء المعلمين",
      color: "green",
      benefits: ["تقارير يومية", "إحصائيات أسبوعية", "تحليلات شهرية", "تصدير PDF"]
    },
    {
      icon: MessageSquare,
      title: "الرسائل النصية",
      description: "إرسال رسائل نصية فورية للآباء عند غياب أو تأخر أبنائهم",
      color: "purple",
      benefits: ["إشعارات فورية", "رسائل مخصصة", "تتبع الرسائل", "قوالب جاهزة"]
    },
    {
      icon: Users,
      title: "إدارة المستخدمين",
      description: "إدارة شاملة للمعلمين والطلاب مع نظام صلاحيات متقدم",
      color: "orange",
      benefits: ["إدارة المعلمين", "إدارة الطلاب", "نظام الصلاحيات", "الملفات الشخصية"]
    },
    {
      icon: BookOpen,
      title: "إدارة الفصول والمواد",
      description: "تنظيم الفصول الدراسية والمواد مع توزيع الطلاب والمعلمين",
      color: "teal",
      benefits: ["إدارة الفصول", "تنظيم المواد", "توزيع الطلاب", "جدولة الحصص"]
    },
    {
      icon: Upload,
      title: "رفع البيانات الجماعي",
      description: "رفع وتحديث البيانات بكميات كبيرة باستخدام ملفات Excel",
      color: "red",
      benefits: ["رفع Excel", "تحديث جماعي", "استيراد البيانات", "تصدير التقارير"]
    }
  ];

  // System capabilities
  const capabilities = [
    {
      icon: Shield,
      title: "أمان عالي",
      description: "نظام حماية متقدم مع تشفير البيانات ومستويات صلاحيات متعددة"
    },
    {
      icon: Smartphone,
      title: "متوافق مع الجوال",
      description: "واجهة متجاوبة تعمل بشكل مثالي على جميع الأجهزة الذكية"
    },
    {
      icon: Database,
      title: "نسخ احتياطية",
      description: "نسخ احتياطية تلقائية للبيانات مع إمكانية الاستعادة السريعة"
    },
    {
      icon: Globe,
      title: "اللغة العربية",
      description: "دعم اللغة العربية مع واجهة سهلة الاستخدام"
    },
    {
      icon: Zap,
      title: "سرعة عالية",
      description: "أداء سريع مع استجابة فورية لجميع العمليات"
    },
    {
      icon: Lock,
      title: "خصوصية البيانات",
      description: "حماية كاملة لبيانات الطلاب والمعلمين وفقاً لأعلى المعايير"
    }
  ];

  // Statistics
  const stats = [
    { icon: School, label: "مدارس", value: "500+", color: "blue" },
    { icon: Users, label: "طلاب", value: "50K+", color: "green" },
    { icon: UserCheck, label: "معلمين", value: "5K+", color: "purple" },
    { icon: BookOpen, label: "فصول", value: "10K+", color: "orange" }
  ];

  // Auto-rotate hero slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      teal: 'bg-teal-500 text-white',
      red: 'bg-red-500 text-white'
    };
    return colors[color] || colors.blue;
  };

  const getStatColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600'
    };
    return colors[color] || colors.blue;
  };

  // Navigation sections
  const navigationSections = [
    { id: 'features', label: 'المميزات' },
    { id: 'capabilities', label: 'القدرات' },
    { id: 'dashboard-preview', label: 'لوحة التحكم' },
    { id: 'user-roles', label: 'الأدوار' },
    { id: 'contact', label: 'اشترك معنا' }
  ];

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false); // Close mobile menu after navigation
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 md:py-4">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="تتبع" 
                className="h-8 w-8 md:h-10 md:w-10 object-contain"
              />
              <div className="mr-2 md:mr-3">
                <h1 className="text-lg md:text-xl font-bold text-gray-900">تتبع</h1>
                <p className="text-xs md:text-sm text-gray-500 hidden sm:block">نظام إدارة الحضور والغياب</p>
              </div>
            </div>
            
            {/* Desktop Navigation Menu */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigationSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium ml-6"
                >
                  {section.label}
                </button>
              ))}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right ml-2">
                    <p className="text-sm text-gray-600">مرحباً</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.name || user?.username || 'المستخدم'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/app/dashboard')}
                    className="btn btn-primary mr-2"
                  >
                    لوحة التحكم
                  </button>
                  <button
                    onClick={logout}
                    className="btn btn-outline"
                  >
                    <LogOut className="h-4 w-4 lg:h-5 lg:w-5 text-red-700 ml-2" />
                    تسجيل الخروج
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="btn btn-primary"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center space-x-2 md:hidden">
              {isAuthenticated && (
                <div className="text-right ml-2">
                  <p className="text-xs text-gray-600">مرحباً</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {user?.name || user?.username || 'المستخدم'}
                  </p>
                </div>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col space-y-4">
                {navigationSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="text-right text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium py-2"
                  >
                    {section.label}
                  </button>
                ))}
                
                {/* Mobile Auth Buttons */}
                <div className="pt-4 border-t border-gray-200">
                  {isAuthenticated ? (
                    <div className="flex flex-col space-y-3">
                      <button
                        onClick={() => {
                          navigate('/app/dashboard');
                          setIsMobileMenuOpen(false);
                        }}
                        className="btn btn-primary w-full"
                      >
                        لوحة التحكم
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="btn btn-outline w-full flex items-center justify-center"
                      >
                        <LogOut className="h-4 w-4 text-red-700 ml-2" />
                        تسجيل الخروج
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        navigate('/login');
                        setIsMobileMenuOpen(false);
                      }}
                      className="btn btn-primary w-full"
                    >
                      تسجيل الدخول
                    </button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh] flex items-center">
        {/* Background Images for each slide */}
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('${slide.backgroundImage}')`
            }}
          >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          </div>
        ))}
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 w-full">
          <div className="text-center">
            <div className="mb-6 md:mb-8">
              {/* <div className="text-6xl mb-4">{heroSlides[currentSlide].image}</div> */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight drop-shadow-lg">
                {heroSlides[currentSlide].title}
              </h1>
              <h2 className="text-lg sm:text-xl md:text-2xl text-gray-100 mb-4 md:mb-6 leading-relaxed drop-shadow-md">
                {heroSlides[currentSlide].subtitle}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-200 max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed px-4 drop-shadow-md">
                {heroSlides[currentSlide].description}
              </p>
            </div>
            
            {/* Slide indicators */}
            <div className="flex justify-center space-x-2 mb-6 md:mb-8">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors mx-1 md:mx-2 ${
                    index === currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/app/dashboard')}
                  className="btn btn-primary btn-lg w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Play className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  <span className="text-sm md:text-base">انتقل إلى لوحة التحكم</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="btn btn-primary btn-lg w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow mt-20"
                >
                  <Play className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  <span className="text-sm md:text-base">ابدأ الآن</span>
                </button>
              )}
         
            </div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="py-8 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
              مميزات النظام
            </h2>
            <p className="text-base md:text-lg text-gray-600 px-4">
              حلول متكاملة لإدارة مدرستك بكفاءة عالية
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card feature-card">
                <div className="card-body p-4 md:p-6">
                  <div className={`inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg mb-3 md:mb-4 ${getColorClasses(feature.color)}`}>
                    <feature.icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <ul className="space-y-1 md:space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center text-xs md:text-sm text-gray-500">
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Capabilities */}
      <section id="capabilities" className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
              قدرات النظام
            </h2>
            <p className="text-base md:text-lg text-gray-600 px-4">
              تقنيات متقدمة لضمان الأداء الأمثل والأمان العالي
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {capabilities.map((capability, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-primary-100 text-primary-600 rounded-full mb-3 md:mb-4">
                  <capability.icon className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                  {capability.title}
                </h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section id="dashboard-preview" className="py-8 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
              لوحة التحكم المتقدمة
            </h2>
            <p className="text-base md:text-lg text-gray-600 px-4">
              واجهة سهلة الاستخدام مع إحصائيات فورية وتقارير مفصلة
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Dashboard Features */}
            <div className="space-y-4 md:space-y-6">
              <div className="card">
                <div className="card-body p-4 md:p-6">
                  <div className="flex items-center mb-3 md:mb-4">
                    <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">إحصائيات فورية</h3>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                    عرض إحصائيات الحضور والغياب في الوقت الفعلي مع رسوم بيانية تفاعلية
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-green-50 p-2 md:p-3 rounded-lg">
                      <div className="text-lg md:text-2xl font-bold text-green-600">85%</div>
                      <div className="text-xs md:text-sm text-green-700">نسبة الحضور</div>
                    </div>
                    <div className="bg-blue-50 p-2 md:p-3 rounded-lg">
                      <div className="text-lg md:text-2xl font-bold text-blue-600">1,250</div>
                      <div className="text-xs md:text-sm text-blue-700">إجمالي الطلاب</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body p-4 md:p-6">
                  <div className="flex items-center mb-3 md:mb-4">
                    <ClipboardList className="h-5 w-5 md:h-6 md:w-6 text-green-600 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">تسجيل الحضور</h3>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                    نظام تسجيل حضور سريع ودقيق مع دعم الفصول المتعددة
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">الخامس 1 - الرياضيات</span>
                      <span className="text-xs text-green-600">25/30 حاضر</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm"> السابع 4 - العلوم</span>
                      <span className="text-xs text-green-600">28/30 حاضر</span>
                    </div>
                  </div>
                </div>
              </div>
      
            </div>

            {/* Reports Preview */}
            <div className="space-y-4 md:space-y-6">
              <div className="card">
                <div className="card-body p-4 md:p-6">
                  <div className="flex items-center mb-3 md:mb-4">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-purple-600 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">التقارير المفصلة</h3>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                    تقارير شاملة قابلة للتصدير مع إحصائيات مفصلة لكل طالب ومعلم
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">التقرير اليومي</span>
                      <Download className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">تقرير الأسبوع</span>
                      <Download className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">تقرير الشهر</span>
                      <Download className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body p-4 md:p-6">
                  <div className="flex items-center mb-3 md:mb-4">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-orange-600 mr-2 md:mr-3" />
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">الإشعارات</h3>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                    إرسال رسائل نصية فورية للآباء مع تتبع حالة الرسائل
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">إشعار الغياب</span>
                      <span className="text-xs text-green-600">مرسل</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">إشعار التأخر</span>
                      <span className="text-xs text-green-600">مرسل</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs md:text-sm">إشعار العذر</span>
                      <span className="text-xs text-green-600">مرسل</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section id="user-roles" className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
              أدوار المستخدمين
            </h2>
            <p className="text-base md:text-lg text-gray-600 px-4">
              نظام صلاحيات متقدم يدعم جميع مستويات الإدارة
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
  

            {/* School Admin */}
            <div className="card text-center">
              <div className="card-body p-4 md:p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-blue-100 text-blue-600 rounded-full mb-3 md:mb-4">
                  <School className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">مدير المدرسة</h3>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                  إدارة مدرسة واحدة مع صلاحيات شاملة لجميع العمليات
                </p>
                <ul className="text-xs md:text-sm text-gray-500 space-y-1">
                  <li>• إدارة المعلمين والطلاب</li>
                  <li>• إدارة الفصول والمواد</li>
                  <li>• التقارير والإحصائيات</li>
                  <li>• الرسائل النصية</li>
                </ul>
              </div>
            </div>

            {/* Teacher */}
            <div className="card text-center">
              <div className="card-body p-4 md:p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-green-100 text-green-600 rounded-full mb-3 md:mb-4">
                  <UserCheck className="h-6 w-6 md:h-8 md:w-8" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3">المعلم</h3>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4 leading-relaxed">
                  تسجيل الحضور وعرض التقارير للفصول المخصصة
                </p>
                <ul className="text-xs md:text-sm text-gray-500 space-y-1">
                  <li>• تسجيل الحضور</li>
                  <li>• عرض تقارير الفصول</li>
                  <li>• إدارة الطلاب</li>
                  <li>• الملف الشخصي</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 md:py-16 bg-primary-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
            ابدأ رحلتك مع نظام تتبع اليوم
          </h2>
          <p className="text-base md:text-xl text-primary-100 mb-6 md:mb-8 px-4">
            انضم إلى المدارس التي تثق في نظام تتبع لإدارة حضورها
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/app/dashboard')}
                className="btn btn-white btn-lg w-full sm:w-auto"
              >
                <Play className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                <span className="text-sm md:text-base">انتقل إلى لوحة التحكم</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="btn btn-white btn-lg w-full sm:w-auto"
              >
                <Play className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                <span className="text-sm md:text-base">تسجيل الدخول</span>
              </button>
            )}
            <a 
              href="https://wa.me/96876002642?text=مرحباً، أود الاشتراك في نظام تتبع الحضور والغياب الذكي." 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline-white btn-lg w-full sm:w-auto hover:bg-white hover:text-gray-900 transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="text-sm md:text-base">اشترك معنا</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
            <div>
              <div className="flex items-center mb-3 md:mb-4">
                <img 
                  src="/logo.png" 
                  alt="تتبع" 
                  className="h-6 w-6 md:h-8 md:w-8 object-contain"
                />
                <div className="mr-2 md:mr-3">
                  <h3 className="text-base md:text-lg font-bold">تتبع</h3>
                  <p className="text-xs md:text-sm text-gray-400">نظام إدارة الحضور</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
                نظام متكامل لإدارة حضور الطلاب والمعلمين في المدارس مع تقارير مفصلة وإشعارات فورية.
              </p>
            </div>
            
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">المميزات</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-400">
                <li>تسجيل الحضور الذكي</li>
                <li>التقارير والإحصائيات</li>
                <li>الرسائل النصية</li>
                <li>إدارة المستخدمين</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">الدعم</h4>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-400">
                <li>مركز المساعدة</li>
                <li>التوثيق</li>
                <li>الدعم الفني</li>
                <li>التدريب</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-base md:text-lg font-semibold mb-3 md:mb-4">تواصل معنا</h4>
              <div className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-400">
                <div className="flex items-center">
                  <Mail className="h-3 w-3 md:h-4 md:w-4 mr-2 flex-shrink-0 ml-2" />
                  <a 
                    href="mailto:pathtodevom@gmail.com" 
                    className="break-all hover:text-white transition-colors "
                  >
                    pathtodevom@gmail.com
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="h-3 w-3 md:h-4 md:w-4 mr-2 flex-shrink-0 ml-2" />
                  <a 
                    href="https://wa.me/96876002642" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    +968 7600 2642
                  </a>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-2 flex-shrink-0 ml-2" />
                  سلطنة عمان
                </div>
                <div className="flex items-center">
                  <Globe className="h-3 w-3 md:h-4 md:w-4 mr-2 flex-shrink-0 ml-2" />
                  <a 
                    href="https://pathtodev.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    pathtodev.com
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-6 md:mt-8 pt-6 md:pt-8 text-center text-xs md:text-sm text-gray-400">
            <p>&copy; 2024 نظام تتبع. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
