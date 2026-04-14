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
  Timeline,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  HeartOutlined,
  FileTextOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientService } from '../../services/patient/patient.service';
import { userService } from '../../services/common/user.service';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;

export default function PatientProfile() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  const [commonUser, setCommonUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [mode, setMode] = useState('view'); // 'view' | 'create'
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const loadSeq = useRef(0);

  const loadProfile = useCallback(() => {
    if (!user) {
      setLoading(false);
      setProfile(null);
      setCommonUser(null);
      setMode('create');
      setLoadError('');
      return;
    }
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError('');

    // Fetch both common user and patient profile in parallel
    Promise.allSettled([
      userService.getById(user.id),
      patientService.getById(user.id),
    ]).then(([userResult, patientResult]) => {
      if (seq !== loadSeq.current) return;

      // Handle common user result
      if (userResult.status === 'fulfilled') {
        setCommonUser(userResult.value);
      } else {
        // Non-fatal — fall back to the stored auth user
        setCommonUser(null);
      }

      // Handle patient profile result
      if (patientResult.status === 'fulfilled') {
        setProfile(patientResult.value);
        setMode('view');
        setEditingProfile(false);
      } else {
        const err = patientResult.reason;
        // 404 means no patient profile created yet — show create form
        if (err?.message?.toLowerCase().includes('not found') || err?.response?.status === 404) {
          setProfile(null);
          setMode('create');
        } else {
          setLoadError(err?.message || 'Could not load your patient profile.');
          setProfile(null);
          setMode('view');
        }
      }

      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile || !editingProfile) return;
    editForm.setFieldsValue({
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth
        ? dayjs(profile.dateOfBirth).format('YYYY-MM-DD')
        : '',
      bloodType: profile.bloodType ?? '',
      allergies: profile.allergies?.join(', ') ?? '',
    });
  }, [profile, editingProfile, editForm]);

  useEffect(() => {
    if (!commonUser || !editingContact) return;
    contactForm.setFieldsValue({
      firstName: commonUser.firstName ?? '',
      lastName: commonUser.lastName ?? '',
      phoneNumber: commonUser.phoneNumber ?? '',
    });
  }, [commonUser, editingContact, contactForm]);

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const newProfile = await patientService.create({
        userId: user.id,
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        bloodType: values.bloodType || undefined,
        allergies: values.allergies
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfile(newProfile);
      setMode('view');
      notify.success('Profile created', 'Your patient profile is set up.');
    } catch (e) {
      notify.error('Create failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (values) => {
    setSaving(true);
    try {
      const updated = await patientService.update(user.id, {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        bloodType: values.bloodType || '',
        allergies: values.allergies
          ?.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfile(updated);
      setEditingProfile(false);
      notify.success('Profile updated', 'Your changes have been saved.');
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContact = async (values) => {
    setSavingContact(true);
    try {
      const updated = await userService.update(user.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber || '',
      });
      setCommonUser(updated);
      setEditingContact(false);
      // Sync updated name back into the auth store so the navbar etc. reflects it
      if (updated.fullName && token) {
        setAuth(token, { ...user, fullName: updated.fullName, firstName: updated.firstName, lastName: updated.lastName });
      }
      notify.success('Contact updated', 'Your contact details have been saved.');
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSavingContact(false);
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

  const displayName = commonUser?.fullName || user?.fullName || '—';
  const displayEmail = commonUser?.email || user?.email || '—';

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          My Profile
        </Title>
        <Text type="secondary">View and edit your personal health information</Text>
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

      {/* ── Contact / Account card (always shown) ── */}
      <Card className="rounded-2xl shadow-sm border-0 mb-6">
        {/* Avatar header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-neutral-100">
          <Avatar
            size={80}
            icon={<UserOutlined />}
            className="flex-shrink-0 bg-green-100 text-green-600"
          />
          <div>
            <Text strong className="text-lg block">{displayName}</Text>
            <Text type="secondary" className="text-sm block">
              <MailOutlined className="mr-1" />{displayEmail}
            </Text>
            <Tag color="green" className="mt-1">Patient</Tag>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Text strong className="text-base">Contact details</Text>
          {!editingContact ? (
            <Button icon={<EditOutlined />} onClick={() => setEditingContact(true)}>
              Edit contact
            </Button>
          ) : null}
        </div>

        {!editingContact ? (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="First Name">{commonUser?.firstName || user?.firstName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Last Name">{commonUser?.lastName || user?.lastName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{displayEmail}</Descriptions.Item>
            <Descriptions.Item label="Phone">
              <PhoneOutlined className="mr-1" />
              {commonUser?.phoneNumber || '—'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={contactForm} layout="vertical" onFinish={handleUpdateContact} size="large">
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
              <Button type="primary" htmlType="submit" loading={savingContact}>
                Save contact
              </Button>
              <Button
                disabled={savingContact}
                onClick={() => {
                  setEditingContact(false);
                  contactForm.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form>
        )}
      </Card>

      {/* ── Health info card (view/edit) or create form ── */}
      {mode === 'view' && profile ? (
        <>
          <Card className="rounded-2xl shadow-sm border-0 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <Text strong className="text-base">Health details</Text>
              {!editingProfile ? (
                <Button icon={<EditOutlined />} onClick={() => setEditingProfile(true)}>
                  Edit health info
                </Button>
              ) : null}
            </div>

            {!editingProfile ? (
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="Full Name">{profile.fullName}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {profile.dateOfBirth
                    ? dayjs(profile.dateOfBirth).format('DD MMM YYYY')
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Blood Type">
                  <Tag color="red">{profile.bloodType || 'N/A'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Allergies">
                  {profile.allergies?.length
                    ? profile.allergies.map((a) => (
                        <Tag key={a} color="orange" className="mb-1">
                          {a}
                        </Tag>
                      ))
                    : 'None'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Form form={editForm} layout="vertical" onFinish={handleUpdateProfile} size="large">
                <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
                  <Input placeholder="Your full name" />
                </Form.Item>
                <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item name="bloodType" label="Blood Type">
                  <Input placeholder="e.g., A+, O-, B+" />
                </Form.Item>
                <Form.Item name="allergies" label="Allergies (comma separated)">
                  <Input placeholder="Penicillin, Peanuts" />
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

          {/* Medical History */}
          <Card
            className="rounded-2xl shadow-sm border-0"
            title={
              <span className="flex items-center gap-2">
                <FileTextOutlined /> Medical History
              </span>
            }
          >
            {profile?.medicalHistory?.length ? (
              <Timeline
                items={profile.medicalHistory.map((rec) => ({
                  color: 'blue',
                  children: (
                    <div>
                      <div className="font-semibold">{rec.diagnosis}</div>
                      {rec.treatment && (
                        <div className="text-sm text-gray-500">Treatment: {rec.treatment}</div>
                      )}
                      {rec.notes && (
                        <div className="text-sm text-gray-400 italic">{rec.notes}</div>
                      )}
                      <div className="text-xs text-gray-300 mt-1">
                        {rec.recordedAt
                          ? dayjs(rec.recordedAt).format('DD MMM YYYY')
                          : ''}
                      </div>
                    </div>
                  ),
                }))}
              />
            ) : (
              <div className="text-center py-8 text-gray-400">
                <HeartOutlined className="text-3xl mb-2" />
                <div>No medical history records</div>
              </div>
            )}
          </Card>
        </>
      ) : !loadError ? (
        <Card className="rounded-2xl shadow-sm border-0" title="Create Patient Profile">
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreate}
            size="large"
            key={user?.id}
            initialValues={{ fullName: commonUser?.fullName || user?.fullName }}
          >
            <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
              <Input placeholder="Your full name" />
            </Form.Item>
            <Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="bloodType" label="Blood Type">
              <Input placeholder="e.g., A+, O-, B+" />
            </Form.Item>
            <Form.Item name="allergies" label="Allergies (comma separated)">
              <Input placeholder="Penicillin, Peanuts" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>
              Create Profile
            </Button>
          </Form>
        </Card>
      ) : null}
    </div>
  );
}
