import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import AppLayout from '../components/layout/AppLayout';
import { ROLES } from '../constants/roles';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Admin pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminDoctors from '../pages/admin/AdminDoctors';
import AdminAppointments from '../pages/admin/AdminAppointments';

// Doctor pages
import DoctorDashboard from '../pages/doctor/DoctorDashboard';
import DoctorProfile from '../pages/doctor/DoctorProfile';
import DoctorSchedule from '../pages/doctor/DoctorSchedule';
import DoctorAppointments from '../pages/doctor/DoctorAppointments';

// Patient pages
import PatientDashboard from '../pages/patient/PatientDashboard';
import PatientProfile from '../pages/patient/PatientProfile';
import PatientAppointments from '../pages/patient/PatientAppointments';
import BookAppointment from '../pages/patient/BookAppointment';
import MedicalRecords from '../pages/patient/MedicalRecords';
import PatientDoctors from '../pages/patient/PatientDoctors';

// After login, redirect to role-specific home
function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const HOME = {
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.DOCTOR]: '/doctor/dashboard',
    [ROLES.PATIENT]: '/patient/dashboard',
  };
  return <Navigate to={HOME[user.role] ?? '/login'} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected + layout shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Root → role home */}
          <Route index element={<RoleRedirect />} />

          {/* ─── Admin ─── */}
          <Route
            path="/admin/dashboard"
            element={
              <RoleRoute roles={[ROLES.ADMIN]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RoleRoute roles={[ROLES.ADMIN]}>
                <AdminUsers />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/doctors"
            element={
              <RoleRoute roles={[ROLES.ADMIN]}>
                <AdminDoctors />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <RoleRoute roles={[ROLES.ADMIN]}>
                <AdminAppointments />
              </RoleRoute>
            }
          />

          {/* ─── Doctor ─── */}
          <Route
            path="/doctor/dashboard"
            element={
              <RoleRoute roles={[ROLES.DOCTOR]}>
                <DoctorDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/doctor/profile"
            element={
              <RoleRoute roles={[ROLES.DOCTOR]}>
                <DoctorProfile />
              </RoleRoute>
            }
          />
          <Route
            path="/doctor/schedule"
            element={
              <RoleRoute roles={[ROLES.DOCTOR]}>
                <DoctorSchedule />
              </RoleRoute>
            }
          />
          <Route
            path="/doctor/appointments"
            element={
              <RoleRoute roles={[ROLES.DOCTOR]}>
                <DoctorAppointments />
              </RoleRoute>
            }
          />

          {/* ─── Patient ─── */}
          <Route
            path="/patient/dashboard"
            element={
              <RoleRoute roles={[ROLES.PATIENT]}>
                <PatientDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/profile"
            element={
              <RoleRoute roles={[ROLES.PATIENT]}>
                <PatientProfile />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <RoleRoute roles={[ROLES.PATIENT]}>
                <PatientAppointments />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/appointments/book"
            element={
              <RoleRoute roles={[ROLES.PATIENT]}>
                <BookAppointment />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/medical-records"
            element={
              <RoleRoute roles={[ROLES.PATIENT]}>
                <MedicalRecords />
              </RoleRoute>
            }
          />
          <Route
          path="/patient/doctors"
          element={
            <RoleRoute roles={[ROLES.PATIENT]}>
              <PatientDoctors />
            </RoleRoute>
          }
        />

          {/* Fallback */}
          <Route path="*" element={<RoleRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
