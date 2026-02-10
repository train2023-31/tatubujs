import axios from 'axios';

// Detect if running on mobile device
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

// Add cache-busting parameter for mobile requests
const addCacheBuster = (url) => {
  if (!url) return url;
  
  // Add timestamp to prevent mobile browser caching
  try {
    const urlObj = new URL(url, window.location.origin);
    // Add or update cache buster parameter
    urlObj.searchParams.set('_cb', Date.now().toString());
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch (error) {
    // Fallback for relative URLs
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
  }
};

// Create axios instance with mobile-friendly configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.tatubu.com/api',
  credentials: 'include', // Allow cookies to be sent
  timeout: isMobile() ? 60000 : 30000, // 60s on mobile, 30s on desktop (mobile networks are slower)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Validate JWT format (must have 3 segments: header.payload.signature)
const isValidJwt = (token) => {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.length < 20) return false; // JWT is always longer
  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0);
};

// Request interceptor to add auth token and cache busting for mobile
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && isValidJwt(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && !isValidJwt(token)) {
      // Invalid token (e.g. "null", truncated, or corrupted) - remove it to avoid "Not enough segments"
      console.warn('Invalid token in localStorage, removing');
      localStorage.removeItem('token');
    }
    
    // Ensure proper headers for mobile browsers (helps with CORS)
    config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
    config.headers['Accept'] = 'application/json';
    
    // Mobile browsers need explicit origin handling
    if (isMobile()) {
      // Don't set Origin header manually (browser handles it), but ensure credentials are sent
      config.withCredentials = true;
      
      // Add cache-busting for mobile browsers (they cache aggressively)
      // Only for GET requests (POST/PUT/DELETE don't get cached)
      if (config.method?.toLowerCase() === 'get') {
        config.url = addCacheBuster(config.url);
        // Prevent caching on mobile
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
        config.headers['Expires'] = '0';
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and network issues
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors (common on mobile)
    if (!error.response) {
      // Network error (no internet, timeout, etc.)
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn('Request timeout - this may be due to slow mobile network');
        // Retry once for timeout errors
        if (!originalRequest._retry && originalRequest.method !== 'post') {
          originalRequest._retry = true;
          // Increase timeout for retry on mobile
          originalRequest.timeout = isMobile() ? 90000 : 45000;
          return api(originalRequest);
        }
      }
      
      // If it's a network error (offline), return a more user-friendly error
      if (error.message === 'Network Error') {
        error.message = 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت الخاص بك.';
      }
    }

    // Handle invalid JWT errors (e.g. "Not enough segments", malformed token)
    const msg = String(error.response?.data?.msg || error.response?.data?.message || '');
    const isInvalidToken =
      msg.includes('Not enough segments') ||
      msg.includes('Invalid token') ||
      msg.includes('Signature expired') ||
      msg.includes('Token has expired');
    if (isInvalidToken) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Handle HTTP errors
    if (error.response?.status === 401) {
      // Don't redirect if we're already on login page or if it's a login request
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isOnLoginPage = window.location.pathname === '/login';
      
      if (!isLoginRequest && !isOnLoginPage) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    // Retry on 500 errors (server errors - might be temporary on mobile)
    if (error.response?.status === 500 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Wait 2 seconds before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }

    // Retry on 503 errors (service unavailable - common on mobile networks)
    if (error.response?.status === 503 && !originalRequest._retry) {
      originalRequest._retry = true;
      await new Promise(resolve => setTimeout(resolve, 3000));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  parentLogin: (credentials) => api.post('/parent-pickup/parent-login', credentials),
  getUser: () => api.get('/auth/user').then(res => res.data),
  updateUser: (userId, userData) => api.post(`/auth/update_user/${userId}`, userData),
  changePassword: (passwordData) => api.put('/auth/change_password', passwordData),
  registerUser: (userData) => api.post('/auth/register', userData),
  registerTeacher: (teacherData) => api.post('/auth/register_single_teacher', teacherData),
  registerDriver: (driverData) => api.post('/auth/register_single_driver', driverData), 
  registerDataAnalyst: (dataAnalystData) => api.post('/auth/register_single_data_analyst', dataAnalystData),
  registerTeachers: (teachersData) => api.post('/auth/register_Teacher', teachersData),
  registerDrivers: (driversData) => api.post('/auth/register_Driver', driversData),
  registerStudents: (studentsData) => api.post('/auth/register_Students', studentsData),
  registerAndAssignStudents: (data) => api.post('/auth/register_and_assign_students_v2', data, { timeout: 300000 }), // 5 minutes timeout for bulk operations
  registerSingleAssignStudent: (data) => api.post('/auth/register_single_assign_student', data),
  updateStudentsPhoneNumbers: (data) => api.post('/auth/update_students_phone_numbers', data,{ timeout: 300000 }),
  deleteUser: (userId) => api.delete(`/auth/user/${userId}`),
  getUserById: (userId) => api.get(`/auth/getUser/${userId}`).then(res => res.data),
  deleteSchoolData: (options) => api.delete('/auth/delete_school_data', { data: { delete_options: options } }),
  toggleSchoolStatus: (schoolId) => api.put(`/auth/toggle_school_status/${schoolId}`),
  viewLogs: (params = {}) => {
    const { page = 1, per_page = 50, days = 30, school_id } = params;
    const queryParams = { page, per_page, days };
    if (school_id) {
      queryParams.school_id = school_id;
    }
    return api.get('/auth/view_logs', { 
      params: queryParams 
    }).then(res => res.data);
  },
  sendAbsenceNotifications: (data) => api.post('/auth/send-absence-notifications', data),
  getAbsenceStats: (params) => api.get('/auth/get-absence-stats', { params }).then(res => res.data),
  
  // SMS Configuration API
  getSmsConfig: (schoolId) => api.get('/static/sms-config', { params: { school_id: schoolId } }).then(res => res.data),
  updateSmsConfig: (data) => api.put('/static/sms-config', data).then(res => res.data),
  testSmsConnection: (data) => api.post('/static/test-sms-connection', data).then(res => res.data),
  
  // SMS Operations API
  sendDailySmsReports: (data) => api.post('/attendance/send-daily-sms-reports', data).then(res => res.data),
  checkSmsBalance: (schoolId) => api.get('/attendance/check-sms-balance', { params: { school_id: schoolId } }).then(res => res.data),
  sendTestSms: (data) => api.post('/attendance/send-test-sms', data).then(res => res.data),
};

// Users API
export const usersAPI = {
  getMySchoolUsers: () => api.get('/users/my-school').then(res => res.data),
  getMySchoolTeachers: () => api.get('/users/my-school-Teachers').then(res => res.data),
  getMySchoolStudents: () => api.get('/users/my-school-Students').then(res => res.data),
  deactivateSchool: (schoolId) => api.post(`/users/deactivate_school/${schoolId}`),
  updateStudentBehaviorNote: (studentId, behaviorNote) => api.put(`/users/update-student-behavior-note/${studentId}`, { behavior_note: behaviorNote }),
};

// Classes API
export const classesAPI = {
  addSchool: (schoolData) => api.post('/classes/addSchool', schoolData),
  updateSchool: (schoolId, schoolData) => api.put(`/classes/updateSchool/${schoolId}`, schoolData),
  createClass: (classData) => api.post('/classes/create', classData),
  createClasses: (classesData) => api.post('/classes/createClasses', classesData),
  updateClasses: (data) => api.put('/classes/update-classes', data),
  updateSubject: (data) => api.put('/classes/update-Subject', data),
  createSubject: (subjectData) => api.post('/classes/create_subject', subjectData),
  getMyClasses: () => api.get('/classes/myClasses').then(res => res.data),
  getAllSchools: () => api.get('/classes/AllSchool').then(res => res.data),
  getAllClasses: () => api.get('/classes/AllClass').then(res => res.data),
  getAllSubjects: () => api.get('/classes/AllSubject').then(res => res.data),
  assignStudents: (data) => api.post('/classes/assign-students', data),
  getClassStudents: (classId) => api.get(`/classes/students/${classId}`).then(res => res.data),
  getMySchoolStudents: (excludeClassId) => {
    const params = excludeClassId ? { exclude_class_id: excludeClassId } : {};
    return api.get('/classes/my-school-students', { params }).then(res => res.data);
  },
  removeStudents: (data) => api.post('/classes/remove-students', data),
  addNewStudent: (data) => api.post('/auth/register_single_assign_student', data),
  deleteClass: (classId) => api.delete(`/classes/${classId}`),
};

// Attendance API
export const attendanceAPI = {
  takeAttendance: (data) => api.post('/attendance/takes', data),
  getAttendanceByClass: (classId, params) => api.get(`/attendance/attendanceByClass/${classId}`, { params }).then(res => res.data),
  getAttendanceByClassAndSubject: (classId, params) => api.get(`/attendance/attendanceByClass_subject/${classId}`, { params }).then(res => res.data),
  getAttendanceSummary: (params) => api.get('/attendance/attendanceSummary', { params }).then(res => res.data),
  getAttendanceDetailsByStudent: (params) => api.get('/attendance/attendanceDetailsByStudent', { params }).then(res => res.data),
  getAttendanceDetailsByStudents: (params) => api.get('/attendance/attendanceDetailsByStudents', { params }).then(res => res.data),
  getStudentsWithExcusedAttendance: (params) => api.get('/attendance/students_with_excused_attendance', { params }).then(res => res.data),
  updateExcuseNote: (data) => api.put('/attendance/update_excuse_note', data),
  getStudentAttendanceLog: (params) => api.get('/attendance/student_attendance_log', { params }).then(res => res.data),
  updateExcuseForStudent: (data) => api.post('/attendance/update-excuse-for-student', data),
  // New student-specific endpoints (no date ranges required)
  getMyAttendanceHistory: () => api.get('/attendance/student/my-attendance-history').then(res => res.data),
  getMyAttendanceStats: () => api.get('/attendance/student/my-attendance-stats').then(res => res.data),
  getMyProfile: () => api.get('/attendance/student/my-profile').then(res => res.data),
  confirmDayAbsents: (data) => api.post('/attendance/confirm-day-absents', data),
  getConfirmationStatus: (params) => api.get('/attendance/get-confirmation-status', { params }).then(res => res.data),
  // Teacher Report APIs
  getTeacherReport: (params) => api.get('/attendance/teacherReport', { params }).then(res => res.data),
  getTeacherHistory: (teacherId, params) => api.get(`/attendance/teacherHistory/${teacherId}`, { params }).then(res => res.data),
};

// Static/Reports API
export const reportsAPI = {
  getSchoolStatistics: (params) => api.get('/static/', { params }).then(res => res.data),
  getTeacherAttendanceThisWeek: (params) => api.get('/static/teacher_attendance_this_week', { params }).then(res => res.data),
  getTeacherMasterReport: (params) => api.get('/static/teacher_master_report', { params }).then(res => res.data),
  sendSMS: (data) => api.post('/static/send-sms', data),
  sendBulkDailyReports: (data) => api.post('/static/send-bulk-daily-reports', data),
  addNews: (data) => api.post('/static/news', data),
  getNews: () => api.get('/static/news').then(res => res.data),
  deleteNews: (newsId) => api.delete(`/static/news/${newsId}`),
  getSchoolAbsenceStatistics: (params) => api.get('/static/school_absence_statistics', { params }).then(res => res.data),
  getSchoolsStatistics: (params) => api.get('/static/schools-statistics', { params }).then(res => res.data),
  getBulkOperationsStatus: (params) => api.get('/static/bulk-operations-status', { params }).then(res => res.data),
};

// Bus API
export const busAPI = {
  // Bus Management
  getBuses: () => api.get('/bus/buses').then(res => res.data),
  getBus: (busId) => api.get(`/bus/buses/${busId}`).then(res => res.data),
  createBus: (busData) => api.post('/bus/buses', busData),
  updateBus: (busId, busData) => api.put(`/bus/buses/${busId}`, busData),
  deleteBus: (busId) => api.delete(`/bus/buses/${busId}`),
  
  // Driver
  getDriverBus: () => api.get('/bus/driver/my-bus').then(res => res.data),
  
  // Student Assignment
  getBusStudents: (busId) => api.get(`/bus/buses/${busId}/students`).then(res => res.data),
  assignStudents: (busId, studentIds) => api.post(`/bus/buses/${busId}/assign-students`, { student_ids: studentIds }),
  removeStudents: (busId, studentIds) => api.post(`/bus/buses/${busId}/remove-students`, { student_ids: studentIds }),
  
  // Scanning
  scanStudent: (scanData) => api.post('/bus/scan', scanData),
  getScans: (params) => api.get('/bus/scans', { params }).then(res => res.data),
  getStudentBusStatus: (studentId) => api.get(`/bus/students/${studentId}/bus-status`).then(res => res.data),
  getCurrentStudentsOnBus: (busId) => api.get(`/bus/buses/${busId}/current-students`).then(res => res.data),
  
  // Reports
  getDailyBusReport: (params) => api.get('/bus/reports/daily', { params }).then(res => res.data),
};

// Timetable API
export const timetableAPI = {
  getTimetables: () => api.get('/timetable/timetables').then(res => res.data),
  getTimetable: (timetableId) => api.get(`/timetable/timetables/${timetableId}`).then(res => res.data),
  createTimetable: (data) => api.post('/timetable/timetables', data),
  updateTimetable: (timetableId, data) => api.put(`/timetable/timetables/${timetableId}`, data),
  deleteTimetable: (timetableId) => api.delete(`/timetable/timetables/${timetableId}`),
  getTeacherMappings: (timetableId) => api.get(`/timetable/timetables/${timetableId}/teacher-mappings`).then(res => res.data),
  updateTeacherMappings: (timetableId, data) => api.put(`/timetable/timetables/${timetableId}/teacher-mappings`, data),
  activateTimetable: (timetableId) => api.post(`/timetable/timetables/${timetableId}/activate`),
  getMyTimetable: () => api.get('/timetable/teacher/my-timetable').then(res => res.data),
};

// Substitution API
export const substitutionAPI = {
  // Get all substitutions
  getSubstitutions: (params = {}) => api.get('/substitutions/', { params }).then(res => res.data),
  
  // Get specific substitution
  getSubstitution: (substitutionId) => api.get(`/substitutions/${substitutionId}`).then(res => res.data),
  
  // Calculate substitute teachers (without saving)
  calculateSubstitution: (data) => api.post('/substitutions/calculate', data).then(res => res.data),
  
  // Create new substitution
  createSubstitution: (data) => api.post('/substitutions/', data),
  
  // Update substitution assignments
  updateSubstitution: (substitutionId, data) => api.put(`/substitutions/${substitutionId}`, data),
  
  // Delete substitution
  deleteSubstitution: (substitutionId) => api.delete(`/substitutions/${substitutionId}`),
  
  // Deactivate substitution
  deactivateSubstitution: (substitutionId) => api.post(`/substitutions/${substitutionId}/deactivate`),
  
  // Get teacher's substitutions
  getTeacherSubstitutions: (teacherUserId) => api.get(`/substitutions/teacher/${teacherUserId}`).then(res => res.data),
};

// Parent Pickup API
export const parentPickupAPI = {
  requestPickup: () => api.post('/parent-pickup/request-pickup'),
  confirmPickup: () => api.post('/parent-pickup/confirm-pickup'),
  completePickup: () => api.post('/parent-pickup/complete-pickup'),
  getMyPickupStatus: () => api.get('/parent-pickup/my-pickup-status').then(res => res.data),
  getConfirmedPickups: (schoolId) => api.get('/parent-pickup/confirmed-pickups', { params: { school_id: schoolId } }).then(res => res.data),
  getDisplayPickups: () => api.get('/parent-pickup/display-pickups').then(res => res.data),
  getAllPickups: (params) => api.get('/parent-pickup/all-pickups', { params }).then(res => res.data),
  cancelPickup: (pickupId) => api.post('/parent-pickup/cancel-pickup', { pickup_id: pickupId }),
};

export default api;
