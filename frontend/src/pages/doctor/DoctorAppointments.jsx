import React, { useState } from 'react';
import {
  Card, Typography, Button, Descriptions, Tag, Modal, Select, Form, Input, Space,
} from 'antd';
import { notify } from '../../utils/notify';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_COLORS } from '../../constants/appointment';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

const STATUS_OPTIONS = Object.values(APPOINTMENT_STATUS).map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export default function DoctorAppointments() {
  const user = useAuthStore((s) => s.user);
  const [searchId, setSearchId] = useState('');
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setAppt(null);
    try {
      const data = await appointmentService.getById(searchId.trim());
      if (data.doctorId !== user._id) {
        notify.error('Access denied', 'This appointment does not belong to you.');
        return;
      }
      setAppt(data);
    } catch (e) {
      notify.error('Search failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    form.setFieldsValue({ status: appt.status });
    setEditModal(true);
  };

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      const updated = await appointmentService.update(appt._id, values);
      setAppt(updated);
      notify.success('Status updated', 'Appointment status has been changed.');
      setEditModal(false);
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          My Appointments
        </Title>
        <Text type="secondary">Look up appointments assigned to you</Text>
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

      {appt && (
        <Card
          className="rounded-2xl shadow-sm border-0"
          title="Appointment Details"
          extra={
            <Button onClick={openEdit}>Update Status</Button>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Status">
              <Tag color={APPOINTMENT_STATUS_COLORS[appt.status]}>{appt.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Patient ID">{appt.patientId}</Descriptions.Item>
            <Descriptions.Item label="Scheduled At">
              {dayjs(appt.scheduledAt).format('DD MMM YYYY, HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Reason">{appt.reason}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Modal
        title="Update Appointment Status"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate} className="mt-4">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Update
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
