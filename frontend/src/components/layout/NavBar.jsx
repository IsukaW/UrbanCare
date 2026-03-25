import React from 'react';
import { Layout, Avatar, Typography, Dropdown, Button, Space, Tag } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';
import { notify } from '../../utils/notify';

const { Header } = Layout;
const { Text } = Typography;

const AVATAR_COLORS = {
  admin: '#ef4444',
  doctor: '#1677ff',
  patient: '#52c41a',
};

export default function NavBar({ collapsed, onToggle }) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const handleLogout = () => {
    notify.success('Signed out', 'See you next time!');
    clearAuth();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    {
      key: 'profile',
      label: (
        <div className="py-1">
          <div className="font-semibold">{user?.fullName || `${user?.firstName} ${user?.lastName}`}</div>
          <div className="text-xs text-gray-400">{user?.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 56,
        lineHeight: 'normal',
      }}
    >
      {/* Left: collapse toggle */}
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        className="text-gray-500"
      />

      {/* Right: role badge + avatar */}
      <Space size={12}>
        <Tag color={ROLE_COLORS[user?.role]}>{ROLE_LABELS[user?.role]}</Tag>

        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Avatar
            size={34}
            style={{
              background: AVATAR_COLORS[user?.role] ?? '#1677ff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {user?.firstName?.[0]?.toUpperCase()}
          </Avatar>
        </Dropdown>
      </Space>
    </Header>
  );
}
