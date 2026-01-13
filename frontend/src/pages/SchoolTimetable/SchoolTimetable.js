import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Calendar, Clock, Users, BookOpen, Building, Search, Filter, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

// Complete Windows-1256 to Unicode mapping table
const WINDOWS_1256_MAP = {
  0x80: 0x20AC, 0x81: 0x067E, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0679, 0x8B: 0x2039, 0x8C: 0x0152, 0x8D: 0x0686, 0x8E: 0x0698, 0x8F: 0x0688,
  0x90: 0x06AF, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x06A9, 0x99: 0x2122, 0x9A: 0x0691, 0x9B: 0x203A, 0x9C: 0x0153, 0x9D: 0x200C, 0x9E: 0x200D, 0x9F: 0x06BA,
  0xA0: 0x00A0, 0xA1: 0x060C, 0xA2: 0x00A2, 0xA3: 0x00A3, 0xA4: 0x00A4, 0xA5: 0x00A5, 0xA6: 0x00A6, 0xA7: 0x00A7,
  0xA8: 0x00A8, 0xA9: 0x00A9, 0xAA: 0x06BE, 0xAB: 0x00AB, 0xAC: 0x00AC, 0xAD: 0x00AD, 0xAE: 0x00AE, 0xAF: 0x00AF,
  0xB0: 0x00B0, 0xB1: 0x00B1, 0xB2: 0x00B2, 0xB3: 0x00B3, 0xB4: 0x00B4, 0xB5: 0x00B5, 0xB6: 0x00B6, 0xB7: 0x00B7,
  0xB8: 0x00B8, 0xB9: 0x00B9, 0xBA: 0x061B, 0xBB: 0x00BB, 0xBC: 0x00BC, 0xBD: 0x00BD, 0xBE: 0x00BE, 0xBF: 0x061F,
  0xC0: 0x06C1, 0xC1: 0x0621, 0xC2: 0x0622, 0xC3: 0x0623, 0xC4: 0x0624, 0xC5: 0x0625, 0xC6: 0x0626, 0xC7: 0x0627,
  0xC8: 0x0628, 0xC9: 0x0629, 0xCA: 0x062A, 0xCB: 0x062B, 0xCC: 0x062C, 0xCD: 0x062D, 0xCE: 0x062E, 0xCF: 0x062F,
  0xD0: 0x0630, 0xD1: 0x0631, 0xD2: 0x0632, 0xD3: 0x0633, 0xD4: 0x0634, 0xD5: 0x0635, 0xD6: 0x0636, 0xD7: 0x00D7,
  0xD8: 0x0637, 0xD9: 0x0638, 0xDA: 0x0639, 0xDB: 0x063A, 0xDC: 0x0640, 0xDD: 0x0641, 0xDE: 0x0642, 0xDF: 0x0643,
  0xE0: 0x00E0, 0xE1: 0x0644, 0xE2: 0x00E2, 0xE3: 0x0645, 0xE4: 0x0646, 0xE5: 0x0647, 0xE6: 0x0648, 0xE7: 0x00E7,
  0xE8: 0x00E8, 0xE9: 0x00E9, 0xEA: 0x00EA, 0xEB: 0x00EB, 0xEC: 0x0649, 0xED: 0x064A, 0xEE: 0x00EE, 0xEF: 0x00EF,
  0xF0: 0x064B, 0xF1: 0x064C, 0xF2: 0x064D, 0xF3: 0x064E, 0xF4: 0x00F4, 0xF5: 0x064F, 0xF6: 0x0650, 0xF7: 0x00F7,
  0xF8: 0x0651, 0xF9: 0x00F9, 0xFA: 0x0652, 0xFB: 0x00FB, 0xFC: 0x00FC, 0xFD: 0x200E, 0xFE: 0x200F, 0xFF: 0x06D2
};

// Convert Windows-1256 encoded bytes to UTF-8 string
const convertWindows1256ToUTF8 = (uint8Array) => {
  const decoder = new TextDecoder('utf-8');
  let result = '';
  
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i];
    
    // ASCII range (0x00-0x7F) - no conversion needed
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
    } 
    // Extended range (0x80-0xFF) - convert using mapping table
    else if (WINDOWS_1256_MAP[byte] !== undefined) {
      const unicode = WINDOWS_1256_MAP[byte];
      result += String.fromCharCode(unicode);
    } 
    // Fallback for unmapped bytes
    else {
      result += String.fromCharCode(byte);
    }
  }
  
  return result;
};

