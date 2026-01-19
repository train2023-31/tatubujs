import React, { useState, useEffect, useRef } from 'react';
import { UserX, Calendar, Filter, Save, Trash2, X, AlertCircle, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { timetableAPI, substitutionAPI } from '../../services/api';
import Modal from '../../components/UI/Modal';

const TeacherSubstitution = () => {
  const { user } = useAuth();
  
  // State management
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [teachers, setTeachers] = useState([]);
  
  // Substitution form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAbsentTeacher, setSelectedAbsentTeacher] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [criteria, setCriteria] = useState(['same_subject', 'fewest_classes', 'fewest_substitutions', 'no_conflict']);
  const [sameTeacherForAllWeeks, setSameTeacherForAllWeeks] = useState(true);
  
  // Calculated substitutions
  const [calculatedAssignments, setCalculatedAssignments] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Existing substitutions
  const [substitutions, setSubstitutions] = useState([]);
  const [expandedSubstitution, setExpandedSubstitution] = useState(null);
  const [editingSubstitution, setEditingSubstitution] = useState(null);
  const [editAssignments, setEditAssignments] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true); // Filter: show only active substitutions
  const [conflictInfo, setConflictInfo] = useState({}); // Store conflict info for each assignment: { assignmentId: { count: number, conflicts: [] } }
  
  // Refs for scrollbars synchronization
  const expandedViewTopScrollRef = useRef(null);
  const expandedViewBottomScrollRef = useRef(null);
  const calculatedViewTopScrollRef = useRef(null);
  const calculatedViewBottomScrollRef = useRef(null);
  const editViewTopScrollRef = useRef(null);
  const editViewBottomScrollRef = useRef(null);
  
  // Load timetables on mount
  useEffect(() => {
    loadTimetables();
  }, []);
  
  // Load timetable data and substitutions when selected
  useEffect(() => {
    if (selectedTimetable) {
      loadTimetableData();
      loadSubstitutions();
    }
  }, [selectedTimetable, showActiveOnly]);
  
  // Auto-calculate when criteria changes (if all required fields are filled)
  const isInitialMount = useRef(true);
  const prevCriteriaRef = useRef(criteria);
  
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCriteriaRef.current = criteria;
      return;
    }
    
    // Check if criteria actually changed
    const criteriaChanged = JSON.stringify(prevCriteriaRef.current) !== JSON.stringify(criteria);
    prevCriteriaRef.current = criteria;
    
    // Auto-calculate if all required fields are filled and criteria changed
    if (criteriaChanged && selectedAbsentTeacher && startDate && endDate) {
      // Only auto-calculate if we're in the create modal
      if (showCreateModal) {
        // Use silent mode to avoid showing toast on every criteria change
        handleCalculateSubstitution(true);
      }
    }
  }, [criteria, selectedAbsentTeacher, startDate, endDate, showCreateModal]);
  
  const loadTimetables = async () => {
    try {
      const response = await timetableAPI.getTimetables();
      // Backend returns array directly, not wrapped in object
      const timetablesList = Array.isArray(response) ? response : (response.timetables || []);
      setTimetables(timetablesList);
      
      // Auto-select active timetable
      const activeTimetable = timetablesList.find(t => t.is_active);
      if (activeTimetable) {
        setSelectedTimetable(activeTimetable.id);
      }
    } catch (error) {
      toast.error('فشل في تحميل الجداول الدراسية');
    }
  };
  
  // Helper function to sort periods by class time
  const sortPeriodsByTime = (periods) => {
    if (!periods || periods.length === 0) return periods;
    
    return [...periods].sort((a, b) => {
      // First try to sort by period_number
      const periodNumA = parseInt(a.period_number || a.period_id || a.id || 0);
      const periodNumB = parseInt(b.period_number || b.period_id || b.id || 0);
      
      if (periodNumA !== periodNumB) {
        return periodNumA - periodNumB;
      }
      
      // If period_number is the same or not available, sort by start_time
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      
      // Fallback: sort by period_id as string
      const idA = String(a.period_id || a.id || '');
      const idB = String(b.period_id || b.id || '');
      return idA.localeCompare(idB);
    });
  };
  
  const loadTimetableData = async () => {
    try {
      const response = await timetableAPI.getTimetable(selectedTimetable);
      
      // Sort periods by class time before setting data
      if (response.periods && response.periods.length > 0) {
        response.periods = sortPeriodsByTime(response.periods);
      }
      
      setTimetableData(response);
      
      // Extract unique teachers from schedules with their subjects
      const uniqueTeachers = {};
      response.schedules.forEach(schedule => {
        if (schedule.teacher_xml_id) {
          if (!uniqueTeachers[schedule.teacher_xml_id]) {
            // Get teacher name from teacher mappings
            const mapping = response.teacher_mappings?.find(m => m.xml_teacher_id === schedule.teacher_xml_id);
            uniqueTeachers[schedule.teacher_xml_id] = {
              xml_id: schedule.teacher_xml_id,
              name: mapping?.xml_teacher_name || schedule.teacher_xml_id || 'غير معروف',
              user_id: mapping?.teacher_id || mapping?.user_id || null,
              user_name: mapping?.teacher_name || mapping?.user_name || null,
              subjects: new Set() // Store unique subjects for this teacher
            };
          }
          
          // Add subject to teacher's subjects set
          if (schedule.subject_name) {
            uniqueTeachers[schedule.teacher_xml_id].subjects.add(schedule.subject_name);
          }
        }
      });
      
      // Convert Set to Array for each teacher
      const teachersList = Object.values(uniqueTeachers).map(teacher => ({
        ...teacher,
        subjects: Array.from(teacher.subjects)
      }));
      
      setTeachers(teachersList);
    } catch (error) {
      toast.error('فشل في تحميل بيانات الجدول');
    }
  };
  
  // Group teachers by subjects for the dropdown
  const getTeachersGroupedBySubjects = () => {
    if (!teachers || teachers.length === 0) return {};
    
    const grouped = {};
    
    teachers.forEach(teacher => {
      if (teacher.subjects && teacher.subjects.length > 0) {
        teacher.subjects.forEach(subject => {
          if (!grouped[subject]) {
            grouped[subject] = [];
          }
          // Avoid duplicates
          if (!grouped[subject].find(t => t.xml_id === teacher.xml_id)) {
            grouped[subject].push(teacher);
          }
        });
      } else {
        // Teachers with no subjects go to "أخرى" group
        if (!grouped['أخرى']) {
          grouped['أخرى'] = [];
        }
        if (!grouped['أخرى'].find(t => t.xml_id === teacher.xml_id)) {
          grouped['أخرى'].push(teacher);
        }
      }
    });
    
    // Sort subjects alphabetically
    const sortedSubjects = Object.keys(grouped).sort();
    const sortedGrouped = {};
    sortedSubjects.forEach(subject => {
      sortedGrouped[subject] = grouped[subject].sort((a, b) => {
        const nameA = a.user_name || a.name || '';
        const nameB = b.user_name || b.name || '';
        return nameA.localeCompare(nameB, 'ar');
      });
    });
    
    return sortedGrouped;
  };
  
  const loadSubstitutions = async () => {
    if (!selectedTimetable) return;
    
    try {
      const response = await substitutionAPI.getSubstitutions({
        active_only: showActiveOnly,
        timetable_id: selectedTimetable
      });
      setSubstitutions(response.substitutions || []);
    } catch (error) {
      toast.error('فشل في تحميل الإحتياط');
    }
  };
  
  const handleCalculateSubstitution = async (silent = false) => {
    if (!selectedAbsentTeacher || !startDate || !endDate) {
      if (!silent) {
        toast.error('الرجاء إدخال جميع البيانات المطلوبة');
      }
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      if (!silent) {
        toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      }
      return;
    }
    
    // Check if date range exceeds 1 month
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 31) {
      if (!silent) {
        toast.error('الفترة المحددة يجب ألا تتجاوز شهراً واحداً (31 يوم)');
      }
      return;
    }
    
    setIsCalculating(true);
    try {
      const response = await substitutionAPI.calculateSubstitution({
        timetable_id: selectedTimetable,
        absent_teacher_xml_id: selectedAbsentTeacher,
        criteria: criteria,
        start_date: startDate,
        end_date: endDate
      });
      
      setCalculatedAssignments(response.assignments || []);
      
      if (!silent) {
        if (response.assignments.length === 0) {
          toast.error('لم يتم العثور على حصص للمعلم الغائب');
        } else {
          toast.success(`تم حساب ${response.assignments.length} حصة إحتياط`);
        }
      }
    } catch (error) {
      if (!silent) {
        toast.error('فشل في حساب الإحتياط');
      }
    } finally {
      setIsCalculating(false);
    }
  };
  
  const handleSaveSubstitution = async () => {
    if (calculatedAssignments.length === 0) {
      toast.error('لا توجد حصص إحتياط للحفظ');
      return;
    }
    
    // Check if all assignments have substitute teachers
    const missingSubstitutes = calculatedAssignments.filter(a => !a.substitute_teacher);
    if (missingSubstitutes.length > 0) {
      toast.error(`${missingSubstitutes.length} حصة لا تحتوي على معلم بديل`);
      return;
    }
    
    setIsSaving(true);
    try {
      const absentTeacher = teachers.find(t => t.xml_id === selectedAbsentTeacher);
      
      // Prepare assignments - ALWAYS save with specific dates for each selected day
      // The ONLY difference between sameTeacherForAllWeeks and different teachers:
      // - sameTeacherForAllWeeks: Same substitute teacher for the same schedule across all dates
      // - different teachers: Can choose different substitute teachers for the same schedule on different dates
      // 
      // In BOTH modes: We save ONE assignment per (schedule_id + date) combination
      // This means if a schedule occurs on 3 different days, we save 3 assignments
      
      let assignmentsToSave = [];
      const uniqueAssignmentKeys = new Set();
      
      // Process all calculated assignments - filter to unique (schedule_id + date) combinations
      assignmentsToSave = calculatedAssignments
        .filter(a => a.substitute_teacher && a.date && a.schedule && a.schedule.id)
        .filter(a => {
          // Create unique key: schedule_id + date
          // This ensures one assignment per schedule per date
          const uniqueKey = `${a.schedule.id}-${a.date || a.dateString}`;
          
          // Skip if duplicate
          if (uniqueAssignmentKeys.has(uniqueKey)) {
            return false;
          }
          
          uniqueAssignmentKeys.add(uniqueKey);
          return true;
        })
        .map(a => ({
          schedule_id: a.schedule.id,
          class_name: a.schedule.class_name,
          subject_name: a.schedule.subject_name,
          day_xml_id: a.schedule.day_xml_id,
          period_xml_id: a.schedule.period_xml_id,
          substitute_teacher_xml_id: a.substitute_teacher.teacher_xml_id,
          substitute_teacher_user_id: a.substitute_teacher.teacher_user_id,
          substitute_teacher_name: a.substitute_teacher.teacher_name,
          assignment_reason: a.substitute_teacher.reasons.join(', '),
          date: a.date || a.dateString // ALWAYS include date - one assignment per schedule per date
        }));
      
      const data = {
        timetable_id: selectedTimetable,
        absent_teacher_xml_id: selectedAbsentTeacher,
        absent_teacher_name: absentTeacher?.name || 'غير معروف',
        start_date: startDate,
        end_date: endDate,
        criteria: criteria,
        same_teacher_for_all_weeks: sameTeacherForAllWeeks,
        assignments: assignmentsToSave
      };
      
      await substitutionAPI.createSubstitution(data);
      toast.success('تم حفظ الإحتياط بنجاح');
      
      // Reset form
      setShowCreateModal(false);
      setSelectedAbsentTeacher('');
      setStartDate('');
      setEndDate('');
      setCalculatedAssignments([]);
      
      // Reload substitutions
      loadSubstitutions();
    } catch (error) {
      toast.error('فشل في حفظ الإحتياط');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEditSubstitution = (substitution) => {
    // Load substitution details with assignments
    setEditingSubstitution(substitution);
    // Create editable assignments array
    const assignments = substitution.assignments.map(assignment => ({
      ...assignment,
      original_teacher_xml_id: assignment.substitute_teacher_xml_id
    }));
    setEditAssignments(assignments);
    setConflictInfo({}); // Reset conflict info when opening edit mode
  };
  
  // Check for conflicts when selecting a substitute teacher
  const checkTeacherConflicts = async (assignment, newTeacherXmlId) => {
    if (!newTeacherXmlId || !assignment) {
      setConflictInfo(prev => {
        const updated = { ...prev };
        if (assignment?.id) {
          delete updated[assignment.id];
        }
        return updated;
      });
      return;
    }
    
    try {
      // Find teacher user_id
      const teacher = getAvailableTeachersForSelection().find(t => t.xml_id === newTeacherXmlId);
      if (!teacher || !teacher.user_id) {
        return;
      }
      
      // Get all active substitutions for this teacher
      const response = await substitutionAPI.getTeacherSubstitutions(teacher.user_id);
      const teacherSubstitutions = response.assignments || [];
      
      // Find conflicts: same date + same period + same class (or same schedule)
      const conflicts = [];
      const assignmentDate = assignment.assignment_date ? assignment.assignment_date.split('T')[0] : null;
      const assignmentPeriod = assignment.period_xml_id;
      const assignmentClass = assignment.class_name;
      const assignmentScheduleId = assignment.schedule_id;
      const assignmentDayXmlId = assignment.day_xml_id;
      const currentSubstitutionId = editingSubstitution?.id;
      
      // Check teacher's regular schedule for conflicts
      if (timetableData && timetableData.schedules && editingSubstitution) {
        // Find if teacher has a regular schedule in the same day and period
        const teacherRegularSchedules = timetableData.schedules.filter(s => {
          const dayMatch = s.day_xml_id === assignmentDayXmlId || 
                          s.dayId === assignmentDayXmlId ||
                          (timetableData.days?.some(d => 
                            (d.day_id === s.day_xml_id || d.id === s.dayId) &&
                            (d.day_id === assignmentDayXmlId || d.id === assignmentDayXmlId)
                          ));
          const periodMatch = s.period_xml_id === assignmentPeriod || 
                             s.period === assignmentPeriod ||
                             String(s.period_xml_id) === String(assignmentPeriod);
          const teacherMatch = s.teacher_xml_id === newTeacherXmlId;
          return dayMatch && periodMatch && teacherMatch;
        });
        
        if (teacherRegularSchedules.length > 0) {
          
          // For each regular schedule, check if it conflicts with the assignment date
          teacherRegularSchedules.forEach(regularSchedule => {
            let scheduleConflict = false;
            
            if (assignmentDate && editingSubstitution?.start_date && editingSubstitution?.end_date) {
              // Check if assignmentDate falls on the same day of week as the schedule
              const assignmentDateObj = new Date(assignmentDate);
              const assignmentDayOfWeek = assignmentDateObj.getDay(); // 0=Sunday, 1=Monday, etc.
              
              // Get the day of week for the schedule
              const scheduleDay = timetableData.days?.find(d => 
                d.day_id === regularSchedule.day_xml_id || 
                d.id === regularSchedule.dayId ||
                d.xml_id === regularSchedule.day_xml_id
              );
              
              if (scheduleDay) {
                // Map day name to day of week
                const dayNameMap = {
                  'الاحد': 0, 'الأحد': 0,
                  'الاثنين': 1, 'الإثنين': 1,
                  'الثلاثاء': 2,
                  'الاربعاء': 3, 'الأربعاء': 3,
                  'الخميس': 4
                };
                const scheduleDayOfWeek = dayNameMap[scheduleDay.name] ?? 
                                         dayNameMap[scheduleDay.short_name] ?? 
                                         dayNameMap[scheduleDay.dayName];
                
                // Check if assignment date is within substitution date range and matches day of week
                const subStart = new Date(editingSubstitution.start_date.split('T')[0]);
                const subEnd = new Date(editingSubstitution.end_date.split('T')[0]);
                const assignDate = new Date(assignmentDate);
                
                if (scheduleDayOfWeek !== undefined && 
                    scheduleDayOfWeek === assignmentDayOfWeek && 
                    assignDate >= subStart && assignDate <= subEnd) {
                  scheduleConflict = true;
                }
              } else {
                // If we can't determine day of week, check if date is within range
                const subStart = new Date(editingSubstitution.start_date.split('T')[0]);
                const subEnd = new Date(editingSubstitution.end_date.split('T')[0]);
                const assignDate = new Date(assignmentDate);
                scheduleConflict = assignDate >= subStart && assignDate <= subEnd;
              }
            } else if (!assignmentDate && editingSubstitution?.start_date && editingSubstitution?.end_date) {
              // If no specific date (same teacher for all weeks), the schedule will conflict on all matching days in the range
              scheduleConflict = true;
            }
            
            if (scheduleConflict) {
              conflicts.push({
                type: 'regular_schedule',
                date: assignmentDate || `${editingSubstitution?.start_date} - ${editingSubstitution?.end_date}`,
                class: regularSchedule.class_name || 'غير محدد',
                period: assignmentPeriod,
                subject: regularSchedule.subject_name || 'غير محدد',
                description: 'حصة عادية في جدول المعلم'
              });
            }
          });
        }
      }
      
      teacherSubstitutions.forEach((subAssignment, index) => {
        // Skip if it's from the current substitution being edited
        if (subAssignment.substitution_id === currentSubstitutionId) {
          return;
        }
        
        // Check if substitution is active
        const subStartDate = subAssignment.substitution_start_date ? subAssignment.substitution_start_date.split('T')[0] : null;
        const subEndDate = subAssignment.substitution_end_date ? subAssignment.substitution_end_date.split('T')[0] : null;
        const today = new Date().toISOString().split('T')[0];
        
        if (subEndDate && subEndDate < today) {
          return; // Substitution is expired
        }
        
        // Check period match FIRST (most restrictive)
        const periodMatches = String(subAssignment.period_xml_id) === String(assignmentPeriod);
        
        if (!periodMatches) {
          return; // No point checking further if period doesn't match
        }
        
        // Check date match
        let dateMatches = false;
        if (assignmentDate && subAssignment.assignment_date) {
          // Both have specific dates - exact match required
          const subAssignmentDate = subAssignment.assignment_date.split('T')[0];
          dateMatches = assignmentDate === subAssignmentDate;
        } else if (assignmentDate && !subAssignment.assignment_date && subStartDate && subEndDate) {
          // Current assignment has specific date, but other assignment is "same teacher for all weeks"
          // Check if assignmentDate is within the other substitution's date range
          dateMatches = assignmentDate >= subStartDate && assignmentDate <= subEndDate;
        } else if (!assignmentDate && subAssignment.assignment_date && editingSubstitution?.start_date && editingSubstitution?.end_date) {
          // Current assignment is "same teacher for all weeks", other has specific date
          // Check if other's date is within current substitution's range
          const currentStart = editingSubstitution.start_date.split('T')[0];
          const currentEnd = editingSubstitution.end_date.split('T')[0];
          const subAssignmentDate = subAssignment.assignment_date.split('T')[0];
          dateMatches = subAssignmentDate >= currentStart && subAssignmentDate <= currentEnd;
        } else if (!assignmentDate && !subAssignment.assignment_date && subStartDate && subEndDate && editingSubstitution?.start_date && editingSubstitution?.end_date) {
          // Both are "same teacher for all weeks" - check if date ranges overlap
          const currentStart = editingSubstitution.start_date.split('T')[0];
          const currentEnd = editingSubstitution.end_date.split('T')[0];
          dateMatches = !(currentEnd < subStartDate || currentStart > subEndDate);
        }
        
        if (!dateMatches) {
          return; // No point checking further if date doesn't match
        }
        
        // Check class/schedule match
        const classMatches = subAssignment.class_name === assignmentClass;
        const scheduleMatches = String(subAssignment.schedule_id) === String(assignmentScheduleId);
        
        // Conflict if: date matches AND period matches AND (class matches OR schedule matches)
        if (dateMatches && periodMatches && (classMatches || scheduleMatches)) {
          conflicts.push({
            type: 'substitution',
            substitution_id: subAssignment.substitution_id,
            date: subAssignment.assignment_date || `${subStartDate} - ${subEndDate}`,
            class: subAssignment.class_name,
            period: subAssignment.period_xml_id,
            absent_teacher: subAssignment.absent_teacher_name || 'غير معروف'
          });
        }
      });
      
      // Update conflict info
      setConflictInfo(prev => ({
        ...prev,
        [assignment.id]: {
          count: conflicts.length,
          conflicts: conflicts
        }
      }));
      
      // Show warning if conflicts found
      if (conflicts.length > 0) {
        toast.error(
          ` يوجد ${conflicts.length} تعارض: المعلم لديه إحتياط نشط آخر أو حصة عادية في نفس التاريخ والحصة`,
          { 
            duration: 6000,
            icon: '⚠️'
          }
        );
      } else {
        // Clear conflict info if no conflicts
        setConflictInfo(prev => ({
          ...prev,
          [assignment.id]: {
            count: 0,
            conflicts: []
          }
        }));
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء التحقق من التعارضات');
    }
  };
  
  const handleUpdateAssignment = async (assignmentId, newTeacherXmlId) => {
    const assignment = editAssignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    // Find teacher info
    const teacher = getAvailableTeachersForSelection().find(t => t.xml_id === newTeacherXmlId);
    const updated = editAssignments.map(a => {
      if (a.id === assignmentId) {
        return {
          ...a,
          substitute_teacher_xml_id: newTeacherXmlId,
          substitute_teacher_user_id: teacher?.user_id || null,
          substitute_teacher_name: teacher?.user_name || teacher?.name || newTeacherXmlId
        };
      }
      return a;
    });
    setEditAssignments(updated);
    
    // Check for conflicts with the new teacher (only if teacher is selected)
    if (newTeacherXmlId) {
      const updatedAssignment = updated.find(a => a.id === assignmentId);
      if (updatedAssignment) {
        // Clear previous conflict info first
        setConflictInfo(prev => ({
          ...prev,
          [assignmentId]: { count: 0, conflicts: [] }
        }));
        
        // Check for conflicts
        await checkTeacherConflicts(updatedAssignment, newTeacherXmlId);
      }
    } else {
      // Clear conflict info if teacher is deselected
      setConflictInfo(prev => {
        const updated = { ...prev };
        delete updated[assignmentId];
        return updated;
      });
    }
  };
  
  const handleSaveEdit = async () => {
    if (!editingSubstitution) return;
    
    setIsUpdating(true);
    try {
      const assignmentsData = editAssignments.map(assignment => ({
        assignment_id: assignment.id,
        substitute_teacher_xml_id: assignment.substitute_teacher_xml_id,
        assignment_reason: assignment.assignment_reason || ''
      }));
      
      await substitutionAPI.updateSubstitution(editingSubstitution.id, {
        assignments: assignmentsData
      });
      
      toast.success('تم تحديث البديل بنجاح');
      setEditingSubstitution(null);
      setEditAssignments([]);
      loadSubstitutions();
    } catch (error) {
      toast.error('فشل في تحديث البديل');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDeleteSubstitution = async (substitutionId) => {
    if (!window.confirm(' الحذف سيؤثر على حساب عدد حصص الإحتياط للمعلمين الآخرين .هل أنت متأكد من حذف هذا الإحتياط؟')) {
      return;
    }
    
    try {
      await substitutionAPI.deleteSubstitution(substitutionId);
      toast.success('تم حذف البديل بنجاح');
      loadSubstitutions();
    } catch (error) {
      toast.error('فشل في حذف البديل');
    }
  };
  
  const handleCriteriaChange = (criteriaKey) => {
    if (criteria.includes(criteriaKey)) {
      setCriteria(criteria.filter(c => c !== criteriaKey));
    } else {
      setCriteria([...criteria, criteriaKey]);
    }
  };
  
  const criteriaOptions = [
    { key: 'same_subject', label: 'نفس المادة', description: 'إعطاء الأولوية للمعلمين الذين يدرسون نفس المادة', points: 100 },
    { key: 'fewest_classes', label: 'أقل عدد حصص', description: 'إعطاء الأولوية للمعلمين الذين لديهم أقل عدد حصص أسبوعية', points: 50 },
    { key: 'fewest_substitutions', label: 'أقل حصص إحتياط', description: 'إعطاء الأولوية للمعلمين الذين لديهم أقل عدد حصص إحتياط سابقة', points: 30 },
    { key: 'no_conflict', label: 'عدم التعارض', description: 'استبعاد المعلمين الذين لديهم حصة في نفس الوقت (إلزامي)', points: 0 }
  ];
  
  const getDayName = (dayXmlId) => {
    if (!timetableData) return dayXmlId;
    const day = timetableData.days.find(d => d.day_id === dayXmlId || d.xml_id === dayXmlId);
    return day ? day.name : dayXmlId;
  };
  
  const getPeriodName = (periodXmlId) => {
    if (!timetableData) return periodXmlId;
    const period = timetableData.periods.find(p => p.period_id === periodXmlId || p.xml_id === periodXmlId);
    return period ? `${period.period_id || period.period_number}` : periodXmlId;
  };
  
  // Calculate unique class count for substitutions
  const getUniqueClassCount = (assignments) => {
    if (!assignments || assignments.length === 0) return 0;
    
    // Count unique day + period combinations (regardless of date or teacher)
    const uniqueClasses = new Set();
    assignments.forEach(a => {
      // Handle both structures: direct (from editAssignments) and nested (from calculatedAssignments)
      const dayXmlId = a.day_xml_id || a.schedule?.day_xml_id;
      const periodXmlId = a.period_xml_id || a.schedule?.period_xml_id;
      
      if (dayXmlId && periodXmlId) {
        const key = `${dayXmlId}-${periodXmlId}`;
        uniqueClasses.add(key);
      }
    });
    return uniqueClasses.size;
  };
  
  // Find conflicts in active substitutions: same teacher, same date, same period, same day
  const findSubstitutionConflicts = () => {
    if (!substitutions || substitutions.length === 0) return [];
    
    // Collect all assignments from active substitutions
    const allAssignments = [];
    substitutions.forEach(sub => {
      if (sub.is_active && sub.assignments && sub.assignments.length > 0) {
        sub.assignments.forEach(assignment => {
          allAssignments.push({
            ...assignment,
            substitution_id: sub.id,
            substitution_start_date: sub.start_date,
            substitution_end_date: sub.end_date,
            absent_teacher_name: sub.absent_teacher_name,
            absent_teacher_xml_id: sub.absent_teacher_xml_id
          });
        });
      }
    });
    
    // Group assignments by conflict key: (substitute_teacher_user_id, assignment_date, period_xml_id, day_xml_id)
    const conflictGroups = {};
    
    allAssignments.forEach(assignment => {
      // Only check assignments with all required fields
      if (!assignment.substitute_teacher_user_id || 
          !assignment.period_xml_id || 
          !assignment.day_xml_id) {
        return;
      }
      
      // Create conflict key
      const assignmentDate = assignment.assignment_date ? assignment.assignment_date.split('T')[0] : 'no_date';
      const conflictKey = `${assignment.substitute_teacher_user_id}-${assignmentDate}-${assignment.period_xml_id}-${assignment.day_xml_id}`;
      
      if (!conflictGroups[conflictKey]) {
        conflictGroups[conflictKey] = [];
      }
      conflictGroups[conflictKey].push(assignment);
    });
    
    // Filter to only groups with more than one assignment (conflicts)
    const conflicts = [];
    Object.keys(conflictGroups).forEach(key => {
      if (conflictGroups[key].length > 1) {
        conflicts.push({
          conflictKey: key,
          assignments: conflictGroups[key],
          count: conflictGroups[key].length
        });
      }
    });
    
    return conflicts;
  };
  
  // Get days between start and end date (Sunday to Thursday only)
  const getSelectedDays = () => {
    // Use editing substitution dates if in edit mode
    const startDateValue = editingSubstitution?.start_date || startDate;
    const endDateValue = editingSubstitution?.end_date || endDate;
    
    if (!startDateValue || !endDateValue) return [];
    
    const start = new Date(startDateValue);
    const end = new Date(endDateValue);
    const days = [];
    
    // Arabic day names
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      // Only include Sunday (0) to Thursday (4)
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        days.push({
          date: new Date(current),
          dayName: dayNames[dayOfWeek],
          dayOfWeek: dayOfWeek
        });
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };
  
  // Map Arabic day names to day names in timetable
  const mapDayNameToTimetableDay = (arabicDayName) => {
    const dayMapping = {
      'الأحد': ['الأحد', 'احد', 'sunday', 'sun', '1'],
      'الإثنين': ['الإثنين', 'الاثنين', 'اثنين', 'monday', 'mon', '2'],
      'الثلاثاء': ['الثلاثاء', 'ثلاثاء', 'tuesday', 'tue', '3'],
      'الأربعاء': ['الأربعاء', 'اربعاء', 'wednesday', 'wed', '4'],
      'الخميس': ['الخميس', 'خميس', 'thursday', 'thu', '5']
    };
    
    for (const [key, variations] of Object.entries(dayMapping)) {
      if (variations.some(v => arabicDayName.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(arabicDayName.toLowerCase()))) {
        return key;
      }
    }
    return arabicDayName;
  };
  
  // Get assigned days and periods from assignments (for edit/view mode)
  const getAssignedDaysAndPeriods = (assignments) => {
    if (!assignments || assignments.length === 0 || !timetableData) return { days: [], periods: [] };
    
    const uniqueDays = new Map();
    const uniquePeriods = new Set();
    
    assignments.forEach(assignment => {
      const dayId = assignment.day_xml_id;
      const periodId = assignment.period_xml_id;
      
      // Find day in timetable
      if (dayId && !uniqueDays.has(dayId)) {
        const timetableDay = timetableData.days.find(d => 
          (d.day_id || d.xml_id || d.id) === dayId
        );
        if (timetableDay) {
          // If assignment has date, add it to the day
          if (assignment.assignment_date) {
            const assignmentDate = new Date(assignment.assignment_date);
            uniqueDays.set(dayId, {
              ...timetableDay,
              date: assignmentDate,
              dateString: assignment.assignment_date.split('T')[0],
              dayName: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][assignmentDate.getDay()]
            });
          } else {
            uniqueDays.set(dayId, timetableDay);
          }
        }
      } else if (dayId && uniqueDays.has(dayId) && assignment.assignment_date) {
        // Update existing day with date if not already set
        const existingDay = uniqueDays.get(dayId);
        if (!existingDay.dateString) {
          const assignmentDate = new Date(assignment.assignment_date);
          uniqueDays.set(dayId, {
            ...existingDay,
            date: assignmentDate,
            dateString: assignment.assignment_date.split('T')[0],
            dayName: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][assignmentDate.getDay()]
          });
        }
      }
      
      // Add period
      if (periodId) {
        uniquePeriods.add(periodId);
      }
    });
    
    // Convert periods Set to array and find period objects
    const periodsList = Array.from(uniquePeriods).map(periodId => {
      return timetableData.periods.find(p => 
        (p.period_id || p.xml_id || p.id) === periodId
      ) || { period_id: periodId, id: periodId };
    }).filter(p => p);
    
    // Sort periods by period_number (class time order), then by start_time if period_number is not available
    const sortedPeriodsList = periodsList.sort((a, b) => {
      // First try to sort by period_number
      const periodNumA = parseInt(a.period_number || a.period_id || a.id || 0);
      const periodNumB = parseInt(b.period_number || b.period_id || b.id || 0);
      
      if (periodNumA !== periodNumB) {
        return periodNumA - periodNumB;
      }
      
      // If period_number is the same or not available, sort by start_time
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      
      // Fallback: sort by period_id as string
      const idA = String(a.period_id || a.id || '');
      const idB = String(b.period_id || b.id || '');
      return idA.localeCompare(idB);
    });
    
    // Sort days by date if available, otherwise by day order
    const daysList = Array.from(uniqueDays.values()).sort((a, b) => {
      if (a.date && b.date) {
        return a.date.getTime() - b.date.getTime();
      }
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });
    
    return { days: daysList, periods: sortedPeriodsList };
  };
  
  // Generate all days from start_date to end_date for a substitution
  const getAllDaysForSubstitution = (substitution) => {
    if (!substitution || !substitution.start_date || !substitution.end_date || !timetableData) {
      return [];
    }
    
    const start = new Date(substitution.start_date);
    const end = new Date(substitution.end_date);
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const allDays = [];
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Only include Sunday (0) to Thursday (4) - working days
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        // Map JavaScript dayOfWeek to Arabic day names
        // Sunday (0) -> الأحد, Monday (1) -> الإثنين, etc.
        const dayName = dayNames[dayOfWeek];
        
        // Find matching timetable day
        const timetableDay = timetableData.days.find(d => {
          const dName = d.name || d.short_name || '';
          const mappedDayName = mapDayNameToTimetableDay(dName);
          const mappedSelected = mapDayNameToTimetableDay(dayName);
          return mappedDayName === mappedSelected;
        });
        
        if (timetableDay) {
          // Check if this day is already in the list (avoid duplicates for same date)
          const dateString = current.toISOString().split('T')[0];
          if (!allDays.find(d => d.dateString === dateString && (d.day_id === timetableDay.day_id || d.id === timetableDay.id))) {
            allDays.push({
              ...timetableDay,
              date: new Date(current),
              dateString: dateString,
              dayName: dayName
            });
          }
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    // Sort by date
    return allDays.sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  
  // Get filtered days based on selected date range
  const getFilteredTimetableDays = () => {
    if (!timetableData || !timetableData.days) return [];
    
    // If in edit mode, show all days from start_date to end_date
    if (editingSubstitution) {
      const allDays = getAllDaysForSubstitution(editingSubstitution);
      if (allDays.length > 0) {
        return allDays;
      }
      // Fallback to assigned days if no dates available
      if (editAssignments.length > 0) {
        const { days } = getAssignedDaysAndPeriods(editAssignments);
        return days;
      }
    }
    
    // If in view mode (expanded substitution), show all days from start_date to end_date
    if (expandedSubstitution) {
      const sub = substitutions.find(s => s.id === expandedSubstitution);
      if (sub) {
        const allDays = getAllDaysForSubstitution(sub);
        if (allDays.length > 0) {
          return allDays;
        }
        // Fallback to assigned days if no dates available
        if (sub.assignments && sub.assignments.length > 0) {
          const { days } = getAssignedDaysAndPeriods(sub.assignments);
          return days;
        }
      }
    }
    
    // If in edit mode, check if assignments have assignment_date
    const hasAssignmentDates = editingSubstitution && editAssignments.some(a => a.assignment_date);
    
    // If no dates selected, show all days
    if (!startDate || !endDate) {
      // In edit mode, if assignments have dates, expand them
      if (hasAssignmentDates) {
        const expandedDays = [];
        editAssignments.forEach(assignment => {
          if (assignment.assignment_date) {
            const assignmentDate = new Date(assignment.assignment_date);
            const dayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][assignmentDate.getDay()];
            const timetableDay = timetableData.days.find(d => {
              const dName = d.name || d.short_name || '';
              const mappedDayName = mapDayNameToTimetableDay(dName);
              const mappedSelected = mapDayNameToTimetableDay(dayName);
              return mappedDayName === mappedSelected;
            });
            if (timetableDay && !expandedDays.find(ed => ed.dateString === assignment.assignment_date.split('T')[0])) {
              expandedDays.push({
                ...timetableDay,
                date: assignmentDate,
                dateString: assignment.assignment_date.split('T')[0],
                dayName: dayName
              });
            }
          }
        });
        return expandedDays.length > 0 ? expandedDays : timetableData.days;
      }
      return timetableData.days;
    }
    
    const selectedDays = getSelectedDays();
    if (selectedDays.length === 0) return [];
    
    // If sameTeacherForAllWeeks (or no assignment dates in edit mode), show only unique day types
    if (sameTeacherForAllWeeks || (hasAssignmentDates === false)) {
      const selectedDayNames = [...new Set(selectedDays.map(d => d.dayName))];
      return timetableData.days.filter(day => {
        const dayName = day.name || day.short_name || '';
        const mappedDayName = mapDayNameToTimetableDay(dayName);
        return selectedDayNames.some(selectedName => {
          const mappedSelected = mapDayNameToTimetableDay(selectedName);
          return mappedDayName === mappedSelected || 
                 dayName.toLowerCase().includes(selectedName.toLowerCase()) ||
                 selectedName.toLowerCase().includes(dayName.toLowerCase());
        });
      });
    }
    
    // If different teachers, show all selected days with dates ORDERED BY DATE
    // Sort selected days by date first
    const sortedSelectedDays = [...selectedDays].sort((a, b) => {
      return a.date.getTime() - b.date.getTime();
    });
    
    // Create expanded days list with dates, ordered by date
    const expandedDays = [];
    sortedSelectedDays.forEach(selectedDay => {
      const dayName = selectedDay.dayName;
      // Find matching timetable day
      const timetableDay = timetableData.days.find(day => {
        const dayName2 = day.name || day.short_name || '';
        const mappedDayName = mapDayNameToTimetableDay(dayName2);
        const mappedSelected = mapDayNameToTimetableDay(dayName);
        return mappedDayName === mappedSelected || 
               dayName2.toLowerCase().includes(dayName.toLowerCase()) ||
               dayName.toLowerCase().includes(dayName2.toLowerCase());
      });
      
      if (timetableDay) {
        expandedDays.push({
          ...timetableDay,
          date: selectedDay.date,
          dateString: selectedDay.date.toISOString().split('T')[0],
          dayName: dayName
        });
      }
    });
    
    return expandedDays;
  };
  
  // Update assignment with manually selected teacher
  const handleManualTeacherSelection = (assignmentIndex, teacherXmlId, teacherUserId, teacherName) => {
    const updated = [...calculatedAssignments];
    updated[assignmentIndex] = {
      ...updated[assignmentIndex],
      substitute_teacher: {
        teacher_xml_id: teacherXmlId,
        teacher_user_id: teacherUserId,
        teacher_name: teacherName,
        score: 0,
        reasons: ['اختيار يدوي']
      }
    };
    setCalculatedAssignments(updated);
  };
  
  // Get all available teachers for manual selection
  const getAvailableTeachersForSelection = () => {
    const teachersList = [];
    
    // First, try to get from teacher_mappings (more complete data)
    if (timetableData && timetableData.teacher_mappings && timetableData.teacher_mappings.length > 0) {
      timetableData.teacher_mappings.forEach(mapping => {
        if (mapping.xml_teacher_id && !teachersList.find(t => t.xml_id === mapping.xml_teacher_id)) {
          teachersList.push({
            xml_id: mapping.xml_teacher_id,
            name: mapping.xml_teacher_name || mapping.xml_teacher_id || 'غير معروف',
            user_id: mapping.teacher_id || mapping.user_id || null,
            user_name: mapping.teacher_name || mapping.user_name || mapping.xml_teacher_name || null
          });
        }
      });
    }
    
    // Fallback: use teachers list from schedules
    if (teachersList.length === 0 && teachers.length > 0) {
      teachers.forEach(teacher => {
        if (teacher.xml_id && !teachersList.find(t => t.xml_id === teacher.xml_id)) {
          teachersList.push({
            xml_id: teacher.xml_id,
            name: teacher.name || teacher.xml_id || 'غير معروف',
            user_id: teacher.user_id || null,
            user_name: teacher.user_name || teacher.name || null
          });
        }
      });
    }
    
    // If still empty, try to extract from schedules
    if (teachersList.length === 0 && timetableData && timetableData.schedules) {
      const uniqueTeachers = {};
      timetableData.schedules.forEach(schedule => {
        if (schedule.teacher_xml_id && !uniqueTeachers[schedule.teacher_xml_id]) {
          // Try to find teacher name from mappings
          const mapping = timetableData.teacher_mappings?.find(m => m.xml_teacher_id === schedule.teacher_xml_id);
          uniqueTeachers[schedule.teacher_xml_id] = {
            xml_id: schedule.teacher_xml_id,
            name: mapping?.xml_teacher_name || schedule.teacher_xml_id || 'معلم ' + schedule.teacher_xml_id,
            user_id: mapping?.teacher_id || mapping?.user_id || null,
            user_name: mapping?.teacher_name || mapping?.user_name || null
          };
        }
      });
      teachersList.push(...Object.values(uniqueTeachers));
    }
    
    if (teachersList.length === 0) {
      console.warn('No teachers available for selection', {
        hasTimetableData: !!timetableData,
        hasMappings: !!(timetableData?.teacher_mappings?.length),
        hasTeachers: teachers.length > 0,
        hasSchedules: !!(timetableData?.schedules?.length)
      });
    }
    
    return teachersList;
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">إدارة إحتياط المعلمين</h1>
        <p className="text-gray-600">توزيع حصص المعلمين الغائبين على المعلمين الإحتياط</p>
      </div>
      
      {/* Timetable Selection */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر الجدول الدراسي
            </label>
            <select
              value={selectedTimetable || ''}
              onChange={(e) => setSelectedTimetable(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">-- اختر جدولاً --</option>
              {timetables.map(tt => (
                <option key={tt.id} value={tt.id}>
                  {tt.name} {tt.is_active && '(نشط)' }
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedTimetable}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <UserX className="h-5 w-5" />
            <span>تسجيل غياب معلم</span>
          </button>
        </div>
      </div>
      
      {/* Conflicts List */}
      {selectedTimetable && (() => {
        const conflicts = findSubstitutionConflicts();
        return conflicts.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-900">
                تعارضات في الإحتياط ({conflicts.length})
              </h2>
            </div>
            <div className="space-y-3">
              {conflicts.map((conflict, idx) => {
                const firstAssignment = conflict.assignments[0];
                const teacherName = firstAssignment.substitute_teacher_name || 'غير معروف';
                const period = firstAssignment.period_xml_id;
                const dayXmlId = firstAssignment.day_xml_id;
                const assignmentDate = firstAssignment.assignment_date ? 
                  new Date(firstAssignment.assignment_date).toLocaleDateString('ar-SA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  }) : 'نفس المعلم لجميع الأسابيع';
                
                // Find day name
                const dayName = timetableData?.days?.find(d => 
                  d.day_id === dayXmlId || d.id === dayXmlId || d.xml_id === dayXmlId
                )?.name || dayXmlId;
                
                return (
                  <div key={idx} className="bg-white border border-yellow-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="font-semibold text-yellow-900">
                            تعارض: {conflict.count} إحتياط لنفس المعلم
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1 mr-6">
                          <p><span className="font-medium">المعلم البديل:</span> {teacherName}</p>
                          <p><span className="font-medium">اليوم:</span> {dayName}</p>
                          <p><span className="font-medium">الحصة:</span> {period}</p>
                          <p><span className="font-medium">التاريخ:</span> {assignmentDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                      <p className="text-xs font-medium text-yellow-800 mb-2">تفاصيل الإحتياط المتعارضة:</p>
                      <div className="space-y-2">
                        {conflict.assignments.map((assignment, aIdx) => (
                          <div key={aIdx} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-yellow-900">
                                  إحتياط #{assignment.substitution_id}
                                </p>
                                <p className="text-yellow-700">
                                  معلم غائب: {assignment.absent_teacher_name || 'غير معروف'}
                                </p>
                                <p className="text-yellow-600">
                                  {assignment.class_name} - {assignment.subject_name}
                                </p>
                                {assignment.substitution_start_date && assignment.substitution_end_date && (
                                  <p className="text-yellow-600 text-xs mt-1">
                                    من {new Date(assignment.substitution_start_date).toLocaleDateString('ar-SA', {
                                      day: 'numeric',
                                      month: 'short'
                                    })} إلى {new Date(assignment.substitution_end_date).toLocaleDateString('ar-SA', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      
      {/* Substitutions List */}
      {selectedTimetable && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {showActiveOnly ? 'الإحتياط النشطة' : 'جميع الإحتياط'}
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">عرض النشطة فقط</span>
            </label>
          </div>
          
          {substitutions.length > 0 ? (
            <div className="space-y-3">
              {substitutions.map(sub => (
              <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <UserX className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-gray-900">{sub.absent_teacher_name}</span>
                      {sub.is_active && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">نشط</span>
                      )} 
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(sub.start_date).toLocaleDateString('ar-SA')} - {new Date(sub.end_date).toLocaleDateString('ar-SA')}</span>
                      </div>
                      <div>
                        <span className="font-medium">{getUniqueClassCount(sub.assignments)}</span> حصة إحتياط
                        {sub.assignments && sub.assignments.length > getUniqueClassCount(sub.assignments) && (
                          <span className="text-xs text-gray-500 mr-1">
                            ({sub.assignments.length} تعيين)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedSubstitution(expandedSubstitution === sub.id ? null : sub.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="عرض التفاصيل"
                    >
                      {expandedSubstitution === sub.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleEditSubstitution(sub)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteSubstitution(sub.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                {/* Expanded Details - Show as Timetable */}
                {expandedSubstitution === sub.id && sub.assignments && sub.assignments.length > 0 && timetableData && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">الحصص الإحتياط:</h4>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                      {/* Top scrollbar */}
                      <div 
                        ref={expandedViewTopScrollRef}
                        className="overflow-x-auto overflow-y-hidden border-b border-gray-200"
                        onScroll={(e) => {
                          if (expandedViewBottomScrollRef.current) {
                            expandedViewBottomScrollRef.current.scrollLeft = e.target.scrollLeft;
                          }
                        }}
                        style={{ 
                          direction: 'rtl',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#cbd5e1 #f1f5f9',
                          maxHeight: '20px'
                        }}
                      >
                        <div style={{ height: '1px', minWidth: '100%' }}>
                          <table className="w-full" style={{ visibility: 'hidden', height: '1px' }}>
                            <thead>
                              <tr>
                                <th className="min-w-[120px]"></th>
                                {getFilteredTimetableDays().map((day, dayIndex) => (
                                  <th key={`${day.day_id || day.id}-${dayIndex}`} className="min-w-[150px]"></th>
                                ))}
                              </tr>
                            </thead>
                          </table>
                        </div>
                      </div>
                      
                      {/* Main table with bottom scrollbar */}
                      <div 
                        ref={expandedViewBottomScrollRef}
                        className="overflow-x-auto"
                        onScroll={(e) => {
                          if (expandedViewTopScrollRef.current) {
                            expandedViewTopScrollRef.current.scrollLeft = e.target.scrollLeft;
                          }
                        }}
                        style={{ 
                          direction: 'rtl',
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#cbd5e1 #f1f5f9'
                        }}
                      >
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>الحصة</span>
                                </div>
                              </th>
                              {getFilteredTimetableDays().map((day, dayIndex) => {
                                const dayDate = day.date || day.dateString;
                                const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : null;
                                return (
                                  <th
                                    key={`${day.day_id || day.id}-${dayIndex}-${dayDate || ''}`}
                                    className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[150px]"
                                  >
                                    <div>
                                      <p className="font-medium">{day.name || day.short_name || day.dayName}</p>
                                      {dateDisplay && (
                                        <p className="text-xs text-blue-600 mt-1 font-medium">{dateDisplay}</p>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const { periods } = getAssignedDaysAndPeriods(sub.assignments);
                              return periods.map(period => (
                                <tr key={period.period_id || period.id} className="border-b border-gray-100">
                                  <td className="px-3 py-4 text-center text-sm font-medium text-gray-700 sticky right-0 bg-white z-10 border-r border-gray-200">
                                    {period.period_id || period.period_number || period.id}
                                  </td>
                                  {getFilteredTimetableDays().map(day => {
                                    const dayId = day.day_id || day.xml_id || day.id;
                                    const periodId = period.period_id || period.xml_id || period.id;
                                    const dayDate = day.dateString || day.date;
                                    
                                    const assignment = sub.assignments.find(a => {
                                      const dayMatch = a.day_xml_id === dayId;
                                      const periodMatch = a.period_xml_id === periodId;
                                      if (a.assignment_date && dayDate) {
                                        return dayMatch && periodMatch && a.assignment_date.split('T')[0] === dayDate;
                                      }
                                      return dayMatch && periodMatch;
                                    });
                                    
                                    return (
                                      <td key={`${dayId}-${periodId}-${dayDate || ''}`} className="px-2 py-3 text-center border-r border-gray-100">
                                        {assignment ? (
                                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                                            <div className="text-xs font-medium text-gray-900">{assignment.class_name}</div>
                                            <div className="text-xs text-gray-600 mt-1">{assignment.subject_name}</div>
                                            <div className="text-xs font-semibold text-primary-600 mt-1">
                                              {assignment.substitute_teacher_name}
                                            </div>
                                            {assignment.assignment_reason && (
                                              <div className="text-[10px] text-gray-500 mt-1">{assignment.assignment_reason}</div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-300">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserX className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showActiveOnly ? 'لا توجد إحتياط نشطة' : 'لا توجد إحتياط'}
              </h3>
              <p className="text-gray-600 mb-4">
                {showActiveOnly 
                  ? 'ابدأ بتسجيل غياب معلم لإنشاء إحتياط تلقائية'
                  : 'لا توجد إحتياط محفوظة لهذا الجدول'}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Create Substitution Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setCalculatedAssignments([]);
          }}
          title="تسجيل غياب معلم وتوزيع الإحتياط"
          size='full'
        >
          <div className="space-y-6">
            {/* Form Section */}
            <div className="space-y-4">
              {/* Teacher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المعلم الغائب <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAbsentTeacher}
                  onChange={(e) => setSelectedAbsentTeacher(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">-- اختر معلماً --</option>
                  {Object.entries(getTeachersGroupedBySubjects()).map(([subject, subjectTeachers]) => (
                    <optgroup key={subject} label={subject}>
                      {subjectTeachers.map(teacher => (
                        <option key={teacher.xml_id} value={teacher.xml_id}>
                          {teacher.user_name || teacher.name} {teacher.subjects && teacher.subjects.length > 1 && `(${teacher.subjects.length} مادة)`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    من تاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    إلى تاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const selectedEndDate = e.target.value;
                      if (startDate) {
                        const start = new Date(startDate);
                        const end = new Date(selectedEndDate);
                        const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                        if (daysDiff > 31) {
                          toast.error('الفترة المحددة يجب ألا تتجاوز شهراً واحداً (31 يوم)');
                          return;
                        }
                      }
                      setEndDate(selectedEndDate);
                    }}
                    min={startDate}
                    max={startDate ? (() => {
                      const maxDate = new Date(startDate);
                      maxDate.setDate(maxDate.getDate() + 31);
                      return maxDate.toISOString().split('T')[0];
                    })() : undefined}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Selected Days Display */}
              {startDate && endDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">الأيام المحددة (من الأحد إلى الخميس):</h4>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedDays().map((day, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-blue-300 rounded-lg text-sm text-blue-700"
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">{day.dayName}</span>
                        <span className="text-blue-600">
                          {day.date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                        </span>
                      </span>
                    ))}
                  </div>
                  {getSelectedDays().length === 0 && (
                    <p className="text-sm text-blue-600">لا توجد أيام عمل (الأحد - الخميس) في الفترة المحددة</p>
                  )}
                </div>
              )}
              
              {/* Criteria Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  معايير التوزيع <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {criteriaOptions.map(option => (
                    <label
                      key={option.key}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={criteria.includes(option.key)}
                        onChange={() => handleCriteriaChange(option.key)}
                        disabled={option.key === 'no_conflict'}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="font-medium text-gray-900">{option.label} <span className="text-sm text-gray-600">({option.description})</span> <span className="text-sm text-gray-600 font-bold">({option.points} نقطة)</span></div>
                      
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Same Teacher for All Weeks Option */}
              {calculatedAssignments.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameTeacherForAllWeeks}
                      onChange={(e) => setSameTeacherForAllWeeks(e.target.checked)}
                      className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">نفس المعلم لجميع الأسابيع</div>
                      <div className="text-sm text-gray-600">
                        {sameTeacherForAllWeeks 
                          ? 'سيتم تعيين نفس المعلم لجميع الأيام من نفس اليوم (مثلاً: جميع أيام الأحد)' 
                          : 'يمكنك تعيين معلمين مختلفين لكل يوم منفصل (مثلاً: الأحد 18/1 معلم مختلف عن الأحد 25/1)'}
                      </div>
                    </div>
                  </label>
                </div>
              )}
              
              {/* Calculate Button */}
              <button
                onClick={handleCalculateSubstitution}
                disabled={!selectedAbsentTeacher || !startDate || !endDate || isCalculating}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري الحساب...</span>
                  </>
                ) : (
                  <>
                    <Filter className="h-5 w-5" />
                    <span>حساب الإحتياط</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Calculated Assignments - Timetable View */}
            {calculatedAssignments.length > 0 && timetableData && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      الحصص الإحتياط المقترحة ({getUniqueClassCount(calculatedAssignments)})
                      {calculatedAssignments.length > getUniqueClassCount(calculatedAssignments) && (
                        <span className="text-sm font-normal text-gray-500">
                          {' '}({calculatedAssignments.length} تعيين)
                        </span>
                      )}
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
                      <p className="font-medium text-blue-900 mb-2">📋 دليل الاستخدام:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>الأيام المحددة: <strong>{getSelectedDays().map(d => `${d.dayName} ${d.date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}`).join('، ')}</strong></li>
                        <li>في كل حصة إحتياط، ستجد قائمة منسدلة "اختر معلم"</li>
                        <li>المعلمون المقترحون (بدون تعارض) يظهرون أولاً مع النقاط</li>
                        <li>يمكنك اختيار أي معلم من القائمة أو المعلم المقترح</li>
                        <li>بعد اختيار جميع المعلمين، اضغط "حفظ الإحتياط"</li>
                      </ol>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-gray-600">
                      {calculatedAssignments.filter(a => a.substitute_teacher).length} حصة لها بديل
                    </span>
                  </div>
                </div>
                
                {/* Timetable Grid */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Top scrollbar */}
                  <div 
                    ref={calculatedViewTopScrollRef}
                    className="overflow-x-auto overflow-y-hidden border-b border-gray-200"
                    onScroll={(e) => {
                      if (calculatedViewBottomScrollRef.current) {
                        calculatedViewBottomScrollRef.current.scrollLeft = e.target.scrollLeft;
                      }
                    }}
                    style={{ 
                      direction: 'rtl',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9',
                      maxHeight: '20px'
                    }}
                  >
                    <div style={{ height: '1px', minWidth: '100%' }}>
                      <table className="w-full" style={{ visibility: 'hidden', height: '1px' }}>
                        <thead>
                          <tr>
                            <th className="min-w-[120px]"></th>
                            {getFilteredTimetableDays().map((day, dayIndex) => (
                              <th key={`${day.id || day.day_id}-${dayIndex}-${day.date || day.dateString || ''}`} className="min-w-[200px]"></th>
                            ))}
                          </tr>
                        </thead>
                      </table>
                    </div>
                  </div>
                  
                  {/* Main table with bottom scrollbar */}
                  <div 
                    ref={calculatedViewBottomScrollRef}
                    className="overflow-x-auto"
                    onScroll={(e) => {
                      if (calculatedViewTopScrollRef.current) {
                        calculatedViewTopScrollRef.current.scrollLeft = e.target.scrollLeft;
                      }
                    }}
                    style={{ 
                      direction: 'rtl',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                  >
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>الحصة</span>
                            </div>
                          </th>
                          {getFilteredTimetableDays().map((day, dayIndex) => {
                            // Show date if available
                            const dayDate = day.date || day.dateString;
                            const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : null;
                            
                            return (
                              <th
                                key={`${day.id || day.day_id}-${dayIndex}-${dayDate || ''}`}
                                className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[200px]"
                              >
                                <div>
                                  <p className="font-medium">{day.name || day.dayName}</p>
                                  {day.short_name && day.short_name !== day.name && (
                                    <p className="text-xs text-gray-500 mt-1">{day.short_name}</p>
                                  )}
                                  {dateDisplay && (
                                    <p className="text-xs text-blue-600 mt-1 font-medium">
                                      {dateDisplay}
                                    </p>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {sortPeriodsByTime(timetableData.periods).map(period => (
                          <tr key={period.id || period.period_id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 text-center border-b border-gray-200 sticky right-0 bg-white z-10">
                              <div className="font-medium text-gray-900">{period.period_id || period.period_number || period.id}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {period.start_time || period.startTime} - {period.end_time || period.endTime}
                              </div>
                            </td>
                            {getFilteredTimetableDays().map(day => {
                              // Find assignment for this day and period
                              // Try multiple ways to match day_id
                              const dayId = day.day_id || day.xml_id || day.id;
                              const periodId = period.period_id || period.xml_id || period.id;
                              const dayDate = day.dateString || day.date;
                              
                              // If sameTeacherForAllWeeks, find by day and period only
                              // If different teachers, also match by date
                              const assignment = calculatedAssignments.find(a => {
                                if (!a.schedule) return false;
                                
                                // Try to match day_xml_id with day_id, xml_id, or id
                                const scheduleDayId = a.schedule.day_xml_id;
                                const dayMatch = scheduleDayId === dayId || 
                                                scheduleDayId === day.xml_id || 
                                                scheduleDayId === day.id ||
                                                scheduleDayId === day.day_id;
                                
                                // Match period
                                const schedulePeriodId = a.schedule.period_xml_id;
                                const periodMatch = schedulePeriodId === periodId ||
                                                   schedulePeriodId === period.xml_id ||
                                                   schedulePeriodId === period.id ||
                                                   schedulePeriodId === period.period_id;
                                
                                if (sameTeacherForAllWeeks) {
                                  return dayMatch && periodMatch;
                                } else {
                                  // Match by date as well
                                  const assignmentDate = a.date || a.dateString;
                                  return dayMatch && periodMatch && assignmentDate === dayDate;
                                }
                              });
                              
                              // Get date for this cell
                              const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : null;
                              
                              return (
                                <td
                                  key={`${day.id || day.day_id}-${period.id || period.period_id}-${dayDate || ''}`}
                                  className="px-3 py-4 text-center border-b border-gray-200"
                                >
                                  {assignment ? (
                                    <div className={`p-2 rounded-lg border ${
                                      assignment.substitute_teacher
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-red-300 bg-red-50'
                                    }`}>
                                      {/* Class and Subject */}
                                      <div className="mb-2">
                                        <p className="text-xs font-medium text-gray-900">
                                          {assignment.schedule.class_name}
                                        </p>
                                        <p className="text-xs text-gray-700 mt-0.5">
                                          {assignment.schedule.subject_name}
                                        </p>
                                        {assignment.schedule.classroom_name && (
                                          <p className="text-xs text-gray-500 mt-0.5">
                                            {assignment.schedule.classroom_name}
                                          </p>
                                        )}
                                        {dateDisplay && (
                                          <p className="text-xs text-blue-600 mt-0.5 font-medium flex items-center justify-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {dateDisplay}
                                          </p>
                                        )}
                                      </div>
                                      
                                      {/* Teacher Selection Dropdown */}
                                      {getAvailableTeachersForSelection().length > 0 ? (
                                        <select
                                          value={assignment.substitute_teacher?.teacher_xml_id || ''}
                                          onChange={(e) => {
                                            if (!e.target.value) {
                                              // Clear selection if empty option selected
                                              // Find assignment by schedule ID and date (if different teachers mode)
                                              const assignmentIndex = calculatedAssignments.findIndex(a => {
                                                const scheduleMatch = a.schedule.id === assignment.schedule.id;
                                                if (sameTeacherForAllWeeks) {
                                                  return scheduleMatch;
                                                } else {
                                                  // Also match by date
                                                  const assignmentDate = a.date || a.dateString;
                                                  const currentDayDate = dayDate || day.dateString;
                                                  return scheduleMatch && assignmentDate === currentDayDate;
                                                }
                                              });
                                              if (assignmentIndex >= 0) {
                                                const updated = [...calculatedAssignments];
                                                updated[assignmentIndex] = {
                                                  ...updated[assignmentIndex],
                                                  substitute_teacher: null
                                                };
                                                setCalculatedAssignments(updated);
                                              }
                                              return;
                                            }
                                            
                                            const selectedTeacher = getAvailableTeachersForSelection().find(
                                              t => t.xml_id === e.target.value
                                            );
                                            if (selectedTeacher) {
                                              // Find assignment by schedule ID and date (if different teachers mode)
                                              const assignmentIndex = calculatedAssignments.findIndex(a => {
                                                const scheduleMatch = a.schedule.id === assignment.schedule.id;
                                                if (sameTeacherForAllWeeks) {
                                                  return scheduleMatch;
                                                } else {
                                                  // Also match by date
                                                  const assignmentDate = a.date || a.dateString;
                                                  const currentDayDate = dayDate || day.dateString;
                                                  return scheduleMatch && assignmentDate === currentDayDate;
                                                }
                                              });
                                              if (assignmentIndex >= 0) {
                                                handleManualTeacherSelection(
                                                  assignmentIndex,
                                                  selectedTeacher.xml_id,
                                                  selectedTeacher.user_id,
                                                  selectedTeacher.user_name || selectedTeacher.name
                                                );
                                              }
                                            }
                                          }}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                                        >
                                          <option value="">-- اختر معلم --</option>
                                        
                                        {/* Suggested teachers without conflicts */}
                                        {/* Note: All candidates in all_candidates are already without conflicts 
                                            because teachers with conflicts are filtered out in the backend */}
                                        {assignment.all_candidates && assignment.all_candidates.length > 0 && (
                                          <optgroup label="✓ معلمون مقترحون (بدون تعارض)">
                                            {assignment.all_candidates.map((candidate, idx) => {
                                              const isSelected = assignment.substitute_teacher?.teacher_xml_id === candidate.teacher_xml_id;
                                              const isHighScore = candidate.score > 100;
                                              const hasSameSubject = candidate.reasons.some(r => r.includes('نفس المادة'));
                                              return (
                                                <option 
                                                  key={`candidate-${idx}`}
                                                  value={candidate.teacher_xml_id}
                                                  className={isHighScore ? 'bg-green-50 font-semibold' : hasSameSubject ? 'bg-blue-50' : 'bg-gray-50'}
                                                  style={
                                                    isHighScore 
                                                      ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } 
                                                      : hasSameSubject
                                                      ? { backgroundColor: '#eff6ff' }
                                                      : { backgroundColor: '#f9fafb' }
                                                  }
                                                >
                                                  {isSelected && '✓ '}
                                                  {candidate.teacher_name}
                                                  {candidate.score > 0 && ` (${Math.round(candidate.score)} نقطة)`}
                                                  {hasSameSubject && ' ⭐'}
                                                </option>
                                              );
                                            })}
                                          </optgroup>
                                        )}
                                        
                                        {/* Currently selected teacher (if exists) */}
                                        {assignment.substitute_teacher && 
                                         !assignment.all_candidates?.some(c => c.teacher_xml_id === assignment.substitute_teacher.teacher_xml_id) && (
                                          <optgroup label="المعلم المختار">
                                            <option 
                                              value={assignment.substitute_teacher.teacher_xml_id} 
                                              className="bg-green-50 font-semibold"
                                              style={{ backgroundColor: '#f0fdf4', fontWeight: 'bold' }}
                                            >
                                              ✓ {assignment.substitute_teacher.teacher_name} (مقترح)
                                            </option>
                                          </optgroup>
                                        )}
                                        
                                        {/* All other available teachers */}
                                        <optgroup label="جميع المعلمين المتاحين (إحتمالية تعارض)">
                                          {getAvailableTeachersForSelection()
                                            .filter(t => {
                                              // Exclude already shown candidates
                                              if (assignment.all_candidates?.some(c => c.teacher_xml_id === t.xml_id)) return false;
                                              if (assignment.substitute_teacher?.teacher_xml_id === t.xml_id) return false;
                                              return true;
                                            })
                                            .map(teacher => (
                                              <option key={teacher.xml_id} value={teacher.xml_id}>
                                                {teacher.user_name || teacher.name}
                                              </option>
                                            ))}
                                        </optgroup>
                                      </select>
                                      ) : (
                                        <div className="text-xs text-red-600 p-2 bg-red-50 rounded border border-red-200 text-center">
                                          <AlertCircle className="h-3 w-3 inline ml-1" />
                                          لا توجد معلمين متاحين
                                        </div>
                                      )}
                                      
                                      {/* Selected Teacher Info with Points */}
                                      {assignment.substitute_teacher && (
                                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-xs">
                                          <div className="font-medium text-green-800 mb-1">
                                            ✓ {assignment.substitute_teacher.teacher_name}
                                          </div>
                                          
                                          {/* Points Display */}
                                          <div className="space-y-0.5 text-[9px]">
                                            <div className="flex items-center justify-between">
                                              <span className="text-gray-600">النقاط:</span>
                                              <span className="font-bold text-green-700">
                                                {Math.round(assignment.substitute_teacher.score || 0)} نقطة
                                              </span>
                                            </div>
                                            
                                            {assignment.substitute_teacher.points_breakdown && (
                                              <>
                                                {assignment.substitute_teacher.points_breakdown.same_subject > 0 && (
                                                  <div className="text-green-700">
                                                    نفس المادة: +{assignment.substitute_teacher.points_breakdown.same_subject}
                                                  </div>
                                                )}
                                                {assignment.substitute_teacher.points_breakdown.fewest_classes > 0 && (
                                                  <div className="text-blue-700">
                                                    حصص أسبوعية: +{Math.round(assignment.substitute_teacher.points_breakdown.fewest_classes)}
                                                  </div>
                                                )}
                                                {assignment.substitute_teacher.points_breakdown.fewest_substitutions > 0 && (
                                                  <div className="text-purple-700">
                                                    حصص إحتياط: +{Math.round(assignment.substitute_teacher.points_breakdown.fewest_substitutions)}
                                                  </div>
                                                )}
                                              </>
                                            )}
                                            
                                            {assignment.substitute_teacher.reasons.length > 0 && (
                                              <div className="text-gray-600 mt-1 pt-1 border-t border-green-200">
                                                {assignment.substitute_teacher.reasons.join(' • ')}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Show suggested teachers without conflicts with detailed points */}
                                      {assignment.all_candidates && assignment.all_candidates.length > 0 && (
                                        <details className="mt-2 text-[10px]">
                                          <summary className="text-blue-600 cursor-pointer hover:text-blue-700 font-medium">
                                            عرض المعلمين المقترحين مع تفاصيل النقاط ({assignment.all_candidates.length})
                                          </summary>
                                          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                                            {assignment.all_candidates.map((candidate, idx) => {
                                              const isSelected = assignment.substitute_teacher?.teacher_xml_id === candidate.teacher_xml_id;
                                              const isHighScore = candidate.score > 100;
                                              
                                              // Get points breakdown from backend or calculate
                                              const pointsBreakdown = candidate.points_breakdown || {
                                                same_subject: candidate.reasons.includes('نفس المادة') ? 100 : 0,
                                                fewest_classes: 0,
                                                fewest_substitutions: 0,
                                                total: candidate.score
                                              };
                                              
                                              // Extract numbers from reasons if breakdown not available
                                              const fewestClassesMatch = candidate.reasons.find(r => r.includes('حصص أسبوعية'));
                                              const fewestSubsMatch = candidate.reasons.find(r => r.includes('حصص إحتياط سابقة'));
                                              const weeklyClasses = candidate.weekly_classes || (fewestClassesMatch ? parseInt(fewestClassesMatch.match(/\d+/)?.[0] || 0) : null);
                                              const prevSubs = candidate.substitution_count || (fewestSubsMatch ? parseInt(fewestSubsMatch.match(/\d+/)?.[0] || 0) : null);
                                              
                                              return (
                                                <div 
                                                  key={idx}
                                                  className={`p-2 rounded border text-xs ${
                                                    isSelected 
                                                      ? 'bg-green-100 text-green-800 border-green-300' 
                                                      : isHighScore
                                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                      : 'bg-white text-gray-700 border-gray-200'
                                                  }`}
                                                >
                                                  <div className="font-medium mb-1.5">
                                                    {isSelected && '✓ '}
                                                    {candidate.teacher_name}
                                                  </div>
                                                  
                                                  {/* Points Breakdown */}
                                                  <div className="space-y-1 text-[9px]">
                                                    <div className="flex items-center justify-between bg-primary-50 px-1.5 py-0.5 rounded">
                                                      <span className="text-gray-700 font-medium">إجمالي النقاط:</span>
                                                      <span className="font-bold text-primary-700">{Math.round(candidate.score)} نقطة</span>
                                                    </div>
                                                    
                                                    {pointsBreakdown.same_subject > 0 && (
                                                      <div className="flex items-center justify-between text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                                        <span>✓ نفس المادة:</span>
                                                        <span className="font-semibold">+{pointsBreakdown.same_subject} نقطة</span>
                                                      </div>
                                                    )}
                                                    
                                                    {(pointsBreakdown.fewest_classes > 0 || fewestClassesMatch) && (
                                                      <div className="flex items-center justify-between text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        <span>حصص أسبوعية ({weeklyClasses || 'N/A'}):</span>
                                                        <span className="font-semibold">
                                                          +{pointsBreakdown.fewest_classes > 0 ? Math.round(pointsBreakdown.fewest_classes) : 'حتى 50'} نقطة
                                                        </span>
                                                      </div>
                                                    )}
                                                    
                                                    {(pointsBreakdown.fewest_substitutions > 0 || fewestSubsMatch) && (
                                                      <div className="flex items-center justify-between text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                                                        <span>حصص إحتياط سابقة ({prevSubs || 0}):</span>
                                                        <span className="font-semibold">
                                                          +{pointsBreakdown.fewest_substitutions > 0 ? Math.round(pointsBreakdown.fewest_substitutions) : 'حتى 30'} نقطة
                                                        </span>
                                                      </div>
                                                    )}
                                                    
                                                    <div className="flex items-center justify-between text-green-700 bg-green-50 px-1.5 py-0.5 rounded mt-1 border-t border-gray-200 pt-1">
                                                      <span>✓ بدون تعارض:</span>
                                                      <span className="font-semibold">إلزامي ✓</span>
                                                    </div>
                                                  </div>
                                                  
                                                  {candidate.reasons.length > 0 && (
                                                    <div className="mt-1.5 pt-1 border-t border-gray-200 text-[9px] text-gray-600">
                                                      <span className="font-medium">ملاحظات:</span> {candidate.reasons.join(' • ')}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </details>
                                      )}
                                      
                                      {!assignment.substitute_teacher && (
                                        <div className="mt-2 flex items-center justify-center gap-1 text-red-600 text-xs">
                                          <AlertCircle className="h-3 w-3" />
                                          <span>لا يوجد بديل</span>
                                        </div>
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
                
                {/* Save Button */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSaveSubstitution}
                    disabled={isSaving || calculatedAssignments.filter(a => !a.substitute_teacher).length > 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>حفظ الإحتياط</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCalculatedAssignments([]);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
      
      {/* Edit Substitution Modal */}
      {editingSubstitution && (
        <Modal
          isOpen={!!editingSubstitution}
          onClose={() => {
            setEditingSubstitution(null);
            setEditAssignments([]);
          }}
          title={`تعديل إحتياط المعلم: ${editingSubstitution.absent_teacher_name}`}
          size="full"
        >
          <div className="space-y-6">
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>
                    من {new Date(editingSubstitution.start_date).toLocaleDateString('ar-SA')} إلى{' '}
                    {new Date(editingSubstitution.end_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                <div>
                  <span className="font-medium">{getUniqueClassCount(editAssignments)}</span> حصة إحتياط
                  {editAssignments.length > getUniqueClassCount(editAssignments) && (
                    <span className="text-xs text-gray-500 mr-1">
                      ({editAssignments.length} تعيين)
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                💡 يمكنك تغيير المعلم البديل لكل حصة من القائمة المنسدلة أدناه
              </p>
            </div>
            
            {/* Timetable Grid for Editing - Show all days from start_date to end_date */}
            {editAssignments.length > 0 && timetableData && (() => {
              // Get all days from start_date to end_date
              const allDays = getFilteredTimetableDays();
              // Get periods from assignments
              const { periods: assignedPeriods } = getAssignedDaysAndPeriods(editAssignments);
              
              if (allDays.length === 0 || assignedPeriods.length === 0) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800">لا توجد أيام أو فترات معينة</p>
                  </div>
                );
              }
              
              return (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Top scrollbar */}
                  <div 
                    ref={editViewTopScrollRef}
                    className="overflow-x-auto overflow-y-hidden border-b border-gray-200"
                    onScroll={(e) => {
                      if (editViewBottomScrollRef.current) {
                        editViewBottomScrollRef.current.scrollLeft = e.target.scrollLeft;
                      }
                    }}
                    style={{ 
                      direction: 'rtl',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9',
                      maxHeight: '20px'
                    }}
                  >
                    <div style={{ height: '1px', minWidth: '100%' }}>
                      <table className="w-full" style={{ visibility: 'hidden', height: '1px' }}>
                        <thead>
                          <tr>
                            <th className="min-w-[120px]"></th>
                            {allDays.map((day, dayIndex) => (
                              <th key={`${day.day_id || day.id}-${dayIndex}-${day.date || day.dateString || ''}`} className="min-w-[150px]"></th>
                            ))}
                          </tr>
                        </thead>
                      </table>
                    </div>
                  </div>
                  
                  {/* Main table with bottom scrollbar */}
                  <div 
                    ref={editViewBottomScrollRef}
                    className="overflow-x-auto"
                    onScroll={(e) => {
                      if (editViewTopScrollRef.current) {
                        editViewTopScrollRef.current.scrollLeft = e.target.scrollLeft;
                      }
                    }}
                    style={{ 
                      direction: 'rtl',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                  >
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-3 text-right text-sm font-semibold text-gray-700 border-b border-gray-200 sticky right-0 bg-gray-50 z-10 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>الحصة</span>
                            </div>
                          </th>
                          {allDays.map((day, dayIndex) => {
                            const dayDate = day.date || day.dateString;
                            const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : null;
                            
                            return (
                              <th
                                key={`${day.day_id || day.id}-${dayIndex}-${dayDate || ''}`}
                                className="px-3 py-3 text-center text-sm font-semibold text-gray-700 border-b border-gray-200 min-w-[150px]"
                              >
                                <div>
                                  <p className="font-medium">{day.name || day.short_name || day.dayName}</p>
                                  {dateDisplay && (
                                    <p className="text-xs text-blue-600 mt-1 font-medium">
                                      {dateDisplay}
                                    </p>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {assignedPeriods.map(period => (
                          <tr key={period.period_id || period.id} className="border-b border-gray-100">
                            <td className="px-3 py-4 text-center text-sm font-medium text-gray-700 sticky right-0 bg-white z-10 border-r border-gray-200">
                              {period.period_id || period.period_number || period.id}
                            </td>
                            {allDays.map(day => {
                            // Find assignment for this day and period
                            const dayId = day.day_id || day.xml_id || day.id;
                            const periodId = period.period_id || period.xml_id || period.id;
                            const dayDate = day.dateString || day.date;
                            
                            // Find assignment matching day, period, and date (if assignment_date exists)
                            const assignment = editAssignments.find(a => {
                              const dayMatch = a.day_xml_id === dayId;
                              const periodMatch = a.period_xml_id === periodId;
                              
                              // If assignment has assignment_date, match by date as well
                              if (a.assignment_date) {
                                const assignmentDate = a.assignment_date.split('T')[0]; // Get date part only
                                const currentDayDate = dayDate ? (dayDate.split('T')[0] || dayDate) : null;
                                return dayMatch && periodMatch && assignmentDate === currentDayDate;
                              } else {
                                // If no assignment_date, match by day and period only (same teacher for all weeks)
                                return dayMatch && periodMatch;
                              }
                            });
                            
                            // Get date for this cell
                            const dateDisplay = dayDate ? new Date(dayDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : null;
                            
                            return (
                              <td
                                key={`${day.day_id || day.id}-${period.period_id || period.id}-${dayDate || ''}`}
                                className={`px-2 py-3 text-center text-xs border-r border-gray-100 ${
                                  assignment ? 'bg-yellow-50' : 'bg-gray-50'
                                }`}
                              >
                                {assignment ? (
                                  <div className="space-y-2">
                                    <div className="font-medium text-gray-900">
                                      {assignment.class_name}
                                    </div>
                                    <div className="text-gray-600">{assignment.subject_name}</div>
                                    {dateDisplay && (
                                      <div className="text-xs text-blue-600 font-medium mt-0.5">
                                        📅 {dateDisplay}
                                      </div>
                                    )}
                                    
                                    {/* Teacher Selection Dropdown */}
                                    <select
                                      value={assignment.substitute_teacher_xml_id || ''}
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleUpdateAssignment(assignment.id, e.target.value);
                                        }
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white mt-1"
                                    >
                                      <option value="">-- اختر معلم --</option>
                                      {getAvailableTeachersForSelection()
                                        .filter(t => t.xml_id !== editingSubstitution.absent_teacher_xml_id)
                                        .map(teacher => (
                                          <option key={teacher.xml_id} value={teacher.xml_id}>
                                            {teacher.user_name || teacher.name || teacher.xml_id}
                                          </option>
                                        ))}
                                    </select>
                                    
                                    {assignment.substitute_teacher_name && (
                                      <div className="text-xs text-primary-600 font-medium mt-1">
                                        ✓ {assignment.substitute_teacher_name}
                                      </div>
                                    )}
                                    
                                    {/* Show conflict warning if exists */}
                                    {conflictInfo[assignment.id] && conflictInfo[assignment.id].count > 0 && (
                                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                        <div className="flex items-start gap-1 text-yellow-800">
                                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="font-medium mb-1">
                                              ⚠️ يوجد {conflictInfo[assignment.id].count} تعارض نشط
                                            </p>
                                            <ul className="list-disc list-inside space-y-0.5 text-yellow-700">
                                              {conflictInfo[assignment.id].conflicts.slice(0, 3).map((conflict, idx) => (
                                                <li key={idx}>
                                                  {conflict.type === 'regular_schedule' ? (
                                                    <>
                                                      <span className="font-semibold">📚 حصة عادية:</span> {conflict.subject} - {conflict.class} - {conflict.date} - حصة {conflict.period}
                                                    </>
                                                  ) : (
                                                    <>
                                                      {conflict.class} - {conflict.date} - حصة {conflict.period}
                                                      {conflict.absent_teacher && ` (معلم غائب: ${conflict.absent_teacher})`}
                                                    </>
                                                  )}
                                                </li>
                                              ))}
                                              {conflictInfo[assignment.id].conflicts.length > 3 && (
                                                <li className="text-yellow-600 italic">
                                                  و{conflictInfo[assignment.id].conflicts.length - 3} تعارض آخر...
                                                </li>
                                              )}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
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
              );
            })()}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveEdit}
                disabled={isUpdating || editAssignments.some(a => !a.substitute_teacher_xml_id)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditingSubstitution(null);
                  setEditAssignments([]);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TeacherSubstitution;
