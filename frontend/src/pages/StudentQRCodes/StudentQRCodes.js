import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Printer, Download, Search, Filter, X, FileText } from 'lucide-react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import StudentQRCode from '../../components/StudentQRCode/StudentQRCode';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const StudentQRCodes = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  
  const { data: students, isLoading } = useQuery(
    'allStudents',
    usersAPI.getMySchoolStudents
  );
  
  // Get unique students by ID (deduplicate)
  const uniqueStudents = useMemo(() => {
    if (!students) return [];
    const seen = new Map();
    students.forEach(student => {
      if (!seen.has(student.id)) {
        seen.set(student.id, student);
      }
    });
    return Array.from(seen.values());
  }, [students]);
  
  // Get unique class names for filter
  const classNames = useMemo(() => {
    const classes = new Set();
    uniqueStudents.forEach(student => {
      if (student.class_name) {
        classes.add(student.class_name);
      }
    });
    return Array.from(classes).sort();
  }, [uniqueStudents]);
  
  // Filter students
  const filteredStudents = useMemo(() => {
    return uniqueStudents.filter(student => {
      // Search filter
      const matchesSearch = !searchTerm || 
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Class filter
      const matchesClass = !filterClass || student.class_name === filterClass;
      
      // Active filter
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' && student.is_active) ||
        (filterActive === 'inactive' && !student.is_active);
      
      return matchesSearch && matchesClass && matchesActive;
    });
  }, [uniqueStudents, searchTerm, filterClass, filterActive]);
  
  const printAll = () => {
    window.print();
  };

  const downloadPDF = async () => { 
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('لا توجد طلاب للتحميل');
      return;
    }

    toast.loading('جاري إنشاء ملف PDF...', { id: 'pdf-download' });

    try {
      // Wait for QR codes to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // PDF page dimensions (A4: 210mm x 297mm)
      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 5; // mm

      // For 9 cards per page: 3 columns x 3 rows
      const numRows = 3;
      const numCols = 3;
      const cardsPerPage = numRows * numCols; // 9

      // Card size calculation
      const headerHeight = 15; // mm for class header
      const totalColMargins = margin * (numCols + 1);
      const totalRowMargins = margin * (numRows + 1);
      const availableHeight = pageHeight - headerHeight; // Subtract header space
      // Card aspect ratio: 400:500 = 0.8 (width:height)
      const cardAspectRatio = 400 / 500; // 0.8
      const cardWidth = (pageWidth - totalColMargins) / numCols;
      // Calculate height based on width to maintain aspect ratio, but fit within available space
      const calculatedHeight = cardWidth / cardAspectRatio;
      const maxHeight = (availableHeight - totalRowMargins) / numRows;
      const cardHeight = Math.min(calculatedHeight, maxHeight);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Group students by class
      const studentsByClass = {};
      filteredStudents.forEach(student => {
        const className = student.class_name || 'بدون فصل';
        if (!studentsByClass[className]) {
          studentsByClass[className] = [];
        }
        studentsByClass[className].push(student);
      });

      // Sort classes alphabetically
      const sortedClasses = Object.keys(studentsByClass).sort();

      let cardIndex = 0;
      let currentClass = null;

      // Process each class group
      for (const className of sortedClasses) {
        const classStudents = studentsByClass[className];

        // Start new page for new class (unless it's the first class and first card)
        if (currentClass !== null || cardIndex > 0) {
          pdf.addPage();
          cardIndex = 0; // Reset card index for new class
        }
        currentClass = className;

        // Add class header as image (to support Arabic text)
        const headerCanvas = document.createElement('canvas');
        headerCanvas.width = 600;
        headerCanvas.height = 50;
        const headerCtx = headerCanvas.getContext('2d');
        headerCtx.fillStyle = '#FFFFFF';
        headerCtx.fillRect(0, 0, 600, 50);
        headerCtx.fillStyle = '#1F2937';
        headerCtx.font = 'bold 24px Amiri';
        headerCtx.textAlign = 'center';
        headerCtx.fillText(className || 'بدون فصل', 300, 35);
        const headerImageData = headerCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(headerImageData, 'JPEG', (pageWidth - 60) / 2, 5, 60, 5);

        // Process each student in the class
        for (let i = 0; i < classStudents.length; i++) {
          const student = classStudents[i];

          // Add new page if current page is full (every 9 cards)
          if (cardIndex % cardsPerPage === 0 && cardIndex > 0) {
            pdf.addPage();
            // Add class header on new page too (as image for Arabic support)
            const headerCanvas = document.createElement('canvas');
            headerCanvas.width = 600;
            headerCanvas.height = 50;
            const headerCtx = headerCanvas.getContext('2d');
            headerCtx.fillStyle = '#FFFFFF';
            headerCtx.fillRect(0, 0, 600, 50);
            headerCtx.fillStyle = '#1F2937';
            headerCtx.font = 'bold 24px Amiri';
            headerCtx.textAlign = 'center';
            headerCtx.fillText(className || 'بدون فصل', 300, 35); 
            const headerImageData = headerCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(headerImageData, 'JPEG', (pageWidth - 60) / 2, 5, 60, 5);
          }

          // Calculate row/col on current page
          const localIndex = cardIndex % cardsPerPage;
          const row = Math.floor(localIndex / numCols);
          const col = localIndex % numCols;

          // x and y based on margin and card size (adjust y for header)
          const x = margin + (col * (cardWidth + margin));
          const y = headerHeight + margin + (row * (cardHeight + margin));

          // Get QR code canvas
          let canvas = document.getElementById(`qr-${student.id}`);
          if (!canvas || canvas.tagName !== 'CANVAS') {
            // Try again after a short delay
            await new Promise(resolve => setTimeout(resolve, 200));
            canvas = document.getElementById(`qr-${student.id}`);
            if (!canvas || canvas.tagName !== 'CANVAS') {
              cardIndex++;
              continue;
            }
          }

          // Use JPEG compression for QR code to reduce data URL size
          const qrImageData = canvas.toDataURL('image/jpeg', 0.95);

          // Create card canvas
          const cardCanvas = document.createElement('canvas');
          cardCanvas.width = 400;
          cardCanvas.height = 500;
          const ctx = cardCanvas.getContext('2d');

          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 400, 500);
          // img background
          
          // Border
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 2;
          ctx.strokeRect(10, 10, 380, 480);

          // School name at top
          const schoolName = user?.school_name || student.school_name || 'المدرسة';
          ctx.fillStyle = '#1F2937';
          ctx.font = 'bold 20px Amiri';
          ctx.textAlign = 'center';
          ctx.fillText(schoolName, 200, 40);

          // Student name
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 24px Amiri';
          ctx.textAlign = 'center';
          ctx.fillText(student.fullName || '', 200, 80);

          // QR Code (centered)
          const qrImg = new Image();
          await new Promise((resolve, reject) => {
            qrImg.onload = () => {
              const qrSize = 250;
              const qrX = (400 - qrSize) / 2;
              const qrY = 110;
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

              // Note about QR code usage
              ctx.fillStyle = '#6B7280';
              ctx.font = '14px Amiri';
              ctx.textAlign = 'center';
              ctx.fillText('هذا الرمز للصعود والنزول من الحافلة QR', 200, 390);

              // Class name if available
              if (student.class_name) {
                ctx.fillStyle = '#6B7280';
                ctx.font = '16px Amiri';
                ctx.fillText(`الفصل: ${student.class_name}`, 200, 415);
              }

              // Convert card canvas to image with compression and add to PDF
              // Use JPEG with quality 0.95 for higher quality images
              const cardImageData = cardCanvas.toDataURL('image/jpeg', 0.95);
              pdf.addImage(cardImageData, 'JPEG', x, y, cardWidth, cardHeight);

              resolve();
            };
            qrImg.onerror = () => {
              resolve(); // Continue even if one fails
            };
            qrImg.src = qrImageData;
          });

          cardIndex++;
        }
      }

      // Save PDF
      const fileName = `QR_Codes_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success(`تم تحميل ${filteredStudents.length} بطاقة QR في ملف PDF`, { id: 'pdf-download' });
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء ملف PDF', { id: 'pdf-download' });
    }
  };

  const downloadBulkQRs = async () => {
    if (!filteredStudents || filteredStudents.length === 0) {
      toast.error('لا توجد طلاب للتحميل');
      return;
    }
    
    toast.loading('جاري إنشاء ملف ZIP...', { id: 'bulk-download' });
    
    try {
      // Wait a bit for QR codes to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const zip = new JSZip();
      
      // Create a canvas for each student and add to ZIP
      const downloadPromises = filteredStudents.map((student, index) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const canvas = document.getElementById(`qr-${student.id}`);
            if (canvas && canvas.tagName === 'CANVAS') {
              const pngUrl = canvas.toDataURL("image/png");
              
              // Create a new canvas for the card
              const cardCanvas = document.createElement('canvas');
              cardCanvas.width = 400;
              cardCanvas.height = 500;
              const ctx = cardCanvas.getContext('2d');
              
              // White background
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, 400, 500);
              
              // Border
              ctx.strokeStyle = '#E5E7EB';
              ctx.lineWidth = 2;
              ctx.strokeRect(10, 10, 380, 480);
              
              // School name at top
              ctx.fillStyle = '#1F2937';
              ctx.font = 'bold 20px Arial';
              ctx.textAlign = 'center';
              const schoolName = user?.school_name || student.school_name || 'المدرسة';
              ctx.fillText(schoolName, 200, 40);
              
              // Student name
              ctx.fillStyle = '#111827';
              ctx.font = 'bold 24px Arial';
              ctx.textAlign = 'center';
              const nameY = 80;
              ctx.fillText(student.fullName || '', 200, nameY);
              
              // QR Code (centered)
              const qrImg = new Image();
              qrImg.crossOrigin = 'anonymous';
              qrImg.onload = () => {
                const qrSize = 250;
                const qrX = (400 - qrSize) / 2;
                const qrY = 110;
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                
                // Note about QR code usage
                ctx.fillStyle = '#6B7280';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('هذا الرمز QR للصعود والنزول من الحافلة', 200, 390);
                
                // Class name if available
                if (student.class_name) {
                  ctx.fillStyle = '#6B7280';
                  ctx.font = '16px Arial';
                  ctx.fillText(`الفصل: ${student.class_name}`, 200, 415);
                }
                
                // Convert canvas to blob and add to ZIP
                cardCanvas.toBlob((blob) => {
                  if (blob) {
                    // Use student name as filename (sanitize for filesystem)
                    const fileName = `${student.fullName || student.username}.png`.replace(/[<>:"/\\|?*]/g, '_');
                    zip.file(fileName, blob);
                  }
                  resolve();
                }, 'image/png');
              };
              qrImg.onerror = () => {
                resolve();
              };
              qrImg.src = pngUrl;
            } else {
              // If canvas not found, wait a bit and try again
              setTimeout(() => {
                const retryCanvas = document.getElementById(`qr-${student.id}`);
                if (retryCanvas && retryCanvas.tagName === 'CANVAS') {
                  const pngUrl = retryCanvas.toDataURL("image/png");
                  const cardCanvas = document.createElement('canvas');
                  cardCanvas.width = 400;
                  cardCanvas.height = 500;
                  const ctx = cardCanvas.getContext('2d');
                  
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, 400, 500);
                  ctx.strokeStyle = '#E5E7EB';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(10, 10, 380, 480);
                  
                  const schoolName = user?.school_name || student.school_name || 'المدرسة';
                  ctx.fillStyle = '#1F2937';
                  ctx.font = 'bold 20px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText(schoolName, 200, 40);
                  
                  ctx.fillStyle = '#111827';
                  ctx.font = 'bold 24px Arial';
                  ctx.fillText(student.fullName || '', 200, 80);
                  
                  const qrImg = new Image();
                  qrImg.onload = () => {
                    ctx.drawImage(qrImg, 75, 110, 250, 250);
                    
                    // Note about QR code usage
                    ctx.fillStyle = '#6B7280';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('هذا الرمز QR للصعود والنزول من الحافلة', 200, 390);
                    
                    // Class name if available
                    if (student.class_name) {
                      ctx.fillStyle = '#6B7280';
                      ctx.font = '16px Arial';
                      ctx.fillText(`الفصل: ${student.class_name}`, 200, 415);
                    }
                    
                    cardCanvas.toBlob((blob) => {
                      if (blob) {
                        const fileName = `${student.fullName || student.username}.png`.replace(/[<>:"/\\|?*]/g, '_');
                        zip.file(fileName, blob);
                      }
                      resolve();
                    }, 'image/png');
                  };
                  qrImg.src = pngUrl;
                } else {
                  resolve();
                }
              }, 200);
            }
          }, index * 100); // Stagger processing to avoid blocking
        });
      });
      
      await Promise.all(downloadPromises);
      
      // Generate ZIP file
      toast.loading('جاري ضغط الملفات...', { id: 'bulk-download' });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `QR_Codes_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      
      toast.success(`تم تحميل ${filteredStudents.length} بطاقة QR في ملف ZIP`, { id: 'bulk-download' });
    } catch (error) {
      toast.error('حدث خطأ أثناء التحميل', { id: 'bulk-download' });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">رموز QR للطلاب</h1>
          <p className="text-gray-600">طباعة وتحميل رموز QR للحافلة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadBulkQRs} className="btn btn-primary">
            <Download className="h-5 w-5 mr-2 ml-2" />
            تحميل ({filteredStudents.length}) ZIP 
          </button>
          <button onClick={downloadPDF} className="btn btn-primary">
            <FileText className="h-5 w-5 mr-2 ml-2" />
            تحميل ({filteredStudents.length}) PDF 
          </button>
          {/* <button onClick={printAll} className="btn btn-outline">
            <Printer className="h-5 w-5 mr-2" />
            طباعة الكل
          </button> */}
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="card print:hidden">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="label">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث بالاسم أو اسم المستخدم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Class Filter */}
            <div>
              <label className="label">الفصل</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="input"
              >
                <option value="">جميع الفصول</option>
                {classNames.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
            
            {/* Active Filter */}
            <div>
              <label className="label">الحالة</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="input"
              >
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(searchTerm || filterClass || filterActive !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">الفلاتر النشطة:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    البحث: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mr-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterClass && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    الفصل: {filterClass}
                    <button
                      onClick={() => setFilterClass('')}
                      className="mr-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterActive !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    الحالة: {filterActive === 'active' ? 'نشط' : 'غير نشط'}
                    <button
                      onClick={() => setFilterActive('all')}
                      className="mr-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterClass('');
                    setFilterActive('all');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  مسح الكل
                </button>
              </div>
            </div>
          )}
          
          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              عرض <strong className="text-gray-900">{filteredStudents.length}</strong> من أصل <strong className="text-gray-900">{uniqueStudents.length}</strong> طالب
            </p>
          </div>
        </div>
      </div>
      
      {!uniqueStudents || uniqueStudents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد طلاب في المدرسة</p>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد نتائج تطابق الفلاتر المحددة</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-4">
          {filteredStudents.map((student) => (
            <StudentQRCode 
              key={student.id} 
              student={student}
              schoolName={student.school_name || user?.school_name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentQRCodes;
