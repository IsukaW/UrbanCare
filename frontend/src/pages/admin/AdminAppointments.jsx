import React, { useState } from 'react';
import {
  Card, Typography, Input, Button, Space, Alert, Tag, Descriptions, Select, Form, Modal, message,
} from 'antd';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';
import { appointmentService } from '../../services/appointment/appointment.service';
import { APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS } from '../../constants/appointment';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const STATUS_OPTIONS = Object.values(APPOINTMENT_STATUS).map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}));

export default function AdminAppointments() {
  const [searchId, setSearchId] = useState('');
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setError('');
    setAppt(null);
    try {
      const data = await appointmentService.getById(searchId.trim());
      setAppt(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    form.setFieldsValue({
      status: appt.status,
      reason: appt.reason,
    });
    setEditModal(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const updated = await appointmentService.update(appt._id, values);
      setAppt(updated);
      message.success('Appointment updated');
      setEditModal(false);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Appointment Management
        </Title>
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

      {error && <Alert message={error} type="error" className="mb-4" />}

      {appt && (
        <Card
          className="rounded-2xl shadow-sm border-0"
          title="Appointment Details"
          extra={
            <Button icon={<EditOutlined />} onClick={openEdit}>
              Update
            </Button>
          }
        >
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="ID">{appt._id}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={APPOINTMENT_STATUS_COLORS[appt.status]}>{appt.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Patient ID">{appt.patientId}</Descriptions.Item>
            <Descriptions.Item label="Doctor ID">{appt.doctorId}</Descriptions.Item>
            <Descriptions.Item label="Scheduled At">
              {dayjs(appt.scheduledAt).format('DD MMM YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Reason">{appt.reason}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Modal
        title="Update Appointment"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
