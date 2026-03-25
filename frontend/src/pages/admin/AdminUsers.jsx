import React, { useEffect, useState } from 'react';
import { Table, Tag, Typography, Card, Input, Select, Space, Button, Modal, Form } from 'antd';
import { notify } from '../../utils/notify';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';
import { userService } from '../../services/common/user.service';
import useAuthStore from '../../store/authStore';
import { ROLE_LABELS, ROLE_COLORS } from '../../constants/roles';

const { Title } = Typography;
const { Option } = Select;

// Admin can view users by ID — backend doesn't expose list-all-users, so we show
// a search-by-ID panel and the ability to update user details.
export default function AdminUsers() {
  const currentUser = useAuthStore((s) => s.user);
  const [searchId, setSearchId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    setFoundUser(null);
    try {
      const user = await userService.getById(searchId.trim());
      setFoundUser(user);
    } catch (e) {
      notify.error('Search failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    form.setFieldsValue({
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
      phoneNumber: foundUser.phoneNumber,
    });
    setEditModal(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const updated = await userService.update(foundUser._id, values);
      setFoundUser(updated);
      notify.success('User updated', 'Changes saved successfully.');
      setEditModal(false);
    } catch (e) {
      notify.error('Update failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = foundUser
    ? [
        { label: 'ID', value: foundUser._id },
        { label: 'Full Name', value: foundUser.fullName },
        { label: 'Email', value: foundUser.email },
        { label: 'Role', value: <Tag color={ROLE_COLORS[foundUser.role]}>{ROLE_LABELS[foundUser.role]}</Tag> },
        { label: 'Phone', value: foundUser.phoneNumber || '—' },
        { label: 'Created', value: foundUser.createdAt ? new Date(foundUser.createdAt).toLocaleDateString() : '—' },
      ]
    : [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          User Management
        </Title>
      </div>

      <Card className="rounded-2xl shadow-sm border-0 mb-6">
        <Space.Compact block style={{ maxWidth: 480 }}>
          <Input
            placeholder="Enter User ID"
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

      {foundUser && (
        <Card
          className="rounded-2xl shadow-sm border-0"
          title="User Details"
          extra={
            <Button icon={<EditOutlined />} onClick={openEdit}>
              Edit
            </Button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
                <div className="font-medium">{value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
