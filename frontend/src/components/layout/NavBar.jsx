import React, { useEffect, useState } from 'react';
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
import { documentService } from '../../services/common/document.service';
import { fetchDoctorProfileForSession } from '../../utils/doctorSession';
import logo from '../../images/UrbanCare_logo.png';

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
  const [doctorPhotoUrl, setDoctorPhotoUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    async function loadDoctorPhoto() {
      if (user?.role !== 'doctor') {
        setDoctorPhotoUrl(null);
        return;
      }

      const profile = await fetchDoctorProfileForSession(user);
      const documentId = profile?.profilePhotoDocumentId ?? user?.profilePhotoDocumentId;

      if (!documentId) {
        if (!cancelled) setDoctorPhotoUrl(null);
        return;
      }

      try {
        const url = await documentService.getViewUrl(documentId);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setDoctorPhotoUrl(url);
      } catch {
        if (!cancelled) setDoctorPhotoUrl(null);
      }
    }

    loadDoctorPhoto();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user]);

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

      {/* Center: logo (mobile only) */}
      <div
        className="md:hidden flex items-center"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          overflow: 'hidden',
          height: 56,
        }}
      >
        <img
          src={logo}
          alt="UrbanCare"
          style={{ width: 90, height: 'auto', margin: '-18px 0' }}
        />
      </div>

      {/* Right: role badge + avatar */}
      <Space size={12}>
        <Tag color={ROLE_COLORS[user?.role]}>{ROLE_LABELS[user?.role]}</Tag>

        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Avatar
            size={34}
            src={user?.role === 'doctor' ? doctorPhotoUrl : undefined}
            style={{
              background: AVATAR_COLORS[user?.role] ?? '#1677ff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {!doctorPhotoUrl ? user?.firstName?.[0]?.toUpperCase() : null}
          </Avatar>
        </Dropdown>
      </Space>
    </Header>
  );
}
