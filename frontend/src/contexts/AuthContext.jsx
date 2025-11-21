import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Validate token and get current user
      api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          // Token is invalid, remove it
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', {
        username,
        password
      });

      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);

      // Set default authorization header for all future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Call logout endpoint (optional, mainly for server-side token invalidation)
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      // Ignore logout errors, proceed with client-side logout
      console.error('Logout error:', err);
    } finally {
      // Clear client-side state
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;

    const roleHierarchy = {
      'Admin': 3,
      'Manager': 2,
      'Viewer': 1
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  const isAdmin = () => hasRole('Admin');
  const isManager = () => hasRole('Manager');

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update user state to clear must_change_password flag
      setUser(prevUser => ({
        ...prevUser,
        must_change_password: false
      }));

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Password change failed';
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    hasRole,
    isAdmin,
    isManager,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
