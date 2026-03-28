import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Typography,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  Tooltip,
} from 'antd';
import { notify } from '../../utils/notify';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';

const { Title } = Typography;

function buildDoctorPayload(values, { withCredentials }) {
  const {
    userId: _omitUserId,
    username,
    password,
    yearsOfExperience,
    ...rest
  } = values;
  const payload = {
    ...rest,
    qualifications: values.qualifications?.split(',').map((s) => s.trim()).filter(Boolean),
  };
  if (yearsOfExperience !== undefined && yearsOfExperience !== '' && yearsOfExperience !== null) {
    payload.yearsOfExperience = Number(yearsOfExperience);
  }
  if (withCredentials) {
    payload.username = typeof username === 'string' ? username.trim() : username;
    payload.password = password;
  }
  return payload;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (!modalOpen || !editingDoctor) return;
    form.setFieldsValue({
      fullName: editingDoctor.fullName,
      specialization: editingDoctor.specialization,
      qualifications: editingDoctor.qualifications?.join(', ') ?? '',
      yearsOfExperience: editingDoctor.yearsOfExperience,
    });
  }, [modalOpen, editingDoctor, form]);

  const openCreate = () => {
    setEditingDoctor(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingDoctor(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDoctor(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = buildDoctorPayload(values, { withCredentials: !editingDoctor });
      if (editingDoctor) {
        await doctorService.update(editingDoctor._id, payload);
        notify.success('Doctor updated', 'Changes have been saved.');
      } else {
        await doctorService.create(payload);
        notify.success('Doctor created', 'The doctor profile has been created.');
      }
      closeModal();
      load();
    } catch (e) {
      notify.error(editingDoctor ? 'Update failed' : 'Create failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await doctorService.remove(id);
      notify.success('Doctor removed', 'The doctor profile has been deleted.');
      load();
    } catch (e) {
      notify.error('Delete failed', e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'fullName', key: 'fullName', ellipsis: true },
    {
      title: 'Email',
      dataIndex: 'username',
      key: 'username',
      width: 180,
      ellipsis: true,
      render: (v) => v || '—',
    },
    { title: 'Specialization', dataIndex: 'specialization', key: 'specialization', ellipsis: true },
    {
      title: 'Experience',
      dataIndex: 'yearsOfExperience',
      key: 'yearsOfExperience',
      width: 100,
      render: (v) => `${v ?? 0} yrs`,
    },
    {
      title: 'Qualifications',
      key: 'qualifications',
      ellipsis: true,
      render: (_, r) =>
        r.qualifications?.length ? (
          <span className="inline-flex flex-wrap gap-1">
            {r.qualifications.map((q) => (
              <Tag key={q} className="m-0">
                {q}
              </Tag>
            ))}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 88,
      render: (_, r) => `${r.schedule?.length ?? 0} days`,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 96,
      align: 'center',
      render: (_, record) => (
        <Space size={0} className="flex-nowrap [&_.ant-space-item]:flex [&_.ant-space-item]:items-center">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              aria-label={`Edit ${record.fullName}`}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete doctor?"
            description="Removes this profile permanently."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deletingId === record._id }}
            onConfirm={() => handleDelete(record._id)}
          >
            <span>
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Delete ${record.fullName}`}
                />
              </Tooltip>
            </span>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Doctors
          </Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Doctor
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm border-0">
        <Table
          columns={columns}
          dataSource={doctors}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      <Modal
        title={editingDoctor ? 'Edit doctor' : 'Create doctor profile'}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          {!editingDoctor && (
            <>
              <Form.Item
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Enter a valid email (e.g. name@gmail.com)' },
                ]}
              >
                <Input type="email" placeholder="name@gmail.com" autoComplete="email" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 8, message: 'At least 8 characters' },
                ]}
              >
                <Input.Password placeholder="Initial password" autoComplete="new-password" />
              </Form.Item>
            </>
          )}
          {editingDoctor && (
            <Form.Item label="Email">
              <span className="text-neutral-600 dark:text-neutral-400">
                {editingDoctor.username ?? '—'}
              </span>
            </Form.Item>
          )}
          <Form.Item name="fullName" label="Full name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="specialization" label="Specialization" rules={[{ required: true }]}>
            <Input placeholder="e.g., Cardiology" />
          </Form.Item>
          <Form.Item name="qualifications" label="Qualifications (comma separated)">
            <Input placeholder="MBBS, MD" />
          </Form.Item>
          <Form.Item name="yearsOfExperience" label="Years of experience">
            <Input type="number" min={0} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={closeModal}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editingDoctor ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
