import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card, Typography, Button, Tag, Select, Spin, Empty,
  Modal, List, Tooltip, Input, Progress, Pagination, DatePicker,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, UserOutlined,
  VideoCameraOutlined, ReloadOutlined, MedicineBoxOutlined,
  FileTextOutlined, DownloadOutlined, EyeOutlined, PaperClipOutlined,
  ArrowLeftOutlined, TeamOutlined, SearchOutlined,
  DownOutlined, UpOutlined,
} from '@ant-design/icons';
import AppointmentExpandedPanel from './AppointmentExpandedPanel';
import { notify } from '../../utils/notify';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import { patientClient } from '../../utils/httpClients';
import { medicalReportService } from '../../services/patient/medicalReport.service';
import { medicalReportApi } from '../../services/patient/medicalReport.api';
import {
  APPOINTMENT_STATUS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS,
} from '../../constants/appointment';
import useAuthStore from '../../store/authStore';
import VideoCall from '../../components/VideoCall';

const { Title, Text } = Typography;
const SLOT_PAGE_SIZE = 3;

// ── Slot status helpers ───────────────────────────────────────────────────────
const SLOT_STATUS_CFG = {
  OPEN:         { label: 'Open',         tagColor: 'green'   },
  FILLING_FAST: { label: 'Filling Fast', tagColor: 'orange'  },
  FULL:         { label: 'Full',         tagColor: 'red'     },
};

function deriveStatus(booked, max) {
  if (booked >= max) return 'FULL';
  if (max > 0 && booked / max >= 0.7) return 'FILLING_FAST';
  return 'OPEN';
}

function progressStroke(pct) {
  if (pct >= 1)   return '#ff4d4f';
  if (pct >= 0.7) return '#fa8c16';
  return '#52c41a';
}

