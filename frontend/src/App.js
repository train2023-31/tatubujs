import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout/Layout';
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
import DeleteSchoolData from './pages/DeleteSchoolData/DeleteSchoolData';
import ViewLogs from './pages/ViewLogs/ViewLogs';
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
    return <Navigate to="/dashboard" replace />;
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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
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
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* User Management - Admin and School Admin only */}
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'school_admin']}>
                      <Users />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Class Management - School Admin only */}
                <Route 
                  path="classes" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <Classes />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Attendance - Teachers and School Admin */}
                <Route 
                  path="attendance" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'school_admin']}>
                      <Attendance />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Attendance Details - Teachers and School Admin */}
                <Route 
                  path="attendance-details" 
                  element={
                    <ProtectedRoute allowedRoles={['teacher', 'school_admin']}>
                      <AttendanceDetails />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Reports - All roles */}
                <Route path="reports" element={
                  <ProtectedRoute allowedRoles={['school_admin']}>
                    <Reports />
                  </ProtectedRoute>
                } />
                
                {/* Daily Report - Teachers and School Admin */}
                <Route 
                  path="daily-report" 
                  element={
                    <ProtectedRoute allowedRoles={['school_admin']}>
                      <DailyReport />
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
                
                {/* News Management - Admin and School Admin */}
                <Route 
                  path="news" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'school_admin']}>
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
                
                {/* View Logs - Admin and School Admin only */}
                <Route 
                  path="view-logs" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'school_admin']}>
                      <ViewLogs />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Profile - All roles */}
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
