import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { QrCode, CheckCircle, XCircle, Bus as BusIcon, LogIn, LogOut, AlertCircle, Lock } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { busAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const BusScanner = () => {
  const { user } = useAuth();
  const [selectedBusId, setSelectedBusId] = useState('');
  const [scanType, setScanType] = useState('board'); // 'board' or 'exit'
  const [lastScan, setLastScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanTypeLocked, setScanTypeLocked] = useState(false); // Lock scan type when scanning
  const scannerRef = useRef(null);
  const scanTypeRef = useRef('board'); // Ref to track scan type for scanning
  
  // Check if user is a driver
  const isDriver = user?.role === 'driver';
  
  // Fetch driver's bus if user is driver
  const { data: driverBusData, isLoading: driverBusLoading } = useQuery(
    'driverBus',
    busAPI.getDriverBus,
    { 
      enabled: isDriver,
      onSuccess: (data) => {
        if (data.has_bus) {
          setSelectedBusId(data.bus.id.toString());
        }
      },
      onError: (error) => {
        if (error.response?.status === 404) {
          toast.error('لم يتم تعيين حافلة لك. يرجى التواصل مع الإدارة.');
        }
      }
    }
  );
  
  // Fetch all buses (for admin/school_admin)
  const { data: buses, isLoading: busesLoading } = useQuery(
    'buses', 
    busAPI.getBuses,
    { enabled: !isDriver }
  );
  
  // Fetch current students on bus
  const { data: currentStudents, refetch: refetchCurrentStudents } = useQuery(
    ['currentStudentsOnBus', selectedBusId],
    () => busAPI.getCurrentStudentsOnBus(selectedBusId),
    { enabled: !!selectedBusId }
  );
  
  useEffect(() => {
    if (isScanning && selectedBusId) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );
      
      scanner.render(onScanSuccess, onScanError);
      scannerRef.current = scanner;
      
      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [isScanning, selectedBusId]);
  
  const onScanSuccess = async (decodedText) => {
    if (!selectedBusId) {
      toast.error('يرجى اختيار الحافلة أولاً');
      return;
    }
    
    // Use the locked scan type from ref to ensure consistency
    const currentScanType = scanTypeRef.current;
    
    // Stop scanner temporarily to prevent multiple scans
    if (scannerRef.current) {
      try {
        scannerRef.current.pause(true);
      } catch (e) {
        // Scanner pause error
      }
    }
    
    try {
      const response = await busAPI.scanStudent({
        username: decodedText, // QR code contains the username
        bus_id: parseInt(selectedBusId),
        scan_type: currentScanType, // Use locked scan type from ref
      });
      
      setLastScan({
        ...response.data,
        timestamp: new Date(),
        success: true,
      });
      
      // Show success toast with scan type
      toast.success(
        `✅ ${response.data.student.fullName}\n${currentScanType === 'board' ? 'صعد إلى' : 'نزل من'} الحافلة`,
        { duration: 3000 }
      );
      
      // Refetch current students
      refetchCurrentStudents();
      
      // Resume scanning after 2 seconds
      setTimeout(() => {
        if (scannerRef.current) {
          try {
            scannerRef.current.resume();
          } catch (e) {
            // Scanner resume error
          }
        }
      }, 2000);
      
    } catch (error) {
      setLastScan({
        error: error.response?.data?.message || 'فشل في المسح',
        timestamp: new Date(),
        success: false,
      });
      
      toast.error(error.response?.data?.message || 'فشل في المسح', {
        duration: 4000,
      });
      
      // Resume scanning after 2 seconds
      setTimeout(() => {
        if (scannerRef.current) {
          try {
            scannerRef.current.resume();
          } catch (e) {
            // Scanner resume error
          }
        }
      }, 2000);
    }
  };
  
  const onScanError = () => {
    // Ignore scan errors (happens when no QR code in view)
  };
  
  const startScanning = () => {
    if (!selectedBusId) {
      toast.error('يرجى اختيار الحافلة أولاً');
      return;
    }
    // Lock the scan type when starting to scan
    scanTypeRef.current = scanType;
    setScanTypeLocked(true);
    setIsScanning(true);
    // Show confirmation toast with scan type
    toast.success(
      `تم تفعيل المسح - ${scanType === 'board' ? 'صعود' : 'نزول'}`,
      { 
        duration: 2000,
        icon: scanType === 'board' ? '✅' : '🚪'
      }
    );
  };
  
  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }
    setIsScanning(false);
    setScanTypeLocked(false); // Unlock scan type when stopping
  };
  
  return (
    <div className="max-w-4xl mx-auto space-y-4 p-2 sm:p-4">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
            ماسح الحافلة - QR Scanner
          </h1>
        </div>
      </div>
      
      {/* Bus Selection & Scan Type */}
      <div className="card">
        <div className="card-body space-y-4">
          {/* Bus Selection - Only show for non-drivers */}
          {!isDriver && (
            <div>
              <label className="label">اختر الحافلة</label>
              <select
                value={selectedBusId}
                onChange={(e) => {
                  setSelectedBusId(e.target.value);
                  stopScanning();
                }}
                className="input w-full"
                style={{ fontSize: '16px' }}
                disabled={busesLoading}
              >
                <option value="">-- اختر الحافلة --</option>
                {buses?.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.bus_number} - {bus.bus_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Driver Bus Info - Show for drivers */}
          {isDriver && (
            <div>
              {driverBusLoading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm">جاري تحميل بيانات الحافلة...</span>
                </div>
              ) : driverBusData?.has_bus ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BusIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">حافلتك</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    <span className="font-bold">{driverBusData.bus.bus_number}</span> - {driverBusData.bus.bus_name}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    السعة: {driverBusData.bus.student_count} / {driverBusData.bus.capacity}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      لم يتم تعيين حافلة لك. يرجى التواصل مع الإدارة.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Scan Type Selection */}
          <div>
            <label className="label">نوع المسح</label>
            {scanTypeLocked && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center gap-2">
                <Lock className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-yellow-800 font-medium">
                  نوع المسح مقفل: {scanType === 'board' ? 'صعود' : 'نزول'} - أوقف المسح لتغيير النوع
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!scanTypeLocked) {
                    setScanType('board');
                    toast.success('تم اختيار: صعود', { duration: 1500 });
                  } else {
                    toast.error('يجب إيقاف المسح أولاً لتغيير نوع المسح', { duration: 2000 });
                  }
                }}
                disabled={scanTypeLocked}
                className={`flex-1 btn ${
                  scanType === 'board' 
                    ? 'btn bg-green-700 text-white' 
                    : scanTypeLocked 
                      ? 'btn-outline opacity-50 cursor-not-allowed' 
                      : 'btn-outline'
                }`}
              >
                <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2 ml-2" />
                صعود
                {scanType === 'board' && scanTypeLocked && (
                  <Lock className="h-3 w-3 mr-1" />
                )}
              </button>
              <button
                onClick={() => {
                  if (!scanTypeLocked) {
                    setScanType('exit');
                    toast.success('تم اختيار: نزول', { duration: 1500 });
                  } else {
                    toast.error('يجب إيقاف المسح أولاً لتغيير نوع المسح', { duration: 2000 });
                  }
                }}
                disabled={scanTypeLocked}
                className={`flex-1 btn ${
                  scanType === 'exit' 
                    ? 'btn-danger' 
                    : scanTypeLocked 
                      ? 'btn-outline opacity-50 cursor-not-allowed' 
                      : 'btn-outline'
                }`}
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2 ml-2" />
                نزول
                {scanType === 'exit' && scanTypeLocked && (
                  <Lock className="h-3 w-3 mr-1" />
                )}
              </button>
            </div>
            {/* Current Scan Type Indicator */}
            <div className={`mt-2 p-2 rounded-lg text-center text-sm font-medium ${
              scanType === 'board' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {scanType === 'board' ? (
                <span>📥 وضع المسح الحالي: <strong>صعود</strong></span>
              ) : (
                <span>📤 وضع المسح الحالي: <strong>نزول</strong></span>
              )}
            </div>
          </div>
          
          {/* Scanner Control */}
          <div className="flex gap-2">
            {!isScanning ? (
              <button
                onClick={startScanning}
                disabled={!selectedBusId}
                className="flex-1 btn btn-primary"
              >
                <QrCode className="h-5 w-5 mr-2 ml-2" />
                بدء المسح
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex-1 btn btn-danger"
              >
                إيقاف المسح
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* QR Scanner */}
      {isScanning && (
        <div className="card">
          <div className="card-body">
            <div id="qr-reader" className="w-full"></div>
          </div>
        </div>
      )}
      
      {/* Last Scan Result */}
      {lastScan && (
        <div className={`card ${lastScan.success ? 'border-green-500' : 'border-red-500'} border-2`}>
          <div className="card-body">
            <div className="flex items-start gap-3">
              {lastScan.success ? (
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {lastScan.success ? (
                  <>
                    <h3 className="font-bold text-base sm:text-lg text-green-900 break-words">
                      {lastScan.student.fullName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {lastScan.student.username}
                    </p>
                    <p className="text-sm mt-2">
                      {lastScan.scan.scan_type === 'board' ? '✅ صعد إلى الحافلة' : '🚪 نزل من الحافلة'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(lastScan.scan.scan_time).toLocaleTimeString('ar-OM')}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-base sm:text-lg text-red-900">فشل المسح</h3>
                    <p className="text-sm text-red-700 break-words">{lastScan.error}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Current Students on Bus */}
      {selectedBusId && currentStudents && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
              <BusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              الطلاب الحاليون في الحافلة ({currentStudents.current_count})
            </h3>
          </div>
          <div className="card-body">
            {currentStudents.current_count === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">
                لا يوجد طلاب في الحافلة حالياً
              </p>
            ) : (
              <div className="space-y-2">
                {currentStudents.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200 gap-1 sm:gap-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base break-words">{student.fullName}</p>
                      <p className="text-xs text-gray-600">{student.username}</p>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      صعد: {new Date(student.board_time).toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Capacity Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">السعة:</span>
                <span className={`text-sm font-bold ${
                  currentStudents.current_count > currentStudents.capacity 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {currentStudents.current_count} / {currentStudents.capacity}
                </span>
              </div>
              {currentStudents.current_count > currentStudents.capacity && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">تحذير: تجاوز السعة!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusScanner;

