import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Users from './pages/Users/Users';
import Classes from './pages/Classes/Classes';
import Attendance from './pages/Attendance/Attendance';
import AttendanceDetails from './pages/AttendanceDetails/AttendanceDetails';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import Schools from './pages/Schools/Schools';
import News from './pages/News/News';
import SMS from './pages/SMS/SMS';
import BulkOperations from './pages/BulkOperations/BulkOperations';
import DailyReport from './pages/DailyReport/DailyReport';
import TeacherReport from './pages/TeacherReport/TeacherReport';
import DeleteSchoolData from './pages/DeleteSchoolData/DeleteSchoolData';
import ViewLogs from './pages/ViewLogs/ViewLogs';
import VersionFeatures from './pages/VersionFeatures/VersionFeatures';
import WhatsAppMessaging from './pages/WhatsAppMessaging/WhatsAppMessaging';
import SmsConfiguration from './pages/SmsConfiguration/SmsConfiguration';
import BulkMessaging from './pages/BulkMessaging/BulkMessaging';
import StudentNotesLog from './pages/StudentNotesLog/StudentNotesLog';
import Guide from './pages/Guide/Guide';
import BusManagement from './pages/BusManagement/BusManagement';
import BusScanner from './pages/BusScanner/BusScanner';
import BusReports from './pages/BusReports/BusReports';
import StudentQRCodes from './pages/StudentQRCodes/StudentQRCodes';
import SchoolTimetable from './pages/SchoolTimetable/SchoolTimetable';
import TeacherSubstitution from './pages/TeacherSubstitution/TeacherSubstitution';
import LoadingSpinner from './components/UI/LoadingSpinner';
import cacheManager from './utils/cacheManager';

// Detect mobile device for mobile-friendly configuration
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

