import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Button, Modal, Descriptions, Space, Tooltip, Popconfirm, Avatar, Spin } from 'antd';
import { notify } from '../../utils/notify';
import { EyeOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';
import { documentService } from '../../services/common/document.service';

const { Title } = Typography;

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [detailPhotoUrl, setDetailPhotoUrl] = useState(null);
  const [detailPhotoLoading, setDetailPhotoLoading] = useState(false);

  const load = () => {
    setLoading(true);
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openDetail = (record) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  useEffect(() => {
    if (!detailOpen || !selected?.profilePhotoDocumentId) {
      setDetailPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setDetailPhotoLoading(false);
      return undefined;
    }

    let cancelled = false;
    setDetailPhotoLoading(true);
    (async () => {
      try {
        const url = await documentService.getViewUrl(selected.profilePhotoDocumentId);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setDetailPhotoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        if (!cancelled) setDetailPhotoUrl(null);
      } finally {
        if (!cancelled) setDetailPhotoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [detailOpen, selected?._id, selected?.profilePhotoDocumentId]);

  const handleDelete = async (record) => {
    setDeletingId(record._id);
    try {
      await doctorService.remove(record._id);
      notify.success('Doctor removed', `Profile and schedule for ${record.fullName} were deleted.`);
      if (selected?._id === record._id) closeDetail();
      load();
    } catch (e) {
      notify.error('Delete failed', e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const scheduleSummary = (r) => {
    const weeks = r.weeklyAvailability;
    if (weeks?.length) {
      const slots = weeks.reduce((a, w) => a + (w.slots?.length ?? 0), 0);
      return `${weeks.length} week(s), ${slots} slot(s)`;
    }
    if (r.schedule?.length) return `${r.schedule.length} slot(s) (legacy)`;
    return '—';
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
      width: 140,
      ellipsis: true,
      render: (_, r) => scheduleSummary(r),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={0} className="flex-nowrap [&_.ant-space-item]:flex [&_.ant-space-item]:items-center">
          <Tooltip title="View details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              aria-label={`View ${record.fullName}`}
              onClick={() => openDetail(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this doctor?"
            description={
              <>
                This permanently removes <strong>{record.fullName}</strong> from UrbanCare, including their
                saved availability. This cannot be undone.
              </>
            }
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading: deletingId === record._id }}
            onConfirm={() => handleDelete(record)}
          >
            <span>
              <Tooltip title="Delete doctor">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Delete ${record.fullName}`}
                  disabled={deletingId === record._id}
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
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Doctors
        </Title>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 mb-0">
          Doctors manage their own profile and photo in the doctor portal. You can remove a doctor profile here
          after confirming the warning.
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm border-0">
        <Table
          columns={columns}
          dataSource={doctors}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        title="Doctor profile"
        open={detailOpen}
        onCancel={closeDetail}
        footer={
          <Button type="primary" onClick={closeDetail}>
            Close
          </Button>
        }
        width={560}
        destroyOnClose
      >
        {selected && (
          <>
            <div className="flex flex-col items-center pt-1 pb-2">
              <Spin spinning={detailPhotoLoading}>
                <Avatar size={120} src={detailPhotoUrl || undefined} icon={<UserOutlined />} alt="" />
              </Spin>
              {!selected.profilePhotoDocumentId && !detailPhotoLoading && (
                <span className="text-neutral-400 text-xs mt-2">No profile photo</span>
              )}
              {selected.profilePhotoDocumentId && !detailPhotoUrl && !detailPhotoLoading && (
                <span className="text-neutral-400 text-xs mt-2">Photo could not be loaded</span>
              )}
            </div>
            <Descriptions column={1} size="small" bordered className="mt-2">
              <Descriptions.Item label="Full name">{selected.fullName}</Descriptions.Item>
              <Descriptions.Item label="Specialization">{selected.specialization}</Descriptions.Item>
              <Descriptions.Item label="Years of experience">{selected.yearsOfExperience ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Qualifications">
                {selected.qualifications?.length ? (
                  <Space size={[4, 4]} wrap>
                    {selected.qualifications.map((q) => (
                      <Tag key={q}>{q}</Tag>
                    ))}
                  </Space>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Availability">{scheduleSummary(selected)}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
}
