import React from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import useAuthStore from '../store/authStore';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/patient/dashboard',
};

// Only lets through users whose role matches.
// Everyone else sees a friendly "Access Denied" page with a link to their dashboard.
export default function RoleRoute({ roles, children }) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Result
          status="403"
          title="Access Denied"
          subTitle={`This page is restricted to: ${allowed.join(', ')}`}
          extra={
            <Button type="primary" href={ROLE_HOME[user.role] ?? '/'}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return children;
}
