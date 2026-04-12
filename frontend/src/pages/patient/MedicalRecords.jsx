import { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Button, Table, Tag, Space, Modal, Form,
  Input, Select, Upload, Popconfirm, Spin, Empty, Alert,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { patientService } from '../../services/patient/patient.service';
import { medicalReportService } from '../../services/patient/medicalReport.service';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const CATEGORY_COLORS = {
  prescription: 'green',
  lab_report: 'blue',
  medical_record: 'purple',
  certificate: 'cyan',
  imaging: 'gold',
  other: 'default',
};

const CATEGORY_LABELS = {
  prescription: 'Prescription',
  lab_report: 'Lab Report',
  medical_record: 'Medical Record',
  certificate: 'Certificate',
  imaging: 'Imaging',
  other: 'Other',
};

export default function MedicalRecords() {
  const user = useAuthStore((s) => s.user);
  const [patientId, setPatientId] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();

  // Load patient profile first to get the patient document's MongoDB _id,
  // which is required by the documents API route /patients/:patientId/documents.
  useEffect(() => {
    patientService
      .getById(user.id)
      .then((p) => setPatientId(p._id))
      .catch(() => setProfileMissing(true))
      .finally(() => setLoading(false));
  }, [user.id]);

  const loadRecords = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const docs = await medicalReportService.list(patientId);
      setRecords(docs);
    } catch (e) {
      notify.error('Failed to load records', e.message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) loadRecords();
  }, [patientId, loadRecords]);

  const openUploadModal = () => {
    form.resetFields();
    setFileList([]);
    setUploadModal(true);
  };

  const handleUpload = async (values) => {
    if (fileList.length === 0) {
      notify.warning('No file selected', 'Please select a file to upload.');
      return;
    }
    setUploading(true);
    try {
      await medicalReportService.upload(patientId, fileList[0].originFileObj, {
        category: values.category || 'other',
        description: values.description || '',
      });
      notify.success('Uploaded', 'Your medical record was uploaded successfully.');
      setUploadModal(false);
      loadRecords();
    } catch (e) {
      notify.error('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (record) => {
    try {
      const url = await medicalReportService.getViewUrl(patientId, record._id);
      window.open(url, '_blank');
    } catch (e) {
      notify.error('Cannot view file', e.message);
    }
  };

  const handleDownload = async (record) => {
    try {
      await medicalReportService.download(patientId, record._id, record.originalName);
    } catch (e) {
      notify.error('Download failed', e.message);
    }
  };

  const handleDelete = async (record) => {
    try {
      await medicalReportService.remove(patientId, record._id);
      notify.success('Deleted', 'Medical record removed.');
      loadRecords();
    } catch (e) {
      notify.error('Delete failed', e.message);
    }
  };

  const columns = [
    {
      title: 'File Name',
      dataIndex: 'originalName',
      key: 'originalName',
      ellipsis: true,
      render: (v) => (
        <span className="flex items-center gap-2">
          <FileTextOutlined className="text-blue-400" />
          {v}
        </span>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (v) => (
        <Tag color={CATEGORY_COLORS[v] ?? 'default'}>
          {CATEGORY_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v) => v || <span className="text-gray-300">—</span>,
    },
    {
      title: 'Uploaded',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (v) => dayjs(v).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="View"
          />
          <Button
            type="text"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
            title="Download"
          />
          <Popconfirm
            title="Delete this record?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button danger type="text" icon={<DeleteOutlined />} title="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && !patientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            My Medical Records
          </Title>
          <Text type="secondary">Upload and manage your medical documents</Text>
        </div>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={openUploadModal}
          disabled={!patientId}
        >
          Upload Record
        </Button>
      </div>

      {profileMissing && (
        <Alert
          message="Profile not set up"
          description={
            <span>
              Please{' '}
              <Link to="/patient/profile" className="text-blue-600 font-medium">
                create your patient profile
              </Link>{' '}
              before uploading medical records.
            </span>
          }
          type="info"
          showIcon
          className="mb-6 rounded-xl"
        />
      )}

      <Card className="rounded-2xl shadow-sm border-0">
        <Table
          columns={columns}
          dataSource={records}
          loading={loading}
          rowKey="_id"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No medical records yet. Upload your first document."
              />
            ),
          }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        title="Upload Medical Record"
        open={uploadModal}
        onOk={() => form.submit()}
        onCancel={() => setUploadModal(false)}
        okText="Upload"
        confirmLoading={uploading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleUpload} className="mt-4">
          <Form.Item label="File" required>
            <Dragger
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag a file here to upload</p>
              <p className="ant-upload-hint">
                Supports PDF, JPG, PNG, DOC, DOCX — max 10 MB
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item name="category" label="Category" initialValue="other">
            <Select>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea
              placeholder="Brief description of this document..."
              maxLength={500}
              showCount
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
