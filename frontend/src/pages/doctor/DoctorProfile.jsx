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
  Upload,
  Space,
  Alert,
} from 'antd';
import { UserOutlined, CameraOutlined, EditOutlined } from '@ant-design/icons';
import { notify } from '../../utils/notify';
import { doctorService } from '../../services/doctor/doctor.service';
import { documentService } from '../../services/common/document.service';
import useAuthStore from '../../store/authStore';
import { fetchDoctorProfileForSession } from '../../utils/doctorSession';

const { Title, Text } = Typography;

function persistDoctorProfileIdOnSession(profile) {
  if (!profile?._id) return;
  const { token, user: sessionUser } = useAuthStore.getState();
  if (!token || sessionUser?.role !== 'doctor' || sessionUser._id === String(profile._id)) return;
  useAuthStore.getState().setAuth(token, { ...sessionUser, _id: String(profile._id) });
}

export default function DoctorProfile() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('view'); // 'view' | 'create'
  const [editingProfile, setEditingProfile] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loadError, setLoadError] = useState('');
  const loadSeq = useRef(0);

  const loadPhotoUrl = useCallback(async (profilePhotoDocumentId) => {
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
  }, []);

  const loadProfile = useCallback(() => {
    if (!user) {
      setLoading(false);
      setProfile(null);
      setMode('create');
      setLoadError('');
      return undefined;
    }
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError('');
    fetchDoctorProfileForSession(user)
      .then((p) => {
        if (seq !== loadSeq.current) return;
        if (p) {
          setProfile(p);
          setMode('view');
          setEditingProfile(false);
          persistDoctorProfileIdOnSession(p);
          loadPhotoUrl(p.profilePhotoDocumentId);
        } else {
          setProfile(null);
          setMode('create');
          setPhotoUrl(null);
        }
      })
      .catch((e) => {
        if (seq !== loadSeq.current) return;
        setLoadError(e?.message || 'Could not load your doctor profile.');
        setProfile(null);
        setMode('view');
      })
      .finally(() => {
        if (seq !== loadSeq.current) return;
        setLoading(false);
      });
    return undefined;
  }, [user, loadPhotoUrl]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    if (!profile || !editingProfile) return;
    editForm.setFieldsValue({
      fullName: profile.fullName.replace(/^Dr\.?\s*/, ''),
      specialization: profile.specialization,
      qualifications: profile.qualifications?.join(', ') ?? '',
      yearsOfExperience: profile.yearsOfExperience ?? 0,
    });
  }, [profile, editingProfile, editForm]);

  const profileDocId = profile?._id ? String(profile._id) : null;

  const handleCreate = async (values) => {
    const commonUserId = user?.id ? String(user.id) : null;
    if (!commonUserId) {
      notify.error('Create failed', 'Missing account id.');
      return;
    }
    setSaving(true);
    try {
      const newProfile = await doctorService.create({
        userId: commonUserId,
        fullName: 'Dr. ' + values.fullName.trim().replace(/^Dr\.?\s*/, ''),
        specialization: values.specialization,
        qualifications: values.qualifications
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        yearsOfExperience: Number(values.yearsOfExperience) || 0,
      });
      setProfile(newProfile);
      setMode('view');
      persistDoctorProfileIdOnSession(newProfile);
      await loadPhotoUrl(newProfile.profilePhotoDocumentId);
      notify.success('Profile created', 'You can edit details and add a photo anytime.');
    } catch (e) {
      notify.error('Create failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (values) => {
    if (!profileDocId) return;
    setSaving(true);
    try {
      const updated = await doctorService.update(profileDocId, {
        fullName: 'Dr. ' + values.fullName.trim().replace(/^Dr\.?\s*/, ''),
        specialization: values.specialization,
        qualifications: values.qualifications
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        yearsOfExperience: Number(values.yearsOfExperience) || 0,
      });
      setProfile(updated);
      persistDoctorProfileIdOnSession(updated);
      setEditingProfile(false);
      notify.success('Profile updated', 'Your changes have been saved.');
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoBeforeUpload = async (file) => {
    if (!profileDocId) {
      notify.error('Photo upload failed', 'Create your profile first.');
      return false;
    }
    setSaving(true);
    try {
      const updated = await doctorService.uploadPhoto(profileDocId, file);
      setProfile(updated);
      persistDoctorProfileIdOnSession(updated);
      await loadPhotoUrl(updated.profilePhotoDocumentId);
      notify.success('Profile photo updated', 'Saved to your doctor profile.');
    } catch (e) {
      notify.error('Photo upload failed', e.message);
    } finally {
      setSaving(false);
    }
    return false;
  };

  const handleRemovePhoto = async () => {
    if (!profileDocId) return;
    setSaving(true);
    try {
      const updated = await doctorService.update(profileDocId, { profilePhotoDocumentId: null });
      setProfile(updated);
      persistDoctorProfileIdOnSession(updated);
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
        <Text type="secondary">View and edit your professional details and profile photo</Text>
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
                Stored on your doctor profile. JPG, PNG, or WebP. Maximum 5 MB.
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

          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <Text strong className="text-base">
              Professional details
            </Text>
            {!editingProfile ? (
              <Button icon={<EditOutlined />} onClick={() => setEditingProfile(true)}>
                Edit details
              </Button>
            ) : null}
          </div>

          {!editingProfile ? (
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="Full name">{profile.fullName}</Descriptions.Item>
              <Descriptions.Item label="Specialization">{profile.specialization}</Descriptions.Item>
              <Descriptions.Item label="Years of experience">{profile.yearsOfExperience ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Qualifications">
                {profile.qualifications?.length ? (
                  profile.qualifications.map((q) => (
                    <Tag key={q} color="blue" className="mb-1">
                      {q}
                    </Tag>
                  ))
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Form form={editForm} layout="vertical" onFinish={handleUpdateProfile} size="large">
              <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}>
                <Input placeholder="Enter your name" />
              </Form.Item>
              <Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}>
                <Input placeholder="e.g., Cardiology" />
              </Form.Item>
              <Form.Item name="qualifications" label="Qualifications (comma separated)">
                <Input placeholder="MBBS, MD, FRCS" />
              </Form.Item>
              <Form.Item name="yearsOfExperience" label="Years of experience">
                <Input type="number" min={0} />
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
        <Card className="rounded-2xl shadow-sm border-0" title="Create your doctor profile">
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            size="large"
            key={user?.id}
            initialValues={{ fullName: user?.fullName, yearsOfExperience: 0 }}
          >
            <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}>
              <Input placeholder="Enter your name" />
            </Form.Item>
            <Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}>
              <Input placeholder="e.g., Cardiology" />
            </Form.Item>
            <Form.Item name="qualifications" label="Qualifications (comma separated)">
              <Input placeholder="MBBS, MD, FRCS" />
            </Form.Item>
            <Form.Item name="yearsOfExperience" label="Years of experience">
              <Input type="number" min={0} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Create profile
            </Button>
          </Form>
        </Card>
      ) : null}
    </div>
  );
}
