import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Tag,
  Spin,
  Descriptions,
  Avatar,
  Space,
  Alert,
} from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import { userService } from '../../services/common/user.service';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;

export default function AdminProfile() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editForm] = Form.useForm();
  const loadSeq = useRef(0);

  const loadProfile = useCallback(() => {
    if (!user) {
      setLoading(false);
      setLoadError('');
      return;
    }
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError('');
    userService
      .getById(user.id)
      .then((p) => {
        if (seq !== loadSeq.current) return;
        setProfile(p);
        setEditingProfile(false);
      })
      .catch((e) => {
        if (seq !== loadSeq.current) return;
        setLoadError(e?.message || 'Could not load your profile.');
      })
      .finally(() => {
        if (seq !== loadSeq.current) return;
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile || !editingProfile) return;
    editForm.setFieldsValue({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phoneNumber: profile.phoneNumber ?? '',
    });
  }, [profile, editingProfile, editForm]);

  const handleUpdateProfile = async (values) => {
    setSaving(true);
    try {
      const updated = await userService.update(user.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber || '',
      });
      setProfile(updated);
      setEditingProfile(false);
      // Sync updated fullName into auth store
      if (updated.fullName && token) {
        setAuth(token, { ...user, fullName: updated.fullName });
      }
      notify.success('Profile updated', 'Your changes have been saved.');
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-2xl">
        <Text type="danger">Sign in to manage your profile.</Text>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          My Profile
        </Title>
        <Text type="secondary">View and edit your account details</Text>
      </div>

      {loadError ? (
        <Alert
          type="error"
          message="Could not load profile"
          description={loadError}
          showIcon
          className="mb-4"
          action={
            <Button size="small" onClick={() => loadProfile()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {profile ? (
        <Card className="rounded-2xl shadow-sm border-0">
          {/* Avatar header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-neutral-100">
            <Avatar
              size={80}
              icon={<UserOutlined />}
              className="flex-shrink-0 bg-red-100 text-red-600"
            />
            <div>
              <Text strong className="text-lg block">{profile.fullName}</Text>
              <Tag color="red" className="mt-1">Admin</Tag>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Text strong className="text-base">Account details</Text>
            {!editingProfile ? (
              <Button icon={<EditOutlined />} onClick={() => setEditingProfile(true)}>
                Edit details
              </Button>
            ) : null}
          </div>

          {!editingProfile ? (
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="First Name">{profile.firstName}</Descriptions.Item>
              <Descriptions.Item label="Last Name">{profile.lastName}</Descriptions.Item>
              <Descriptions.Item label="Email">{profile.email}</Descriptions.Item>
              <Descriptions.Item label="Phone Number">
                {profile.phoneNumber || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Role">
                <Tag color="red">Admin</Tag>
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Form form={editForm} layout="vertical" onFinish={handleUpdateProfile} size="large">
              <Form.Item name="firstName" label="First Name" rules={[{ required: true, min: 2 }]}>
                <Input placeholder="First name" />
              </Form.Item>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true, min: 2 }]}>
                <Input placeholder="Last name" />
              </Form.Item>
              <Form.Item name="phoneNumber" label="Phone Number">
                <Input placeholder="+94 71 234 5678" />
              </Form.Item>
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={saving}>
                  Save changes
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => {
                    setEditingProfile(false);
                    editForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form>
          )}
        </Card>
      ) : !loadError ? (
        <div className="text-center py-8 text-gray-400">No profile data found.</div>
      ) : null}
    </div>
  );
}
