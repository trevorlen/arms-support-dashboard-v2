import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const { changePassword, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationError('');

    // Validation
    if (newPassword.length < 8) {
      setValidationError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New passwords do not match');
      return;
    }

    setLoading(true);

    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      // Redirect to home page after successful password change
      navigate('/');
    } else {
      setError(result.error || 'Failed to change password');
    }

    setLoading(false);
  };

  const canSkip = !user?.must_change_password;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>
          {user?.must_change_password ? 'Change Your Password' : 'Update Password'}
        </h2>

        {user?.must_change_password && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
            border: '1px solid #ffeaa7'
          }}>
            <strong>Password Change Required</strong>
            <p style={{ margin: '0.5rem 0 0 0' }}>
              For security reasons, you must change your password before continuing.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
            <small style={{ color: '#666', fontSize: '0.875rem' }}>
              Minimum 8 characters
            </small>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {validationError && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {validationError}
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: loading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500
              }}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>

            {canSkip && (
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
