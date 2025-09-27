import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://sultan00095.pythonanywhere.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getUser: () => api.get('/auth/user').then(res => res.data),
  updateUser: (userId, userData) => api.post(`/auth/update_user/${userId}`, userData),
  changePassword: (passwordData) => api.put('/auth/change_password', passwordData),
  registerUser: (userData) => api.post('/auth/register', userData),
  registerTeacher: (teacherData) => api.post('/auth/register_single_teacher', teacherData),
  registerTeachers: (teachersData) => api.post('/auth/register_Teacher', teachersData),
  registerStudents: (studentsData) => api.post('/auth/register_Students', studentsData),
  registerAndAssignStudents: (data) => api.post('/auth/register_and_assign_students_v2', data),
  registerSingleAssignStudent: (data) => api.post('/auth/register_single_assign_student', data),
  updateStudentsPhoneNumbers: (data) => api.post('/auth/update_students_phone_numbers', data),
  deleteUser: (userId) => api.delete(`/auth/user/${userId}`),
  getUserById: (userId) => api.get(`/auth/getUser/${userId}`).then(res => res.data),
  deleteSchoolData: (options) => api.delete('/auth/delete_school_data', { data: { delete_options: options } }),
  toggleSchoolStatus: (schoolId) => api.put(`/auth/toggle_school_status/${schoolId}`),
  viewLogs: (page = 1, per_page = 50, days = 30) => 
    api.get('/auth/view_logs', { 
      params: { page, per_page, days } 
    }).then(res => res.data),
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
  getMySchoolStudents: () => api.get('/classes/my-school-students').then(res => res.data),
  removeStudents: (data) => api.post('/classes/remove-students', data),
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
  confirmDayAbsents: (data) => api.post('/attendance/confirm-day-absents', data),
  getConfirmationStatus: (params) => api.get('/attendance/get-confirmation-status', { params }).then(res => res.data),
};

// Static/Reports API
export const reportsAPI = {
  getSchoolStatistics: (params) => api.get('/static/', { params }).then(res => res.data),
  getTeacherAttendanceThisWeek: (params) => api.get('/static/teacher_attendance_this_week', { params }).then(res => res.data),
  getTeacherMasterReport: (params) => api.get('/static/teacher_master_report', { params }).then(res => res.data),
  sendSMS: (data) => api.post('/static/send-sms', data),
  addNews: (data) => api.post('/static/news', data),
  getNews: () => api.get('/static/news').then(res => res.data),
  deleteNews: (newsId) => api.delete(`/static/news/${newsId}`),
  getSchoolAbsenceStatistics: (params) => api.get('/static/school_absence_statistics', { params }).then(res => res.data),
  getSchoolsStatistics: (params) => api.get('/static/schools-statistics', { params }).then(res => res.data),
  getBulkOperationsStatus: (params) => api.get('/static/bulk-operations-status', { params }).then(res => res.data),
};

export default api;
