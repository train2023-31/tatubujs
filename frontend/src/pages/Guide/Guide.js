import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  UserPlus, 
  Upload, 
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Info,
  PlayCircle,
  Video,
  Bus,
  User,
  ScanLine
} from 'lucide-react';
import Tabs from '../../components/UI/Tabs';

const Guide = () => {
  const [selectedTab, setSelectedTab] = useState('setup');

  const tabs = [
    { id: 'setup', name: 'إعداد البيانات', icon: BookOpen },
    { id: 'refactor', name: 'إعادة هيكلة البيانات', icon: RefreshCw },
  ];

  const StepCard = ({ number, title, description, children, warning, tip }) => (
    <div className={`border rounded-lg p-4 sm:p-6 mb-6 ${warning ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-base ${
          warning ? 'bg-yellow-500' : 'bg-primary-500'
        }`}>
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {description && <p className="text-sm sm:text-base text-gray-600 mb-4">{description}</p>}
          {children}
          {warning && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            </div>
          )}
          {tip && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">{tip}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const SetupGuide = () => {
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    return (
      <div className="space-y-6">
        {/* Introduction */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <BookOpen className="w-8 h-8 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">دليل إعداد البيانات</h2>
              <p className="text-gray-700 mb-3">
                هذا الدليل يوضح كيفية إعداد البيانات للمرة الأولى أو عند بداية سنة دراسية جديدة.
              </p>
              <p className="text-sm text-gray-600">
                اتبع الخطوات بالترتيب المذكور أدناه لضمان إعداد صحيح للنظام.
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Video Guide */}
        <StepCard
          number="1"
          title="شاهد الفيديو التوضيحي"
          description="ابدأ بمشاهدة الفيديو التوضيحي لمعرفة كيفية تنزيل ورفع البيانات من نظام البوابة"
          tip="💡 نصيحة: شاهد الفيديو كاملاً قبل البدء في رفع البيانات لضمان فهم صحيح للعملية."
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary-600" />
                الفيديو التوضيحي:
              </h4>
              <p className="text-gray-700 mb-4">
                يوضح هذا الفيديو كيفية تنزيل قوائم الطلاب وأرقام الهواتف من نظام البوابة ورفعها في النظام.
              </p>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  className="w-full h-auto max-h-96"
                  controls
                  controlsList="nodownload"
                  playsInline
                  webkit-playsinline="true"
                  preload="metadata"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  style={{ maxWidth: '100%', height: 'auto' }}
                >
                  <source src="/1010.mp4" type="video/mp4" />
                  <source src="/1010.mp4" type="video/mp4" />
                  <p className="text-white p-4 text-center">
                    متصفحك لا يدعم تشغيل الفيديو. يرجى استخدام متصفح حديث أو 
                    <a href="/1010.mp4" download className="underline text-blue-400"> اضغط هنا لتحميل الفيديو</a>
                  </p>
                </video>
              </div>
            </div>
          </div>
        </StepCard>

        {/* Step 2: Register Teachers */}
        <StepCard
          number="2"
          title="تسجيل المعلمين"
        description="ابدأ بتسجيل جميع المعلمين في المدرسة"
        tip="💡 نصيحة: استخدم رقم هاتف المعلم كاسم مستخدم وبريد إلكتروني لسهولة تذكر تسجيل الدخول."
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" />
              خطوات تسجيل المعلمين:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/bulk-operations?tab=teachers" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/bulk-operations?tab=teachers'; }}>رفع وتحديث البيانات</Link></li>
              <li>اختر تبويب <strong>"تسجيل المعلمين"</strong></li>
              <li>قم بتحميل النموذج من الزر <strong>"تحميل نموذج المعلمين"</strong></li>
              <li>املأ النموذج بالبيانات التالية (الحقول المطلوبة فقط):
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1 text-sm">
                  <li><strong>الاسم الكامل:</strong> الاسم الكامل للمعلم</li>
                  <li><strong>رقم الهاتف:</strong> رقم هاتف المعلم (سيتم استخدامه تلقائياً كاسم مستخدم وبريد إلكتروني)</li>
                  <li><strong>المسمى الوظيفي:</strong> مثل: حاسب آلي، رياضيات، إلخ</li>
                  <li><strong>عدد الحصص الأسبوعية:</strong> عدد الحصص (مثل: 20)</li>
                </ul>
              </li>
              <li>احفظ الملف بصيغة Excel (XLS أو XLSX)</li>
              <li>ارفع الملف من خلال زر <strong>"اختر ملف Excel"</strong></li>
              <li>راجع البيانات المعروضة في معاينة البيانات</li>
              <li>اضغط على <strong>"معالجة البيانات"</strong> لإتمام التسجيل</li>
              <li className="text-green-500">سيقوم النظام بإنشاء المستخدمين وتسجيلهم في النظام تلقائياً. وبإمكانهم استخدام رقم هاتفهم كاسم مستخدم وكلمة المرور الإفتراضية   </li>
             
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">مثال على البيانات:</h4>
            <div className="overflow-x-auto -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-full text-sm border border-blue-300" style={{ minWidth: '500px' }}>
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-2 border border-blue-300 text-right">الاسم الكامل</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">رقم الهاتف</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">المسمى الوظيفي</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">عدد الحصص</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-blue-300">أحمد محمد علي</td>
                    <td className="px-3 py-2 border border-blue-300">9999123456</td>
                    <td className="px-3 py-2 border border-blue-300">حاسب آلي</td>
                    <td className="px-3 py-2 border border-blue-300">20</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-blue-800 mt-3">
              💡 <strong>ملاحظة:</strong> سيتم استخدام رقم الهاتف تلقائياً كاسم مستخدم وبريد إلكتروني.
            </p>
          </div>
        </div>
      </StepCard>

      

      {/* Step 3: Register and Assign Students */}
      <StepCard
        number="3"
        title="تسجيل وتعيين الطلاب"
        description="قم بتسجيل الطلاب وتعيينهم للفصول المناسبة"
        tip="💡 نصيحة: قم بتنزيل قوائم الفصول من نظام البوابة وارفعها بدون التعديل عليها."
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary-600" />
              خطوات تسجيل وتعيين الطلاب:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/bulk-operations?tab=assign" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/bulk-operations?tab=assign'; }}>رفع وتحديث البيانات</Link></li>
              <li>اختر تبويب <strong>"تسجيل وتعيين الطلاب"</strong></li>
              <li className="text-red-500">قم بتنزيل قوائم الفصول من نظام البوابة (شاهد الفيديو للتعرف على كيفية التنزيل) <strong>وقم برفعها بدون التعديل عليها</strong></li>
              <li> أو قم بتحميل النموذج من الزر <strong>"تحميل نموذج الطلبة"</strong></li>
              <li>املأ النموذج بالبيانات التالية:
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1 text-sm">
                  <li><strong>الرقم المدرسي:</strong> رقم الطالب المدرسي (مثل: 1010101010104)</li>
                  <li><strong>الاسم:</strong> الاسم الكامل للطالب</li>
                  <li><strong>اسم الصف:</strong> اسم الصف (مثل: 12)</li>
                  <li><strong>الشعبة:</strong> الشعبة (مثل: أ، ب، ج)</li>
                </ul>
              </li>
              <li>احفظ الملف بصيغة Excel (XLS أو XLSX)</li>
              <li>ارفع الملف من خلال زر <strong>"اختر ملف Excel"</strong></li>
              <li>راجع البيانات المعروضة في معاينة البيانات</li>
              <li>اضغط على <strong>"معالجة البيانات"</strong></li>
              <li>سيتم تلقائياً:
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1 text-sm">
                  <li>إنشاء الفصول من (اسم الصف + الشعبة)</li>
                  <li>تسجيل الطلاب الجدد</li>
                  <li>تعيين الطلاب للفصول المناسبة</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              ميزة التسجيل المتعدد:
            </h4>
            <p className="text-sm text-green-800 mb-2">
              يمكن للطالب أن يظهر في عدة صفوف بفصول مختلفة:
            </p>
            <ul className="list-disc list-inside mr-6 space-y-1 text-sm text-green-800">
              <li>مثال: أحمد في فصل 12 أ، وفي فصل الفيزياء 1، وفي فصل الكيمياء 2</li>
              <li>إذا كان الطالب مسجلاً مسبقاً، سيتم تعيينه للفصل الجديد فقط (بدون إعادة التسجيل)</li>
              <li>يمكن رفع ملفات متعددة لنفس الطلاب بفصول مختلفة</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">مثال على البيانات:</h4>
            <div className="overflow-x-auto -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-full text-sm border border-blue-300" style={{ minWidth: '600px' }}>
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-2 border border-blue-300 text-right">الرقم المدرسي</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">الاسم</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">اسم الصف</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">الشعبة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-blue-300">1010101010104</td>
                    <td className="px-3 py-2 border border-blue-300">محمد أحمد علي</td>
                    <td className="px-3 py-2 border border-blue-300">12</td>
                    <td className="px-3 py-2 border border-blue-300">أ</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border border-blue-300">1010101010104</td>
                    <td className="px-3 py-2 border border-blue-300">محمد أحمد علي</td>
                    <td className="px-3 py-2 border border-blue-300">فيزياء</td>
                    <td className="px-3 py-2 border border-blue-300">1</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </StepCard>


      {/* Step 3: Update Phone Numbers */}
      <StepCard
        number="4"
        title="تحديث أرقام الهواتف "
        description="قم بتحديث أرقام الهواتف للطلاب"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" />
              خطوات تحديث أرقام الهواتف:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/bulk-operations?tab=phones" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/bulk-operations?tab=phones'; }}>رفع وتحديث البيانات</Link></li>
              <li>اختر تبويب <strong>"تحديث أرقام الهواتف"</strong></li>
              <li className="text-red-500">قم بتنزيل قائمة أرقام الهواتف من نظام البوابة (شاهد الفيديو للتعرف على كيفية التنزيل) <strong>وقم برفعها بدون التعديل عليها</strong></li>
              <li> أو قم بتحميل النموذج من الزر <strong>"تحميل نموذج الهواتف"</strong></li>
              <li>املأ النموذج بالبيانات التالية:
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1 text-sm">
                  <li><strong>الرقم المدرسي:</strong> رقم الطالب المدرسي</li>
                  <li><strong>الهاتف النقال:</strong> رقم هاتف الطالب</li>
                  <li><strong>المنطقة السكنية:</strong> المنطقة السكنية للطالب (اختياري)</li>
                </ul>
              </li>
              <li>احفظ الملف وارفعه</li>
              <li>اضغط على <strong>"معالجة البيانات"</strong></li>
            </ol>
          </div>
        </div>
      </StepCard>

     

        {/* Step 4: Create Classes */}
      <StepCard
        number="5"
        title="إنشاء الفصول والمواد الدراسية"
        description="قم بإنشاء الفصول الدراسية والمواد الدراسية"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-500 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              يتم إنشاء الفصول الدراسية تلقائياً من خلال رفع قوائم الفصول من نظام البوابة. (عند رفع قوائم الطلاب في الخطوة السابقة)
            <Link to="/app/classes" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/classes'; }}>إدارة الفصول</Link>
           </h4>
             <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" />
              خطوات إنشاءالمواد:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/classes?tab=subjects" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/classes?tab=subjects'; }}>إدارة المواد</Link></li>
              <li>قم بإنشاء المواد الدراسية  </li>
            </ol>
          </div>
        </div>
      </StepCard>


      {/* Step 6: Upload Timetable XML */}
      <StepCard
        number="6"
        title="رفع الجدول الدراسي (XML)"
        description="قم برفع ملف الجدول الدراسي من نظام البوابة"
        tip="💡 نصيحة: قم بتنزيل ملف الجدول الدراسي (XML) من نظام البوابة وارفعه مباشرة بدون التعديل عليه."
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" />
              خطوات رفع الجدول الدراسي:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/school-timetable" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/school-timetable'; }}>الجدول الدراسي</Link></li>
              <li className="text-red-500">قم بتنزيل ملف الجدول الدراسي (XML Oman) من نظام (aSc Timetables)  <strong>وقم برفعه مباشرة بدون التعديل عليه</strong></li>
              <li>اضغط على زر <strong>"رفع ملف XML"</strong> أو <strong>"رفع جدول جديد"</strong></li>
              <li>اختر ملف XML من جهازك</li>
              <li>انتظر حتى يتم تحليل الملف وعرض البيانات</li>
              <li>قم بربط المعلمين في الجدول مع المعلمين المسجلين في النظام (إذا لزم الأمر)</li>
              <li>أدخل اسم للجدول الدراسي (مثل: "الفصل الدراسي الأول 2024")</li>
              <li>اضغط على <strong>"حفظ الجدول"</strong> لإتمام العملية</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">معلومات مهمة:</h4>
            <ul className="list-disc list-inside mr-6 space-y-1 text-sm text-blue-800">
              <li>يجب أن يكون الملف بصيغة XML فقط</li>
              <li>يمكنك رفع عدة جداول دراسية (مثل: جدول للفصل الأول وجدول للفصل الثاني)</li>
              <li>يمكنك تفعيل أو تعطيل أي جدول دراسي حسب الحاجة</li>
              <li>بعد رفع الجدول، يمكنك استخدام نظام البدائل لإدارة غياب المعلمين</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ تحذير:</h4>
            <p className="text-sm text-yellow-800">
              تأكد من أن جميع المعلمين المذكورين في الجدول الدراسي مسجلين في النظام قبل رفع الجدول. 
              يمكنك ربط المعلمين بعد الرفع إذا لزم الأمر.
            </p>
          </div>
        </div>
      </StepCard>


       {/* Step 5: Register Drivers */}
       <StepCard
        number="7"
        title="تسجيل السائقين (اختياري)"
        description="قم بتسجيل سائقين الحافلات في المدرسة"
        tip="💡 نصيحة: استخدم رقم هاتف السائق كاسم مستخدم وبريد إلكتروني لسهولة تذكر تسجيل الدخول."
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bus className="w-5 h-5 text-primary-600" />
              خطوات تسجيل السائقين:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/bulk-operations?tab=drivers" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/bulk-operations?tab=drivers'; }}>رفع وتحديث البيانات</Link></li>
              <li>اختر تبويب <strong>"تسجيل السائقين"</strong></li>
              <li>قم بتحميل النموذج من الزر <strong>"تحميل نموذج السائقين"</strong></li>
              <li>املأ النموذج بالبيانات التالية (الحقول المطلوبة فقط):
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1 text-sm">
                  <li><strong>الاسم الكامل:</strong> الاسم الكامل للسائق</li>
                  <li><strong>رقم الهاتف:</strong> رقم هاتف السائق (سيتم استخدامه تلقائياً كاسم مستخدم وبريد إلكتروني)</li>
                  <li><strong>رقم الرخصة:</strong> رقم رخصة القيادة (اختياري)</li>
                </ul>
              </li>
              <li>احفظ الملف بصيغة Excel (XLS أو XLSX)</li>
              <li>ارفع الملف من خلال زر <strong>"اختر ملف Excel"</strong></li>
              <li>راجع البيانات المعروضة في معاينة البيانات</li>
              <li>اضغط على <strong>"معالجة البيانات"</strong> لإتمام التسجيل</li>
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">مثال على البيانات:</h4>
            <div className="overflow-x-auto -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-full text-sm border border-blue-300" style={{ minWidth: '400px' }}>
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-3 py-2 border border-blue-300 text-right">الاسم الكامل</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">رقم الهاتف</th>
                    <th className="px-3 py-2 border border-blue-300 text-right">رقم الرخصة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border border-blue-300">محمد أحمد سالم</td>
                    <td className="px-3 py-2 border border-blue-300">9999123456</td>
                    <td className="px-3 py-2 border border-blue-300">123456789</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-blue-800 mt-3">
              💡 <strong>ملاحظة:</strong> سيتم استخدام رقم الهاتف تلقائياً كاسم مستخدم وبريد إلكتروني.
            </p>
          </div>
        </div>
      </StepCard>

      

      {/* Step 7: Bus Management */}
      <StepCard
        number="8"
        title="إدارة الحافلات (اختياري)"
        description="قم بإضافة الحافلات وتعيين السائقين والطلاب"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Bus className="w-5 h-5 text-primary-600" />
              خطوات إدارة الحافلات:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/buses" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/buses'; }}>إدارة الحافلات</Link></li>
              <li>اضغط على <strong>"إضافة حافلة جديدة"</strong></li>
              <li>املأ بيانات الحافلة:
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1 text-sm">
                  <li><strong>رقم الحافلة:</strong> رقم الحافلة (مثل: 101)</li>
                  <li><strong>اسم الحافلة:</strong> اسم الحافلة (مثل: حافلة الطلاب 1)</li>
                  <li><strong>السعة:</strong> عدد الطلاب (مثل: 50)</li>
                  <li><strong>رقم اللوحة:</strong> رقم لوحة الحافلة (اختياري)</li>
                  <li><strong>موقع الحافلة:</strong> موقع الحافلة (اختياري)</li>
                  <li><strong>السائق:</strong> اختر سائق من القائمة</li>
                </ul>
              </li>
              <li>بعد إضافة الحافلة، اضغط على أيقونة <strong>"تعيين طلاب"</strong> لتعيين الطلاب للحافلة</li>
              <li>اختر الطلاب المراد تعيينهم للحافلة من القائمة</li>
              <li>اضغط على <strong>"تعيين"</strong> لإتمام العملية</li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-green-900 mb-3">ملخص خطوات الإعداد</h3>
            <ol className="list-decimal list-inside space-y-2 text-green-800">
              <li>شاهد الفيديو التوضيحي</li>
              <li>تسجيل جميع المعلمين</li>
              <li>تسجيل جميع الطلاب</li>
              <li>تحديث أرقام الهواتف</li>
              
             
              <li>إنشاء المواد الدراسية</li>
              <li>رفع الجدول الدراسي (XML)</li>
              <li>تسجيل السائقين (اختياري)</li>
              
              <li>إدارة الحافلات (اختياري)</li>
            </ol>
            <p className="mt-4 text-sm text-green-700">
              بعد إتمام هذه الخطوات، سيكون النظام جاهزاً للاستخدام!
            </p>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const RefactorGuide = () => (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <RefreshCw className="w-8 h-8 text-orange-600 mt-1 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">دليل إعادة هيكلة البيانات</h2>
            <p className="text-gray-700 mb-3">
              هذا الدليل يوضح كيفية إعادة هيكلة بيانات المدرسة عند بداية سنة دراسية جديدة أو عند الحاجة لإعادة التنظيم.
            </p>
            <p className="text-sm text-gray-600">
              ⚠️ <strong>تحذير:</strong> عملية إعادة الهيكلة تتضمن حذف البيانات. تأكد من عمل نسخة احتياطية قبل البدء.
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-8 h-8 text-red-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-red-900 mb-3">تحذيرات مهمة</h3>
            <ul className="list-disc list-inside space-y-2 text-red-800">
              <li>هذا الإجراء <strong>لا يمكن التراجع عنه</strong></li>
              <li>سيتم حذف البيانات المحددة <strong>نهائياً</strong> من النظام</li>
              <li>تأكد من عمل <strong>نسخة احتياطية</strong> من البيانات المهمة</li>
              <li>هذا الإجراء سيؤثر على <strong>جميع المستخدمين</strong> في المدرسة</li>
              <li>لا يمكن حذف حساب <strong>مدير المدرسة</strong> (school_admin)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step 1: Delete Bus Scans */}
      <StepCard
        number="1"
        title="حذف سجلات مسح الحافلات"
        description="ابدأ بحذف جميع سجلات مسح الحافلات"
        warning="يجب حذف سجلات المسح أولاً قبل حذف الحافلات أو الطلاب"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-red-600" />
              خطوات حذف سجلات مسح الحافلات:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"سجلات مسح الحافلات"</strong></li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Step 2: Delete Attendance */}
      <StepCard
        number="2"
        title="حذف سجلات الحضور والغياب"
        description="قم بحذف جميع سجلات الحضور والغياب"
        warning="يجب حذف سجلات الحضور قبل حذف الطلاب أو الفصول"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف سجلات الحضور:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"سجلات الحضور والغياب"</strong></li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Step 3: Delete Buses and Drivers */}
      <StepCard
        number="3"
        title="حذف الحافلات والسائقين"
        description="قم بحذف الحافلات والسائقين"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف الحافلات والسائقين:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"الحافلات"</strong> و/أو <strong>"السائقين"</strong></li>
              <li>تأكد من حذف سجلات المسح أولاً</li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>ملاحظة:</strong> عند حذف الحافلات، سيتم حذف جميع العلاقات بين الطلاب والحافلات تلقائياً.
            </p>
          </div>
        </div>
      </StepCard>

      {/* Step 4: Delete Substitutions and Timetable */}
      <StepCard
        number="4"
        title="حذف البدائل والجداول الدراسية"
        description="قم بحذف البدائل والجداول الدراسية القديمة"
        warning="يجب حذف البدائل قبل حذف الجداول الدراسية"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف البدائل والجداول:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"البدائل"</strong> أولاً (إذا كان هناك بدائل مسجلة)</li>
              <li>حدد خيار <strong>"الجدول الدراسي"</strong></li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>ملاحظة:</strong> عند حذف الجداول الدراسية، سيتم حذف جميع البيانات المرتبطة بها بما في ذلك الأيام، الفترات، الجداول، وربط المعلمين.
            </p>
          </div>
        </div>
      </StepCard>

      {/* Step 5: Delete Classes and Subjects */}
      <StepCard
        number="5"
        title="حذف الفصول والمواد الدراسية"
        description="قم بحذف الفصول والمواد الدراسية القديمة"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف الفصول والمواد:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"الفصول"</strong> و/أو <strong>"المواد الدراسية"</strong></li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Step 6: Delete Reports, Notifications and News */}
      <StepCard
        number="6"
        title="حذف التقارير والإشعارات والأخبار (اختياري)"
        description="يمكن حذف التقارير والإشعارات والأخبار في أي وقت"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف التقارير والإشعارات والأخبار:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"التقارير"</strong> و/أو <strong>"الإشعارات"</strong> و/أو <strong>"الأخبار"</strong></li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Step 7: Delete Students */}
      <StepCard
        number="7"
        title="حذف الطلاب"
        description="قم بحذف جميع الطلاب بعد حذف الفصول والمواد"
        warning="يجب حذف الطلاب قبل حذف المعلمين"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف الطلاب:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"الطلاب"</strong></li>
              <li>تأكد من حذف سجلات الحضور أولاً</li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
        </div>
      </StepCard>

      {/* Step 8: Delete Teachers */}
      <StepCard
        number="8"
        title="حذف المعلمين (اختياري)"
        description="يمكن حذف المعلمين بعد حذف الطلاب"
        warning="لا يمكن حذف حساب مدير المدرسة (school_admin)"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              خطوات حذف المعلمين:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>انتقل إلى صفحة <Link to="/app/delete-school-data" className="text-primary-600 hover:underline font-medium" onClick={(e) => { e.preventDefault(); window.location.href = '/app/delete-school-data'; }}>حذف بيانات المدرسة</Link></li>
              <li>حدد خيار <strong>"المعلمين"</strong></li>
              <li>تأكد من حذف الطلاب أولاً</li>
              <li>اضغط على <strong>"حذف البيانات المحددة"</strong></li>
              <li>اكتب <strong>"تأكيد الحذف"</strong> في حقل التأكيد</li>
              <li>اضغط على <strong>"حذف نهائي"</strong></li>
            </ol>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>ملاحظة:</strong> سيتم حذف جميع المعلمين <strong>ما عدا</strong> حساب مدير المدرسة (school_admin).
            </p>
          </div>
        </div>
      </StepCard>

      {/* Deletion Order */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Info className="w-8 h-8 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-blue-900 mb-3">ترتيب الحذف المطلوب</h3>
            <p className="text-blue-800 mb-4">
              يجب اتباع الترتيب الصحيح للحذف لتجنب أخطاء النظام:
            </p>
            <div className="bg-white rounded-lg p-4 border border-blue-300">
              <ol className="list-decimal list-inside space-y-2 text-blue-900">
                <li><strong>سجلات مسح الحافلات</strong> - يجب حذفها أولاً</li>
                <li><strong>سجلات الحضور والغياب</strong> - يجب حذفها بعد سجلات المسح</li>
                <li><strong>الحافلات والسائقين</strong> - يمكن حذفها بعد سجلات المسح</li>
                <li><strong>البدائل والجداول الدراسية</strong> - يجب حذف البدائل قبل الجداول</li>
                <li><strong>الفصول والمواد الدراسية</strong> - يمكن حذفها بعد الجداول الدراسية</li>
                <li><strong>التقارير والإشعارات والأخبار</strong> - يمكن حذفها في أي وقت</li>
                <li><strong>الطلاب</strong> - يجب حذفهم بعد حذف الفصول والمواد</li>
                <li><strong>المعلمين</strong> - يجب حذفهم أخيراً بعد حذف الطلاب</li>
              </ol>
            </div>
            <p className="text-blue-800 mt-4 text-sm">
              💡 <strong>نصيحة:</strong> إذا كنت تريد حذف الطلاب أو المعلمين، تأكد من تحديد "سجلات الحضور والغياب" أيضاً.
            </p>
          </div>
        </div>
      </div>

      {/* After Refactoring */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-bold text-green-900 mb-3">بعد إعادة الهيكلة</h3>
            <p className="text-green-800 mb-4">
              بعد إتمام عملية الحذف، اتبع خطوات الإعداد من جديد:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-green-800">
              <li>تسجيل المعلمين الجدد</li>
              <li>إنشاء الفصول والمواد الدراسية الجديدة</li>
              <li>رفع الجدول الدراسي الجديد (XML)</li>
              <li>تسجيل وتعيين الطلاب الجدد</li>
              <li>تحديث أرقام الهواتف (اختياري)</li>
            </ol>
            <p className="mt-4 text-sm text-green-700">
              يمكنك الرجوع إلى تبويب <strong>"إعداد البيانات"</strong> لمعرفة التفاصيل.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">دليل الاستخدام</h1>
          <p className="text-sm sm:text-base text-gray-600">تعليمات شاملة لإعداد وإدارة بيانات المدرسة</p>
        </div>
       
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        variant="modern"
        className="mb-6"
      />

      {/* Content */}
      <div className="card">
        <div className="card-body">
          {selectedTab === 'setup' && <SetupGuide />}
          {selectedTab === 'refactor' && <RefactorGuide />}
        </div>
      </div>
    </div>
  );
};

export default Guide;

