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
  Upload,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  HeartOutlined,
  FileTextOutlined,
  CameraOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientService } from '../../services/patient/patient.service';
import { userService } from '../../services/common/user.service';
import { medicalReportApi } from '../../services/patient/medicalReport.api';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;

export default function PatientProfile() {
  const user    = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token   = useAuthStore((s) => s.token);

  const [commonUser,     setCommonUser]     = useState(null);
  const [profile,        setProfile]        = useState(null);
  const [photoUrl,       setPhotoUrl]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [savingContact,  setSavingContact]  = useState(false);
  const [mode,           setMode]           = useState('view');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [loadError,      setLoadError]      = useState('');
  const [createForm] = Form.useForm();
  const [editForm]   = Form.useForm();
  const [contactForm]= Form.useForm();
  const loadSeq = useRef(0);

  const loadPhotoUrl = useCallback(async (patientDocId, photoDocId) => {
    if (!patientDocId || !photoDocId) { setPhotoUrl(null); return; }
    try {
      const url = await medicalReportApi.getViewUrl(patientDocId, photoDocId);
      setPhotoUrl(url);
    } catch {
      setPhotoUrl(null);
    }
  }, []);

  useEffect(() => {
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
  }, [photoUrl]);

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

    Promise.allSettled([
      userService.getById(user.id),
      patientService.getById(user.id),
    ]).then(([userResult, patientResult]) => {
      if (seq !== loadSeq.current) return;

      if (userResult.status === 'fulfilled') {
        setCommonUser(userResult.value);
      } else {
        setCommonUser(null);
      }

      if (patientResult.status === 'fulfilled') {
        const p = patientResult.value;
        setProfile(p);
        setMode('view');
        setEditingProfile(false);
        loadPhotoUrl(String(p._id), p.profilePhotoDocumentId);
      } else {
        const err = patientResult.reason;
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
  }, [user, loadPhotoUrl]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!profile || !editingProfile) return;
    editForm.setFieldsValue({
      fullName:    profile.fullName,
      dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth).format('YYYY-MM-DD') : '',
      bloodType:   profile.bloodType ?? '',
      allergies:   profile.allergies?.join(', ') ?? '',
    });
  }, [profile, editingProfile, editForm]);

  useEffect(() => {
    if (!commonUser || !editingContact) return;
    contactForm.setFieldsValue({
      firstName:   commonUser.firstName   ?? '',
      lastName:    commonUser.lastName    ?? '',
      phoneNumber: commonUser.phoneNumber ?? '',
    });
  }, [commonUser, editingContact, contactForm]);

  const handlePhotoBeforeUpload = async (file) => {
    if (!profile) {
      notify.error('Photo upload failed', 'Create your health profile first.');
      return false;
    }
    if (!file.type.startsWith('image/')) {
      notify.error('Invalid file', 'Please choose an image file (JPEG, PNG, or WebP).');
      return false;
    }
    setSaving(true);
    try {
      const { data: doc } = await medicalReportApi.upload(
        String(profile._id),
        file,
        { category: 'other', description: 'Patient profile photo' }
      );
      const docId = doc._id ?? doc.id;
      const updated = await patientService.update(user.id, { profilePhotoDocumentId: String(docId) });
      setProfile(updated);
      const url = await medicalReportApi.getViewUrl(String(updated._id), updated.profilePhotoDocumentId);
      setPhotoUrl(url);
      notify.success('Profile photo updated');
    } catch (e) {
      notify.error('Photo upload failed', e.message);
    } finally {
      setSaving(false);
    }
    return false;
  };

  const handleRemovePhoto = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await patientService.update(user.id, { profilePhotoDocumentId: null });
      setProfile(updated);
      setPhotoUrl(null);
      notify.success('Profile photo removed');
    } catch (e) {
      notify.error('Could not remove photo', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const newProfile = await patientService.create({
        userId:      user.id,
        fullName:    values.fullName,
        dateOfBirth: values.dateOfBirth,
        bloodType:   values.bloodType || undefined,
        allergies:   values.allergies?.split(',').map((s) => s.trim()).filter(Boolean),
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
        fullName:    values.fullName,
        dateOfBirth: values.dateOfBirth,
        bloodType:   values.bloodType || '',
        allergies:   values.allergies?.split(',').map((s) => s.trim()).filter(Boolean),
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
        firstName:   values.firstName,
        lastName:    values.lastName,
        phoneNumber: values.phoneNumber || '',
      });
      setCommonUser(updated);
      setEditingContact(false);
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
    return <div className="flex items-center justify-center h-64"><Spin size="large" /></div>;
  }

  if (!user) {
    return <div className="p-6 max-w-2xl"><Text type="danger">Sign in to manage your profile.</Text></div>;
  }

  const displayName  = commonUser?.fullName || user?.fullName || '—';
  const displayEmail = commonUser?.email    || user?.email    || '—';

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>My Profile</Title>
        <Text type="secondary">View and edit your personal health information</Text>
      </div>

      {loadError ? (
        <Alert
          type="error"
          message="Could not load profile"
          description={loadError}
          showIcon
          className="mb-4"
          action={<Button size="small" onClick={() => loadProfile()}>Retry</Button>}
        />
      ) : null}

      {/* Contact / Account card */}
      <Card className="rounded-2xl shadow-sm border-0 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6 pb-6 border-b border-neutral-100">
          <Avatar
            size={96}
            src={photoUrl}
            icon={!photoUrl ? <UserOutlined /> : undefined}
            className="flex-shrink-0 bg-green-100 text-green-600"
          />
          <div className="flex-1 min-w-0">
            <Text strong className="text-lg block">{displayName}</Text>
            <Text type="secondary" className="text-sm block mb-1">
              <MailOutlined className="mr-1" />{displayEmail}
            </Text>
            <Tag color="green" className="mb-3">Patient</Tag>
            <div>
              <Text type="secondary" className="text-xs block mb-2">
                Profile photo — JPG, PNG, or WebP. Max 5 MB.
              </Text>
              <Space wrap>
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  showUploadList={false}
                  beforeUpload={handlePhotoBeforeUpload}
                  disabled={saving || !profile}
                >
                  <Button icon={<CameraOutlined />} loading={saving} disabled={!profile}>
                    {photoUrl ? 'Change photo' : 'Upload photo'}
                  </Button>
                </Upload>
                {photoUrl ? (
                  <Button danger type="text" disabled={saving} onClick={handleRemovePhoto}>
                    Remove photo
                  </Button>
                ) : null}
              </Space>
              {!profile && (
                <Text type="secondary" className="text-xs block mt-1">
                  Create your health profile below to enable photo upload.
                </Text>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Text strong className="text-base">Contact details</Text>
          {!editingContact ? (
            <Button icon={<EditOutlined />} onClick={() => setEditingContact(true)}>Edit contact</Button>
          ) : null}
        </div>

        {!editingContact ? (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="First Name">{commonUser?.firstName || user?.firstName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Last Name">{commonUser?.lastName  || user?.lastName  || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{displayEmail}</Descriptions.Item>
            <Descriptions.Item label="Phone">
              <PhoneOutlined className="mr-1" />{commonUser?.phoneNumber || '—'}
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
              <Button type="primary" htmlType="submit" loading={savingContact}>Save contact</Button>
              <Button disabled={savingContact} onClick={() => { setEditingContact(false); contactForm.resetFields(); }}>Cancel</Button>
            </Space>
          </Form>
        )}
      </Card>

      {/* Health profile card */}
      {mode === 'view' && profile ? (
        <>
          <Card className="rounded-2xl shadow-sm border-0 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <Text strong className="text-base">Health details</Text>
              {!editingProfile ? (
                <Button icon={<EditOutlined />} onClick={() => setEditingProfile(true)}>Edit health info</Button>
              ) : null}
            </div>

            {!editingProfile ? (
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label="Full Name">{profile.fullName}</Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {profile.dateOfBirth ? dayjs(profile.dateOfBirth).format('DD MMM YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Blood Type">
                  <Tag color="red">{profile.bloodType || 'N/A'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Allergies">
                  {profile.allergies?.length
                    ? profile.allergies.map((a) => <Tag key={a} color="orange" className="mb-1">{a}</Tag>)
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
                  <Button type="primary" htmlType="submit" loading={saving}>Save changes</Button>
                  <Button disabled={saving} onClick={() => { setEditingProfile(false); editForm.resetFields(); }}>Cancel</Button>
                </Space>
              </Form>
            )}
          </Card>

          <Card
            className="rounded-2xl shadow-sm border-0"
            title={<span className="flex items-center gap-2"><FileTextOutlined /> Medical History</span>}
          >
            {profile?.medicalHistory?.length ? (
              <Timeline
                items={profile.medicalHistory.map((rec) => ({
                  color: 'blue',
                  children: (
                    <div>
                      <div className="font-semibold">{rec.diagnosis}</div>
                      {rec.treatment && <div className="text-sm text-gray-500">Treatment: {rec.treatment}</div>}
                      {rec.notes     && <div className="text-sm text-gray-400 italic">{rec.notes}</div>}
                      <div className="text-xs text-gray-300 mt-1">
                        {rec.recordedAt ? dayjs(rec.recordedAt).format('DD MMM YYYY') : ''}
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
