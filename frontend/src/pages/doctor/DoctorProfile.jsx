import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Typography, Tag, Spin, Descriptions,
} from 'antd';
import { notify } from '../../utils/notify';
import { doctorService } from '../../services/doctor/doctor.service';
import { documentService } from '../../services/common/document.service';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

export default function DoctorProfile() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('view'); // 'view' | 'create'
  const [photoUrl, setPhotoUrl] = useState(null);
  const [form] = Form.useForm();

  const loadPhotoUrl = async (profilePhotoDocumentId) => {
    if (!profilePhotoDocumentId) {
      setPhotoUrl(null);
      return;
    }
    try {
      const url = await documentService.getViewUrl(profilePhotoDocumentId);
      setPhotoUrl(url);
    } catch {
      setPhotoUrl(null);
    }
  };

  useEffect(() => {
    doctorService
      .getById(user._id)
      .then((p) => {
        setProfile(p);
        setMode('view');
        loadPhotoUrl(p.profilePhotoDocumentId);
      })
      .catch(() => setMode('create'))
      .finally(() => setLoading(false));
  }, [user._id]);

  // Revoke blob URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const newProfile = await doctorService.create({
        userId: user._id,
        ...values,
        qualifications: values.qualifications
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        yearsOfExperience: Number(values.yearsOfExperience) || 0,
      });
      setProfile(newProfile);
      setMode('view');
      notify.success('Profile created', 'Your doctor profile is live.');
    } catch (e) {
      notify.error('Create failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoBeforeUpload = async (file) => {
    setSaving(true);
    try {
      const updated = await doctorService.uploadPhoto(doctorId, file);
      setProfile(updated);
      await loadPhotoUrl(updated.profilePhotoDocumentId);
      notify.success('Profile photo updated');
    } catch (e) {
      notify.error('Photo upload failed', e.message);
    } finally {
      setSaving(false);
    }
    return false;
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    try {
      const updated = await doctorService.update(doctorId, { profilePhotoDocumentId: null });
      setProfile(updated);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
      notify.success('Profile photo removed');
    } catch (e) {
      notify.error('Could not remove photo', e.message);
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

  if (!doctorId) {
    return (
      <div className="p-6 max-w-2xl">
        <Text type="danger">Unable to load your doctor profile (missing account id).</Text>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          My Doctor Profile
        </Title>
        <Text type="secondary">Manage your professional information</Text>
      </div>

      {mode === 'view' && profile ? (
        <Card className="rounded-2xl shadow-sm border-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
            <Avatar
              size={112}
              src={photoUrl}
              icon={!photoUrl ? <UserOutlined /> : undefined}
              className="flex-shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
            />
            <div className="flex-1 min-w-0">
              <Text strong className="block mb-1">
                Profile photo
              </Text>
              <Text type="secondary" className="text-sm block mb-3">
                JPG, PNG, or WebP. Maximum 5 MB.
              </Text>
              <Space wrap>
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  showUploadList={false}
                  beforeUpload={handlePhotoBeforeUpload}
                  disabled={saving}
                >
                  <Button icon={<CameraOutlined />} loading={saving}>
                    {photoUrl ? 'Change photo' : 'Upload photo'}
                  </Button>
                </Upload>
                {photoUrl ? (
                  <Button danger type="text" disabled={saving} onClick={handleRemovePhoto}>
                    Remove photo
                  </Button>
                ) : null}
              </Space>
            </div>
          </div>

          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Full Name">{profile.fullName}</Descriptions.Item>
            <Descriptions.Item label="Specialization">{profile.specialization}</Descriptions.Item>
            <Descriptions.Item label="Years of Experience">
              {profile.yearsOfExperience}
            </Descriptions.Item>
            <Descriptions.Item label="Qualifications">
              {profile.qualifications?.map((q) => (
                <Tag key={q} color="blue" className="mb-1">
                  {q}
                </Tag>
              ))}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : (
        <Card
          className="rounded-2xl shadow-sm border-0"
          title="Create Your Doctor Profile"
        >
          <Form form={form} layout="vertical" onFinish={handleCreate} size="large">
            <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
              <Input defaultValue={user?.fullName} />
            </Form.Item>
            <Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}>
              <Input placeholder="e.g., Cardiology" />
            </Form.Item>
            <Form.Item name="qualifications" label="Qualifications (comma separated)">
              <Input placeholder="MBBS, MD, FRCS" />
            </Form.Item>
            <Form.Item name="yearsOfExperience" label="Years of Experience">
              <Input type="number" min={0} defaultValue={0} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Create Profile
            </Button>
          </Form>
        </Card>
      )}
    </div>
  );
}
