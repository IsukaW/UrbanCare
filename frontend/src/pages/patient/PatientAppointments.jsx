import React, { useState } from 'react';
import {
  Card, Typography, Input, Button, Space, Alert, Tag, Descriptions, Popconfirm, message,
} from 'antd';
import { SearchOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_COLORS } from '../../constants/appointment';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

export default function PatientAppointments() {
  const user = useAuthStore((s) => s.user);
  const [searchId, setSearchId] = useState('');
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setError('');
    setAppt(null);
    try {
      const data = await appointmentService.getById(searchId.trim());
      if (data.patientId !== user._id) {
        setError('This appointment does not belong to you.');
        return;
      }
      setAppt(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await appointmentService.cancel(appt._id);
      setAppt((prev) => ({ ...prev, status: APPOINTMENT_STATUS.CANCELLED }));
      message.success('Appointment cancelled');
    } catch (e) {
      message.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            My Appointments
          </Title>
          <Text type="secondary">Find and manage your appointments</Text>
        </div>
        <Link to="/patient/appointments/book">
          <Button type="primary">Book New</Button>
        </Link>
      </div>

      <Card className="rounded-2xl shadow-sm border-0 mb-6">
        <Space.Compact block style={{ maxWidth: 480 }}>
          <Input
            placeholder="Enter Appointment ID"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onPressEnter={handleSearch}
            size="large"
            prefix={<SearchOutlined />}
          />
          <Button type="primary" size="large" loading={loading} onClick={handleSearch}>
            Search
          </Button>
        </Space.Compact>
      </Card>

      {error && <Alert message={error} type="error" showIcon className="mb-4" />}

      {appt && (
        <Card
          className="rounded-2xl shadow-sm border-0"
          title="Appointment Details"
          extra={
            appt.status === APPOINTMENT_STATUS.SCHEDULED && (
              <Popconfirm
                title="Cancel this appointment?"
                description="This action cannot be undone."
                onConfirm={handleCancel}
                okText="Yes, cancel"
                okType="danger"
              >
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={cancelling}
                >
                  Cancel
                </Button>
              </Popconfirm>
            )
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Status">
              <Tag color={APPOINTMENT_STATUS_COLORS[appt.status]}>{appt.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Doctor ID">{appt.doctorId}</Descriptions.Item>
            <Descriptions.Item label="Scheduled At">
              {dayjs(appt.scheduledAt).format('DD MMM YYYY, HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Reason">{appt.reason}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
