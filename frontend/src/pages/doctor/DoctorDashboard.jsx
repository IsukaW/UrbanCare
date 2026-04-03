import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Tag, Spin, Alert, Button } from 'antd';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { doctorService } from '../../services/doctor/doctor.service';
import useAuthStore from '../../store/authStore';
import { DAYS_OF_WEEK } from '../../constants/appointment';

const { Title, Text } = Typography;

export default function DoctorDashboard() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?._id) return;
    doctorService
      .getById(user._id)
      .then(setProfile)
      .catch((e) => {
        // Profile not created yet is expected
        if (!e.message.includes('404') && !e.message.includes('not found')) {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

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
          Welcome, Dr. {user?.firstName}
        </Title>
        <Text type="secondary">Manage your profile, schedule, and appointments</Text>
      </div>

      {error && <Alert message={error} type="error" className="mb-4" />}

      {!profile ? (
        <Card className="rounded-2xl shadow-sm border-0 text-center py-10">
          <MedicineBoxOutlined className="text-4xl text-blue-400 mb-4" />
          <Title level={4}>No Doctor Profile Found</Title>
          <Text type="secondary" className="block mb-4">
            Set up your doctor profile to get started
          </Text>
          <Link to="/doctor/profile">
            <Button type="primary" size="large">
              Create Profile
            </Button>
          </Link>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {/* Profile summary */}
          <Col xs={24} lg={8}>
            <Card className="rounded-2xl shadow-sm border-0 h-full">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full text-blue-600 text-2xl mb-3">
                  <UserOutlined />
                </div>
                <Title level={4} style={{ margin: 0 }}>
                  {profile.fullName}
                </Title>
                <Tag color="blue" className="mt-2">
                  {profile.specialization}
                </Tag>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <Text type="secondary">Experience</Text>
                  <Text strong>{profile.yearsOfExperience} yrs</Text>
                </div>
                <div className="flex justify-between py-1">
                  <Text type="secondary">Qualifications</Text>
                  <div className="flex gap-1 flex-wrap justify-end max-w-32">
                    {profile.qualifications?.map((q) => (
                      <Tag key={q} size="small">
                        {q}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
              <Link to="/doctor/profile">
                <Button block className="mt-4">
                  Edit Profile
                </Button>
              </Link>
            </Card>
          </Col>

          {/* Schedule */}
          <Col xs={24} lg={16}>
            <Card
              className="rounded-2xl shadow-sm border-0"
              title={
                <span className="flex items-center gap-2">
                  <ClockCircleOutlined /> Weekly Schedule
                </span>
              }
              extra={
                <Link to="/doctor/schedule">
                  <Button size="small">Manage</Button>
                </Link>
              }
            >
              {profile.schedule?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.schedule.map((slot) => {
                    const day = DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek);
                    return (
                      <div
                        key={slot.dayOfWeek}
                        className="bg-blue-50 rounded-xl px-4 py-3 min-w-32"
                      >
                        <div className="text-blue-700 font-semibold text-sm">{day?.label}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {slot.startTime} – {slot.endTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CalendarOutlined className="text-3xl mb-2" />
                  <div>No schedule set</div>
                  <Link to="/doctor/schedule">
                    <Button type="link" className="mt-2">
                      Add Schedule
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Quick actions */}
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} sm={12}>
                <Link to="/doctor/appointments">
                  <Card
                    className="rounded-2xl shadow-sm border-0 hover:shadow-md transition-all cursor-pointer"
                    bodyStyle={{ padding: 20 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <CalendarOutlined className="text-orange-500" />
                      </div>
                      <div>
                        <div className="font-semibold">My Appointments</div>
                        <div className="text-xs text-gray-400">View & manage</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </Col>
            </Row>
          </Col>
        </Row>
      )}
    </div>
  );
}
