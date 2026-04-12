import React from 'react';
import { Layout, Menu, Avatar, Typography, Divider } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  PlusCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { ROLES } from '../../constants/roles';
import useAuthStore from '../../store/authStore';

const { Sider } = Layout;
const { Text } = Typography;

const NAV_ITEMS = {
  [ROLES.ADMIN]: [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/admin/doctors',
      icon: <MedicineBoxOutlined />,
      label: 'Doctors',
    },
    {
      key: '/admin/appointments',
      icon: <CalendarOutlined />,
      label: 'Appointments',
    },
  ],
  [ROLES.DOCTOR]: [
    {
      key: '/doctor/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/doctor/profile',
      icon: <MedicineBoxOutlined />,
      label: 'My Profile',
    },
    {
      key: '/doctor/schedule',
      icon: <ClockCircleOutlined />,
      label: 'My Schedule',
    },
    {
      key: '/doctor/appointments',
      icon: <CalendarOutlined />,
      label: 'Appointments',
    },
  ],
  [ROLES.PATIENT]: [
    {
      key: '/patient/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/patient/profile',
      icon: <HeartOutlined />,
      label: 'My Profile',
    },
    {
      key: '/patient/appointments/book',
      icon: <PlusCircleOutlined />,
      label: 'Book Appointment',
    },
    {
      key: '/patient/appointments',
      icon: <CalendarOutlined />,
      label: 'My Appointments',
    },
    {
      key: '/patient/medical-records',
      icon: <FileTextOutlined />,
      label: 'Medical Records',
    },
    {
      key: '/patient/doctors',
      icon: <MedicineBoxOutlined />,
      label: 'Our Doctors',
    },
  ],
};

// Sidebar accent color per role
const ROLE_COLORS = {
  [ROLES.ADMIN]: '#ef4444',
  [ROLES.DOCTOR]: '#1677ff',
  [ROLES.PATIENT]: '#52c41a',
};

export default function Sidebar({ collapsed, onCollapse }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  const items = NAV_ITEMS[user?.role] ?? [];
  const roleColor = ROLE_COLORS[user?.role] ?? '#1677ff';

  const selectedKey = items
    .map((i) => i.key)
    .filter((k) => location.pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      collapsedWidth={72}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'auto',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: '1px solid #f0f0f0' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: '#1677ff' }}
        >
          U
        </div>
        {!collapsed && (
          <span className="font-bold text-gray-800 text-base">UrbanCare</span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3">
          <div
            className="rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ background: `${roleColor}15`, color: roleColor }}
          >
            {user?.role}
          </div>
        </div>
      )}

      {/* Nav */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ border: 'none', marginTop: 4 }}
      />
    </Sider>
  );
}
