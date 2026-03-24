import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Alert } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';

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
  const [error, setError] = useState('');

  useEffect(() => {
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDoctors(false));
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
      title: 'Schedule Days',
      key: 'schedule',
      render: (_, r) => r.schedule?.length ?? 0,
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

      {error && <Alert message={error} type="error" className="mb-4" />}

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
          <StatCard title="Patients" value="–" icon={<HeartOutlined />} color="#52c41a" />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Appointments"
            value="–"
            icon={<CalendarOutlined />}
            color="#faad14"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard title="Users" value="–" icon={<UserOutlined />} color="#722ed1" />
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
        />
      </Card>
    </div>
  );
}
