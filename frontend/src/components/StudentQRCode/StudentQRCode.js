import React, { useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { encodeStudentQRPayload } from '../../utils/qrPayload';

const LOGIN_QR_URL = 'https://tatubu.com/login';

const StudentQRCode = ({ student, schoolName, isSelected, onToggleSelect, registerCardRef, canSelect = true }) => {
  const cardRef = useRef(null);
  const qrValue = encodeStudentQRPayload(student.username);

  useEffect(() => {
    if (typeof registerCardRef !== 'function') return;
    const el = cardRef.current;
    registerCardRef(student.id, el);
    return () => registerCardRef(student.id, null);
  }, [student.id, registerCardRef]);

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: null,

        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${student.fullName || student.username || 'card'}.png`.replace(/[<>:"/\\|?*]/g, '_');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const CARD_W = 280;
  const CARD_H = 180;

  return (
    <div className="relative group hover:z-[100]" style={{ width: CARD_W }}>
      {typeof onToggleSelect === 'function' && (
        <div className="absolute top-2 left-2 z-[60]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={() => onToggleSelect()}
              disabled={!canSelect && !isSelected}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 bg-white/90 px-1 rounded">اختيار</span>
          </label>
        </div>
      )}
      <div
        ref={cardRef}
        className="relative rounded-[12px] border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-lg overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300"
        style={{ width: CARD_W, height: CARD_H }}
      >
        {/* Logo as subtle background */}
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-contain pointer-events-none absolute top-0 left-0"
          style={{
            backgroundImage: "url('/logo.png')",
            backgroundSize: '100%',
            opacity: 0.12,
            zIndex: 0,
          }}
          aria-hidden
        />
      <div className="relative flex flex-row gap-2 h-full z-10" dir="rtl" style={{ padding: 12, boxSizing: 'border-box' }}>
        {/* Right: Student QR (main) + note - fixed size */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 gap-1" style={{ width: 140, minHeight: 0 }}>
          <div className="bg-white rounded-lg border border-gray-100 shadow-inner" style={{ padding: 4 }}>
            <QRCodeCanvas
              id={`qr-${student.id}`}
              value={qrValue}
              size={128}
              level="H"
              includeMargin={true}
            />
          </div>
          <span className="text-gray-400 bg-transparent text-center" style={{ fontSize: 7, lineHeight: 1.2 }}>للاستخدام في التطبيق فقط</span>
        </div>
        {/* Left: Text + Login QR - fixed width */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0" style={{ width: 168 }}>
          <div className="flex flex-col flex-shrink-0 gap-2" style={{ paddingTop: 2 }}>
            {schoolName && (
              <p className="font-medium text-gray-500 break-words bg-transparent" style={{ fontSize: 10, lineHeight: 1.35 }} title={schoolName}>
                {schoolName}
              </p>
            )}
            <h3 className="font-bold text-gray-900 break-words bg-transparent" style={{ fontSize: 12, lineHeight: 1.4, marginTop: 4 }} title={student.fullName}>
              {student.fullName}
            </h3>
          </div>
          <div className="flex-1 min-h-0" style={{ minHeight: 0 }} aria-hidden />
          <div className="flex flex-col items-center flex-shrink-0 gap-0" style={{ paddingTop: 8 }}>
            <QRCodeCanvas
              id={`login-qr-${student.id}`}
              value={LOGIN_QR_URL}
              size={44}
              level="M"
              includeMargin={true}
            />
            <span className="text-gray-500 bg-transparent" style={{ fontSize: 8, lineHeight: 1.2 }}>تسجيل الدخول</span>
          </div>
        </div>
      </div>
      </div>
      {/* Hover: download option - on top of card */}
      <div
        className="absolute rounded-[12px] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-50"
        style={{ inset: 0, width: CARD_W, height: CARD_H }}
        aria-hidden
      >
        <button
          type="button"
          onClick={handleDownloadImage}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg shadow-lg hover:bg-gray-100 font-medium text-sm"
        >
          <Download className="w-4 h-4" />
          تحميل الصورة
        </button>
      </div>
    </div>
  );
};

export default StudentQRCode;