const SchoolTimetable = () => {
  const [timetableData, setTimetableData] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState(null);
  const [subjectFilterForTeacherList, setSubjectFilterForTeacherList] = useState(null);
  const [viewMode, setViewMode] = useState('class'); // 'class' or 'teacher'
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const fileInputRef = useRef(null);
  const timetableContainerRef = useRef(null);

  // Parse XML file
  const parseXML = (xmlString) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('خطأ في تحليل ملف XML');
      }

      // Extract data from XML
      const data = {
        days: [],
        periods: [],
        grades: [],
        subjects: [],
        teachers: [],
        classrooms: [],
        classes: [],
        schedules: []
      };

      // Parse days
      const dayElements = xmlDoc.querySelectorAll('day');
      dayElements.forEach(day => {
        data.days.push({
          id: day.getAttribute('day'),
          name: day.getAttribute('name'),
          short: day.getAttribute('short')
        });
      });

      // Parse periods
      const periodElements = xmlDoc.querySelectorAll('period');
      periodElements.forEach(period => {
        data.periods.push({
          id: period.getAttribute('period'),
          startTime: period.getAttribute('starttime'),
          endTime: period.getAttribute('endtime')
        });
      });

      // Parse subjects
      const subjectElements = xmlDoc.querySelectorAll('subject');
      subjectElements.forEach(subject => {
        data.subjects.push({
          id: subject.getAttribute('id'),
          name: subject.getAttribute('name'),
          short: subject.getAttribute('short')
        });
      });

      // Parse teachers
      const teacherElements = xmlDoc.querySelectorAll('teacher');
      teacherElements.forEach(teacher => {
        data.teachers.push({
          id: teacher.getAttribute('id'),
          name: teacher.getAttribute('name'),
          short: teacher.getAttribute('short'),
          gender: teacher.getAttribute('gender'),
          color: teacher.getAttribute('color')
        });
      });

      // Parse classrooms
      const classroomElements = xmlDoc.querySelectorAll('classroom');
      classroomElements.forEach(classroom => {
        data.classrooms.push({
          id: classroom.getAttribute('id'),
          name: classroom.getAttribute('name'),
          short: classroom.getAttribute('short'),
          capacity: classroom.getAttribute('capacity')
        });
      });

      // Parse classes
      const classElements = xmlDoc.querySelectorAll('class');
      classElements.forEach(cls => {
        data.classes.push({
          id: cls.getAttribute('id'),
          name: cls.getAttribute('name'),
          short: cls.getAttribute('short'),
          teacherId: cls.getAttribute('teacherid'),
          gradeId: cls.getAttribute('gradeid')
        });
      });

      // Parse schedules
      const scheduleElements = xmlDoc.querySelectorAll('TimeTableSchedule');
      scheduleElements.forEach(schedule => {
        data.schedules.push({
          dayId: schedule.getAttribute('DayID'),
          period: schedule.getAttribute('Period'),
          lengthId: schedule.getAttribute('LengthID'),
          schoolRoomId: schedule.getAttribute('SchoolRoomID'),
          subjectGradeId: schedule.getAttribute('SubjectGradeID'),
          classId: schedule.getAttribute('ClassID'),
          optionalClassId: schedule.getAttribute('OptionalClassID'),
          teacherId: schedule.getAttribute('TeacherID')
        });
      });

      return data;
    } catch (error) {
      console.error('Error parsing XML:', error);
      throw new Error('فشل في تحليل ملف XML: ' + error.message);
    }
  };

  // Handle file upload - simplified approach
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      toast.error('الرجاء اختيار ملف XML فقط');
      return;
    }

    // Try FileReader with windows-1256 first (most reliable for browsers that support it)
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        let xmlString = e.target.result;
        
        // Check if text is corrupted (contains replacement characters or question marks)
        const hasCorruption = xmlString.includes('') || 
                              xmlString.includes('\uFFFD') || 
                              (xmlString.length > 100 && !/[\u0600-\u06FF]/.test(xmlString.substring(0, 500)) && xmlString.includes('?'));
        
        if (hasCorruption) {
          console.log('FileReader result appears corrupted, trying ArrayBuffer conversion...');
          // Try reading as ArrayBuffer and converting manually
          try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            xmlString = convertWindows1256ToUTF8(uint8Array);
            console.log('Manual conversion result sample:', xmlString.substring(0, 200));
          } catch (convError) {
            console.error('Manual conversion failed:', convError);
            toast.error('فشل في تحويل الترميز. يرجى التأكد من أن الملف بصيغة صحيحة.');
            return;
          }
        }
        
        // Parse the XML
        const parsedData = parseXML(xmlString);
        setTimetableData(parsedData);
        toast.success('تم تحميل الجدول بنجاح');
      } catch (error) {
        console.error('Parse error:', error);
        toast.error('فشل في تحليل ملف XML: ' + error.message);
      }
    };
    
    reader.onerror = () => {
      toast.error('خطأ في قراءة الملف');
    };
    
    // Try windows-1256 first, then UTF-8 as fallback
    try {
      reader.readAsText(file, 'windows-1256');
    } catch (e) {
      console.log('windows-1256 not supported, trying UTF-8');
      reader.readAsText(file, 'UTF-8');
    }
  };

  // Get schedule for a specific class, day, and period
  const getScheduleForSlot = (classId, dayId, period) => {
    if (!timetableData) return null;
    return timetableData.schedules.find(
      s => s.classId === classId && s.dayId === dayId && s.period === period
    );
  };

  // Get schedule for a specific teacher, day, and period (with optional subject filter)
  const getScheduleForTeacherSlot = (teacherId, dayId, period, subjectFilter = null) => {
    if (!timetableData) return null;
    const schedule = timetableData.schedules.find(
      s => s.teacherId === teacherId && s.dayId === dayId && s.period === period
    );
    
    // If subject filter is set, only return schedule if it matches
    if (schedule && subjectFilter && schedule.subjectGradeId !== subjectFilter) {
      return null;
    }
    
    return schedule;
  };

  // Get subjects taught by selected teacher
  const getTeacherSubjects = () => {
    if (!timetableData || !selectedTeacher) return [];
    
    const teacherSchedules = timetableData.schedules.filter(
      s => s.teacherId === selectedTeacher
    );
    
    const subjectIds = [...new Set(teacherSchedules.map(s => s.subjectGradeId))];
    
    return subjectIds
      .map(subjectId => timetableData.subjects.find(s => s.id === subjectId))
      .filter(subject => subject !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get all subjects that have teachers
  const getAllSubjectsWithTeachers = () => {
    if (!timetableData) return [];
    
    const subjectIds = [...new Set(timetableData.schedules.map(s => s.subjectGradeId))];
    
    return subjectIds
      .map(subjectId => timetableData.subjects.find(s => s.id === subjectId))
      .filter(subject => subject !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get teachers who teach a specific subject
  const getTeachersBySubject = (subjectId) => {
    if (!timetableData || !subjectId) return [];
    
    const teacherIds = [...new Set(
      timetableData.schedules
        .filter(s => s.subjectGradeId === subjectId)
        .map(s => s.teacherId)
    )];
    
    return teacherIds
      .map(teacherId => timetableData.teachers.find(t => t.id === teacherId))
      .filter(teacher => teacher !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get subject name by ID
  const getSubjectName = (subjectId) => {
    if (!timetableData) return '';
    const subject = timetableData.subjects.find(s => s.id === subjectId);
    return subject ? subject.name : '';
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId) => {
    if (!timetableData) return '';
    const teacher = timetableData.teachers.find(t => t.id === teacherId);
    return teacher ? teacher.short || teacher.name : '';
  };

  // Get classroom name by ID
  const getClassroomName = (classroomId) => {
    if (!timetableData) return '';
    const classroom = timetableData.classrooms.find(c => c.id === classroomId);
    return classroom ? classroom.short || classroom.name : '';
  };

  // Get class name by ID
  const getClassName = (classId) => {
    if (!timetableData) return '';
    const cls = timetableData.classes.find(c => c.id === classId);
    return cls ? cls.name : '';
  };

  // Filter classes based on search term
  const filteredClasses = timetableData?.classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.short.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter teachers based on search term and subject filter
  const filteredTeachers = (() => {
    if (!timetableData) return [];
    
    let teachers = timetableData.teachers;
    
    // Filter by subject if selected
    if (subjectFilterForTeacherList) {
      const teachersForSubject = getTeachersBySubject(subjectFilterForTeacherList);
      teachers = teachers.filter(teacher => 
        teachersForSubject.some(t => t.id === teacher.id)
      );
    }
    
    // Filter by search term
    if (teacherSearchTerm) {
      teachers = teachers.filter(teacher =>
        teacher.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
        (teacher.short && teacher.short.toLowerCase().includes(teacherSearchTerm.toLowerCase()))
      );
    }
    
    return teachers;
  })();

  // Reset timetable
  const handleReset = () => {
    setTimetableData(null);
    setSelectedClass(null);
    setSelectedTeacher(null);
    setSelectedSubjectFilter(null);
    setSubjectFilterForTeacherList(null);
    setViewMode('class');
    setSearchTerm('');
    setTeacherSearchTerm('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedClass(null);
    setSelectedTeacher(null);
    setSelectedSubjectFilter(null);
    setSubjectFilterForTeacherList(null);
    setSearchTerm('');
    setTeacherSearchTerm('');
  };

  // Handle teacher selection change
  const handleTeacherChange = (teacherId) => {
    setSelectedTeacher(teacherId);
    setSelectedSubjectFilter(null); // Reset subject filter when teacher changes
  };

  // Generate timetable HTML for a class
  const generateClassTimetableHTML = (classId) => {
    const cls = timetableData.classes.find(c => c.id === classId);
    if (!cls) return '';

    let html = `
      <div style="direction: rtl; font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px; font-size: 24px; color: #1f2937;">
          جدول ${cls.name}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; min-width: 120px;">
                الحصة
              </th>
    `;

    timetableData.days.forEach(day => {
      html += `
        <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; min-width: 150px;">
          ${day.name}
        </th>
      `;
    });

    html += `</tr></thead><tbody>`;

    timetableData.periods.forEach(period => {
      html += `
        <tr>
          <td style="padding: 12px; border: 1px solid #d1d5db; text-align: center; background-color: #ffffff;">
            <div style="font-weight: bold;">${period.id}</div>
            <div style="font-size: 11px; color: #6b7280;">${period.startTime} - ${period.endTime}</div>
          </td>
      `;

      timetableData.days.forEach(day => {
        const schedule = getScheduleForSlot(classId, day.id, period.id);
        if (schedule) {
          html += `
            <td style="padding: 12px; border: 1px solid #d1d5db; text-align: center; background-color: #dbeafe;">
              <div style="font-weight: bold; color: #1e40af;">${getSubjectName(schedule.subjectGradeId)}</div>
              ${schedule.teacherId ? `<div style="font-size: 11px; color: #1e3a8a; margin-top: 4px;">${getTeacherName(schedule.teacherId)}</div>` : ''}
              ${schedule.schoolRoomId ? `<div style="font-size: 11px; color: #1e40af; margin-top: 4px;">${getClassroomName(schedule.schoolRoomId)}</div>` : ''}
            </td>
          `;
        } else {
          html += `<td style="padding: 12px; border: 1px solid #d1d5db; text-align: center; color: #9ca3af;">-</td>`;
        }
      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  };

  // Generate timetable HTML for a teacher
  const generateTeacherTimetableHTML = (teacherId, subjectFilter = null) => {
    const teacher = timetableData.teachers.find(t => t.id === teacherId);
    if (!teacher) return '';

    let html = `
      <div style="direction: rtl; font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px; font-size: 24px; color: #1f2937;">
          جدول ${teacher.name}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; min-width: 120px;">
                الحصة
              </th>
    `;

    timetableData.days.forEach(day => {
      html += `
        <th style="padding: 12px; border: 1px solid #d1d5db; text-align: center; min-width: 150px;">
          ${day.name}
        </th>
      `;
    });

    html += `</tr></thead><tbody>`;

    timetableData.periods.forEach(period => {
      html += `
        <tr>
          <td style="padding: 12px; border: 1px solid #d1d5db; text-align: center; background-color: #ffffff;">
            <div style="font-weight: bold;">${period.id}</div>
            <div style="font-size: 11px; color: #6b7280;">${period.startTime} - ${period.endTime}</div>
          </td>
      `;

      timetableData.days.forEach(day => {
        const schedule = getScheduleForTeacherSlot(teacherId, day.id, period.id, subjectFilter);
        if (schedule) {
          html += `
            <td style="padding: 12px; border: 1px solid #d1d5db; text-align: center; background-color: #d1fae5;">
              <div style="font-weight: bold; color: #065f46;">${getSubjectName(schedule.subjectGradeId)}</div>
              ${schedule.classId ? `<div style="font-size: 11px; color: #047857; margin-top: 4px;">${getClassName(schedule.classId)}</div>` : ''}
              ${schedule.schoolRoomId ? `<div style="font-size: 11px; color: #059669; margin-top: 4px;">${getClassroomName(schedule.schoolRoomId)}</div>` : ''}
            </td>
          `;
        } else {
          html += `<td style="padding: 12px; border: 1px solid #d1d5db; text-align: center; color: #9ca3af;">-</td>`;
        }
      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  };

  // Convert HTML to PDF
  const htmlToPDF = async (htmlContent, fileName) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a temporary div to render HTML
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '297mm'; // Landscape width
        tempDiv.style.direction = 'rtl';
        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);

        // Wait for content to render
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: tempDiv.scrollWidth,
          height: tempDiv.scrollHeight,
        });

        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL('image/png', 0.95);
        const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape orientation
        
        const imgWidth = 297; // Landscape width (A4 landscape)
        const pageHeight = 210; // Landscape height
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage('l'); // Add landscape page
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        resolve(pdf);
      } catch (error) {
        reject(error);
      }
    });
  };

  // Download all class timetables
  const handleDownloadAllClasses = async () => {
    if (!timetableData || timetableData.classes.length === 0) {
      toast.error('لا توجد فصول للتحميل');
      return;
    }

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      toast.loading('جاري إنشاء ملفات PDF...', { id: 'downloading' });

      for (let i = 0; i < timetableData.classes.length; i++) {
        const cls = timetableData.classes[i];
        const html = generateClassTimetableHTML(cls.id);
        const pdf = await htmlToPDF(html, `جدول_${cls.name}.pdf`);
        
        const pdfBlob = pdf.output('blob');
        zip.file(`جدول_${cls.name.replace(/\//g, '_')}.pdf`, pdfBlob);

        // Update progress
        toast.loading(`جاري إنشاء ملف ${i + 1} من ${timetableData.classes.length}...`, { id: 'downloading' });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'جداول_الحصص_لجميع_الفصول.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`تم تحميل ${timetableData.classes.length} جدول بنجاح`, { id: 'downloading' });
    } catch (error) {
      console.error('Error downloading all classes:', error);
      toast.error('فشل في تحميل الجداول', { id: 'downloading' });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Download all teacher timetables
  const handleDownloadAllTeachers = async () => {
    if (!timetableData || timetableData.teachers.length === 0) {
      toast.error('لا يوجد معلمين للتحميل');
      return;
    }

    setIsDownloadingAll(true);
    try {
      const zip = new JSZip();
      toast.loading('جاري إنشاء ملفات PDF...', { id: 'downloading' });

      for (let i = 0; i < timetableData.teachers.length; i++) {
        const teacher = timetableData.teachers[i];
        const html = generateTeacherTimetableHTML(teacher.id);
        const pdf = await htmlToPDF(html, `جدول_${teacher.name}.pdf`);
        
        const pdfBlob = pdf.output('blob');
        zip.file(`جدول_${teacher.name.replace(/\//g, '_')}.pdf`, pdfBlob);

        // Update progress
        toast.loading(`جاري إنشاء ملف ${i + 1} من ${timetableData.teachers.length}...`, { id: 'downloading' });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'جداول_الحصص_لجميع_المعلمين.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`تم تحميل ${timetableData.teachers.length} جدول بنجاح`, { id: 'downloading' });
    } catch (error) {
      console.error('Error downloading all teachers:', error);
      toast.error('فشل في تحميل الجداول', { id: 'downloading' });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">جدول الحصص المدرسية</h1>
                <p className="text-sm text-gray-500 mt-1">عرض جدول الحصص من ملف XML</p>
              </div>
            </div>
            
            {!timetableData ? (
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
                <Upload className="h-5 w-5" />
                <span>رفع ملف XML</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <X className="h-5 w-5" />
                <span>إعادة التحميل</span>
              </button>
            )}
          </div>
        </div>

        {!timetableData ? (
          /* Upload Section */
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12">
            <div className="max-w-md mx-auto text-center">
              <div className="p-4 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">رفع ملف الجدول</h2>
              <p className="text-gray-600 mb-4">الرجاء رفع ملف XML الخاص بجدول الحصص</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-right">
                <p className="text-xs text-blue-800">
                  <strong>ملاحظة:</strong> يدعم النظام ملفات XML بترميز Windows-1256 أو UTF-8. إذا ظهرت النصوص بشكل غير صحيح، يرجى التأكد من ترميز الملف.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors">
                <Upload className="h-5 w-5" />
                <span>اختر ملف XML</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          /* Timetable Display */
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">الفصول</p>
                    <p className="text-lg font-semibold">{timetableData.classes.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">المواد</p>
                    <p className="text-lg font-semibold">{timetableData.subjects.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">المعلمين</p>
                    <p className="text-lg font-semibold">{timetableData.teachers.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-500">القاعات</p>
                    <p className="text-lg font-semibold">{timetableData.classrooms.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewModeChange('class')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'class'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="h-4 w-4 inline ml-2" />
                  عرض حسب الفصل
                </button>
                <button
                  onClick={() => handleViewModeChange('teacher')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'teacher'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="h-4 w-4 inline ml-2" />
                  عرض حسب المعلم
                </button>
              </div>
            </div>

            {/* Class Selection */}
            {viewMode === 'class' && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">اختر الفصل</h2>
                  <div className="flex gap-3 flex-1 sm:max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="ابحث عن فصل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleDownloadAllClasses}
                      disabled={isDownloadingAll}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {isDownloadingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">جاري التحميل...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">تحميل جميع الفصول</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredClasses.map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClass(cls.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedClass === cls.id
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <p className="font-medium">{cls.name}</p>
                        {cls.short && cls.short !== cls.name && (
                          <p className="text-xs text-gray-500 mt-1">{cls.short}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Selection */}
            {viewMode === 'teacher' && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">اختر المعلم</h2>
                    <div className="flex gap-3 flex-1 sm:max-w-2xl">
                      {/* Subject Filter for Teacher List */}
                      <div className="flex-1">
                        <div className="relative">
                          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                          <select
                            value={subjectFilterForTeacherList || ''}
                            onChange={(e) => setSubjectFilterForTeacherList(e.target.value || null)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white appearance-none"
                          >
                            <option value="">جميع المواد</option>
                            {getAllSubjectsWithTeachers().map(subject => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="ابحث عن معلم..."
                          value={teacherSearchTerm}
                          onChange={(e) => setTeacherSearchTerm(e.target.value)}
                          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={handleDownloadAllTeachers}
                        disabled={isDownloadingAll}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {isDownloadingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">جاري التحميل...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">تحميل جميع المعلمين</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {subjectFilterForTeacherList && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">
                        عرض المعلمين الذين يدرسون: <strong className="text-primary-700">{getSubjectName(subjectFilterForTeacherList)}</strong>
                      </span>
                      <button
                        onClick={() => setSubjectFilterForTeacherList(null)}
                        className="text-primary-600 hover:text-primary-700 underline text-xs"
                      >
                        إلغاء الفلترة
                      </button>
                    </div>
                  )}
                </div>
                
                {filteredTeachers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>لا يوجد معلمين متطابقين مع البحث</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredTeachers.map(teacher => (
                        <button
                          key={teacher.id}
                          onClick={() => handleTeacherChange(teacher.id)}
                          className={`p-3 rounded-lg border-2 transition-all text-right ${
                            selectedTeacher === teacher.id
                              ? 'border-primary-600 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                          }`}
                        >
                          <p className="font-medium">{teacher.name}</p>
                          {teacher.short && teacher.short !== teacher.name && (
                            <p className="text-xs text-gray-500 mt-1">{teacher.short}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subject Filter for Teacher View */}
            {viewMode === 'teacher' && selectedTeacher && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900">فلترة بالمواد الدراسية</h2>
                  </div>
                  <div className="flex-1 sm:max-w-xs">
                    <select
                      value={selectedSubjectFilter || ''}
                      onChange={(e) => setSelectedSubjectFilter(e.target.value || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value="">جميع المواد</option>
                      {getTeacherSubjects().map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedSubjectFilter && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      عرض حصص: <strong>{getSubjectName(selectedSubjectFilter)}</strong>
                    </span>
                    <button
                      onClick={() => setSelectedSubjectFilter(null)}
                      className="text-xs text-primary-600 hover:text-primary-700 underline"
                    >
                      إلغاء الفلترة
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Timetable Grid for Class */}
            {viewMode === 'class' && selectedClass && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    جدول {timetableData.classes.find(c => c.id === selectedClass)?.name}
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>الحصة</span>
                          </div>
                        </th>
                        {timetableData.days.map(day => (
                          <th
                            key={day.id}
                            className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[150px]"
                          >
                            <div>
                              <p className="font-medium">{day.name}</p>
                              {day.short && day.short !== day.name && (
                                <p className="text-xs text-gray-500 mt-1">{day.short}</p>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timetableData.periods.map(period => (
                        <tr key={period.id} className="hover:bg-gray-50">
                          <td className="px-3 py-4 text-center border-b border-gray-200 sticky right-0 bg-white z-10">
                            <div className="font-medium text-gray-900">{period.id}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {period.startTime} - {period.endTime}
                            </div>
                          </td>
                          {timetableData.days.map(day => {
                            const schedule = getScheduleForSlot(selectedClass, day.id, period.id);
                            return (
                              <td
                                key={`${day.id}-${period.id}`}
                                className="px-3 py-4 text-center border-b border-gray-200"
                              >
                                {schedule ? (
                                  <div className="p-2 bg-primary-50 rounded-lg border border-primary-200">
                                    <p className="text-sm font-medium text-primary-900">
                                      {getSubjectName(schedule.subjectGradeId)}
                                    </p>
                                    {schedule.teacherId && (
                                      <p className="text-xs text-primary-700 mt-1">
                                        {getTeacherName(schedule.teacherId)}
                                      </p>
                                    )}
                                    {schedule.schoolRoomId && (
                                      <p className="text-xs text-primary-600 mt-1">
                                        {getClassroomName(schedule.schoolRoomId)}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-sm">-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Timetable Grid for Teacher */}
            {viewMode === 'teacher' && selectedTeacher && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    جدول {timetableData.teachers.find(t => t.id === selectedTeacher)?.name}
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>الحصة</span>
                          </div>
                        </th>
                        {timetableData.days.map(day => (
                          <th
                            key={day.id}
                            className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[150px]"
                          >
                            <div>
                              <p className="font-medium">{day.name}</p>
                              {day.short && day.short !== day.name && (
                                <p className="text-xs text-gray-500 mt-1">{day.short}</p>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timetableData.periods.map(period => (
                        <tr key={period.id} className="hover:bg-gray-50">
                          <td className="px-3 py-4 text-center border-b border-gray-200 sticky right-0 bg-white z-10">
                            <div className="font-medium text-gray-900">{period.id}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {period.startTime} - {period.endTime}
                            </div>
                          </td>
                          {timetableData.days.map(day => {
                            const schedule = getScheduleForTeacherSlot(selectedTeacher, day.id, period.id, selectedSubjectFilter);
                            return (
                              <td
                                key={`${day.id}-${period.id}`}
                                className="px-3 py-4 text-center border-b border-gray-200"
                              >
                                {schedule ? (
                                  <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-sm font-medium text-green-900">
                                      {getSubjectName(schedule.subjectGradeId)}
                                    </p>
                                    {schedule.classId && (
                                      <p className="text-xs text-green-700 mt-1">
                                        {getClassName(schedule.classId)}
                                      </p>
                                    )}
                                    {/* {schedule.schoolRoomId && (
                                      <p className="text-xs text-green-600 mt-1">
                                        {getClassroomName(schedule.schoolRoomId)}
                                      </p>
                                    )} */}
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-sm">-</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(selectedClass || selectedTeacher) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>ملاحظة:</strong> يمكنك التبديل بين عرض الجدول حسب الفصل أو حسب المعلم
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolTimetable;
