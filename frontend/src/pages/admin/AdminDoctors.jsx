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

function buildDoctorPayload(values) {
  const { yearsOfExperience, ...rest } = values;
  const payload = {
    ...rest,
    qualifications: values.qualifications?.split(',').map((s) => s.trim()).filter(Boolean),
  };
  if (yearsOfExperience !== undefined && yearsOfExperience !== '' && yearsOfExperience !== null) {
    payload.yearsOfExperience = Number(yearsOfExperience);
  }
  return payload;
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const payload = buildDoctorPayload(values);
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
      notify.error('Create failed', e.message);
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
      title: 'Specialization',
      dataIndex: 'specialization',
      key: 'specialization',
      ellipsis: true,
    },
    {
      title: 'Experience',
      dataIndex: 'yearsOfExperience',
      key: 'yearsOfExperience',
      render: (v) => `${v} yrs`,
    },
    {
      title: 'Qualifications',
      key: 'qualifications',
      render: (_, r) =>
        r.qualifications?.map((q) => (
          <Tag key={q}>{q}</Tag>
        )) ?? '—',
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 100,
      render: (_, r) => {
        const weeks = r.weeklyAvailability;
        if (weeks?.length) {
          const slots = weeks.reduce((a, w) => a + (w.slots?.length ?? 0), 0);
          return `${weeks.length} wk · ${slots} slots`;
        }
        if (r.schedule?.length) return `${r.schedule.length} slot (legacy)`;
        return '—';
      },
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
        <Title level={3} style={{ margin: 0 }}>
          Doctors
        </Title>
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
        title="Create Doctor Profile"
        open={modal}
        onCancel={() => setModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          {!editingDoctor && (
            <Form.Item
              name="userId"
              label="User ID"
              help="The doctor's User ID from the common service (after account approval)"
              rules={[{ required: true, message: 'User ID is required' }]}
            >
              <Input placeholder="MongoDB ObjectId" />
            </Form.Item>
          )}
          {editingDoctor && (
            <Form.Item label="User ID">
              <span className="text-neutral-600 dark:text-neutral-400">
                {editingDoctor.userId ?? '—'}
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
          <Form.Item name="yearsOfExperience" label="Years of Experience">
            <Input type="number" min={0} />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Create
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