function fmt12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DoctorAppointments() {
  const user = useAuthStore((s) => s.user);

  // View: 'slots' | 'detail'
  const [view, setView]             = useState('slots');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots]           = useState([]);
  const [loading, setLoading]       = useState(true);

  // Detail view filters
  const [search, setSearch]             = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  // Slot pagination
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [dateFilter, setDateFilter] = useState(null); // [dayjs, dayjs] | null

  // Modals
  const [videoAppt, setVideoAppt]                       = useState(null);
  const [recordsAppt, setRecordsAppt]                   = useState(null);
  const [linkedDocs, setLinkedDocs]                     = useState([]);
  const [docsLoading, setDocsLoading]                   = useState(false);
  const [recordsPatientProfileId, setRecordsPatientProfileId] = useState(null);

  // ── Load: fetch appointments then enrich with slot schedule info ────────────
  const load = async () => {
    setLoading(true);
    try {
      // 1. Fetch all appointments — paginate up to 100 per page until exhausted
      let allAppointments = [];
      let page = 1;
      while (true) {
        const { appointments: batch, pagination } = await appointmentService.list({ limit: 100, page });
        if (!batch || batch.length === 0) break;
        allAppointments = [...allAppointments, ...batch];
        if (!pagination || allAppointments.length >= pagination.total) break;
        page++;
      }
      const appointments = allAppointments;

      if (!appointments || appointments.length === 0) {
        setSlots([]);
        return;
      }

      // 2. Doctor profile _id lives on the appointments themselves
      const doctorProfileId = appointments[0]?.doctorId;

      // 3. Unique dates → fetch slot metadata in parallel
      const uniqueDates = [...new Set(
        appointments.map((a) => dayjs.utc(a.scheduledAt).format('YYYY-MM-DD'))
      )];

      const slotMetaMap = {};
      await Promise.all(
        uniqueDates.map(async (date) => {
          try {
            const res = await appointmentService.getDoctorSlots(doctorProfileId, date);
            const arr = res?.slots ?? (Array.isArray(res) ? res : []);
            arr.forEach((s) => { slotMetaMap[s.slotId] = s; });
          } catch { /* non-critical */ }
        })
      );

      // 4. Group appointments by slotId
      const grouped = {};
      appointments.forEach((a) => {
        if (!grouped[a.slotId]) grouped[a.slotId] = [];
        grouped[a.slotId].push(a);
      });

      // 5. Build slot objects
      const slotList = Object.entries(grouped).map(([slotId, appts]) => {
        const meta  = slotMetaMap[slotId] || {};
        const first = appts[0];
        const date  = dayjs.utc(first.scheduledAt).format('YYYY-MM-DD');
        const startTime = meta.startTime || dayjs.utc(first.scheduledAt).format('HH:mm');
        const endTime   = meta.endTime   || null;
        const max       = meta.maxTokens || 20;
        const booked    = appts.filter((a) => a.status !== 'cancelled').length;

        return {
          slotId, date, startTime, endTime,
          maxTokens: max,
          bookedTokens: booked,
          remainingTokens: Math.max(0, max - booked),
          status: deriveStatus(booked, max),
          appointments: [...appts].sort((a, b) =>
            (a.tokenNumber || '').localeCompare(b.tokenNumber || '')
          ),
        };
      });

      slotList.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

      setSlots(slotList);
    } catch (e) {
      notify.error('Failed to load appointments', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setUpcomingPage(1);
    setPastPage(1);
  }, [slots.length]);

  const today    = dayjs().format('YYYY-MM-DD');
  const visibleSlots = dateFilter?.[0] && dateFilter?.[1]
    ? slots.filter((s) => s.date >= dateFilter[0].format('YYYY-MM-DD') && s.date <= dateFilter[1].format('YYYY-MM-DD'))
    : slots;
  const upcoming = visibleSlots.filter((s) => s.date >= today);
  const past     = visibleSlots.filter((s) => s.date <  today);
  const upcomingPageData = upcoming.slice((upcomingPage - 1) * SLOT_PAGE_SIZE, upcomingPage * SLOT_PAGE_SIZE);
  const pastPageData = past.slice((pastPage - 1) * SLOT_PAGE_SIZE, pastPage * SLOT_PAGE_SIZE);

  // ── Docs modal ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!recordsAppt) { setLinkedDocs([]); setRecordsPatientProfileId(null); return; }
    const ids = new Set((recordsAppt.patientMedicalDocumentIds ?? []).map(String));
    if (ids.size === 0) { setLinkedDocs([]); return; }
    setDocsLoading(true);
    patientClient
      .get(`/patients/${recordsAppt.patientId}`)
      .then(({ data }) => {
        const p = data.patient ?? data;
        setRecordsPatientProfileId(p._id);
        return medicalReportService.list(p._id, { limit: 100 });
      })
      .then((all) => setLinkedDocs(all.filter((d) => ids.has(String(d._id)))))
      .catch(() => notify.error('Failed to load records'))
      .finally(() => setDocsLoading(false));
  }, [recordsAppt]);

  // ── Filtered appointments for detail view ──────────────────────────────────
  const detailAppointments = useMemo(() => {
    if (!selectedSlot) return [];
    let list = [...selectedSlot.appointments];
    if (filterPayment) list = list.filter((a) => a.paymentStatus === filterPayment);
    if (filterStatus)  list = list.filter((a) => a.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) =>
        (a.tokenNumber   || '').toLowerCase().includes(q) ||
        (a.reason        || '').toLowerCase().includes(q) ||
        (a.patientId     || '').toLowerCase().includes(q) ||
        (a.patientEmail  || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedSlot, filterPayment, filterStatus, search]);

  const openSlot = (slot) => {
    setSelectedSlot(slot);
    setSearch(''); setFilterPayment(''); setFilterStatus('');
    setView('detail');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {view === 'slots' ? (
        <SlotOverview
          slots={visibleSlots}
          upcoming={upcoming}
          past={past}
          upcomingPage={upcomingPage}
          pastPage={pastPage}
          upcomingPageData={upcomingPageData}
          pastPageData={pastPageData}
          onChangeUpcomingPage={setUpcomingPage}
          onChangePastPage={setPastPage}
          onRefresh={load}
          onOpen={openSlot}
          dateFilter={dateFilter}
          onDateFilterChange={(d) => { setDateFilter(d); setUpcomingPage(1); setPastPage(1); }}
        />
      ) : (
        <DetailView
          slot={selectedSlot}
          appointments={detailAppointments}
          search={search}              setSearch={setSearch}
          filterPayment={filterPayment} setFilterPayment={setFilterPayment}
          filterStatus={filterStatus}   setFilterStatus={setFilterStatus}
          onBack={() => { setView('slots'); setSelectedSlot(null); }}
          onVideoCall={setVideoAppt}
          onViewDocs={setRecordsAppt}
          onAppointmentComplete={load}
        />
      )}

      {/* Video call overlay */}
      {videoAppt && (
        <div className="fixed inset-0 z-[1000]">
          <VideoCall
            channelName={`appointment_${videoAppt._id}`}
            role="publisher"
            onLeave={() => setVideoAppt(null)}
          />
        </div>
      )}

      {/* Documents modal */}
      <Modal
        open={!!recordsAppt}
        title={<span className="flex items-center gap-2"><FileTextOutlined className="text-blue-500" />Patient Attached Documents</span>}
        footer={null}
        onCancel={() => setRecordsAppt(null)}
        width={620}
      >
        {docsLoading ? (
          <div className="flex justify-center py-10"><Spin /></div>
        ) : linkedDocs.length === 0 ? (
          <Empty description="No documents attached to this appointment" />
        ) : (
          <List
            dataSource={linkedDocs}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Tooltip title="View" key="view">
                    <Button size="small" icon={<EyeOutlined />} onClick={async () => {
                      try { window.open(await medicalReportApi.getViewUrl(recordsPatientProfileId, doc._id), '_blank'); }
                      catch { notify.error('Failed to open document'); }
                    }} />
                  </Tooltip>,
                  <Tooltip title="Download" key="dl">
                    <Button size="small" icon={<DownloadOutlined />} onClick={async () => {
                      try { await medicalReportApi.download(recordsPatientProfileId, doc._id, doc.originalName); }
                      catch { notify.error('Failed to download document'); }
                    }} />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined className="text-blue-400 text-xl mt-1" />}
                  title={doc.originalName}
                  description={
                    <span className="flex gap-2 flex-wrap">
                      <Tag color="blue">{doc.category?.replace('_', ' ')}</Tag>
                      {doc.description && <span className="text-gray-500 text-xs">{doc.description}</span>}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
}

// ── Slot Overview ─────────────────────────────────────────────────────────────
function SlotOverview({
  slots,
  upcoming,
  past,
  upcomingPage,
  pastPage,
  upcomingPageData,
  pastPageData,
  onChangeUpcomingPage,
  onChangePastPage,
  onRefresh,
  onOpen,
  dateFilter,
  onDateFilterChange,
}) {
  const totalBooked = slots.reduce((sum, s) => sum + s.bookedTokens, 0);

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={3} style={{ margin: 0 }}>My Appointments</Title>
          <Text type="secondary">Overview of your scheduled appointment slots</Text>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker.RangePicker
            allowClear
            placeholder={['From date', 'To date']}
            value={dateFilter}
            onChange={onDateFilterChange}
            format="DD MMM YYYY"
            className="w-72"
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>Refresh</Button>
        </div>
      </div>

      {/* Summary stats */}
      {slots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Slots',    value: slots.length,    icon: <CalendarOutlined />, color: 'text-blue-500',   bg: 'bg-blue-50'   },
            { label: 'Total Bookings', value: totalBooked,     icon: <TeamOutlined />,     color: 'text-green-500',  bg: 'bg-green-50'  },
            { label: 'Upcoming',       value: upcoming.length, icon: <ClockCircleOutlined />, color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Past',           value: past.length,     icon: <ReloadOutlined />,   color: 'text-gray-400',   bg: 'bg-gray-50'   },
          ].map((s) => (
            <Card key={s.label} className="rounded-2xl border-0 shadow-sm" bodyStyle={{ padding: '16px 20px' }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color} text-lg shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800 leading-tight">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {slots.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointment slots found" />
      ) : (
        <>
          {/* ── Upcoming ── */}
          {upcoming.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <Text strong className="text-xs uppercase tracking-widest text-gray-500">Upcoming Slots</Text>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcomingPageData.map((slot) => <SlotCard key={slot.slotId} slot={slot} onOpen={onOpen} />)}
              </div>
              {upcoming.length > SLOT_PAGE_SIZE && (
                <div className="mt-5 flex justify-center">
                  <Pagination
                    current={upcomingPage}
                    pageSize={SLOT_PAGE_SIZE}
                    total={upcoming.length}
                    showSizeChanger={false}
                    onChange={onChangeUpcomingPage}
                  />
                </div>
              )}
            </section>
          )}

          {/* ── Past ── */}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full bg-gray-300" />
                <Text strong className="text-xs uppercase tracking-widest text-gray-400">Past Slots</Text>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                {pastPageData.map((slot) => <SlotCard key={slot.slotId} slot={slot} onOpen={onOpen} />)}
              </div>
              {past.length > SLOT_PAGE_SIZE && (
                <div className="mt-5 flex justify-center">
                  <Pagination
                    current={pastPage}
                    pageSize={SLOT_PAGE_SIZE}
                    total={past.length}
                    showSizeChanger={false}
                    onChange={onChangePastPage}
                  />
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}

// ── Slot Card ─────────────────────────────────────────────────────────────────
function SlotCard({ slot, onOpen }) {
  const pct       = slot.maxTokens > 0 ? slot.bookedTokens / slot.maxTokens : 0;
  const cfg       = SLOT_STATUS_CFG[slot.status] || SLOT_STATUS_CFG.OPEN;
  const isToday   = slot.date === dayjs().format('YYYY-MM-DD');
  const timeLabel = fmt12(slot.startTime) + (slot.endTime ? ` – ${fmt12(slot.endTime)}` : '');

  return (
    <Card
      className="rounded-2xl border-0 shadow-sm transition-shadow hover:shadow-md"
      bodyStyle={{ padding: '22px 24px' }}
    >
      {/* Top: date + status  */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">
              {dayjs(slot.date).format('ddd, DD MMM YYYY')}
            </span>
            {isToday && <Tag color="blue" className="text-xs leading-none">Today</Tag>}
          </div>
          <div className="flex items-center gap-1 mt-1 text-gray-500 text-sm">
            <ClockCircleOutlined className="text-xs" />
            <span>{timeLabel}</span>
          </div>
        </div>
        <Tag color={cfg.tagColor} className="font-medium text-xs shrink-0">{cfg.label}</Tag>
      </div>

      {/* Token counts */}
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500">Tokens Booked</span>
        <span className="font-bold text-gray-800">{slot.bookedTokens} / {slot.maxTokens}</span>
      </div>

      {/* Progress bar */}
      <Progress
        percent={Math.round(pct * 100)}
        showInfo={false}
        strokeColor={progressStroke(pct)}
        trailColor="#f0f0f0"
        size="small"
      />

      <div className="flex justify-between text-xs text-gray-400 mt-1 mb-5">
        <span>{slot.remainingTokens} remaining</span>
        <span className="font-mono">{slot.slotId?.slice(-8)}</span>
      </div>

      {/* CTA */}
      <Button
        type="primary"
        block
        disabled={slot.bookedTokens === 0}
        onClick={() => onOpen(slot)}
        className="h-9 font-medium"
      >
        View Appointments
        {slot.bookedTokens > 0 && (
          <span className="ml-1.5 inline-flex items-center justify-center bg-white/25 rounded-full w-5 h-5 text-xs font-bold">
            {slot.bookedTokens}
          </span>
        )}
      </Button>
    </Card>
  );
}

// ── Detail View ───────────────────────────────────────────────────────────────
function DetailView({
  slot, appointments,
  search, setSearch, filterPayment, setFilterPayment, filterStatus, setFilterStatus,
  onBack, onVideoCall, onViewDocs, onAppointmentComplete,
}) {
  const [expandedApptId, setExpandedApptId] = useState(null);

  const toggleExpand = useCallback((id) => {
    setExpandedApptId((prev) => (prev === id ? null : id));
  }, []);
  const pct      = slot.maxTokens > 0 ? slot.bookedTokens / slot.maxTokens : 0;
  const cfg      = SLOT_STATUS_CFG[slot.status] || SLOT_STATUS_CFG.OPEN;
  const timeLabel = fmt12(slot.startTime) + (slot.endTime ? ` – ${fmt12(slot.endTime)}` : '');
  const hasFilters = filterPayment || filterStatus || search.trim();

  return (
    <>
      {/* Back + header */}
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="-ml-2 mb-3 text-gray-500 hover:text-blue-600"
        >
          Back to Slots
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {dayjs(slot.date).format('dddd, DD MMMM YYYY')}
            </Title>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Text type="secondary">
                <ClockCircleOutlined className="mr-1" />{timeLabel}
              </Text>
              <Tag color={cfg.tagColor} className="text-xs">{cfg.label}</Tag>
            </div>
          </div>

          {/* Slot stats */}
          <div className="flex gap-6">
            {[
              { label: 'Booked',    value: slot.bookedTokens,    cls: 'text-gray-800'  },
              { label: 'Remaining', value: slot.remainingTokens, cls: 'text-green-600' },
              { label: 'Total',     value: slot.maxTokens,       cls: 'text-gray-400'  },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <Progress
          percent={Math.round(pct * 100)}
          showInfo={false}
          strokeColor={progressStroke(pct)}
          trailColor="#f0f0f0"
          size="small"
          className="mt-4"
        />
      </div>

      {/* Filter bar */}
      <Card className="rounded-2xl border-0 shadow-sm mb-4" bodyStyle={{ padding: '14px 20px' }}>
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search token, reason, patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className="w-full sm:w-56"
          />
          <Select
            allowClear
            placeholder="Payment status"
            value={filterPayment || undefined}
            onChange={setFilterPayment}
            className="w-full sm:w-44"
            options={[
              { value: 'paid',     label: 'Paid'     },
              { value: 'pending',  label: 'Pending'  },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />
          <Select
            allowClear
            placeholder="Appointment status"
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            className="w-full sm:w-48"
            options={Object.values(APPOINTMENT_STATUS).map((s) => ({
              value: s, label: APPOINTMENT_STATUS_LABELS[s],
            }))}
          />
          {hasFilters && (
            <Button type="text" className="text-gray-400 hover:text-gray-600"
              onClick={() => { setSearch(''); setFilterPayment(''); setFilterStatus(''); }}>
              Reset
            </Button>
          )}
          <Text type="secondary" className="sm:ml-auto text-sm">
            {appointments.length} patient{appointments.length !== 1 ? 's' : ''}
          </Text>
        </div>
      </Card>

      {/* Appointment rows */}
      {appointments.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointments match your filters" />
      ) : (
        <div className="flex flex-col gap-3">
          {appointments.map((appt) => (
            <AppointmentRow
              key={appt._id}
              appt={appt}
              onVideoCall={onVideoCall}
              onViewDocs={onViewDocs}
              expanded={expandedApptId === appt._id}
              onToggleExpand={toggleExpand}
              onAppointmentComplete={onAppointmentComplete}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Appointment Row ───────────────────────────────────────────────────────────
function AppointmentRow({ appt, onVideoCall, onViewDocs, expanded, onToggleExpand, onAppointmentComplete }) {
  const canJoinCall    = appt.status === APPOINTMENT_STATUS.CONFIRMED && appt.type === 'video';
  const hasAttachments = (appt.patientMedicalDocumentIds?.length ?? 0) > 0;
  const tokenSeq       = appt.tokenNumber?.split('-').pop() ?? '–';

  return (
    <div>
      <Card
        className={`rounded-2xl border-0 shadow-sm transition-all ${expanded ? 'shadow-md ring-1 ring-blue-200' : ''}`}
        bodyStyle={{ padding: '16px 20px' }}
        style={{ cursor: 'default' }}
      >
        {/* ── Top row: info + tags ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="flex gap-4 flex-1 min-w-0">
            {/* Token badge */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center">
              <span className="text-[9px] text-blue-400 uppercase leading-none tracking-wider">Token</span>
              <span className="text-lg font-bold text-blue-600 leading-tight">{tokenSeq}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-gray-400 mb-1">{appt.tokenNumber}</div>
              {appt.reason && (
                <div className="text-sm text-gray-700 mb-1 truncate">
                  <span className="font-medium text-gray-500">Reason: </span>{appt.reason}
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {appt.patientEmail && (
                  <span><UserOutlined className="mr-1" />{appt.patientEmail}</span>
                )}
                <span>
                  {appt.type === 'video' ? <VideoCameraOutlined className="mr-1" /> : <MedicineBoxOutlined className="mr-1" />}
                  {appt.type === 'video' ? 'Video Call' : 'In-Person'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: status tags */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Tag color={APPOINTMENT_STATUS_COLORS[appt.status] || 'default'} className="text-xs">
              {APPOINTMENT_STATUS_LABELS[appt.status] ?? appt.status}
            </Tag>
            {appt.paymentStatus === 'paid'     && <Tag color="green"   className="text-xs">Paid</Tag>}
            {appt.paymentStatus === 'pending'  && <Tag color="orange"  className="text-xs">Unpaid</Tag>}
            {appt.paymentStatus === 'refunded' && <Tag                 className="text-xs">Refunded</Tag>}
          </div>
        </div>

        {/* ── Bottom: action buttons ───────────────────────────────────── */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {canJoinCall && (
              <Button type="primary" size="small" icon={<VideoCameraOutlined />} onClick={() => onVideoCall(appt)}>
                Join Call
              </Button>
            )}
            {hasAttachments && (
              <Tooltip title={`Attached documents (${appt.patientMedicalDocumentIds.length})`}>
                <Button size="small" icon={<PaperClipOutlined />} onClick={() => onViewDocs(appt)} />
              </Tooltip>
            )}
          </div>

          {/* Expand toggle */}
          <Button
            size="small"
            type={expanded ? 'primary' : 'default'}
            ghost={expanded}
            icon={expanded ? <UpOutlined /> : <DownOutlined />}
            onClick={() => onToggleExpand(appt._id)}
            className={expanded ? 'border-blue-400 text-blue-600' : 'text-gray-500'}
          >
            {expanded ? 'Close Panel' : 'Open Consultation'}
          </Button>
        </div>
      </Card>

      {/* ── Expandable consultation panel ──────────────────────────────── */}
      {expanded && (
        <AppointmentExpandedPanel
          appt={appt}
          onSaved={() => { /* optimistic — no full reload needed for save-only */ }}
          onComplete={() => onAppointmentComplete?.()}
        />
      )}
    </div>
  );
}
