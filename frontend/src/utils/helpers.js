// Utility functions for the attendance tracking system

/**
 * Format a date according to the specified format and locale
 * @param {Date|string} date - The date to format
 * @param {string} format - The format string (e.g., 'dd/MM/yyyy', 'EEEE, dd MMMM yyyy')
 * @param {string} locale - The locale (e.g., 'ar', 'en')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'dd/MM/yyyy', locale = 'ar-OM') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    timeZone: 'Asia/Muscat', // Muscat, Oman timezone
  };
  
  // Handle different format patterns
  if (format.includes('EEEE')) {
    options.weekday = 'long';
  }
  if (format.includes('MMMM')) {
    options.month = 'long';
  }
  if (format.includes('MMM')) {
    options.month = 'short';
  }
  if (format.includes('dd')) {
    options.day = '2-digit';
  }
  if (format.includes('MM')) {
    options.month = '2-digit';
  }
  if (format.includes('yyyy')) {
    options.year = 'numeric';
  }
  
  try {
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } catch (error) {
    // Fallback to simple formatting with timezone
    return dateObj.toLocaleDateString(locale, { timeZone: 'Asia/Muscat' });
  }
};

/**
 * Get today's date in API format (YYYY-MM-DD)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayAPI = () => {
  const today = new Date();
  // Convert to Muscat timezone using a robust method
  const muscatTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  // Fallback to current date if conversion fails
  if (isNaN(muscatTime.getTime())) {
    return today.toISOString().split('T')[0];
  }
  return muscatTime.toISOString().split('T')[0];
};

/**
 * Get current week date range
 * @returns {Object} Object with start and end dates of current week
 */
export const getCurrentWeekRange = () => {
  const today = new Date();
  // Convert to Muscat timezone using a robust method
  const muscatToday = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  
  // Fallback to current date if conversion fails
  if (isNaN(muscatToday.getTime())) {
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0],
    };
  }
  
  const dayOfWeek = muscatToday.getDay();
  const startOfWeek = new Date(muscatToday);
  startOfWeek.setDate(muscatToday.getDate() - dayOfWeek);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  };
};

/**
 * Get current working week date range (Sunday to Thursday)
 * @returns {Object} Object with start and end dates of current working week
 */
export const getCurrentWorkingWeekRange = () => {
  const today = new Date();
  // Convert to Muscat timezone using a robust method
  const muscatToday = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  
  // Fallback to current date if conversion fails
  if (isNaN(muscatToday.getTime())) {
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4); // Thursday
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0],
    };
  }
  
  const dayOfWeek = muscatToday.getDay();
  const startOfWeek = new Date(muscatToday);
  startOfWeek.setDate(muscatToday.getDate() - dayOfWeek); // Sunday
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4); // Thursday
  
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  };
};

/**
 * Get all working weeks in the current month (Sunday to Thursday)
 * Weeks start from Sunday (day 0) and end on Thursday (day 4)
 * @returns {Array} Array of week objects with start, end, and label
 */
export const getCurrentMonthWeeks = () => {
  const today = new Date();
  const muscatToday = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  
  // Fallback to current date if conversion fails
  if (isNaN(muscatToday.getTime())) {
    return getCurrentMonthWeeksFallback(today);
  }
  
  return getCurrentMonthWeeksFallback(muscatToday);
};

/**
 * Fallback function for getting current month weeks
 * @param {Date} currentDate - The current date
 * @returns {Array} Array of week objects
 */
const getCurrentMonthWeeksFallback = (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of the month
  const firstDay = new Date(year, month, 1);
  // Get last day of the month
  const lastDay = new Date(year, month + 1, 0);
  
  const weeks = [];
  let currentWeekStart = new Date(firstDay);
  
  // Find the first Sunday of the month or before
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  currentWeekStart.setDate(firstDay.getDate() - firstDayOfWeek);
  
  let weekNumber = 1;
  
  // Generate all weeks that have at least one day in the current month
  while (currentWeekStart <= lastDay) {
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 5); // Thursday
    
    // Only include weeks that have at least one day in the current month
    if (weekEnd >= firstDay && weekStart <= lastDay) {
      weeks.push({
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
        label: `الأسبوع ${weekNumber}`,
        weekNumber: weekNumber
      });
      weekNumber++;
    }
    
    // Move to next week
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }
  
  return weeks;
};

