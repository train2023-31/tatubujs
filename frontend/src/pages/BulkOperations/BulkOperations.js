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
  Bus,
  Users,
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
  // Chunked student upload: { currentChunk, totalChunks, processedCount, totalCount }
  const [uploadProgress, setUploadProgress] = useState(null);

  const STUDENT_CHUNK_SIZE = 100;

  // Handle URL parameters on component mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['teachers', 'drivers', 'assign', 'phones'].includes(tabFromUrl)) {
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

  // Bulk register drivers mutation
  const bulkRegisterDriversMutation = useMutation(
    (data) => authAPI.registerDrivers(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('drivers');
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
        // Set email and username to phone_number
        const phoneNumber = mappedRow.phone_number || '';
        mappedRow.email = phoneNumber;
        mappedRow.username = phoneNumber;
        return mappedRow;
      });
    } else if (selectedTab === 'drivers') {
      processedData = uploadedData.map(row => {
        const mappedRow = {};
        Object.entries(fieldMapping).forEach(([arabicField, englishField]) => {
          mappedRow[englishField] = row[arabicField] || '';
        });
        // Set email and username to phone_number
        const phoneNumber = mappedRow.phone_number || '';
        mappedRow.email = phoneNumber;
        mappedRow.username = phoneNumber;
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
        phone_number: row['الهاتف النقال'] || '',
        location: row['المنطقة السكنية'] || row['المنطقه السكنيه'] || ''  // Support both spellings
      }));
    }

    switch (selectedTab) {
      case 'teachers': {
        const invalidRows = [];
        uploadedData.forEach((row) => {
          const val = row['عدد الحصص الأسبوعية'];
          const num = val !== '' && val !== undefined && val !== null ? Number(String(val).trim()) : NaN;
          if (Number.isNaN(num) || num <= 0) {
            invalidRows.push({
              row: row._rowIndex,
              name: row['الاسم الكامل'] || '(بدون اسم)',
            });
          }
        });
        if (invalidRows.length > 0) {
          const list = invalidRows.slice(0, 10).map((r) => `صف ${r.row} (${r.name})`).join('، ');
          const more = invalidRows.length > 10 ? ` و${invalidRows.length - 10} صفوف أخرى` : '';
          toast.error(
            `يرجى تعديل ملف الإكسل: عمود «عدد الحصص الأسبوعية» يجب أن يكون رقماً أكبر من 0. الصفوف غير الصالحة: ${list}${more}.`
          );
          setIsProcessing(false);
          return;
        }
        setProcessingStage('جاري تسجيل المعلمين...');
        bulkRegisterTeachersMutation.mutate(processedData);
        break;
      }
      case 'drivers':
        setProcessingStage('جاري تسجيل السائقين...');
        bulkRegisterDriversMutation.mutate(processedData);
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

      // Step 2: Register and assign students (chunked to avoid load errors)
      const chunks = [];
      for (let i = 0; i < processedData.length; i += STUDENT_CHUNK_SIZE) {
        chunks.push(processedData.slice(i, i + STUDENT_CHUNK_SIZE));
      }

      if (chunks.length <= 1) {
        // Single chunk: use existing mutation
        setProcessingStage('جاري تسجيل وتعيين الطلاب...');
        toast.loading('جاري تسجيل وتعيين الطلاب...', { id: 'registering-students' });
        bulkRegisterAndAssignMutation.mutate({ students: processedData });
        return;
      }

      // Multiple chunks: upload sequentially and show progress
      setProcessingStage('جاري تسجيل وتعيين الطلاب...');
      setUploadProgress({
        currentChunk: 0,
        totalChunks: chunks.length,
        processedCount: 0,
        totalCount: processedData.length
      });
      toast.loading(`جاري رفع الدفعة 1 من ${chunks.length}...`, { id: 'registering-students' });

      const allResults = [];
      for (let i = 0; i < chunks.length; i++) {
        setUploadProgress(prev => ({
          ...prev,
          currentChunk: i + 1,
          processedCount: i * STUDENT_CHUNK_SIZE
        }));
        toast.loading(
          `جاري رفع الدفعة ${i + 1} من ${chunks.length} (${i * STUDENT_CHUNK_SIZE}/${processedData.length} سجل)`,
          { id: 'registering-students' }
        );
        try {
          const res = await authAPI.registerAndAssignStudents({ students: chunks[i] });
          const chunkResults = res.data || [];
          allResults.push(...chunkResults);
          setUploadProgress(prev => ({
            ...prev,
            processedCount: Math.min((i + 1) * STUDENT_CHUNK_SIZE, processedData.length)
          }));
        } catch (err) {
          toast.dismiss('registering-students');
          toast.error(err.response?.data?.message?.ar || 'فشل في معالجة البيانات');
          setUploadProgress(null);
          setIsProcessing(false);
          setProcessingStage('');
          return;
        }
      }

      toast.dismiss('registering-students');
      setResults(allResults);
      setUploadProgress(null);
      setIsProcessing(false);
      setProcessingStage('');
      queryClient.invalidateQueries('students');
      queryClient.invalidateQueries('classes');
      toast.success('تم معالجة البيانات بنجاح');
    } catch (error) {
      toast.dismiss('creating-classes');
      toast.dismiss('registering-students');
      toast.error('فشل في عملية تسجيل وتعيين الطلاب');
      setIsProcessing(false);
      setProcessingStage('');
      setUploadProgress(null);
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
      'drivers': 'نموذج_تسجيل_السائقين',
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
          'الاسم الكامل': 'fullName',
          'رقم الهاتف': 'phone_number',
          'المسمى الوظيفي': 'job_name',
          'عدد الحصص الأسبوعية': 'week_Classes_Number'
        };
      case 'drivers':
        return {
          'الاسم الكامل': 'fullName',
          'رقم الهاتف': 'phone_number',
          'رقم الرخصة': 'license_number'
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
          'الهاتف النقال': 'phone_number',
          'المنطقة السكنية': 'location'
        };
      default:
        return {};
    }
  };

  const getExpectedHeaders = () => {
    switch (selectedTab) {
      case 'teachers':
        return ['الاسم الكامل', 'رقم الهاتف', 'المسمى الوظيفي', 'عدد الحصص الأسبوعية'];
      case 'drivers':
        return ['الاسم الكامل', 'رقم الهاتف', 'رقم الرخصة'];
      case 'assign':
        return ['الرقم المدرسي', 'الاســـــــــــم', 'الشعبة', 'اسم الصف'];
      case 'phones':
        return ['الرقم المدرسي', 'الهاتف النقال', 'المنطقة السكنية'];
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
    { id: 'drivers', name: 'تسجيل السائقين', icon: Bus },
    { id: 'assign', name: 'تسجيل وتعيين الطلاب', icon: Users },
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
              case 'drivers':
                return 'السائقين';
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
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">أحمد محمد علي</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">9999##99</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">حاسب آلي</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">20 <p className="text-xs text-red-500 mt-1">لا يقبل القيمة (0)</p> <p className="text-xs text-red-500 mt-1">لا تتركه فارغا</p></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 ملاحظة مهمة: سيتم استخدام <strong>رقم الهاتف</strong> تلقائياً كـ <strong>اسم المستخدم</strong> و <strong>البريد الإلكتروني</strong> لسهولة تذكر تسجيل الدخول في النظام
                    </p>
                  </div>
               
                </div>
              </div>
            )}

            {/* Example for drivers */}
            {selectedTab === 'drivers' && (
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
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">محمد أحمد سالم</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">9999##99</td>
                        <td className="px-3 py-2 border border-gray-300 text-gray-800">123456789</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 ملاحظة مهمة: سيتم استخدام <strong>رقم الهاتف</strong> تلقائياً كـ <strong>اسم المستخدم</strong> و <strong>البريد الإلكتروني</strong> لسهولة تذكر تسجيل الدخول في النظام
                    </p>
                  </div>
               
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">نصائح:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                
                {selectedTab === 'assign' && (
                  <li className="text-red-500">
                    • قم بتنزيل قوائم الفصول من نظام البوابة (شاهد الفيديو للتعرف على كيفية التنزيل) <strong>وقم برفعها بدون التعديل عليها</strong>
                  </li>
                )}
                <li>•  استخدم ملف Excel (XLS أو XLSX) </li>
            
          
                {selectedTab === 'assign' && (
                  <>
                    <li>• سيتم إنشاء الفصول تلقائياً من (اسم الصف + الشعبة)</li>
                    <li>• ثم سيتم تسجيل وتعيين الطلاب للفصول </li>
                    <li className="text-red-500">• <strong>دعم الفصول الإحتيارية:</strong> يمكن للطالب أن يظهر في عدة صفوف بفصول مختلفة (مثل: أحمد في فصل 12، وفي فصل الفيزياء 1، وفي فصل الكيمياء 2) لهذا الإجراء قم بتحميل نموذج الطلاب من الزر <strong>"تحميل نموذج الطلبة"</strong></li>
                     {/* Example Table for Each Tab */}
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-red-500 mb-2">مثال على البيانات المطلوبة:</h4>
                  <table className="min-w-full border border-red-500 bg-white rounded">
                    <thead>
                      <tr className="bg-gray-50">
                        {getExpectedHeaders().map((header, idx) => (
                          <th
                            key={idx}
                            className="px-3 py-2 text-right border border-gray-300 font-medium text-red-500"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTab === 'teachers' && (
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">محمد أحمد سالم</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">99992233</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">معلم رياضيات</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">18</td>
                        </tr>
                      )}
                      {selectedTab === 'drivers' && (
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">سعيد علي عبد الله</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">99887766</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">54321</td>
                        </tr>
                      )}
                      {selectedTab === 'assign' && (
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">20231234</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">هشام صالح سالم</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">1</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">الفيزياء</td>
                        </tr>
                      )}
                      {selectedTab === 'phones' && (
                        <tr>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">20236789</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">95551234</td>
                          <td className="px-3 py-2 border border-gray-300 text-gray-800">الخوض السادسة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              <div className="text-center w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {processingStage || 'جاري معالجة البيانات'}
                </h3>
                <p className="text-sm text-gray-600">
                  {uploadProgress
                    ? `جاري رفع الدفعة ${uploadProgress.currentChunk} من ${uploadProgress.totalChunks} (تم معالجة ${uploadProgress.processedCount} من ${uploadProgress.totalCount} سجل)`
                    : `يرجى الانتظار بينما نقوم بمعالجة ${uploadedData.length} سجل...`}
                </p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-primary-500 h-2 rounded-full ${uploadProgress ? 'transition-all duration-300' : 'animate-pulse'}`}
                      style={{
                        width: uploadProgress
                          ? `${(uploadProgress.processedCount / uploadProgress.totalCount) * 100}%`
                          : '100%'
                      }}
                    />
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
