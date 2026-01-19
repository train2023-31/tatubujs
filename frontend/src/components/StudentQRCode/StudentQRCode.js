import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';

const StudentQRCode = ({ student, schoolName }) => {
  const downloadQR = () => {
    const canvas = document.getElementById(`qr-${student.id}`);
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${student.username}_QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    const canvas = document.getElementById(`qr-${student.id}`);
    const qrImage = canvas.toDataURL();
    
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>QR Code - ${student.fullName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px solid #333;
              border-radius: 10px;
            }
            h1 { font-size: 24px; margin: 10px 0; }
            h2 { font-size: 20px; margin: 10px 0; color: #666; }
            p { font-size: 18px; margin: 5px 0; }
            img { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${schoolName ? `<h2>${schoolName}</h2>` : ''}
            <h1>${student.fullName}</h1>
            <img src="${qrImage}" alt="QR Code" />
            <p>هذا الرمز QR للصعود والنزول من الحافلة</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"> 
      <div className="text-center w-full">
        {schoolName && (
          <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{schoolName}</p>
        )}
        <h3 className="font-bold text-xl text-gray-900 mb-2">{student.fullName}</h3>
       
        {student.class_name && (
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-700">الفصل: {student.class_name}</p>
          </div>
        )}
      </div>
      
      {/* QR Code Container */}
      <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-inner">
        <QRCodeCanvas
          id={`qr-${student.id}`}
          value={student.username}
          size={200}
          level="H"
          includeMargin={true}
        />
      </div>
      
      {/* Username */}
      <div className="mt-2 px-4 py-2 bg-gray-100 rounded-lg w-full">
        <p className="text-xs font-mono text-center text-gray-700">{student.username}</p>
      </div>
      
      {/* Actions */}
      {/* <div className="flex gap-2">
        <button
          onClick={downloadQR}
          className="btn btn-sm btn-outline flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          تحميل
        </button>
        <button
          onClick={printQR}
          className="btn btn-sm btn-primary flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          طباعة
        </button>
      </div> */}
    </div>
  );
};

export default StudentQRCode;