/**
 * Get current month date range
 * @returns {Object} Object with start and end dates of current month
 */
export const getCurrentMonthRange = () => {
  const today = new Date();
  // Convert to Muscat timezone using a robust method
  const muscatToday = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  
  // Fallback to current date if conversion fails
  if (isNaN(muscatToday.getTime())) {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      start: startOfMonth.toISOString().split('T')[0],
      end: endOfMonth.toISOString().split('T')[0],
    };
  }
  
  const startOfMonth = new Date(muscatToday.getFullYear(), muscatToday.getMonth(), 1);
  const endOfMonth = new Date(muscatToday.getFullYear(), muscatToday.getMonth() + 1, 0);
  
  return {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0],
  };
};

/**
 * Get class time options for attendance
 * @returns {Array} Array of class time options
 */
export const getClassTimeOptions = () => {
  return [
    { value: 0, label: 'الحصة الصفرية' },
    { value: 1, label: 'الحصة الأولى' },
    { value: 2, label: 'الحصة الثانية' },
    { value: 3, label: 'الحصة الثالثة' },
    { value: 4, label: 'الحصة الرابعة' },
    { value: 5, label: 'الحصة الخامسة' },
    { value: 6, label: 'الحصة السادسة' },
    { value: 7, label: 'الحصة السابعة' },
    { value: 8, label: 'الحصة الثامنة' },
  ];
};

/**
 * Get display name for user role
 * @param {string} role - The user role
 * @returns {string} Display name for the role
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    admin: 'مدير النظام',
    school_admin: 'مدير المدرسة',
    teacher: 'معلم',
    student: 'طالب',
    data_analyst: 'محلل بيانات',
    driver: 'سائق',
  };
  
  return roleNames[role] || role || 'غير محدد';
};

/**
 * Get color class for user role
 * @param {string} role - The user role
 * @returns {string} CSS class for the role
 */
export const getRoleColor = (role) => {
  const roleColors = {
    admin: 'badge-danger',
    school_admin: 'badge-warning',
    teacher: 'badge-info',
    student: 'badge-success',
    data_analyst: 'badge-primary',
    driver: 'badge-primary',
  };
  
  return roleColors[role] || 'badge-info';
};

/**
 * Check if user has any of the specified roles
 * @param {Object} user - The user object
 * @param {Array} roles - Array of roles to check
 * @returns {boolean} True if user has any of the specified roles
 */
export const hasRole = (user, roles) => {
  if (!user || !user.role || !Array.isArray(roles)) {
    return false;
  }
  
  return roles.includes(user.role);
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 8) {
    // Omani mobile number format: XXXX XXXX
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  } else if (cleaned.length === 9 && cleaned.startsWith('9')) {
    // Omani mobile number with country code: 9XXXX XXXX
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('968')) {
    // Full international format: +968 XXXX XXXX
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  
  return phoneNumber; // Return original if no pattern matches
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Accept 8-digit Omani numbers, 9-digit numbers starting with 9, or 12-digit international
  return cleaned.length === 8 || 
         (cleaned.length === 9 && cleaned.startsWith('9')) || 
         (cleaned.length === 12 && cleaned.startsWith('968'));
};

/**
 * Generate a random ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} String with first letter capitalized
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} String in title case
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
export const isEmpty = (value) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @param {Date|string} date - The date to compare
 * @param {string} locale - The locale
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date, locale = 'ar') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Convert both dates to Muscat timezone for accurate comparison
  const muscatNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  const muscatDate = new Date(dateObj.toLocaleString("en-US", {timeZone: "Asia/Muscat"}));
  
  // Fallback to original dates if conversion fails
  const nowTime = isNaN(muscatNow.getTime()) ? now : muscatNow;
  const dateTime = isNaN(muscatDate.getTime()) ? dateObj : muscatDate;
  
  const diffInSeconds = Math.floor((nowTime - dateTime) / 1000);
  
  if (diffInSeconds < 60) return 'الآن';
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  if (diffInSeconds < 31536000) return `منذ ${Math.floor(diffInSeconds / 2592000)} شهر`;
  
  return `منذ ${Math.floor(diffInSeconds / 31536000)} سنة`;
};



