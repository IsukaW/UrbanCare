import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Typography, Spin, Alert, Button, Space, Statistic, Row, Col } from 'antd';
import {
  MedicineBoxOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { getSlotsForWeek, mondayOfWeekContaining } from '../../utils/doctorScheduleWeek';
import { fetchDoctorProfileForSession } from '../../utils/doctorSession';

const { Title, Text } = Typography;

export default function DoctorDashboard() {
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(() => {
    if (!user) return Promise.resolve();
    return fetchDoctorProfileForSession(user)
      .then((p) => {
        setProfile(p ?? null);
        // Persist doctor profile _id into the auth session so subsequent calls use it directly
        if (p?._id) {
          const { token, user: sessionUser } = useAuthStore.getState();
          if (token && sessionUser?.role === 'doctor' && sessionUser._id !== String(p._id)) {
            useAuthStore.getState().setAuth(token, { ...sessionUser, _id: String(p._id) });
          }
        }
      })
      .catch((e) => {
        if (!e.message.includes('404') && !e.message.includes('not found')) {
          setError(e.message);
        }
        setProfile(null);
      });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, [user, loadProfile]);

  const stats = useMemo(() => {
    if (!profile) return null;
    const slotCount = getSlotsForWeek(profile, mondayOfWeekContaining(new Date())).length;
    const hoursPerWeek = slotCount * 2;
    const qualCount = profile.qualifications?.length ?? 0;
    return { slotCount, hoursPerWeek, qualCount };
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Welcome, Dr. {user?.firstName}
          </Title>
          <Text type="secondary">Overview of your practice at a glance</Text>
        </div>
        {/* <Space wrap>
          <Link to="/doctor/profile">
            <Button>Profile</Button>
          </Link>
          <Link to="/doctor/schedule">
            <Button type="primary" icon={<CalendarOutlined />}>
              My schedule
            </Button>
          </Link>
          <Link to="/doctor/appointments">
            <Button>Appointments</Button>
          </Link>
        </Space> */}
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          closable
          onClose={() => setError('')}
          className="mb-4"
        />
      )}

      {!profile ? (
        <Card className="rounded-2xl shadow-sm border-0 text-center py-12">
          <MedicineBoxOutlined className="text-4xl text-blue-400 mb-3" />
          <Title level={4}>No doctor profile</Title>
          <Text type="secondary" className="block mb-4">
            Complete your profile to see statistics and manage your schedule.
          </Text>
          <Link to="/doctor/profile">
            <Button type="primary" size="large">
              Go to profile
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card size="small" className="rounded-xl border-slate-100 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Text strong className="text-lg">
                {profile.fullName}
              </Text>
              <Text type="secondary">{profile.specialization}</Text>
            </div>
          </Card>

          <Title level={5} className="!mb-3 !mt-0 text-slate-600">
            Statistics
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="rounded-2xl shadow-sm border-0 h-full">
                <Statistic
                  title="Weekly slots"
                  value={stats.slotCount}
                  prefix={<CalendarOutlined className="text-blue-500" />}
                  suffix={<span className="text-sm font-normal text-slate-400">this week</span>}
                />
                <Text type="secondary" className="text-xs block mt-2">
                  2-hour blocks set for the current calendar week
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="rounded-2xl shadow-sm border-0 h-full">
                <Statistic
                  title="Hours / week"
                  value={stats.hoursPerWeek}
                  prefix={<ClockCircleOutlined className="text-emerald-600" />}
                  suffix="h"
                />
                <Text type="secondary" className="text-xs block mt-2">
                  Estimated from marked slots (×2h each)
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="rounded-2xl shadow-sm border-0 h-full">
                <Statistic
                  title="Experience"
                  value={profile.yearsOfExperience ?? 0}
                  prefix={<TrophyOutlined className="text-amber-500" />}
                  suffix="yrs"
                />
                <Text type="secondary" className="text-xs block mt-2">
                  Years of practice
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="rounded-2xl shadow-sm border-0 h-full">
                <Statistic
                  title="Qualifications"
                  value={stats.qualCount}
                  prefix={<BookOutlined className="text-violet-500" />}
                />
                <Text type="secondary" className="text-xs block mt-2">
                  Listed credentials
                </Text>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
