import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Button, Modal, Descriptions, Space, Tooltip, Popconfirm, Avatar, Spin } from 'antd';
import { notify } from '../../utils/notify';
import { EyeOutlined, DeleteOutlined, UserOutlined, CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { doctorService } from '../../services/doctor/doctor.service';
import { documentService } from '../../services/common/document.service';
import {
  mondayOfWeekContaining,
  formatWeekStartMonday,
  addDays,
  getSlotsForWeek,
} from '../../utils/doctorScheduleWeek';
import { slotsFromProfileForUi } from '../../utils/doctorScheduleSchema';

const { Title } = Typography;

const SLOT_STARTS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function pad2(n) { return String(n).padStart(2, '0'); }
function endFromStart(start) {
  const [h, m] = start.split(':').map(Number);
  return `${pad2(h + 2)}:${pad2(m)}`;
}
function slotKey(dayOfWeek, startTime, endTime) {
  return `${dayOfWeek}_${startTime}_${endTime}`;
}

/** Returns "X days this week" count for a doctor profile. */
function thisWeekAvailabilityDays(profile) {
  const monday = mondayOfWeekContaining(new Date());
  const raw = getSlotsForWeek(profile, monday);
  const slots = slotsFromProfileForUi(raw);
  return new Set(slots.map((s) => s.dayOfWeek)).size;
}

/** Read-only calendar view of a doctor's weekly schedule. */
function ScheduleCalendarView({ profile }) {
  const [weekStart, setWeekStart] = useState(() => mondayOfWeekContaining(new Date()));

  const mon = weekStart;
  const sun = addDays(mon, 6);
  const raw = getSlotsForWeek(profile, mon);
  const slots = slotsFromProfileForUi(raw);
  const scheduleKeys = new Set(slots.map((s) => slotKey(s.dayOfWeek, s.startTime, s.endTime)));
  const weekKey = mon.getTime();
  const weekLabel = `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const thisWeekMonday = mondayOfWeekContaining(new Date());
  const isCurrentWeek = mon.getTime() === thisWeekMonday.getTime();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="font-medium text-slate-700 text-sm">{weekLabel}</span>
        <Space size="small" wrap>
          <Button size="small" icon={<LeftOutlined />} onClick={() => setWeekStart((d) => addDays(d, -7))} aria-label="Previous week" />
          <Button size="small" icon={<RightOutlined />} onClick={() => setWeekStart((d) => addDays(d, 7))} aria-label="Next week" />
          <Button size="small" type={isCurrentWeek ? 'default' : 'primary'} onClick={() => setWeekStart(mondayOfWeekContaining(new Date()))}>
            This week
          </Button>
        </Space>
      </div>

      <div className="overflow-x-auto">
        <div
          key={weekKey}
          className="grid gap-1 min-w-[520px]"
          style={{ gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))' }}
        >
          <div />
          {Array.from({ length: 7 }, (_, c) => {
            const dayDate = addDays(mon, c);
            return (
              <div key={`h-${weekKey}-${c}`} className="text-center pb-2 border-b border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
                  {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div className="text-sm font-semibold text-slate-800">{dayDate.getDate()}</div>
              </div>
            );
          })}

          {SLOT_STARTS.map((start) => {
            const end = endFromStart(start);
            return (
              <React.Fragment key={`${weekKey}-${start}`}>
                <div className="text-[10px] text-slate-500 flex items-center justify-end pr-1 text-right leading-tight">
                  {start}<br />{end}
                </div>
                {Array.from({ length: 7 }, (_, c) => {
                  const cellDate = addDays(mon, c);
                  const dow = cellDate.getDay();
                  const key = slotKey(dow, start, end);
                  const on = scheduleKeys.has(key);
                  return (
                    <div
                      key={`${weekKey}-${c}-${start}`}
                      className={[
                        'min-h-9 rounded-md border',
                        on ? 'bg-blue-500 border-blue-700' : 'bg-slate-50 border-slate-200',
                      ].join(' ')}
                      title={on ? `${cellDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} · ${start}–${end} (Available)` : undefined}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-700 inline-block" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" /> Unavailable
        </span>
      </div>
    </div>
  );
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [detailPhotoUrl, setDetailPhotoUrl] = useState(null);
  const [detailPhotoLoading, setDetailPhotoLoading] = useState(false);
  const [schedModalOpen, setSchedModalOpen] = useState(false);

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
    const days = thisWeekAvailabilityDays(r);
    if (days === 0) return 'No availability this week';
    return `${days} day${days !== 1 ? 's' : ''} this week`;
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
              <Descriptions.Item label="Availability">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-0 p-0 text-sm"
                  onClick={() => setSchedModalOpen(true)}
                >
                  <CalendarOutlined />
                  {scheduleSummary(selected)}
                </button>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      <Modal
        title={selected ? `${selected.fullName} — Weekly Schedule` : 'Schedule'}
        open={schedModalOpen}
        onCancel={() => setSchedModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => setSchedModalOpen(false)}>
            Close
          </Button>
        }
        width={680}
        destroyOnClose
      >
        {selected && <ScheduleCalendarView profile={selected} />}
      </Modal>
    </div>
  );
}
