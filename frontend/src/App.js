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
import LoadingSpinner from './components/UI/LoadingSpinner';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
