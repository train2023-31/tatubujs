import React from 'react';
import { FileText, Download, Printer, MessageCircle } from 'lucide-react';

const Invoice = ({ school, onClose }) => {
  // Generate invoice number (you can make this dynamic later)
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const currentDate = new Date().toLocaleDateString('ar');
  
  // Calculate due date (end of August next year)
  const nextYear = new Date().getFullYear() + 1;
  const dueDate = new Date(nextYear, 7, 31); // August 31st next year (month is 0-indexed)
  const dueDateFormatted = dueDate.toLocaleDateString('ar');
  
  // Sample invoice data - you can make this dynamic later
  const invoiceItems = [
    {
      id: 1,
      description: 'اشتراك فصلي - نظام إدارة سجلات الحضور والغياب والتقارير والإحصائيات بالمدرسة',
      quantity: 1,
      unitPrice: 25,
      total: 25
    },
  ];

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.05; // 5% VAT for Oman
  const total = subtotal + tax;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة ${school?.name || 'المدرسة'}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body { 
              font-family: 'Arial', sans-serif; 
              direction: rtl; 
              background: white;
              color: #000;
              line-height: 1.4;
              font-size: 12px;
            }
            .invoice-container { 
              width: 100%;
              max-width: 100%;
              background: white;
              page-break-inside: avoid;
            }
            
            /* Header Section */
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .logo-section {
              display: flex;
              align-items: center;
            }
            .logo-section img {
              width: 50px;
              height: 50px;
              margin-left: 10px;
            }
            .invoice-title {
              font-size: 24px;
              font-weight: bold;
              color: #000;
              margin-bottom: 3px;
            }
            .invoice-subtitle {
              color: #666;
              font-size: 12px;
            }
            .invoice-number {
              background: #000;
              color: white;
              padding: 10px;
              border-radius: 5px;
              text-align: center;
              min-width: 120px;
            }
            .invoice-number-label {
              font-size: 10px;
              margin-bottom: 3px;
            }
            .invoice-number-value {
              font-size: 14px;
              font-weight: bold;
            }
            
            /* Company Info Section */
            .company-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 15px;
            }
            .info-section h3 {
              font-size: 14px;
              font-weight: 600;
              color: #000;
              margin-bottom: 8px;
            }
            .info-box {
              background: #f5f5f5;
              padding: 10px;
              border: 1px solid #ccc;
              border-radius: 3px;
            }
            .info-box p {
              margin-bottom: 3px;
              font-size: 11px;
            }
            .info-box .company-name {
              font-weight: 600;
              color: #000;
              margin-bottom: 5px;
            }
            
            /* Invoice Details */
            .invoice-details {
              margin-bottom: 15px;
            }
            .details-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            }
            .details-title {
              font-size: 14px;
              font-weight: 600;
              color: #000;
            }
            .dates {
              text-align: right;
            }
            .dates p {
              margin-bottom: 2px;
              font-size: 11px;
              color: #666;
            }
            
            /* Table */
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              border: 1px solid #000;
            }
            .invoice-table th {
              background: #f0f0f0;
              padding: 8px;
              text-align: right;
              font-weight: 600;
              color: #000;
              border: 1px solid #000;
              font-size: 11px;
            }
            .invoice-table td {
              padding: 8px;
              border: 1px solid #000;
              text-align: right;
              font-size: 11px;
            }
            
            /* Totals */
            .totals {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 15px;
            }
            .totals-container {
              width: 250px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #ccc;
              font-size: 11px;
            }
            .total-final {
              background: #f0f0f0;
              padding: 8px;
              border: 1px solid #000;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 12px;
            }
            .total-amount {
              color: #000;
            }
            
            /* Footer */
            .footer {
              border-top: 1px solid #000;
              padding-top: 10px;
              text-align: center;
              margin-top: 15px;
            }
            .footer h4 {
              font-weight: 600;
              color: #000;
              margin-bottom: 5px;
              font-size: 12px;
            }
            .footer p {
              color: #666;
              font-size: 10px;
            }
            
            /* Print specific */
            @media print {
              body { 
                margin: 0; 
                padding: 0;
                font-size: 11px;
              }
              .invoice-container { 
                padding: 0; 
                margin: 0;
              }
              .invoice-header {
                margin-bottom: 10px;
                padding-bottom: 8px;
              }
              .company-info {
                margin-bottom: 10px;
                gap: 15px;
              }
              .invoice-details {
                margin-bottom: 10px;
              }
              .invoice-table {
                margin-bottom: 10px;
              }
              .totals {
                margin-bottom: 10px;
              }
              .footer {
                margin-top: 10px;
                padding-top: 8px;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header -->
            <div class="invoice-header">
              <div class="logo-section">
                <img src="/logo.png" alt="Tatubo Technology" />
                <div>
                  <h1 class="invoice-title">فاتورة</h1>
                  <p class="invoice-subtitle">Invoice</p>
                </div>
              </div>
              <div class="invoice-number">
                <p class="invoice-number-label">رقم الفاتورة</p>
                <p class="invoice-number-value">${invoiceNumber}</p>
              </div>
            </div>
            
            <!-- Company Info -->
            <div class="company-info">
              <div>
                <h3>من:</h3>
                <div class="info-box">
                  <p class="company-name">tatubu.com</p>
                  <p>Muscat, Sultanate of Oman</p>
                  <p>+968 76002642</p>
                  <p>www.pathtodev.com</p>
                </div>
              </div>
              <div>
                <h3>إلى:</h3>
                <div class="info-box">
                  <p class="company-name">${school?.name || 'اسم المدرسة'}</p>
                  <p>${school?.address || 'عنوان المدرسة'}</p>
                  <p>${school?.phone_number || 'رقم الهاتف'}</p>
                  <p>سلطنة عمان</p>
                </div>
              </div>
            </div>
            
            <!-- Invoice Details -->
            <div class="invoice-details">
              <div class="details-header">
                <h3 class="details-title">تفاصيل الفاتورة</h3>
                <div class="dates">
                  <p>تاريخ الإصدار: ${currentDate}</p>
                  <p>فترة الخدمة: من ${currentDate} إلى ${dueDateFormatted}</p>
                </div>
              </div>
            </div>
            
            <!-- Invoice Table -->
            <table class="invoice-table">
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceItems.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td>${item.unitPrice.toLocaleString()} ريال عماني</td>
                    <td>${item.total.toLocaleString()} ريال عماني</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <!-- Totals -->
            <div class="totals">
              <div class="totals-container">
                <div class="total-row">
                  <span>المجموع الفرعي:</span>
                  <span>${subtotal.toLocaleString()} ريال عماني</span>
                </div>
                <div class="total-final">
                  <span>المجموع الكلي:</span>
                  <span class="total-amount">${subtotal.toLocaleString()} ريال عماني</span>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <h4>شكراً لاختياركم خدماتنا</h4>
              <p>نحن نقدر ثقتكم في خدماتنا ونتطلع إلى استمرار التعاون معكم.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ في إنشاء PDF. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleSendWhatsApp = async () => {
    if (school?.phone_number) {
      try {
        // Generate PDF first
        const message = `مرحباً، يرجى مراجعة فاتورتكم رقم ${invoiceNumber} للمدرسة ${school.name}. شكراً لاختياركم خدماتنا.`;
        
        // For now, we'll use the print function to generate a PDF-like view
        // In the future, you can integrate with a PDF generation library like jsPDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>فاتورة ${school.name}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                .invoice-container { max-width: 800px; margin: 0 auto; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="invoice-container">
                ${document.querySelector('.bg-white').innerHTML}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        
        // Show instructions for sharing
        alert(`تم فتح الفاتورة في نافذة جديدة. يرجى:
1. حفظ الصفحة كـ PDF (Ctrl+P ثم حفظ كـ PDF)
2. ثم مشاركة الملف عبر واتساب على الرقم: ${school.phone_number}

أو يمكنك نسخ الرابط التالي لمشاركة الفاتورة:
${window.location.href}`);
        
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('حدث خطأ في إنشاء PDF. يرجى المحاولة مرة أخرى.');
      }
    } else {
      alert('رقم الهاتف غير متوفر للمدرسة');
    }
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center">
          <div className=" rounded-lg flex items-center justify-center mr-4">
            <img src="/logo.png" alt="Tatubo Technology" className="w-16 h-16 ml-4 object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">فاتورة</h1>
            <p className="text-gray-600">Invoice</p>
          </div>
        </div>
        <div className="text-left">
          <div className="bg-blue-600 text-white p-4 rounded-lg">
            <p className="text-sm">رقم الفاتورة</p>
            <p className="text-xl font-bold">{invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Company and School Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">من:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-gray-900">tatubu.com</p>
            <p className="text-gray-600">Muscat, Sultanate of Oman</p>
            <p className="text-gray-600">+968 76002642</p>
            <p className="text-gray-600">www.pathtodev.com</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">إلى:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-gray-900">{school?.name || 'اسم المدرسة'}</p>
            <p className="text-gray-600">{school?.address || 'عنوان المدرسة'}</p>
            <p className="text-gray-600">{school?.phone_number || 'رقم الهاتف'}</p>
            <p className="text-gray-600">سلطنة عمان</p>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">تفاصيل الفاتورة</h3>
          <div className="text-right">
            <p className="text-gray-600">تاريخ الإصدار: {currentDate}</p>
          
            <p className="text-gray-600">فترة الخدمة: من {currentDate} إلى {dueDateFormatted}</p>
          </div>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900">الوصف</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">الكمية</th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">سعر الوحدة</th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{item.description}</td>
                <td className="border border-gray-300 px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-3 text-left text-gray-700">{item.unitPrice.toLocaleString()} ريال عماني</td>
                <td className="border border-gray-300 px-4 py-3 text-left text-gray-700 font-semibold">{item.total.toLocaleString()} ريال عماني</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <div className="space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">المجموع الفرعي:</span>
              <span className="font-semibold">{subtotal.toLocaleString()} ريال عماني</span>
            </div>
            <div className="flex justify-between py-3 bg-gray-50 px-4 rounded-lg">
              <span className="text-lg font-bold text-gray-900">المجموع الكلي:</span>
              <span className="text-lg font-bold text-blue-600">{subtotal.toLocaleString()} ريال عماني</span>
            </div>
          </div>
        </div>
      </div>



      {/* Footer */}
      <div className="border-t border-gray-200 pt-6">
        <div className="text-center">
          <h4 className="font-semibold text-gray-900 mb-2">شكراً لاختياركم خدماتنا</h4>
          <p className="text-gray-600 text-sm">
            نحن نقدر ثقتكم في خدماتنا ونتطلع إلى استمرار التعاون معكم.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 mt-8 justify-between print:hidden">
        {/* <button
          onClick={handlePrint}
          className="btn btn-primary flex items-center"
        >
          <Printer className="h-4 w-4 mr-2" />
          طباعة
        </button> */}
        <button
          onClick={handleDownload}
          className="btn btn-outline flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          تحميل PDF
        </button>
        {/* <button
          onClick={handleSendWhatsApp}
          className="btn btn-success flex items-center"
          disabled={!school?.phone_number}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          مشاركة PDF عبر واتساب
        </button> */}
        <button
          onClick={onClose}
          className="btn btn-secondary"
        >
          إغلاق
        </button>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .bg-white {
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Invoice;
