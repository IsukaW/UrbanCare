import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Typography, Tag, Spin, Alert, message, Descriptions,
} from 'antd';
import { doctorService } from '../../services/doctor/doctor.service';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

export default function DoctorProfile() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'create'
  const [form] = Form.useForm();

  useEffect(() => {
    doctorService
      .getById(user._id)
      .then((p) => {
        setProfile(p);
        setMode('view');
      })
      .catch(() => setMode('create'))
      .finally(() => setLoading(false));
  }, [user._id]);

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
      message.success('Profile created!');
    } catch (e) {
      message.error(e.message);
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
          My Doctor Profile
        </Title>
        <Text type="secondary">Manage your professional information</Text>
      </div>

      {error && <Alert message={error} type="error" className="mb-4" />}

      {mode === 'view' && profile ? (
        <Card className="rounded-2xl shadow-sm border-0">
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
