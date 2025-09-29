import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export { AuthContext };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const userData = await authAPI.getUser();
          setUser(userData);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
     
      
      // Send credentials as-is (backend handles case-insensitive login)
      // Add retry logic for 500 errors
      let response;
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          response = await authAPI.login(credentials);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          // Only retry on 500 errors, not on 401/400 errors
          if (error.response?.status === 500 && retries > 1) {
            retries--;
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
            continue;
          }
          throw error; // Re-throw if not a 500 error or no retries left
        }
      }
      
      if (!response) {
        throw lastError;
      }
      
      const access_token = response.data.access_token;
      
      if (!access_token) {
        throw new Error('No access token received from server');
      }
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Get user data with retry logic
      let userData;
      let userRetries = 3;
      while (userRetries > 0) {
        try {
          userData = await authAPI.getUser();
          break;
        } catch (userError) {
          userRetries--;
          if (userRetries === 0) {
            throw userError;
          }
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setUser(userData);
      
      toast.success('تم تسجيل الدخول بنجاح');
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      
      // Clear any stored token on error
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      
      const message = error.response?.data?.message || error.message || 'فشل في تسجيل الدخول';
      // Don't show toast here, let the component handle the error message
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('تم تسجيل الخروج بنجاح');
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
