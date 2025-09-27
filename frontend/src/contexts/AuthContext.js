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
      // setLoading(true);
      console.log('Attempting login with credentials:', credentials);
      
      const response = await authAPI.login(credentials);
      console.log('Login response:', response);
      
      const access_token = response.data.access_token;
      console.log('Access token received:', access_token);
      
      if (!access_token) {
        throw new Error('No access token received from server');
      }
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Get user data
      console.log('Fetching user data...');
      const userData = await authAPI.getUser();
      console.log('User data received:', userData);
      setUser(userData);
      
      toast.success('تم تسجيل الدخول بنجاح');
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
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
