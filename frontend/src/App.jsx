import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ChangePassword from './pages/ChangePassword';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If user is authenticated and must change password, redirect to change password page
  const mustChangePassword = user?.must_change_password;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          mustChangePassword ? (
            <Navigate to="/change-password" replace />
          ) : (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )
        }
      />
      <Route
        path="/users"
        element={
          mustChangePassword ? (
            <Navigate to="/change-password" replace />
          ) : (
            <ProtectedRoute requireRole="Admin">
              <UserManagement />
            </ProtectedRoute>
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
