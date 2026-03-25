import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// If not logged in, send the user to the login page.
// We remember where they were trying to go so we can bring them back after login.
export default function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
