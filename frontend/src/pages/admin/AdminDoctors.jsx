import React, { useEffect, useState } from 'react';
import {
  Table, Card, Typography, Tag, Button, Modal, Form, Input, Select, message, Alert, Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';

const { Title } = Typography;
const { Option } = Select;

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      await doctorService.create({
        ...values,
        qualifications: values.qualifications?.split(',').map((s) => s.trim()).filter(Boolean),
      });
      message.success('Doctor profile created');
      setModal(false);
      form.resetFields();
      load();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Specialization', dataIndex: 'specialization', key: 'specialization' },
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
      render: (_, r) => `${r.schedule?.length ?? 0} days`,
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>
          Add Doctor
        </Button>
      </div>

      {error && <Alert message={error} type="error" className="mb-4" />}

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
        <Form form={form} layout="vertical" onFinish={handleCreate} className="mt-4">
          <Form.Item name="userId" label="User ID" rules={[{ required: true }]}>
            <Input placeholder="User's MongoDB _id" />
          </Form.Item>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
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
