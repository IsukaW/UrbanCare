import React, { useEffect, useMemo, useState } from 'react';
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
  Divider,
  Alert,
} from 'antd';
import { notify } from '../../utils/notify';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';
import { doctorClient } from '../../utils/httpClients';

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

  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [pendingActingId, setPendingActingId] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingRecord, setRejectingRecord] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const doctorBaseUrl = useMemo(() => import.meta.env.VITE_DOCTOR_BASE_URL, []);

  const load = () => {
    setLoading(true);
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoading(false));
  };

  const loadPending = () => {
    setPendingLoading(true);
    setPendingError('');
    doctorClient
      .get('/doctors/pending-registrations', { params: { status: 'pending' } })
      .then(({ data }) => {
        const list =
          (Array.isArray(data) && data) ||
          data?.registrations ||
          data?.pendingRegistrations ||
          data?.items ||
          data?.data ||
          data;
        setPending(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        setPending([]);
        setPendingError(e.message || 'Failed to load pending registrations');
        notify.error('Failed to load pending registrations', e.message);
      })
      .finally(() => setPendingLoading(false));
  };

  useEffect(load, []);
  useEffect(loadPending, []);

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

  const approvePending = async (record) => {
    setPendingActingId(record._id);
    try {
      await doctorClient.post(`/doctors/pending-registrations/${record._id}/approve`);
      notify.success('Approved', 'Doctor sign in request has been approved.');
      loadPending();
      load();
    } catch (e) {
      notify.error('Approve failed', e.message);
    } finally {
      setPendingActingId(null);
    }
  };

  const openReject = (record) => {
    setRejectingRecord(record);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectingRecord) return;
    const reason = String(rejectReason || '').trim();
    if (!reason) {
      notify.error('Reason required', 'Please enter a rejection reason.');
      return;
    }
    setPendingActingId(rejectingRecord._id);
    try {
      await doctorClient.post(`/doctors/pending-registrations/${rejectingRecord._id}/reject`, { reason });
      notify.success('Rejected', 'Doctor sign in request has been rejected.');
      setRejectOpen(false);
      setRejectingRecord(null);
      setRejectReason('');
      loadPending();
    } catch (e) {
      notify.error('Reject failed', e.message);
    } finally {
      setPendingActingId(null);
    }
  };

  const viewCertificate = async (pendingId, fileIndex, originalName) => {
    try {
      const res = await doctorClient.get(
        `/doctors/pending-registrations/${pendingId}/certificates/${fileIndex}`,
        { responseType: 'blob' }
      );
      const blobUrl = window.URL.createObjectURL(res.data);
      const w = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!w) {
        // Popup blocked; fall back to download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = originalName || `certificate-${fileIndex + 1}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      // Best-effort cleanup
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30_000);
    } catch (e) {
      notify.error('Failed to open certificate', e.message);
      if (doctorBaseUrl) {
        notify.error('Tip', `If popups are blocked, allow popups for ${doctorBaseUrl}`);
      }
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

  const pendingColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
      render: (v) => v || '—',
    },
    { title: 'Name', dataIndex: 'fullName', key: 'fullName', ellipsis: true },
    {
      title: 'Specialization',
      dataIndex: 'specialization',
      key: 'specialization',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Certificates',
      key: 'certificates',
      width: 220,
      render: (_, r) => {
        const certs = r.certificates || [];
        if (!certs.length) return '—';
        return (
          <Space size={4} wrap>
            {certs.slice(0, 3).map((c, idx) => (
              <Button
                key={`${r._id}-${idx}`}
                size="small"
                icon={<FilePdfOutlined />}
                onClick={() => viewCertificate(r._id, idx, c.originalName)}
              >
                {c.originalName ? String(c.originalName).slice(0, 14) : `PDF ${idx + 1}`}
              </Button>
            ))}
            {certs.length > 3 ? <Tag className="m-0">+{certs.length - 3} more</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <div className="flex justify-center">
          <Space direction="vertical" size={4} className="w-full max-w-[92px]">
            <Tooltip title="Approve registration">
              <Button
                type="primary"
                size="small"
                block
                className="!text-xs !px-2 !h-7"
                icon={<CheckOutlined />}
                loading={pendingActingId === record._id}
                onClick={() => approvePending(record)}
              >
                Approve
              </Button>
            </Tooltip>
            <Tooltip title="Reject registration">
              <Button
                danger
                size="small"
                block
                className="!text-xs !px-2 !h-7"
                icon={<CloseOutlined />}
                disabled={pendingActingId === record._id}
                onClick={() => openReject(record)}
              >
                Reject
              </Button>
            </Tooltip>
          </Space>
        </div>
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

      <Divider className="my-6" />

      <div className="mb-3 flex items-center justify-between">
        <Title level={4} style={{ margin: 0 }}>
          Pending Doctor Registrations
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadPending} loading={pendingLoading}>
          Refresh
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm border-0">
        {!!pendingError && (
          <Alert
            type="error"
            showIcon
            className="mb-3"
            message="Pending registrations could not be loaded"
            description={pendingError}
          />
        )}
        <Table
          columns={pendingColumns}
          dataSource={pending}
          loading={pendingLoading}
          rowKey="_id"
          pagination={{ pageSize: 5 }}
          size="middle"
          locale={{ emptyText: 'No pending requests' }}
          scroll={{ x: 'max-content' }}
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

      <Modal
        title="Reject doctor registration"
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          setRejectingRecord(null);
          setRejectReason('');
        }}
        okText="Reject"
        okButtonProps={{ danger: true, loading: pendingActingId === rejectingRecord?._id }}
        onOk={confirmReject}
        destroyOnClose
      >
        <div className="mb-2 text-neutral-600">
          Provide a reason. This will be emailed to the doctor.
        </div>
        <Input.TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          rows={4}
          maxLength={300}
          showCount
        />
      </Modal>
    </div>
  );
}
