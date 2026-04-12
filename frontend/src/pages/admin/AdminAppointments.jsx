import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Button, Tag, Select, Spin, Empty, Modal, Form, Input, Pagination,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, UserOutlined,
  VideoCameraOutlined, ReloadOutlined, MedicineBoxOutlined, EditOutlined,
} from '@ant-design/icons';
import { notify } from '../../utils/notify';
import { appointmentService } from '../../services/appointment/appointment.service';
import {
  APPOINTMENT_STATUS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS,
} from '../../constants/appointment';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_OPTIONS = Object.values(APPOINTMENT_STATUS).map((s) => ({
  value: s,
  label: APPOINTMENT_STATUS_LABELS[s],
}));

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [editAppt, setEditAppt]         = useState(null);
  const [saving, setSaving]             = useState(false);
  const [form]                          = Form.useForm();
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const PAGE_SIZE = 10;

  const load = async (status = statusFilter, currentPage = page) => {
    setLoading(true);
    try {
      const { appointments: list, pagination } = await appointmentService.list(
        Object.fromEntries(
          Object.entries({ ...(status ? { status } : {}), page: currentPage, limit: PAGE_SIZE })
            .filter(([, v]) => v)
        )
      );
      setAppointments(list);
      if (pagination) setTotal(pagination.total);
    } catch (e) {
      notify.error('Failed to load appointments', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (appt) => {
    form.setFieldsValue({ status: appt.status, reason: appt.reason });
    setEditAppt(appt);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const updated = await appointmentService.update(editAppt._id, values);
      notify.success('Appointment updated');
      setAppointments((prev) =>
        prev.map((a) => a._id === editAppt._id ? { ...a, ...updated } : a)
      );
      setEditAppt(null);
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    load(val, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    load(statusFilter, newPage);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>Appointment Management</Title>
        <Text type="secondary">View and manage all appointments across the system</Text>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <Select
          allowClear
          placeholder="Filter by status"
          value={statusFilter || undefined}
          onChange={handleFilterChange}
          className="w-full sm:w-56"
          options={STATUS_OPTIONS}
        />
        <Button icon={<ReloadOutlined />} onClick={() => load()}>Refresh</Button>
        <Text type="secondary" className="sm:ml-auto">
          {total} appointment{total !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : appointments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={statusFilter ? `No ${APPOINTMENT_STATUS_LABELS[statusFilter]?.toLowerCase()} appointments` : 'No appointments found'}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {appointments.map((appt) => (
            <Card
              key={appt._id}
              className="rounded-2xl shadow-sm border-0"
              bodyStyle={{ padding: '20px 24px' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left */}
                <div className="flex gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <MedicineBoxOutlined className="text-blue-500 text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-base">{appt.doctorName}</span>
                      <Tag color="blue" className="font-mono text-xs">{appt.tokenNumber}</Tag>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">{appt.doctorSpecialty}</div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <UserOutlined />Patient: <span className="font-mono text-xs">{appt.patientId}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarOutlined />{dayjs(appt.scheduledAt).format('DD MMM YYYY')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockCircleOutlined />{dayjs(appt.scheduledAt).format('h:mm A')}
                      </span>
                      <span className="flex items-center gap-1">
                        {appt.type === 'video' ? <VideoCameraOutlined /> : <UserOutlined />}
                        {appt.type === 'video' ? 'Video Call' : 'In-Person'}
                      </span>
                    </div>
                    {appt.reason && (
                      <div className="mt-2 text-sm text-gray-500 truncate max-w-full lg:max-w-lg">
                        <span className="font-medium text-gray-600">Reason:</span> {appt.reason}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-400 font-mono truncate">{appt._id}</div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 sm:shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                  <div className="flex gap-2 flex-wrap">
                    <Tag color={APPOINTMENT_STATUS_COLORS[appt.status]}>
                      {APPOINTMENT_STATUS_LABELS[appt.status] ?? appt.status}
                    </Tag>
                    {appt.paymentStatus === 'paid' && <Tag color="green">Paid</Tag>}
                    {appt.paymentStatus === 'pending' && <Tag color="orange">Unpaid</Tag>}
                  </div>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(appt)}
                  >
                    Update
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
            showSizeChanger={false}
            responsive
            showTotal={(t) => `${t} total`}
          />
        </div>
      )}

      {/* Edit modal */}
      <Modal
        title="Update Appointment"
        open={!!editAppt}
        onCancel={() => setEditAppt(null)}
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
            <Button onClick={() => setEditAppt(null)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

