import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Upload, 
  Download, 
  UserPlus, 
  FileText, 
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { authAPI, classesAPI } from '../../services/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import Tabs from '../../components/UI/Tabs';
import toast from 'react-hot-toast';

const BulkOperations = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState('teachers');
  const [uploadedData, setUploadedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [processingStage, setProcessingStage] = useState('');
  const [showVideoGuide, setShowVideoGuide] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Handle URL parameters on component mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['teachers', 'assign', 'phones'].includes(tabFromUrl)) {
      setSelectedTab(tabFromUrl);
    }
  }, [searchParams]);

  // Bulk register teachers mutation
  const bulkRegisterTeachersMutation = useMutation(
    (data) => authAPI.registerTeachers(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('teachers');
        queryClient.invalidateQueries('allUsers');
        setResults(response.data || []);
        toast.success('تم معالجة البيانات بنجاح');
        setIsProcessing(false);
        setProcessingStage('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في معالجة البيانات');
        setIsProcessing(false);
        setProcessingStage('');
      },
    }
  );

  // Bulk register and assign students mutation
  const bulkRegisterAndAssignMutation = useMutation(
    (data) => authAPI.registerAndAssignStudents(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('students');
        queryClient.invalidateQueries('classes');
        setResults(response.data || []);
        toast.dismiss('registering-students');
        toast.success('تم معالجة البيانات بنجاح');
        setIsProcessing(false);
        setProcessingStage('');
      },
      onError: (error) => {
        toast.dismiss('registering-students');
        toast.error(error.response?.data?.message?.ar || 'فشل في معالجة البيانات');
        setIsProcessing(false);
        setProcessingStage('');
      },
    }
  );

  // Update students phone numbers mutation
  const updatePhoneNumbersMutation = useMutation(
    (data) => authAPI.updateStudentsPhoneNumbers(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('students');
        setResults(response.data || []);
        toast.success('تم تحديث أرقام الهواتف بنجاح');
        setIsProcessing(false);
        setProcessingStage('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في تحديث أرقام الهواتف');
        setIsProcessing(false);
        setProcessingStage('');
      },
    }
  );

  // Create classes mutation
  const createClassesMutation = useMutation(
    (data) => classesAPI.createClasses(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('classes');
        toast.success('تم إنشاء الفصول بنجاح');
        return response;
      },
      onError: (error) => {
        toast.error(error.response?.data?.message?.ar || 'فشل في إنشاء الفصول'); 
        throw error;
      },
    }
  );

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx'].includes(fileExtension)) {
      toast.error('يرجى اختيار ملف Excel (XLS أو XLSX)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast.error('الملف يجب أن يحتوي على رؤوس وأقل من سجل واحد');
          return;
        }
        
        const headers = jsonData[0].map(h => String(h).trim());
        const dataRows = jsonData.slice(1);
        
        const processedData = dataRows.map((row, index) => {
          const obj = {};
          headers.forEach((header, i) => {
            obj[header] = row[i] ? String(row[i]).trim() : '';
          });
          return { ...obj, _rowIndex: index + 2 };
        }).filter(row => row[headers[0]]); // Filter out empty rows

        setUploadedData(processedData);
        toast.success(`تم تحميل ${processedData.length} سجل`);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('خطأ في قراءة الملف. تأكد من أن الملف صحيح');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessData = async () => {
    if (uploadedData.length === 0) {
      toast.error('لا توجد بيانات للمعالجة');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    let processedData = uploadedData;
    const fieldMapping = getFieldMapping();

    // Map Arabic field names to correct format for all cases
    if (selectedTab === 'teachers') {
      processedData = uploadedData.map(row => {
        const mappedRow = {};
        Object.entries(fieldMapping).forEach(([arabicField, englishField]) => {
          mappedRow[englishField] = row[arabicField] || '';
        });
        return mappedRow;
      });
    } else if (selectedTab === 'assign') {
      processedData = uploadedData.map(row => ({
        username: row['الرقم المدرسي'] || '',
        fullName: row['الاســـــــــــم'] || '',
        class: `${row['اسم الصف'] || ''} ${row['الشعبة'] || ''}`.trim()
      }));
    } else if (selectedTab === 'phones') {
      processedData = uploadedData.map(row => ({
        username: row['الرقم المدرسي'] || '',
        phone_number: row['الهاتف النقال'] || ''
      }));
    }

    switch (selectedTab) {
      case 'teachers':
        setProcessingStage('جاري تسجيل المعلمين...');
        bulkRegisterTeachersMutation.mutate(processedData);
        break;
      case 'assign':
        await handleAssignStudentsProcess(processedData);
        break;
      case 'phones':
        setProcessingStage('جاري تحديث أرقام الهواتف...');
        updatePhoneNumbersMutation.mutate({ students: processedData });
        break;
      default:
        setIsProcessing(false);
        setProcessingStage('');
    }
  };

  const handleAssignStudentsProcess = async (processedData) => {
    try {
      // Step 1: Create unique classes from the data
      const uniqueClasses = [...new Set(processedData.map(row => row.class))]
        .filter(className => className && className.trim() !== '') // Remove empty strings
        .sort(); // Sort alphabetically
      
      
      // Format for API request - array of class names
      const classesToCreate = uniqueClasses;
      
      setProcessingStage('جاري إنشاء الفصول...');
      toast.loading('جاري إنشاء الفصول...', { id: 'creating-classes' });
      
      // Create classes first
      await createClassesMutation.mutateAsync(classesToCreate);
      
      toast.dismiss('creating-classes');
      setProcessingStage('جاري تسجيل وتعيين الطلاب...');
      toast.loading('جاري تسجيل وتعيين الطلاب...', { id: 'registering-students' });
      
      // Step 2: Register and assign students
      bulkRegisterAndAssignMutation.mutate({ students: processedData });
      
    } catch (error) {
      console.error('Error in assign students process:', error);
      toast.dismiss('creating-classes');
      toast.dismiss('registering-students');
      toast.error('فشل في عملية تسجيل وتعيين الطلاب');
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = getExpectedHeaders();
    const templateData = [headers]; // Just headers for template
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate filename based on selected tab
    const tabNames = {
      'teachers': 'نموذج_تسجيل_المعلمين',
      'assign': 'نموذج_تسجيل_وتعيين_الطلاب',
      'phones': 'نموذج_تحديث_الهواتف'
    };
    
    const filename = `${tabNames[selectedTab] || 'نموذج'}.xlsx`;
    
    // Download the file
    XLSX.writeFile(wb, filename);
    
    toast.success('تم تحميل النموذج بنجاح');
  };

  // Arabic field names mapping
  const getFieldMapping = () => {
    switch (selectedTab) {
      case 'teachers':
        return {
          'اسم المستخدم': 'username',
          'الاسم الكامل': 'fullName',
          'البريد الإلكتروني': 'email',
          'رقم الهاتف': 'phone_number',
          'المسمى الوظيفي': 'job_name',
          'عدد الحصص الأسبوعية': 'week_Classes_Number'
        };
      case 'assign':
        return {
          'الرقم المدرسي': 'username',
          'الاســـــــــــم': 'fullName',
          'الشعبة': 'section',
          'اسم الصف': 'class_name'
        };
      case 'phones':
        return {
          'الرقم المدرسي': 'username',
          'الهاتف النقال': 'phone_number'
        };
      default:
        return {};
    }
  };

  const getExpectedHeaders = () => {
    switch (selectedTab) {
      case 'teachers':
        return ['اسم المستخدم', 'الاسم الكامل', 'البريد الإلكتروني', 'رقم الهاتف', 'المسمى الوظيفي', 'عدد الحصص الأسبوعية'];
      case 'assign':
        return ['الرقم المدرسي', 'الاســـــــــــم', 'الشعبة', 'اسم الصف'];
      case 'phones':
        return ['الرقم المدرسي', 'الهاتف النقال'];
      default:
        return [];
    }
  };

  // Get display headers for data preview
  const getDisplayHeaders = () => {
    if (uploadedData.length === 0) return [];
    return Object.keys(uploadedData[0] || {}).filter(key => key !== '_rowIndex');
  };

  const getStatusIcon = (flag, status) => {
    // Check status first for "skipped" or "rejected" status
    if (status === 'skipped' || status === 'rejected') {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
    
    switch (flag) {
      case 6:
      case 7:
      case 8:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (flag, status) => {
    // Check status first for "skipped" or "rejected" status
    if (status === 'skipped') {
      return 'تم التخطي (مسجل بالفعل في هذا الفصل)';
    }
    if (status === 'rejected') {
      return 'تم الرفض (مسجل بالفعل في نفس الفصل)';
    }
    
    switch (flag) {
      case 1:
        return 'غير مصرح';
      case 2:
        return 'تنسيق غير صالح';
      case 3:
        return 'حقول مفقودة';
      case 4:
        return 'اسم المستخدم موجود';
      case 5:
        return 'المدرسة غير موجودة';
      case 6:
        return 'تم التسجيل بنجاح';
      case 7:
        return 'نجاح التحديث'; 
      case 8:
        return 'نجاح التعيين';
      default:
        return 'غير معروف';
    }
  };

  const tabs = [
    { id: 'teachers', name: 'تسجيل المعلمين', icon: UserPlus },
    { id: 'assign', name: 'تسجيل وتعيين الطلاب', icon: FileText },
    { id: 'phones', name: 'تحديث أرقام الهواتف', icon: Upload },
  ];

  // Video player functions
  const handleVideoPlayPause = () => {
    const video = document.getElementById('guide-video');
    if (video) {
      if (video.paused) {
        video.play();
        setIsVideoPlaying(true);
      } else {
        video.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  const handleVideoMute = () => {
    const video = document.getElementById('guide-video');
    if (video) {
      video.muted = !video.muted;
      setIsVideoMuted(video.muted);
    }
  };

  const handleVideoRestart = () => {
    const video = document.getElementById('guide-video');
    if (video) {
      video.currentTime = 0;
      video.play();
      setIsVideoPlaying(true);
    }
  };

  const handleVideoFullscreen = () => {
    const video = document.getElementById('guide-video');
    if (video) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">رفع وتحديث البيانات</h1>
          <p className="text-gray-600">تسجيل وتحديث البيانات  </p>
        </div>
        <button
          onClick={() => setShowVideoGuide(!showVideoGuide)}
          className="btn btn-outline flex items-center space-x-2"
        >
          <Play className="h-4 w-4 ml-2" />
          <span>{showVideoGuide ? 'إخفاء الدليل' : 'دليل الفيديو'}</span>
        </button>
      </div>

      {/* Video Guide Section */}
      {showVideoGuide && (
        <div className="card">
          <div className="card-header">
          
            <button
              onClick={() => setShowVideoGuide(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>  
            <h3 className="text-lg font-medium text-gray-900">دليل الفيديو - كيفية رفع بيانات الطلاب وارقام الهواتف</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  id="guide-video"
                  className="w-full h-auto max-h-96"
                  controls
                  preload="metadata"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                >
                  <source src="/1010.mp4" type="video/mp4" />
                  متصفحك لا يدعم تشغيل الفيديو
                </video>
                
                {/* Custom Video Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleVideoPlayPause}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                      >
                        {isVideoPlaying ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white" />
                        )}
                      </button>
                      
                      <button
                        onClick={handleVideoRestart}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                      >
                        <RotateCcw className="h-5 w-5 text-white" />
                      </button>
                      
                      <button
                        onClick={handleVideoMute}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                      >
                        {isVideoMuted ? (
                          <VolumeX className="h-5 w-5 text-white" />
                        ) : (
                          <Volume2 className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                    
                    <button
                      onClick={handleVideoFullscreen}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                      <Maximize className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">نصائح مهمة:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• شاهد الفيديو بالكامل لفهم العملية خطوة بخطوة</li>
                  <li>• تأكد من تحضير ملف Excel بالشكل الصحيح قبل البدء</li>
                  
                  <li>• لا تغلق الصفحة أثناء معالجة البيانات</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tabId) => {
          setSelectedTab(tabId);
          setUploadedData([]);
          setResults([]);
          // Update URL parameters
          setSearchParams({ tab: tabId });
        }}
        variant="modern"
        className="mb-6"
      />

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">تعليمات التحميل</h3>
          <button 
          className="btn btn-outline float-left bg-primary-500 text-white"
          onClick={handleDownloadTemplate}
        >
          <Download className="h-5 w-5 mr-2 ml-2" />
          تحميل نموذج {(() => {
            switch (selectedTab) {
              case 'teachers':
                return 'المعلمين';
              case 'assign':
                return 'الطلبة';
              case 'phones':
                return 'الهواتف';
              default:
                return '';
            }
          })()}
        </button>
        </div>
        
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">الحقول المطلوبة:</h4>
              <div className="flex flex-wrap gap-2">
                {getExpectedHeaders().map((header, index) => (
                  <span key={index} className="badge badge-info">
                    {header}
                  </span>
                ))}
              </div>
            </div>

            {/* Example for teachers */}
            {selectedTab === 'teachers' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">مثال على البيانات:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        {getExpectedHeaders().map((header, index) => (
                          <th key={index} className="px-3 py-2 text-right border border-gray-300 font-medium text-gray-700">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">teacher001  أو 9999##99</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">أحمد محمد علي</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">teacher001 أو 9999##99</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">9999##99</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">حاسب الي</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">20</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 ملاحظة مهمة: يجب تعبئة  <strong>اسم المستخدم</strong> و <strong>البريد الإلكتروني</strong> وينصح أن يكونا رقم هاتف الملعم/ـة لسهولة تذكر تسجيل الدخول في النظام
                    </p>
                  </div>
               
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">نصائح:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                
                <li className="text-red-500">• قم بتنزيل قوائم الفصول من نظام البوابة (شاهد الفيديو للتعرف على كيفية التنزيل) <strong>وقم برفعها بدون التعديل عليها</strong></li>
                <li>•  استخدم ملف Excel (XLS أو XLSX) </li>
                <li>• تأكد من أن الصف الأول يحتوي على أسماء الحقول</li>
                <li>• لا تترك حقول مطلوبة فارغة</li>
                <li>• تأكد من عدم تكرار أسماء المستخدمين</li>
                <li>• استخدم الورقة الأولى في الملف فقط</li>
          
                {selectedTab === 'assign' && (
                  <>
                    <li>• سيتم إنشاء الفصول تلقائياً من (اسم الصف + الشعبة)</li>
                    <li>• ثم سيتم تسجيل وتعيين الطلاب للفصول المناسبة</li>
                    <li className="text-red-500">• <strong>دعم التسجيل المتعدد:</strong> يمكن للطالب أن يظهر في عدة صفوف بفصول مختلفة (مثل: أحمد في فصل 12، وفي فصل الفيزياء 1، وفي فصل الكيمياء 2)</li>
                    <li>• إذا كان الطالب مسجلاً مسبقاً، سيتم تعيينه للفصل الجديد فقط (بدون إعادة التسجيل)</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">رفع الملف</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <label className="label">اختر ملف Excel (XLS أو XLSX)</label>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileUpload}
                className="input"
                disabled={isProcessing}
              />
            </div>

            {uploadedData.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  تم تحميل {uploadedData.length} سجل
                </p>
                <button
                  onClick={handleProcessData}
                  disabled={isProcessing}
                  className="btn btn-primary"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="mr-2">جاري المعالجة...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      معالجة البيانات
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center space-x-4 py-8">
              <LoadingSpinner size="lg" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {processingStage || 'جاري معالجة البيانات'}
                </h3>
                <p className="text-sm text-gray-600">
                  يرجى الانتظار بينما نقوم بمعالجة {uploadedData.length} سجل...
                </p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500">
                    لا تغلق هذه الصفحة أثناء المعالجة
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Preview */}
      {uploadedData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">معاينة البيانات</h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header text-right">
                  <tr>
                    {getDisplayHeaders().map((key, index) => (
                      <th key={index} className="table-header-cell text-right">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="table-body">
                  {uploadedData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      {getDisplayHeaders().map((key, cellIndex) => (
                        <td key={cellIndex} className="table-cell">
                          {row[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploadedData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  عرض أول 10 سجلات من أصل {uploadedData.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">نتائج المعالجة</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {results.map((result, index) => {
                const status = result.status || (result.flag === 6 || result.flag === 8 ? 'success' : 'failed');
                const isSuccess = status === 'success' || result.flag === 6 || result.flag === 8;
                const isSkipped = status === 'skipped';
                const isRejected = status === 'rejected';
                const isFailed = status === 'failed' || (!isSuccess && !isSkipped && !isRejected);
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(result.flag, status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {result.username}
                        </p>
                        <p className="text-sm text-gray-600">
                          {result.message?.ar || result.message?.en || result.message}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${
                      isSuccess ? 'badge-success' : 
                      isSkipped || isRejected ? 'badge-warning' : 
                      'badge-danger'
                    }`}>
                      {getStatusText(result.flag, status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOperations;
