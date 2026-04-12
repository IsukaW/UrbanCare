import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Typography, Spin, Tag, Descriptions, Divider, Timeline,
} from 'antd';
import {
  HeartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientService } from '../../services/patient/patient.service';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;

export default function PatientProfile() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('view');
  const [form] = Form.useForm();

  useEffect(() => {
    patientService
      .getById(user.id)
      .then((p) => {
        setProfile(p);
        setMode('view');
      })
      .catch(() => setMode('create'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const newProfile = await patientService.create({
        userId: user.id,
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        bloodType: values.bloodType,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          My Profile
        </Title>
        <Text type="secondary">Personal health information</Text>
      </div>

      {mode === 'create' ? (
        <Card className="rounded-2xl shadow-sm border-0" title="Create Patient Profile">
          <Form form={form} layout="vertical" onFinish={handleCreate} size="large">
            <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}
              initialValue={user?.fullName}>
              <Input />
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
      ) : (
        <>
          <Card className="rounded-2xl shadow-sm border-0 mb-6">
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="Full Name">{profile?.fullName}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {profile?.dateOfBirth
                  ? dayjs(profile.dateOfBirth).format('DD MMM YYYY')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Blood Type">
                <Tag color="red">{profile?.bloodType || 'N/A'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Allergies">
                {profile?.allergies?.length
                  ? profile.allergies.map((a) => (
                      <Tag key={a} color="orange">
                        {a}
                      </Tag>
                    ))
                  : 'None'}
              </Descriptions.Item>
            </Descriptions>
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
      )}
    </div>
  );
}
