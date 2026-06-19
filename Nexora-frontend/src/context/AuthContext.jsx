import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('netflix_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('netflix_token'));
  const [loading, setLoading] = useState(true);

  // Sync token and user in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('netflix_token', token);
    } else {
      localStorage.removeItem('netflix_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('netflix_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('netflix_user');
    }
  }, [user]);

  // Load user profile on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          if (res.data && res.data.success) {
            setUser(res.data.data);
          } else if (res.data) {
            setUser(res.data);
          }
        } catch (err) {
          console.error('Error fetching user profile on startup', err);
          // If 401/expired, clear auth state
          if (err.response && err.response.status === 401) {
            logoutState();
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const logoutState = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('netflix_token');
    localStorage.removeItem('netflix_user');
  };

  const signup = async (username, dateOfBirth, gender, email, password) => {
    try {
      const res = await API.post('/auth/signup', {
        username,
        dateOfBirth,
        gender,
        email,
        password,
      });
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Signup failed';
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      const res = await API.post('/auth/verify-email', { email, otp });
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'OTP verification failed';
    }
  };

  const resendVerificationOtp = async (email) => {
    try {
      const res = await API.post('/auth/resend-verification-otp', { email });
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Resending OTP failed';
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await API.post('/auth/forgot-password', { email });
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Forgot password request failed';
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const res = await API.post('/auth/reset-password', { email, otp, newPassword });
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Password reset failed';
    }
  };

  const login = async (email, password) => {
    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.data) {
        setToken(res.data.data.token);
        setUser(res.data.data.user);
        return res.data;
      } else {
        throw new Error(res.data?.message || 'Login failed');
      }
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Login failed';
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await API.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout request failed', err);
    } finally {
      logoutState();
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await API.get('/auth/me');
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data);
        return res.data.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch profile', error);
      throw error;
    }
  };

  const subscribe = async (planId, planName) => {
    try {
      const res = await API.post('/subscriptions/subscribe', { planId });
      // Refresh profile to get updated subscription state
      await fetchProfile();
      // Merge planName into user subscription since /auth/me may not return it
      setUser(prev => {
        if (prev?.subscription) {
          return {
            ...prev,
            subscription: {
              ...prev.subscription,
              planId,
              planName: prev.subscription.planName || planName,
              status: prev.subscription.status || 'active',
            }
          };
        }
        // If fetchProfile didn't set subscription, create it
        return {
          ...prev,
          subscription: {
            planId,
            planName,
            status: 'active',
          }
        };
      });
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Subscription change failed';
    }
  };

  const cancelSubscription = async () => {
    try {
      const res = await API.post('/subscriptions/cancel');
      // Refresh profile to get updated subscription state
      await fetchProfile();
      // Ensure subscription is cleared properly
      setUser(prev => ({
        ...prev,
        subscription: prev?.subscription ? { ...prev.subscription, status: 'cancelled', planName: null } : null,
      }));
      return res.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Subscription cancellation failed';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        signup,
        verifyEmail,
        resendVerificationOtp,
        login,
        logout,
        fetchProfile,
        subscribe,
        cancelSubscription,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
