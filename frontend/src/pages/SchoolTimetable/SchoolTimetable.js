import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, Calendar, Clock, Users, BookOpen, Building, Search, Filter, Download, Loader2, Save, UserCheck, Edit, Trash2, Power, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { useAuth } from '../../hooks/useAuth';
import api, { usersAPI, timetableAPI, substitutionAPI } from '../../services/api';

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
  const { user } = useAuth();
  const [timetableData, setTimetableData] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState(null);
  const [subjectFilterForTeacherList, setSubjectFilterForTeacherList] = useState(null);
  const [viewMode, setViewMode] = useState('class'); // 'class' or 'teacher'
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTeacherMapping, setShowTeacherMapping] = useState(false);
  const [schoolTeachers, setSchoolTeachers] = useState([]);
  const [teacherMappings, setTeacherMappings] = useState({});
  const [savedTimetables, setSavedTimetables] = useState([]);
  const [currentTimetableId, setCurrentTimetableId] = useState(null);
  const [timetableName, setTimetableName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState(null);
  const [editTimetableName, setEditTimetableName] = useState('');
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [teacherSubstitutions, setTeacherSubstitutions] = useState([]); // Store substitutions for selected teacher
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

      // ========== Parse Days (Support multiple formats) ==========
      // Format 1: Direct <day> elements
      const dayElements = xmlDoc.querySelectorAll('day');
      if (dayElements.length > 0) {
        dayElements.forEach(day => {
          const dayId = day.getAttribute('day') || day.getAttribute('id');
          if (dayId) {
            data.days.push({
              id: dayId,
              name: day.getAttribute('name') || '',
              short: day.getAttribute('short') || day.getAttribute('name') || ''
            });
          }
        });
      }

      // Format 2: <daysdef> elements (used in some XML formats like 202020.xml)
      if (data.days.length === 0) {
        const daysdefElements = xmlDoc.querySelectorAll('daysdef');
        const parsedDays = [];
        
        // First, prioritize individual day definitions (single pattern, length 5)
        const individualDays = Array.from(daysdefElements).filter(d => {
          const days = d.getAttribute('days') || '';
          return days.length === 5 && days.split(',').length === 1;
        });
        
        if (individualDays.length > 0) {
          // Use individual day definitions
          individualDays.forEach(daysdef => {
            const dayId = daysdef.getAttribute('id');
            const days = daysdef.getAttribute('days') || '';
            const name = daysdef.getAttribute('name') || '';
            const short = daysdef.getAttribute('short') || name;
            const dayIndex = days.indexOf('1');
            if (dayIndex >= 0 && dayIndex < 5) {
              parsedDays.push({
                id: dayId,
                name: name,
                short: short,
                index: dayIndex,
                pattern: days
              });
            }
          });
        } else {
          // Fallback: parse combined day definitions
          daysdefElements.forEach(daysdef => {
            const dayId = daysdef.getAttribute('id');
            const days = daysdef.getAttribute('days') || '';
            const name = daysdef.getAttribute('name') || '';
            const short = daysdef.getAttribute('short') || name;
            
            // Parse days string - can be single day like "10000" or multiple like "10000,01000,00100"
            const dayPatterns = days.split(',').filter(p => p.trim());
            
            dayPatterns.forEach(dayPattern => {
              // Parse day pattern (e.g., "10000" = Sunday, "01000" = Monday, etc.)
              const dayIndex = dayPattern.indexOf('1');
              if (dayIndex >= 0 && dayIndex < 5) {
                // Check if this day is already added
                const existingDay = parsedDays.find(d => d.index === dayIndex);
                if (!existingDay) {
                  parsedDays.push({
                    id: dayId, // Use daysdef id as day id
                    name: name,
                    short: short,
                    index: dayIndex,
                    pattern: dayPattern
                  });
                }
              }
            });
          });
        }
        
        // Sort by index and add to data.days
        parsedDays.sort((a, b) => a.index - b.index);
        data.days = parsedDays.map(d => ({ id: d.id, name: d.name, short: d.short }));
        
        console.log('Parsed days from daysdefs:', data.days);
      }

      // ========== Parse Periods (Support multiple formats) ==========
      const periodElements = xmlDoc.querySelectorAll('period');
      periodElements.forEach(period => {
        const periodId = period.getAttribute('period') || period.getAttribute('id') || period.getAttribute('name');
        if (periodId) {
          data.periods.push({
            id: periodId,
            startTime: period.getAttribute('starttime') || period.getAttribute('startTime') || '',
            endTime: period.getAttribute('endtime') || period.getAttribute('endTime') || ''
          });
        }
      });
      // Sort periods by ID
      data.periods.sort((a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return aNum - bNum;
      });

      // ========== Parse Subjects ==========
      const subjectElements = xmlDoc.querySelectorAll('subject');
      subjectElements.forEach(subject => {
        const subjectId = subject.getAttribute('id');
        if (subjectId) {
          data.subjects.push({
            id: subjectId,
            name: subject.getAttribute('name') || '',
            short: subject.getAttribute('short') || subject.getAttribute('name') || ''
          });
        }
      });

      // ========== Parse Teachers ==========
      const teacherElements = xmlDoc.querySelectorAll('teacher');
      teacherElements.forEach(teacher => {
        const teacherId = teacher.getAttribute('id');
        if (teacherId) {
          let name = teacher.getAttribute('name') || '';
          // If name is empty, try to construct from firstname and lastname
          if (!name) {
            const firstname = teacher.getAttribute('firstname') || '';
            const lastname = teacher.getAttribute('lastname') || '';
            name = `${firstname} ${lastname}`.trim();
          }
          
          data.teachers.push({
            id: teacherId,
            name: name || '',
            short: teacher.getAttribute('short') || name || '',
            gender: teacher.getAttribute('gender') || '',
            color: teacher.getAttribute('color') || ''
          });
        }
      });

      // ========== Parse Classrooms ==========
      const classroomElements = xmlDoc.querySelectorAll('classroom');
      classroomElements.forEach(classroom => {
        const classroomId = classroom.getAttribute('id');
        if (classroomId) {
          data.classrooms.push({
            id: classroomId,
            name: classroom.getAttribute('name') || '',
            short: classroom.getAttribute('short') || classroom.getAttribute('name') || '',
            capacity: classroom.getAttribute('capacity') || ''
          });
        }
      });

      // ========== Parse Classes ==========
      const classElements = xmlDoc.querySelectorAll('class');
      classElements.forEach(cls => {
        const classId = cls.getAttribute('id');
        if (classId) {
          data.classes.push({
            id: classId,
            name: cls.getAttribute('name') || '',
            short: cls.getAttribute('short') || cls.getAttribute('name') || '',
            teacherId: cls.getAttribute('teacherid') || cls.getAttribute('teacherId') || '',
            gradeId: cls.getAttribute('gradeid') || cls.getAttribute('grade') || ''
          });
        }
      });

      // ========== Parse Schedules (Support multiple formats) ==========
      
      // Format 1: Direct TimeTableSchedule elements (100.xml format)
      const scheduleElements = xmlDoc.querySelectorAll('TimeTableSchedule');
      if (scheduleElements.length > 0) {
        scheduleElements.forEach(schedule => {
          data.schedules.push({
            dayId: schedule.getAttribute('DayID') || schedule.getAttribute('dayId') || '',
            period: schedule.getAttribute('Period') || schedule.getAttribute('period') || '',
            lengthId: schedule.getAttribute('LengthID') || '',
            schoolRoomId: schedule.getAttribute('SchoolRoomID') || schedule.getAttribute('schoolRoomId') || '',
            subjectGradeId: schedule.getAttribute('SubjectGradeID') || schedule.getAttribute('subjectGradeId') || '',
            classId: schedule.getAttribute('ClassID') || schedule.getAttribute('classId') || '',
            optionalClassId: schedule.getAttribute('OptionalClassID') || '',
            teacherId: schedule.getAttribute('TeacherID') || schedule.getAttribute('teacherId') || ''
          });
        });
      } else {
        // Format 2: Cards + Lessons format (202020.xml format)
        const lessonElements = xmlDoc.querySelectorAll('lesson');
        const cardElements = xmlDoc.querySelectorAll('card');
        
        if (lessonElements.length > 0 && cardElements.length > 0) {
          // Create a map of lessons
          const lessonsMap = new Map();
          lessonElements.forEach(lesson => {
            const lessonId = lesson.getAttribute('id');
            if (lessonId) {
              const classIds = (lesson.getAttribute('classids') || '').split(',').filter(id => id.trim());
              const teacherIds = (lesson.getAttribute('teacherids') || '').split(',').filter(id => id.trim());
              const classroomIds = (lesson.getAttribute('classroomids') || '').split(',').filter(id => id.trim());
              
              lessonsMap.set(lessonId, {
                subjectId: lesson.getAttribute('subjectid') || '',
                classIds: classIds,
                teacherIds: teacherIds,
                classroomIds: classroomIds,
                daysdefid: lesson.getAttribute('daysdefid') || ''
              });
            }
          });

          // Create a map of daysdef patterns to day IDs and names
          const daysdefMap = new Map(); // Maps pattern -> {id, name, short}
          const daysdefElements = xmlDoc.querySelectorAll('daysdef');
          daysdefElements.forEach(daysdef => {
            const daysdefId = daysdef.getAttribute('id');
            const daysPattern = daysdef.getAttribute('days') || '';
            const name = daysdef.getAttribute('name') || '';
            const short = daysdef.getAttribute('short') || name;
            
            // Handle both single pattern and comma-separated patterns
            const patterns = daysPattern.split(',').filter(p => p.trim());
            patterns.forEach(pattern => {
              daysdefMap.set(pattern, {
                id: daysdefId,
                name: name,
                short: short
              });
            });
          });
          
          console.log('Daysdef Map:', Array.from(daysdefMap.entries()));
          console.log('Lessons Map size:', lessonsMap.size);
          console.log('Cards count:', cardElements.length);

          // Process cards to create schedules
          cardElements.forEach(card => {
            const lessonId = card.getAttribute('lessonid');
            const lesson = lessonsMap.get(lessonId);
            
            if (lesson) {
              const period = card.getAttribute('period');
              const cardDays = card.getAttribute('days') || '';
              const cardClassroomIds = (card.getAttribute('classroomids') || '').split(',').filter(id => id.trim());
              
              // Parse days string from card (e.g., "10000" = Sunday, "01000" = Monday, etc.)
              // The card's days attribute tells us which day of the week this card is for
              for (let i = 0; i < cardDays.length && i < 5; i++) {
                if (cardDays[i] === '1') {
                  // Find corresponding day ID
                  // First try to find day by pattern match in daysdefMap
                  let dayInfo = daysdefMap.get(cardDays);
                  let dayId = dayInfo ? dayInfo.id : null;
                  
                  // If not found, try to find individual day definition that matches this pattern
                  if (!dayId) {
                    const matchingDaysdef = Array.from(daysdefElements).find(d => {
                      const days = d.getAttribute('days') || '';
                      // Check if this daysdef contains the card's day pattern
                      const patterns = days.split(',').filter(p => p.trim());
                      return patterns.includes(cardDays);
                    });
                    if (matchingDaysdef) {
                      dayId = matchingDaysdef.getAttribute('id');
                      // Also update data.days if needed
                      if (!data.days.find(d => d.id === dayId)) {
                        data.days.push({
                          id: dayId,
                          name: matchingDaysdef.getAttribute('name') || '',
                          short: matchingDaysdef.getAttribute('short') || ''
                        });
                      }
                    }
                  }
                  
                  // If still not found, try to find by index in data.days
                  if (!dayId && data.days[i]) {
                    dayId = data.days[i].id;
                  }
                  
                  // If still not found, use lesson's daysdefid
                  if (!dayId) {
                    dayId = lesson.daysdefid;
                  }
                  
                  // Last resort: create a day ID based on position
                  if (!dayId) {
                    dayId = `day_${i + 1}`;
                    // Add to data.days if not exists
                    if (!data.days.find(d => d.id === dayId)) {
                      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
                      data.days.push({
                        id: dayId,
                        name: dayNames[i] || `Day ${i + 1}`,
                        short: dayNames[i] || `Day ${i + 1}`
                      });
                    }
                  }
                  
                  console.log(`Card ${lessonId}: day pattern "${cardDays}", day index ${i}, found dayId: ${dayId}`);
                  
                  // Create schedule for each class and teacher combination
                  const classIds = lesson.classIds.length > 0 ? lesson.classIds : ['*'];
                  const teacherIds = lesson.teacherIds.length > 0 ? lesson.teacherIds : ['*'];
                  const classroomId = cardClassroomIds[0] || lesson.classroomIds[0] || '';
                  
                  classIds.forEach(classId => {
                    teacherIds.forEach(teacherId => {
                      data.schedules.push({
                        dayId: dayId,
                        period: period,
                        lengthId: '',
                        schoolRoomId: classroomId,
                        subjectGradeId: lesson.subjectId,
                        classId: classId,
                        optionalClassId: '',
                        teacherId: teacherId
                      });
                    });
                  });
                }
              }
            }
          });
        }
      }

      // Validate and set defaults if needed
      if (data.days.length === 0) {
        console.warn('No days found in XML, using default days');
        data.days = [
          { id: '1', name: 'الأحد', short: 'أحد' },
          { id: '2', name: 'الإثنين', short: 'إثنين' },
          { id: '3', name: 'الثلاثاء', short: 'ثلاثاء' },
          { id: '4', name: 'الأربعاء', short: 'أربعاء' },
          { id: '5', name: 'الخميس', short: 'خميس' }
        ];
      }

      if (data.periods.length === 0) {
        throw new Error('لم يتم العثور على فترات الحصص في الملف');
      }

      console.log('Parsed XML data:', {
        days: data.days.length,
        periods: data.periods.length,
        subjects: data.subjects.length,
        teachers: data.teachers.length,
        classes: data.classes.length,
        schedules: data.schedules.length
      });

      return data;
    } catch (error) {
      console.error('Error parsing XML:', error);
      throw new Error('فشل في تحليل ملف XML: ' + error.message);
    }
  };

  // Handle file upload - simplified approach
  const handleFileUpload = (event, isUpdate = false) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      toast.error('الرجاء اختيار ملف XML فقط');
      return;
    }

    // If updating and no current timetable, show error
    if (isUpdate && !currentTimetableId) {
      toast.error('لا يوجد جدول محمّل للتحديث');
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
        
        // If updating, automatically save the updated data
        if (isUpdate && currentTimetableId) {
          toast.success('تم تحميل ملف XML بنجاح. جاري تحديث الجدول...');
          
          // Helper functions to get names (defined inline since they depend on parsedData)
          const getSubjectNameById = (subjectId) => {
            const subject = parsedData.subjects.find(s => s.id === subjectId);
            return subject ? subject.name : '';
          };
          
          const getClassNameById = (classId) => {
            const cls = parsedData.classes.find(c => c.id === classId);
            return cls ? cls.name : '';
          };
          
          const getClassroomNameById = (classroomId) => {
            const classroom = parsedData.classrooms.find(c => c.id === classroomId);
            return classroom ? classroom.short || classroom.name : '';
          };
          
          // Auto-save the updated timetable
          const data = {
            name: timetableName || savedTimetables.find(t => t.id === currentTimetableId)?.name || 'جدول محدث',
            days: parsedData.days,
            periods: parsedData.periods,
            teachers: parsedData.teachers,
            schedules: parsedData.schedules.map(schedule => ({
              className: getClassNameById(schedule.classId),
              classId: schedule.classId,
              subjectName: getSubjectNameById(schedule.subjectGradeId),
              subjectGradeId: schedule.subjectGradeId,
              teacherId: schedule.teacherId,
              classroomName: schedule.schoolRoomId ? getClassroomNameById(schedule.schoolRoomId) : null,
              dayId: schedule.dayId,
              period: schedule.period
            }))
          };
          
          setIsSaving(true);
          try {
            await timetableAPI.updateTimetable(currentTimetableId, data);
            toast.success('تم تحديث الجدول بنجاح');
            loadSavedTimetables();
            setShowTeacherMapping(true); // Show teacher mapping after update
          } catch (error) {
            console.error('Error updating timetable:', error);
            toast.error('فشل في تحديث الجدول: ' + (error.response?.data?.error || error.message));
          } finally {
            setIsSaving(false);
          }
        } else {
          toast.success('تم تحميل الجدول بنجاح');
        }
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
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
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
  // Also checks for substitution assignments
  const getScheduleForTeacherSlot = (teacherId, dayId, period, subjectFilter = null) => {
    if (!timetableData) return null;
    
    // First, check for regular schedule
    const schedule = timetableData.schedules.find(
      s => s.teacherId === teacherId && s.dayId === dayId && s.period === period
    );
    
    // If subject filter is set, only return schedule if it matches
    if (schedule && subjectFilter && schedule.subjectGradeId !== subjectFilter) {
      return null;
    }
    
    // Check for substitution assignments
    // Get the mapped user ID for this teacher
    const teacherUserId = teacherMappings[teacherId];
    if (teacherUserId && teacherSubstitutions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find active substitutions with assignments for this day and period
      for (const substitution of teacherSubstitutions) {
        if (!substitution.is_active) continue;
        
        const startDate = new Date(substitution.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(substitution.end_date);
        endDate.setHours(23, 59, 59, 999);
        
        // Check if substitution is still active (today should be within range)
        if (today < startDate || today > endDate) continue;
        
        // Check assignments for this substitution
        if (substitution.assignments && substitution.assignments.length > 0) {
          for (const assignment of substitution.assignments) {
            // Match by day_xml_id and period_xml_id
            const dayMatch = assignment.day_xml_id === dayId || 
                            assignment.schedule?.day_xml_id === dayId;
            const periodMatch = assignment.period_xml_id === period || 
                               assignment.schedule?.period_xml_id === period;
            
            if (dayMatch && periodMatch) {
              // IMPORTANT: The timetable shows weekly days (Sunday, Monday, etc.), not specific dates
              // So we need to show substitutions based on day of week, not specific dates
              
              // If assignment_date exists, it means "different teachers for different weeks"
              // In this case, we should show the substitution for this day of week if:
              // 1. Today is within the substitution date range
              // 2. Today's day of week matches the assignment_date's day of week
              // OR we can show it for all occurrences of this day within the range
              
              if (assignment.assignment_date) {
                // Different teachers for different weeks
                const assignmentDate = new Date(assignment.assignment_date);
                assignmentDate.setHours(0, 0, 0, 0);
                
                // Get day of week for assignment date (0 = Sunday, 1 = Monday, etc.)
                const getDayOfWeek = (date) => {
                  const day = date.getDay(); // JavaScript: 0=Sunday, 6=Saturday
                  return day; // Return as is: 0=Sunday, 1=Monday, ..., 6=Saturday
                };
                
                const assignmentDayOfWeek = getDayOfWeek(assignmentDate);
                
                // Get the timetable day to determine its day of week
                const timetableDay = timetableData.days.find(d => d.id === dayId);
                if (!timetableDay) {
                  continue; // Can't find timetable day, skip
                }
                
                // Map day name to day of week (0=Sunday, 1=Monday, etc.)
                const dayNameToWeekday = {
                  'الأحد': 0, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4
                };
                const timetableDayOfWeek = dayNameToWeekday[timetableDay.name];
                
                // Show substitution only if timetable day of week matches assignment's day of week
                // (Today is already verified to be within range above)
                if (timetableDayOfWeek === undefined || timetableDayOfWeek !== assignmentDayOfWeek) {
                  continue; // Day of week doesn't match, skip
                }
              }
              // If no assignment_date, it's "same teacher for all weeks" - show for all days within range
              // (as long as today is within the substitution date range, which we already checked above)
              
              // Return substitution schedule info
              return {
                ...schedule, // Include original schedule if exists
                isSubstitution: true,
                substitutionClass: assignment.class_name,
                substitutionSubject: assignment.subject_name,
                substitutionClassroom: assignment.schedule?.classroom_name || '',
                absentTeacher: substitution.absent_teacher_name || '',
                substitutionDate: assignment.assignment_date || substitution.end_date
              };
            }
          }
        }
      }
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

  // Get subjects taught by XML teacher
  const getXMLTeacherSubjects = (xmlTeacherId) => {
    if (!timetableData || !xmlTeacherId) return [];
    
    const teacherSchedules = timetableData.schedules.filter(
      s => s.teacherId === xmlTeacherId
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

  // Calculate similarity between two strings (Levenshtein distance based)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    if (s1.includes(s2) || s2.includes(s1)) return 80;
    
    // Simple word-based similarity
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    let matches = 0;
    words1.forEach(w1 => {
      if (words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))) {
        matches++;
      }
    });
    
    return (matches / Math.max(words1.length, words2.length)) * 100;
  };

  // Get suggested teachers for an XML teacher name
  const getSuggestedTeachers = (xmlTeacherName) => {
    if (!xmlTeacherName || !schoolTeachers.length) return [];
    
    // Calculate similarity for each teacher
    const teachersWithSimilarity = schoolTeachers.map(teacher => ({
      ...teacher,
      similarity: calculateSimilarity(xmlTeacherName, teacher.fullName)
    }));
    
    // Sort by similarity (highest first) and return top 3
    return teachersWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .filter(t => t.similarity > 0);
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
  const handleTeacherChange = async (teacherId) => {
    setSelectedTeacher(teacherId);
    setSelectedSubjectFilter(null); // Reset subject filter when teacher changes
    
    // Load substitutions for this teacher if they are mapped to a user
    if (currentTimetableId && teacherMappings[teacherId]) {
      try {
        const substitutions = await substitutionAPI.getTeacherSubstitutions(teacherMappings[teacherId]);
        setTeacherSubstitutions(substitutions.substitutions || []);
      } catch (error) {
        console.error('Error loading teacher substitutions:', error);
        setTeacherSubstitutions([]);
      }
    } else {
      setTeacherSubstitutions([]);
    }
  };

  // Generate timetable HTML for a class - optimized for single page PDF
  const generateClassTimetableHTML = (classId) => {
    const cls = timetableData.classes.find(c => c.id === classId);
    if (!cls) return '';

    // Calculate optimal font sizes based on number of periods and days
    const numPeriods = timetableData.periods.length;
    const numDays = timetableData.days.length;
    const totalCells = numPeriods * numDays;
    
    // Adjust sizes for larger tables
    const titleSize = totalCells > 30 ? '20px' : '24px';
    const cellPadding = totalCells > 30 ? '8px' : '10px';
    const headerPadding = totalCells > 30 ? '10px' : '12px';
    const subjectFontSize = totalCells > 30 ? '11px' : '13px';
    const detailFontSize = totalCells > 30 ? '9px' : '10px';

    let html = `
      <div style="direction: rtl; font-family: Arial, sans-serif; padding: 15px; box-sizing: border-box;">
        <h2 style="text-align: center; margin-bottom: 15px; margin-top: 0; font-size: ${titleSize}; color: #1f2937;">
          جدول ${cls.name}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0 auto; font-size: ${subjectFontSize};">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: ${headerPadding}; border: 1px solid #d1d5db; text-align: center; font-size: ${subjectFontSize};">
                الحصة
              </th>
    `;

    timetableData.days.forEach(day => {
      html += `
        <th style="padding: ${headerPadding}; border: 1px solid #d1d5db; text-align: center; font-size: ${subjectFontSize};">
          ${day.name}
        </th>
      `;
    });

    html += `</tr></thead><tbody>`;

    timetableData.periods.forEach(period => {
      html += `
        <tr>
          <td style="padding: ${cellPadding}; border: 1px solid #d1d5db; text-align: center; background-color: #ffffff; font-size: ${subjectFontSize};">
            <div style="font-weight: bold;">${period.id}</div>
            <div style="font-size: ${detailFontSize}; color: #6b7280;">${period.startTime} - ${period.endTime}</div>
          </td>
      `;

      timetableData.days.forEach(day => {
        const schedule = getScheduleForSlot(classId, day.id, period.id);
        if (schedule) {
          html += `
            <td style="padding: ${cellPadding}; border: 1px solid #d1d5db; text-align: center; background-color: #dbeafe; font-size: ${subjectFontSize};">
              <div style="font-weight: bold; color: #1e40af; font-size: ${subjectFontSize}; line-height: 1.3;">${getSubjectName(schedule.subjectGradeId)}</div>
              ${schedule.teacherId ? `<div style="font-size: ${detailFontSize}; color: #1e3a8a; margin-top: 2px; line-height: 1.2;">${getTeacherName(schedule.teacherId)}</div>` : ''}
              ${schedule.schoolRoomId ? `<div style="font-size: ${detailFontSize}; color: #1e40af; margin-top: 2px; line-height: 1.2;">${getClassroomName(schedule.schoolRoomId)}</div>` : ''}
            </td>
          `;
        } else {
          html += `<td style="padding: ${cellPadding}; border: 1px solid #d1d5db; text-align: center; color: #9ca3af; font-size: ${subjectFontSize};">-</td>`;
        }
      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  };

  // Generate timetable HTML for a teacher - optimized for single page PDF
  const generateTeacherTimetableHTML = (teacherId, subjectFilter = null) => {
    const teacher = timetableData.teachers.find(t => t.id === teacherId);
    if (!teacher) return '';

    // Calculate optimal font sizes based on number of periods and days
    const numPeriods = timetableData.periods.length;
    const numDays = timetableData.days.length;
    const totalCells = numPeriods * numDays;
    
    // Adjust sizes for larger tables
    const titleSize = totalCells > 30 ? '20px' : '24px';
    const cellPadding = totalCells > 30 ? '8px' : '10px';
    const headerPadding = totalCells > 30 ? '10px' : '12px';
    const subjectFontSize = totalCells > 30 ? '11px' : '13px';
    const detailFontSize = totalCells > 30 ? '9px' : '10px';

    let html = `
      <div style="direction: rtl; font-family: Arial, sans-serif; padding: 15px; box-sizing: border-box;">
        <h2 style="text-align: center; margin-bottom: 15px; margin-top: 0; font-size: ${titleSize}; color: #1f2937;">
          جدول ${teacher.name}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 0 auto; font-size: ${subjectFontSize};">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: ${headerPadding}; border: 1px solid #d1d5db; text-align: center; font-size: ${subjectFontSize};">
                الحصة
              </th>
    `;

    timetableData.days.forEach(day => {
      html += `
        <th style="padding: ${headerPadding}; border: 1px solid #d1d5db; text-align: center; font-size: ${subjectFontSize};">
          ${day.name}
        </th>
      `;
    });

    html += `</tr></thead><tbody>`;

    timetableData.periods.forEach(period => {
      html += `
        <tr>
          <td style="padding: ${cellPadding}; border: 1px solid #d1d5db; text-align: center; background-color: #ffffff; font-size: ${subjectFontSize};">
            <div style="font-weight: bold;">${period.id}</div>
            <div style="font-size: ${detailFontSize}; color: #6b7280;">${period.startTime} - ${period.endTime}</div>
          </td>
      `;

      timetableData.days.forEach(day => {
        const schedule = getScheduleForTeacherSlot(teacherId, day.id, period.id, subjectFilter);
        if (schedule) {
          html += `
            <td style="padding: ${cellPadding}; border: 1px solid #d1d5db; text-align: center; background-color: #d1fae5; font-size: ${subjectFontSize};">
              <div style="font-weight: bold; color: #065f46; font-size: ${subjectFontSize}; line-height: 1.3;">${getSubjectName(schedule.subjectGradeId)}</div>
              ${schedule.classId ? `<div style="font-size: ${detailFontSize}; color: #047857; margin-top: 2px; line-height: 1.2;">${getClassName(schedule.classId)}</div>` : ''}
              ${schedule.schoolRoomId ? `<div style="font-size: ${detailFontSize}; color: #059669; margin-top: 2px; line-height: 1.2;">${getClassroomName(schedule.schoolRoomId)}</div>` : ''}
            </td>
          `;
        } else {
          html += `<td style="padding: ${cellPadding}; border: 1px solid #d1d5db; text-align: center; color: #9ca3af; font-size: ${subjectFontSize};">-</td>`;
        }
      });

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  };

  // Convert HTML to PDF - ensure each table fits on one page
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
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the actual dimensions
        const contentWidth = tempDiv.scrollWidth;
        const contentHeight = tempDiv.scrollHeight;
        
        // A4 Landscape dimensions in pixels (at 96 DPI)
        const pageWidthPx = 1123; // 297mm in pixels
        const pageHeightPx = 794; // 210mm in pixels
        
        // Calculate scale to fit content on one page
        const widthScale = pageWidthPx / contentWidth;
        const heightScale = pageHeightPx / contentHeight;
        const scale = Math.min(widthScale, heightScale, 1); // Don't scale up, only down
        
        const canvas = await html2canvas(tempDiv, {
          scale: scale * 2, // Higher scale for better quality
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: contentWidth,
          height: contentHeight,
        });

        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL('image/png', 0.95);
        const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape orientation
        
        const imgWidth = 297; // Landscape width (A4 landscape)
        const pageHeight = 210; // Landscape height
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Ensure the image fits on one page - scale down if needed
        let finalImgWidth = imgWidth;
        let finalImgHeight = imgHeight;
        
        if (imgHeight > pageHeight) {
          // Scale down to fit on one page
          const scaleDown = pageHeight / imgHeight;
          finalImgHeight = pageHeight;
          finalImgWidth = imgWidth * scaleDown;
        }
        
        // Center the image on the page
        const xOffset = (imgWidth - finalImgWidth) / 2;
        const yOffset = 0;
        
        // Add image to PDF - only one page
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight);

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

  // Load saved timetables
  useEffect(() => {
    loadSavedTimetables();
    loadSchoolTeachers();
  }, []);

  const loadSavedTimetables = async () => {
    try {
      const timetables = await timetableAPI.getTimetables();
      setSavedTimetables(timetables);
    } catch (error) {
      console.error('Error loading timetables:', error);
    }
  };

  const loadSchoolTeachers = async () => {
    try {
      const teachers = await usersAPI.getMySchoolTeachers();
      setSchoolTeachers(teachers);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('فشل في تحميل قائمة المعلمين');
    }
  };

  // Prepare schedule data for API
  const prepareScheduleData = () => {
    return timetableData.schedules.map(schedule => ({
      className: getClassName(schedule.classId),
      classId: schedule.classId,
      subjectName: getSubjectName(schedule.subjectGradeId),
      subjectGradeId: schedule.subjectGradeId,
      teacherId: schedule.teacherId,
      classroomName: schedule.schoolRoomId ? getClassroomName(schedule.schoolRoomId) : null,
      dayId: schedule.dayId,
      period: schedule.period
    }));
  };

  // Save timetable to database
  const handleSaveTimetable = async () => {
    if (!timetableName) {
      toast.error('الرجاء إدخال اسم للجدول');
      return;
    }

    if (!timetableData) {
      toast.error('لا يوجد بيانات للحفظ');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: timetableName,
        days: timetableData.days,
        periods: timetableData.periods,
        teachers: timetableData.teachers,
        schedules: prepareScheduleData()
      };

      if (currentTimetableId) {
        // Update existing
        await timetableAPI.updateTimetable(currentTimetableId, data);
        toast.success('تم تحديث الجدول بنجاح');
      } else {
        // Create new
        const response = await timetableAPI.createTimetable(data);
        setCurrentTimetableId(response.data.timetable_id);
        toast.success('تم حفظ الجدول بنجاح');
      }

      loadSavedTimetables();
      setShowTeacherMapping(true); // Show teacher mapping after save
    } catch (error) {
      console.error('Error saving timetable:', error);
      toast.error('فشل في حفظ الجدول: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Load a saved timetable
  const handleLoadTimetable = async (timetableId) => {
    try {
      const data = await timetableAPI.getTimetable(timetableId);

      // Convert back to frontend format
      const loadedData = {
        days: data.days.map(d => ({ id: d.day_id, name: d.name, short: d.short_name })),
        periods: data.periods.map(p => ({ 
          id: p.period_id, 
          startTime: p.start_time, 
          endTime: p.end_time 
        })),
        classes: [...new Set(data.schedules.map(s => s.class_xml_id))].map(classId => {
          const schedule = data.schedules.find(s => s.class_xml_id === classId);
          return { id: classId, name: schedule.class_name, short: schedule.class_name };
        }),
        subjects: [...new Set(data.schedules.map(s => s.subject_xml_id))].map(subjectId => {
          const schedule = data.schedules.find(s => s.subject_xml_id === subjectId);
          return { id: subjectId, name: schedule.subject_name };
        }),
        teachers: data.teacher_mappings.map(tm => ({
          id: tm.xml_teacher_id,
          name: tm.xml_teacher_name,
          short: tm.xml_teacher_name
        })),
        classrooms: [...new Set(data.schedules.filter(s => s.classroom_name).map(s => s.classroom_name))].map((name, idx) => ({
          id: `room_${idx}`,
          name: name
        })),
        schedules: data.schedules.map(s => ({
          classId: s.class_xml_id,
          subjectGradeId: s.subject_xml_id,
          teacherId: s.teacher_xml_id,
          schoolRoomId: s.classroom_name,
          dayId: s.day_xml_id,
          period: s.period_xml_id
        }))
      };

      setTimetableData(loadedData);
      setCurrentTimetableId(timetableId);
      setTimetableName(data.name);

      // Load teacher mappings
      const mappingsData = await timetableAPI.getTeacherMappings(timetableId);
      const mappingsObj = {};
      mappingsData.mappings.forEach(m => {
        mappingsObj[m.xml_teacher_id] = m.teacher_id;
      });
      setTeacherMappings(mappingsObj);

      // If a teacher is already selected, load their substitutions
      if (selectedTeacher && mappingsObj[selectedTeacher]) {
        try {
          const substitutions = await substitutionAPI.getTeacherSubstitutions(mappingsObj[selectedTeacher]);
          setTeacherSubstitutions(substitutions.substitutions || []);
        } catch (error) {
          console.error('Error loading teacher substitutions:', error);
          setTeacherSubstitutions([]);
        }
      }

      toast.success('تم تحميل الجدول بنجاح');
    } catch (error) {
      console.error('Error loading timetable:', error);
      toast.error('فشل في تحميل الجدول');
    }
  };

  // Save teacher mappings
  const handleSaveTeacherMappings = async () => {
    if (!currentTimetableId) {
      toast.error('الرجاء حفظ الجدول أولاً');
      return;
    }

    setIsSaving(true);
    try {
      const mappingsArray = Object.keys(teacherMappings).map(xmlTeacherId => ({
        xml_teacher_id: xmlTeacherId,
        teacher_id: teacherMappings[xmlTeacherId]
      }));

      await timetableAPI.updateTeacherMappings(currentTimetableId, {
        mappings: mappingsArray
      });

      toast.success('تم حفظ ربط المعلمين بنجاح');
      setShowTeacherMapping(false);
    } catch (error) {
      console.error('Error saving teacher mappings:', error);
      toast.error('فشل في حفظ ربط المعلمين');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit timetable
  const handleEditTimetable = (timetable) => {
    setEditingTimetable(timetable);
    setEditTimetableName(timetable.name);
    setShowEditModal(true);
  };

  // Save edited timetable name
  const handleSaveEdit = async () => {
    if (!editTimetableName.trim()) {
      toast.error('الرجاء إدخال اسم للجدول');
      return;
    }

    setIsSaving(true);
    try {
      await timetableAPI.updateTimetable(editingTimetable.id, {
        name: editTimetableName.trim()
      });
      
      toast.success('تم تحديث اسم الجدول بنجاح');
      setShowEditModal(false);
      setEditingTimetable(null);
      setEditTimetableName('');
      loadSavedTimetables();
    } catch (error) {
      console.error('Error updating timetable:', error);
      toast.error('فشل في تحديث الجدول: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle activate timetable
  const handleActivateTimetable = async (timetableId) => {
    try {
      await timetableAPI.activateTimetable(timetableId);
      toast.success('تم تفعيل الجدول بنجاح');
      loadSavedTimetables();
    } catch (error) {
      console.error('Error activating timetable:', error);
      toast.error('فشل في تفعيل الجدول: ' + (error.response?.data?.error || error.message));
    }
  };

  // Handle delete timetable
  const handleDeleteTimetable = async (timetableId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الجدول؟ لا يمكن التراجع عن هذه العملية.')) {
      return;
    }

    setIsSaving(true);
    try {
      await timetableAPI.deleteTimetable(timetableId);
      toast.success('تم حذف الجدول بنجاح');
      
      // If deleted timetable was the current one, reset
      if (currentTimetableId === timetableId) {
        handleReset();
      }
      
      loadSavedTimetables();
    } catch (error) {
      console.error('Error deleting timetable:', error);
      toast.error('فشل في حذف الجدول: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle new timetable
  const handleNewTimetable = () => {
    handleReset();
    setTimetableName('');
    setCurrentTimetableId(null);
    // Show guide dialog first
    setShowUploadGuide(true);
  };

  // Handle file upload after guide is shown
  const handleFileUploadAfterGuide = () => {
    setShowUploadGuide(false);
    // Small delay to ensure modal is closed before opening file dialog
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">جدول الحصص المدرسية</h1>
                  {currentTimetableId && timetableName ? (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-sm text-gray-500">الجدول المحدد:</p>
                      <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {timetableName}
                      </span> 
                      {savedTimetables.find(t => t.id === currentTimetableId)?.is_active && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                          ✓ نشط
                        </span>
                      )}
                      {!savedTimetables.find(t => t.id === currentTimetableId)?.is_active && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                          ✗ غير نشط
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">عرض جدول الحصص من ملف XML</p>
                  )}
                </div>
              </div>
              
              {/* Primary Actions */}
              <div className="flex gap-3 flex-wrap">
                {!timetableData ? (
                  <>
                    <label 
                      onClick={() => setShowUploadGuide(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
                    >
                      <Upload className="h-5 w-5" />
                      <span>رفع ملف XML</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xml"
                        onChange={(e) => handleFileUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                    {/* {currentTimetableId && (
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer transition-colors">
                        <Upload className="h-5 w-5" />
                        <span className="hidden sm:inline">تحديث الجدول من XML</span>
                        <span className="sm:hidden">تحديث</span>
                        <input
                          type="file"
                          accept=".xml"
                          onChange={(e) => handleFileUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    )} */}
                    <button
                      onClick={handleNewTimetable}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">جدول جديد</span>
                      <span className="sm:hidden">جديد</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Save Timetable - Show in header if not saved */}
                    {!currentTimetableId && (
                      <div className="flex gap-2 items-center flex-1 sm:flex-initial sm:max-w-md">
                        <input
                          type="text"
                          placeholder="اسم الجدول..."
                          value={timetableName}
                          onChange={(e) => setTimetableName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        />
                        <button
                          onClick={handleSaveTimetable}
                          disabled={isSaving || !timetableName}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="hidden sm:inline">جاري الحفظ...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              <span className="hidden sm:inline">حفظ</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {/* Timetable Actions */}
                    <button
                      onClick={() => setShowTeacherMapping(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors relative"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">ربط المعلمين</span>
                      <span className="sm:hidden">ربط</span>
                      {timetableData && Object.keys(teacherMappings).length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {Object.values(teacherMappings).filter(id => id !== null).length}
                        </span>
                      )}
                    </button>
                    {currentTimetableId && (
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">تحديث من XML</span>
                        <span className="sm:hidden">تحديث</span>
                        <input
                          type="file"
                          accept=".xml"
                          onChange={(e) => handleFileUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    )}
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">إغلاق الجدول</span>
                      <span className="sm:hidden">إغلاق</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Mapping Modal */}
        {showTeacherMapping && timetableData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">ربط معلمي XML مع معلمي المدرسة</h2>
                  <button
                    onClick={() => setShowTeacherMapping(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {timetableData.teachers.map(xmlTeacher => {
                    const selectedTeacherId = teacherMappings[xmlTeacher.id];
                    const suggestedTeachers = getSuggestedTeachers(xmlTeacher.name);
                    // Filter out already selected teachers from the list
                    const availableTeachers = schoolTeachers.filter(teacher => {
                      // Hide if this teacher is selected for another XML teacher
                      const isSelectedElsewhere = Object.keys(teacherMappings).some(
                        xmlId => xmlId !== xmlTeacher.id && teacherMappings[xmlId] === teacher.id
                      );
                      return !isSelectedElsewhere;
                    });
                    
                    // Calculate similarity for all available teachers for coloring
                    const teachersWithSimilarity = availableTeachers.map(teacher => ({
                      ...teacher,
                      similarity: calculateSimilarity(xmlTeacher.name, teacher.fullName)
                    })).sort((a, b) => b.similarity - a.similarity);
                    
                    const xmlTeacherSubjects = getXMLTeacherSubjects(xmlTeacher.id);
                    
                    return (
                      <div key={xmlTeacher.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">معلم XML</p>
                          <p className="font-medium text-gray-900">{xmlTeacher.name}</p>
                          {xmlTeacherSubjects.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              المواد: {xmlTeacherSubjects.map(s => s.name).join('، ')}
                            </p>
                          )}
                          {suggestedTeachers.length > 0 && !selectedTeacherId && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {suggestedTeachers.map((suggested, idx) => {
                                const isSelected = selectedTeacherId === suggested.id;
                                const isSelectedElsewhere = Object.keys(teacherMappings).some(
                                  xmlId => xmlId !== xmlTeacher.id && teacherMappings[xmlId] === suggested.id
                                );
                                
                                if (isSelected || isSelectedElsewhere) return null;
                                
                                // Green for high similarity (>70%), blue for medium (40-70%), gray for low
                                const isHighSimilarity = suggested.similarity > 70;
                                const isMediumSimilarity = suggested.similarity > 40 && suggested.similarity <= 70;
                                
                                return (
                                  <button
                                    key={suggested.id}
                                    onClick={() => setTeacherMappings({
                                      ...teacherMappings,
                                      [xmlTeacher.id]: suggested.id
                                    })}
                                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                      isHighSimilarity
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                                        : isMediumSimilarity
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                    }`}
                                    title={`تشابه: ${Math.round(suggested.similarity)}%`}
                                  >
                                    {suggested.fullName} ({Math.round(suggested.similarity)}%)
                                    {xmlTeacherSubjects.length > 0 && (
                                      <span className="text-xs opacity-75"> - {xmlTeacherSubjects.map(s => s.name).join('، ')}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <select
                            value={selectedTeacherId || ''}
                            onChange={(e) => setTeacherMappings({
                              ...teacherMappings,
                              [xmlTeacher.id]: e.target.value ? parseInt(e.target.value) : null
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">-- اختر معلم --</option>
                            {selectedTeacherId && (() => {
                              const selectedTeacher = schoolTeachers.find(t => t.id === selectedTeacherId);
                              const selectedTeacherSubjects = getXMLTeacherSubjects(xmlTeacher.id);
                              return (
                                <option value={selectedTeacherId} className="bg-green-50 font-semibold">
                                  ✓ {selectedTeacher?.fullName}
                                  {selectedTeacherSubjects.length > 0 && ` (${selectedTeacherSubjects.map(s => s.name).join('، ')})`}
                                </option>
                              );
                            })()}
                            {suggestedTeachers.length > 0 && !selectedTeacherId && (
                              <optgroup label="اقتراحات (أعلى تشابه)">
                                {suggestedTeachers
                                  .filter(t => {
                                    const isSelectedElsewhere = Object.keys(teacherMappings).some(
                                      xmlId => xmlId !== xmlTeacher.id && teacherMappings[xmlId] === t.id
                                    );
                                    return !isSelectedElsewhere;
                                  })
                                  .map(teacher => {
                                    const isHighSimilarity = teacher.similarity > 70;
                                    const isMediumSimilarity = teacher.similarity > 40 && teacher.similarity <= 70;
                                    const teacherSubjects = getXMLTeacherSubjects(xmlTeacher.id);
                                    return (
                                      <option 
                                        key={teacher.id} 
                                        value={teacher.id} 
                                        className={isHighSimilarity ? 'bg-green-50 font-semibold' : isMediumSimilarity ? 'bg-blue-50' : 'bg-gray-50'}
                                        style={isHighSimilarity ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } : isMediumSimilarity ? { backgroundColor: '#eff6ff' } : {}}
                                      >
                                        {isHighSimilarity ? '✓ ' : ''}{teacher.fullName} ({Math.round(teacher.similarity)}% تشابه)
                                        {teacherSubjects.length > 0 && ` - ${teacherSubjects.map(s => s.name).join('، ')}`}
                                      </option>
                                    );
                                  })}
                              </optgroup>
                            )}
                            {teachersWithSimilarity.length > 0 && (
                              <optgroup label={selectedTeacherId ? "معلمون آخرون" : "جميع المعلمين"}>
                                {teachersWithSimilarity
                                  .filter(teacher => {
                                    // Don't show if it's the selected one (already shown above)
                                    if (selectedTeacherId === teacher.id) return false;
                                    // Don't show if it's in suggestions (already shown)
                                    if (suggestedTeachers.some(st => st.id === teacher.id)) return false;
                                    return true;
                                  })
                                  .map(teacher => {
                                    const isHighSimilarity = teacher.similarity > 70;
                                    const isMediumSimilarity = teacher.similarity > 40 && teacher.similarity <= 70;
                                    const teacherSubjects = getXMLTeacherSubjects(xmlTeacher.id);
                                    return (
                                      <option 
                                        key={teacher.id} 
                                        value={teacher.id}
                                        className={isHighSimilarity ? 'bg-green-50 font-semibold' : isMediumSimilarity ? 'bg-blue-50' : ''}
                                        style={isHighSimilarity ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } : isMediumSimilarity ? { backgroundColor: '#eff6ff' } : {}}
                                      >
                                        {isHighSimilarity ? '✓ ' : ''}{teacher.fullName}
                                        {teacherSubjects.length > 0 && ` - ${teacherSubjects.map(s => s.name).join('، ')}`}
                                      </option>
                                    );
                                  })}
                              </optgroup>
                            )}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={() => setShowTeacherMapping(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveTeacherMappings}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>حفظ الربط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saved Timetables List - Show first if no timetable loaded */}
        {!timetableData && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            
            {/* <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">الجداول المحفوظة</h2>
              <button
                onClick={handleNewTimetable}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>جدول جديد</span>
              </button>
            </div> */}
           
          {savedTimetables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>لا توجد جداول محفوظة</p>
              <p className="text-sm mt-1">قم بإنشاء جدول جديد عن طريق رفع ملف XML</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {savedTimetables.map(timetable => (
                <div
                  key={timetable.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    timetable.is_active 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleLoadTimetable(timetable.id)}
                    >
                      <h3 className="font-medium text-gray-900">{timetable.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(timetable.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTimetable(timetable);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="تعديل الاسم"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateTimetable(timetable.id);
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          timetable.is_active
                            ? 'text-green-600 hover:bg-green-100'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={timetable.is_active ? 'نشط (سيتم تعطيل الجداول الأخرى)' : 'تفعيل (سيتم تعطيل الجداول الأخرى)'}
                      >
                        <Power className={`h-4 w-4 ${timetable.is_active ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTimetable(timetable.id);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {timetable.is_active && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
                        ✓ نشط
                      </span>
                      <span className="text-xs text-gray-500">
                        (هذا الجدول النشط الوحيد)
                      </span>
                    </div>
                  )}
                  {!timetable.is_active && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
                        ✗ غير نشط
                      </span>
                      <span className="text-xs text-gray-500">
                        (هذا الجدول غير نشط)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        )}

        {/* Upload Guide Modal */}
        {showUploadGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">دليل رفع ملف XML من تطبيق aSc Timetables</h2>
                  <button
                    onClick={() => setShowUploadGuide(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Guide Content */}
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">افتح تطبيق aSc Timetables</h3>
                        <p className="text-sm text-gray-700 mb-3">
                          تأكد من أن لديك جدول الحصص المحفوظ في تطبيق aSc Timetables
                        </p>
                        <div className="bg-white rounded p-2 border border-blue-300">
                          <img 
                            src="/asc.png" 
                            alt="aSc Timetables Application" 
                            className="rounded-lg"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div style={{display: 'none'}} className="text-center text-gray-500 py-4">
                            <FileText className="h-12 w-12 mx-auto mb-2" />
                            <p>صورة تطبيق aSc Timetables</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">انتقل إلى قائمة التصدير (Export)</h3>
                        <p className="text-sm text-gray-700 mb-3">
                          في شريط القوائم العلوي، اضغط على زر <strong>"تصدير" (Export)</strong> المميز باللون الأصفر
                        </p>
                        <div className="bg-white rounded p-2 border border-green-300">
                          <img 
                            src="/asctimetable.png" 
                            alt="Export Menu in aSc Timetables" 
                            className="rounded-lg"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div style={{display: 'none'}} className="text-center text-gray-500 py-4">
                            <FileText className="h-12 w-12 mx-auto mb-2" />
                            <p>صورة قائمة التصدير</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">اختر "Oman XML"</h3>
                        <p className="text-sm text-gray-700 mb-2">
                          من القائمة المنسدلة، اختر الخيار <strong>"Oman XML"</strong> (المميز باللون الأصفر في الصورة)
                        </p>
                        <div className="bg-white rounded p-3 border border-yellow-300">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-yellow-600 font-bold">✓</span>
                            <span className="font-semibold">Oman XML</span>
                            <span className="text-gray-500 text-xs">(هذا هو التنسيق المطلوب)</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          <strong>ملاحظة:</strong> تأكد من اختيار "Oman XML" وليس "aSc Timetables XML" أو أي تنسيق آخر
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        4
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">احفظ الملف</h3>
                        <p className="text-sm text-gray-700 mb-2">
                          سيتم فتح نافذة الحفظ، اختر موقعاً مناسباً لحفظ الملف واحفظه
                        </p>
                        <div className="bg-white rounded p-3 border border-purple-300">
                          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                            <li>احفظ الملف بامتداد <code className="bg-gray-100 px-1 rounded">.xml</code></li>
                            <li>اختر اسماً واضحاً للملف (مثل: جدول_الحصص.xml)</li>
                            <li>تذكر موقع الملف المحفوظ</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                        5
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">ارفع الملف هنا</h3>
                        <p className="text-sm text-gray-700 mb-2">
                          بعد حفظ الملف، اضغط على زر "متابعة" أدناه لرفع الملف إلى النظام
                        </p>
                        <div className="bg-white rounded p-3 border border-indigo-300">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Upload className="h-5 w-5 text-indigo-600" />
                            <span>سيتم فتح نافذة اختيار الملف</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Important Notes */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center">
                          <span className="text-lg">!</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">ملاحظات مهمة</h3>
                        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                          <li>
                            <strong>التنسيق المطلوب:</strong> يجب أن يكون الملف بتنسيق "Oman XML" وليس أي تنسيق آخر
                          </li>
                          <li>
                            <strong>الترميز:</strong> النظام يدعم ملفات XML بترميز Windows-1256 أو UTF-8
                          </li>
                          <li>
                            <strong>التحقق:</strong> تأكد من أن الملف يحتوي على جميع البيانات المطلوبة (أيام، فترات، فصول، معلمين، حصص)
                          </li>
                          <li>
                            <strong>حجم الملف:</strong> يجب ألا يتجاوز حجم الملف الحد المسموح به
                          </li>
                          <li>
                            <strong>في حالة الخطأ:</strong> إذا ظهرت رسالة خطأ، تأكد من أن الملف بتنسيق "Oman XML" وأنه غير تالف
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center">
                          <span className="text-lg">💡</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">نصائح مفيدة</h3>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                          <li>احفظ نسخة احتياطية من ملف XML قبل الرفع</li>
                          <li>تأكد من تحديث الجدول في تطبيق aSc Timetables قبل التصدير</li>
                          <li>بعد الرفع الناجح، يمكنك ربط معلمي XML مع معلمي المدرسة في النظام</li>
                          <li>يمكنك تحديث الجدول لاحقاً برفع ملف XML جديد</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={() => setShowUploadGuide(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleFileUploadAfterGuide}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span>متابعة ورفع الملف</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Timetable Modal */}
        {showEditModal && editingTimetable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">تعديل اسم الجدول</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTimetable(null);
                      setEditTimetableName('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الجدول
                  </label>
                  <input
                    type="text"
                    value={editTimetableName}
                    onChange={(e) => setEditTimetableName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="اسم الجدول"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTimetable(null);
                      setEditTimetableName('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving || !editTimetableName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>حفظ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Helper Section - Only show when no timetable and no saved timetables */}
        {!timetableData && savedTimetables.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 mb-6">
            <div className="max-w-md mx-auto text-center">
              <div className="p-4 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">ابدأ بإنشاء جدول جديد</h2>
              <p className="text-gray-600 mb-4">الرجاء رفع ملف XML الخاص بجدول الحصص</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-right">
                <p className="text-xs text-blue-800">
                  <strong>ملاحظة:</strong> يدعم النظام ملفات XML بترميز Windows-1256 أو UTF-8. إذا ظهرت النصوص بشكل غير صحيح، يرجى التأكد من ترميز الملف.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timetable Display */}
        {timetableData && (
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
                      {filteredTeachers.map(teacher => {
                        const teacherSubjects = getXMLTeacherSubjects(teacher.id);
                        return (
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
                            {teacherSubjects.length > 0 && (
                              <p className="text-xs text-green-700 mt-1 line-clamp-2">
                                {teacherSubjects.map(s => s.name).join('، ')}
                              </p>
                            )}
                          </button>
                        );
                      })}
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
                    جدول الصف : {timetableData.classes.find(c => c.id === selectedClass)?.name}
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
                    جدول المعلم : {timetableData.teachers.find(t => t.id === selectedTeacher)?.name}
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
                                  <div className={`p-2 rounded-lg border ${
                                    schedule.isSubstitution 
                                      ? 'bg-yellow-50 border-yellow-300' 
                                      : 'bg-green-50 border-green-200'
                                  }`}>
                                    {schedule.isSubstitution ? (
                                      <>
                                        {/* Substitution class info */}
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                          <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-medium">
                                            بديل
                                          </span>
                                        </div>
                                        <p className="text-sm font-medium text-yellow-900">
                                          {schedule.substitutionSubject || (schedule.subjectGradeId ? getSubjectName(schedule.subjectGradeId) : 'مادة')}
                                        </p>
                                        {schedule.substitutionClass && (
                                          <p className="text-xs text-yellow-700 mt-1">
                                            {schedule.substitutionClass}
                                          </p>
                                        )}
                                        {schedule.substitutionClassroom && (
                                          <p className="text-xs text-yellow-600 mt-1">
                                            {schedule.substitutionClassroom}
                                          </p>
                                        )}
                                        {schedule.absentTeacher && (
                                          <p className="text-xs text-yellow-600 mt-1 italic">
                                            بدلاً عن: {schedule.absentTeacher}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {/* Regular schedule */}
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
                                      </>
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
