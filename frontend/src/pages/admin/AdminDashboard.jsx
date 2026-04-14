import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';
import { appointmentService } from '../../services/appointment/appointment.service';
import { userService } from '../../services/common/user.service';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;

const StatCard = ({ title, value, icon, color, loading }) => (
  <Card className="rounded-2xl shadow-sm border-0" bodyStyle={{ padding: 24 }}>
    <div className="flex items-center justify-between">
      <div>
        <Text type="secondary" className="text-sm font-medium uppercase tracking-wide">
          {title}
        </Text>
        {loading ? (
          <Spin size="small" className="block mt-2" />
        ) : (
          <div className="text-3xl font-bold mt-1" style={{ color }}>
            {value}
          </div>
        )}
      </div>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${color}1a`, color }}
      >
        {icon}
      </div>
    </div>
  </Card>
);

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [appointmentCount, setAppointmentCount] = useState(null);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoadingDoctors(false));

    appointmentService
      .list({ limit: 1 })
      .then(({ pagination, appointments }) => {
        setAppointmentCount(pagination?.total ?? appointments?.length ?? 0);
      })
      .catch((e) => notify.error('Failed to load appointments', e.message))
      .finally(() => setLoadingAppointments(false));

    userService
      .listAll()
      .then(setUsers)
      .catch((e) => notify.error('Failed to load users', e.message))
      .finally(() => setLoadingUsers(false));
  }, []);

  const doctorColumns = [
    { title: 'Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Specialization', dataIndex: 'specialization', key: 'specialization' },
    {
      title: 'Experience',
      dataIndex: 'yearsOfExperience',
      key: 'yearsOfExperience',
      render: (v) => `${v} yrs`,
    },
    {
      title: 'Schedule',
      key: 'schedule',
      render: (_, r) => {
        const weeks = r.weeklyAvailability;
        if (weeks?.length) {
          const slots = weeks.reduce((a, w) => a + (w.slots?.length ?? 0), 0);
          return `${weeks.length} wk / ${slots} slots`;
        }
        return r.schedule?.length ?? 0;
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Admin Dashboard
        </Title>
        <Text type="secondary">Overview of UrbanCare operations</Text>
      </div>

      {/* Stats row */}
      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Total Doctors"
            value={loadingDoctors ? '–' : doctors.length}
            icon={<MedicineBoxOutlined />}
            color="#1677ff"
            loading={loadingDoctors}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Patients"
            value={loadingUsers ? '–' : users.filter((u) => u.role === ROLES.PATIENT).length}
            icon={<HeartOutlined />}
            color="#52c41a"
            loading={loadingUsers}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Appointments"
            value={loadingAppointments ? '–' : appointmentCount ?? '–'}
            icon={<CalendarOutlined />}
            color="#faad14"
            loading={loadingAppointments}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Users"
            value={loadingUsers ? '–' : users.length}
            icon={<UserOutlined />}
            color="#722ed1"
            loading={loadingUsers}
          />
        </Col>
      </Row>

      {/* Doctors table */}
      <Card
        title={<span className="font-semibold">Registered Doctors</span>}
        className="rounded-2xl shadow-sm border-0"
      >
        <Table
          columns={doctorColumns}
          dataSource={doctors}
          loading={loadingDoctors}
          rowKey="_id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="middle"
          scroll={{ x: 500 }}
        />
      </Card>
    </div>
  );
}
