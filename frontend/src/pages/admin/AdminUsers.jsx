import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Typography, Card, Select, Space, Button, Modal, Form, Input } from 'antd';
import { notify } from '../../utils/notify';
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { userService } from '../../services/common/user.service';
import useAuthStore from '../../store/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';

const { Title } = Typography;
const { Option } = Select;

const STATUS_COLORS = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
};

// Admin can view, filter, approve and reject all users
export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [acting, setActing] = useState(null);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectMessage, setRejectMessage] = useState('');

  const [editModal, setEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await userService.listAll(params);
      setUsers(data);
    } catch (e) {
      notify.error('Failed to load users', e.message);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (record) => {
    setActing(record._id);
    try {
      await userService.approve(record._id);
      notify.success('Approved', `${record.firstName} ${record.lastName} has been approved.`);
      load();
    } catch (e) {
      notify.error('Approve failed', e.message);
    } finally {
      setActing(null);
    }
  };

  const openReject = (record) => {
    setRejectingUser(record);
    setRejectMessage('');
    setRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectingUser) return;
    const msg = rejectMessage.trim();
    if (!msg) {
      notify.error('Message required', 'Please enter a rejection message.');
      return;
    }
    setActing(rejectingUser._id);
    try {
      await userService.reject(rejectingUser._id, msg);
      notify.success('Rejected', `${rejectingUser.firstName} ${rejectingUser.lastName} has been rejected.`);
      setRejectModal(false);
      setRejectingUser(null);
      load();
    } catch (e) {
      notify.error('Reject failed', e.message);
    } finally {
      setActing(null);
    }
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: `Delete ${record.firstName} ${record.lastName}?`,
      content: 'This action cannot be undone. The user will be permanently removed.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        setActing(record._id);
        try {
          await userService.delete(record._id);
          notify.success('Deleted', `${record.firstName} ${record.lastName} has been deleted.`);
          load();
        } catch (e) {
          notify.error('Delete failed', e.message);
        } finally {
          setActing(null);
        }
      },
    });
  };

  const openEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      firstName: record.firstName,
      lastName: record.lastName,
      phoneNumber: record.phoneNumber,
    });
    setEditModal(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      await userService.update(editingUser._id, values);
      notify.success('User updated', 'Changes saved successfully.');
      setEditModal(false);
      load();
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, r) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '—',
      ellipsis: true,
    },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (v) => <Tag color={ROLE_COLORS[v]}>{ROLE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v) => (
        <Tag color={STATUS_COLORS[v] ?? 'default'} className="capitalize">
          {v ?? '—'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (v) => (v ? new Date(v).toLocaleDateString() : '—'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small" wrap>
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                loading={acting === record._id}
                onClick={() => handleApprove(record)}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                disabled={acting === record._id}
                onClick={() => openReject(record)}
              >
                Reject
              </Button>
            </>
          )}
          {record._id !== currentUser?._id && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                Edit
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={acting === record._id}
                onClick={() => handleDelete(record)}
              >
                Delete
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Title level={3} style={{ margin: 0 }}>
          User Management
        </Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm border-0">
        <Space wrap className="mb-4">
          <Select
            placeholder="Filter by role"
            allowClear
            style={{ width: 160 }}
            onChange={setRoleFilter}
          >
            <Option value="admin">Admin</Option>
            <Option value="doctor">Doctor</Option>
            <Option value="patient">Patient</Option>
          </Select>
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 160 }}
            onChange={setStatusFilter}
          >
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="rejected">Rejected</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 700 }}
        />
      </Card>

      {/* Reject Modal */}
      <Modal
        title="Reject User"
        open={rejectModal}
        onCancel={() => { setRejectModal(false); setRejectingUser(null); }}
        okText="Reject"
        okButtonProps={{ danger: true, loading: acting === rejectingUser?._id }}
        onOk={confirmReject}
        destroyOnClose
      >
        <p className="mb-3 text-neutral-600">
          This message will be emailed to <strong>{rejectingUser?.email}</strong>.
        </p>
        <Input.TextArea
          value={rejectMessage}
          onChange={(e) => setRejectMessage(e.target.value)}
          placeholder="Enter rejection reason (min 10 characters)..."
          rows={4}
          maxLength={500}
          showCount
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit User"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Phone Number">
            <Input />
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
