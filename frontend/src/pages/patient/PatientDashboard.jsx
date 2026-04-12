import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Button, Alert, Spin, Tag } from 'antd';
import {
  CalendarOutlined,
  HeartOutlined,
  UserOutlined,
  PlusCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/patient/patient.service';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

const QuickCard = ({ to, icon, title, desc, color }) => (
  <Link to={to}>
    <Card
      className="rounded-2xl shadow-sm border-0 hover:shadow-md transition-all cursor-pointer h-full"
      bodyStyle={{ padding: 20 }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
          style={{ background: `${color}1a`, color }}
        >
          {icon}
        </div>
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
        </div>
      </div>
    </Card>
  </Link>
);

export default function PatientDashboard() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService
      .getById(user.id)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Welcome, {user?.firstName}
        </Title>
        <Text type="secondary">Your personal health portal</Text>
      </div>

      {!profile && (
        <Alert
          message="Profile not set up"
          description={
            <span>
              Please{' '}
              <Link to="/patient/profile" className="text-blue-600 font-medium">
                create your patient profile
              </Link>{' '}
              to use all features.
            </span>
          }
          type="info"
          showIcon
          className="mb-6 rounded-xl"
        />
      )}

      {profile && (
        <Card className="rounded-2xl shadow-sm border-0 mb-6" bodyStyle={{ padding: 20 }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl text-green-600">
              <UserOutlined />
            </div>
            <div>
              <div className="text-lg font-bold">{profile.fullName}</div>
              <div className="text-sm text-gray-500">
                Blood Type: <Tag color="red">{profile.bloodType || 'N/A'}</Tag>
              </div>
              {profile.allergies?.length > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  Allergies:{' '}
                  {profile.allergies.map((a) => (
                    <Tag key={a} color="orange" size="small">
                      {a}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <QuickCard
            to="/patient/appointments/book"
            icon={<PlusCircleOutlined />}
            title="Book Appointment"
            desc="Schedule a new visit"
            color="#1677ff"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <QuickCard
            to="/patient/appointments"
            icon={<CalendarOutlined />}
            title="My Appointments"
            desc="View your appointments"
            color="#faad14"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <QuickCard
            to="/patient/profile"
            icon={<HeartOutlined />}
            title="Medical History"
            desc="View health records"
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <QuickCard
            to="/patient/medical-records"
            icon={<FileTextOutlined />}
            title="Medical Records"
            desc="Upload & manage documents"
            color="#722ed1"
          />
        </Col>
      </Row>
    </div>
  );
}