// Create a client with mobile-friendly defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: isMobileDevice() ? 3 : 1, // Retry more on mobile (3 times) due to network instability
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s on mobile, faster on desktop
        const baseDelay = isMobileDevice() ? 1000 : 500;
        return Math.min(baseDelay * Math.pow(2, attemptIndex), 8000);
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when connection restored (important for mobile)
      staleTime: isMobileDevice() ? 30000 : 0, // Cache data longer on mobile (30s) to reduce requests
      cacheTime: isMobileDevice() ? 5 * 60 * 1000 : 5 * 60 * 1000, // 5 minutes cache
      refetchOnMount: true, // Always refetch on mount (ensures fresh data)
    },
    mutations: {
      retry: isMobileDevice() ? 2 : 1, // Retry mutations more on mobile
      retryDelay: isMobileDevice() ? 2000 : 1000,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

// Online/Offline detection for mobile networks
const setupOnlineDetection = () => {
  // Listen for online/offline events
  window.addEventListener('online', async () => {
    console.log('Connection restored - clearing cache and refreshing data...');
    // Clear caches when connection restored (mobile browsers cache aggressively)
    await cacheManager.clearQueryCache(queryClient);
    // Invalidate all queries to refetch fresh data
    queryClient.invalidateQueries();
    console.log('✅ Data refreshed after connection restored');
  });

  window.addEventListener('offline', () => {
    console.warn('Connection lost - app will retry when connection is restored');
  });
};

// Mobile cache management: Clear cache if needed on load
const initializeCacheManagement = async () => {
  // Check if we should clear cache (new version, clearCache param, etc.)
  if (cacheManager.shouldClearCache()) {
    console.log('🔄 New version detected - clearing cache...');
    // Don't fully clear on mobile (would cause reload loop), just clear query cache
    cacheManager.clearQueryCache(queryClient);
  }

  // Store current version
  const currentVersion = process.env.REACT_APP_VERSION || '2.0.1';
  localStorage.setItem('app_version', currentVersion);

  // Clear caches periodically on mobile (every 24 hours)
  const lastCacheClear = localStorage.getItem('last_cache_clear');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (!lastCacheClear || (now - parseInt(lastCacheClear)) > oneDay) {
    if (cacheManager.isMobileDevice()) {
      console.log('🔄 Periodic cache clear (mobile)');
      // On mobile, only clear query cache to avoid reload issues
      cacheManager.clearQueryCache(queryClient);
      localStorage.setItem('last_cache_clear', now.toString());
    }
  }

  // Expose cache clearing function globally for manual use
  window.clearAppCache = async () => {
    try {
      // Store queryClient in window for cache manager to access
      window.queryClient = queryClient;
      
      if (cacheManager.isMobileDevice()) {
        // On mobile, show confirmation and then clear
        const confirmed = window.confirm('هل تريد مسح ذاكرة التخزين المؤقت؟ سيتم إعادة تحميل الصفحة.');
        if (confirmed) {
          await cacheManager.clearCacheAndReload();
        }
      } else {
        // Desktop: clear and reload
        await cacheManager.clearCacheAndReload();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('حدث خطأ أثناء مسح ذاكرة التخزين المؤقت. يرجى إعادة تحميل الصفحة يدوياً.');
    }
  };
};

// Initialize cache management
initializeCacheManagement();

// Initialize online detection
setupOnlineDetection();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="App" dir="rtl">
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/app" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* User Management - Admin, School Admin, and Data Analyst */}
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'school_admin', 'data_analyst']}>
                      <Users />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Class Management - School Admin and Data Analyst */}
                <Route 
                  path="classes" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                      <Classes />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Attendance - Teachers, School Admin, and Data Analyst */}
                <Route 
                  path="attendance" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'data_analyst']}>
                      <Attendance />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Attendance Details - Teachers, School Admin, and Data Analyst */}
                <Route 
                  path="attendance-details" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'school_admin', 'data_analyst']}>
                      <AttendanceDetails />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Reports - School Admin and Data Analyst */}
                <Route path="reports" element={
                  <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                
                {/* Daily Report - School Admin and Data Analyst */}
                <Route 
                  path="daily-report" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                      <DailyReport />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Teacher Report - School Admin and Data Analyst */}
                <Route 
                  path="teacher-report" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                      <TeacherReport />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Schools Management - Admin only */}
                <Route 
                  path="schools" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Schools />
                    </ProtectedRoute>
                  } 
                />
                
                {/* News Management - Admin, School Admin, and Data Analyst */}
                <Route 
                  path="news" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'school_admin', 'data_analyst']}>
                      <News />
                    </ProtectedRoute>
                  } 
                />
                
                {/* SMS Management - School Admin */}
                <Route 
                  path="sms" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <SMS />
                    </ProtectedRoute>
                  } 
                />
                
                {/* SMS Configuration - School Admin */}
                <Route 
                  path="sms-configuration" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <SmsConfiguration />
                    </ProtectedRoute>
                  } 
                />
                
                {/* WhatsApp Messaging - School Admin, Data Analyst, and Admin */}
                <Route 
                  path="whatsapp-messaging" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst', 'admin']}>
                      <WhatsAppMessaging />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Bulk Operations - School Admin */}
                <Route 
                  path="bulk-operations" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <BulkOperations />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Bulk Messaging - School Admin, Data Analyst, and Admin */}
                <Route 
                  path="bulk-messaging" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst', 'admin']}>
                      <BulkMessaging />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Student Notes Log - School Admin and Data Analyst */}
                <Route 
                  path="student-notes-log" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                      <StudentNotesLog />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Delete School Data - School Admin only */}
                <Route 
                  path="delete-school-data" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <DeleteSchoolData />
                    </ProtectedRoute>
                  } 
                />
                
                {/* View Logs - Admin, School Admin, and Data Analyst */}
                <Route 
                  path="view-logs" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'school_admin', 'data_analyst']}>
                      <ViewLogs />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Version Features - All roles */}
                <Route path="version-features" element={<VersionFeatures />} />
                
                {/* Guide - School Admin */}
                <Route 
                  path="guide" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <Guide />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Bus Management - School Admin and Admin */}
                <Route 
                  path="buses" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'admin']}>
                      <BusManagement />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Bus Scanner - School Admin, Admin, and Driver */}
                <Route 
                  path="bus-scanner" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'admin', 'driver']}>
                      <BusScanner />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Bus Reports - School Admin, Admin, and Data Analyst */}
                <Route 
                  path="bus-reports" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'admin', 'data_analyst']}>
                      <BusReports />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Student QR Codes - School Admin and Admin */}
                <Route 
                  path="student-qrcodes" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'admin']}>
                      <StudentQRCodes />
                    </ProtectedRoute>
                  } 
                />
                
                {/* School Timetable - School Admin and Data Analyst only */}
                <Route 
                  path="school-timetable" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                      <SchoolTimetable />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Teacher Substitution - School Admin and Data Analyst only */}
                <Route 
                  path="teacher-substitution" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin', 'data_analyst']}>
                      <TeacherSubstitution />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Profile - All roles */}
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
