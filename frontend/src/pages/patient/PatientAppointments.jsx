import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Button, Tag, Select, Spin, Empty, Badge, Tooltip, Pagination,
  Modal, List, Input,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, UserOutlined,
  CloseCircleOutlined, VideoCameraOutlined, ReloadOutlined,
  MedicineBoxOutlined, CreditCardOutlined,
  FileTextOutlined, EyeOutlined, DownloadOutlined, PaperClipOutlined,
  FileDoneOutlined, UpOutlined,
} from '@ant-design/icons';
import PatientConsultationPanel from './PatientConsultationPanel';
import { notify } from '../../utils/notify';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import { medicalReportService } from '../../services/patient/medicalReport.service';
import { medicalReportApi } from '../../services/patient/medicalReport.api';
import { patientService } from '../../services/patient/patient.service';
import {
  APPOINTMENT_STATUS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS,
} from '../../constants/appointment';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';
import VideoCall from '../../components/VideoCall';
import PaymentModal from './PaymentModal';

const { Title, Text } = Typography;

const CANCELLABLE = [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING];

// ── helpers ──────────────────────────────────────────────────────────────────
const todayIso = () => new Date().toISOString().split('T')[0];

export default function PatientAppointments() {
  const user = useAuthStore((s) => s.user);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  // null = default view (confirmed + from today), otherwise the selected status
  const [statusFilter, setStatusFilter] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null); // appt being cancelled
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);
  const [videoAppt, setVideoAppt]       = useState(null);
  const [payingAppt, setPayingAppt]     = useState(null);
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [expandedApptId, setExpandedApptId] = useState(null);
  // Attachments modal
  const [docsAppt, setDocsAppt]         = useState(null);
  const [linkedDocs, setLinkedDocs]     = useState([]);
  const [docsLoading, setDocsLoading]   = useState(false);
  const [patientProfileId, setPatientProfileId] = useState(null);
  const PAGE_SIZE = 10;

  const load = async (status = statusFilter, currentPage = page) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: PAGE_SIZE, sort: 'asc' };
      if (status) {
        params.status = status;
        // When user explicitly filters, show all dates
      } else {
        // Default view: confirmed appointments from today onwards
        params.status   = APPOINTMENT_STATUS.CONFIRMED;
        params.fromDate = todayIso();
      }
      const { appointments: list, pagination } = await appointmentService.list(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      );
      setAppointments(list);
      if (pagination) setTotal(pagination.total);
    } catch (e) {
      notify.error('Failed to load appointments', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Resolve patient profile once (needed for document APIs) ───────────────
  useEffect(() => {
    patientService.getById(user.id)
      .then((profile) => setPatientProfileId(profile._id))
      .catch(() => {}); // non-critical
  }, [user.id]);

  // ── Load linked documents when docsAppt is set ────────────────────────────
  useEffect(() => {
    if (!docsAppt) { setLinkedDocs([]); return; }
    const linkedIds = new Set((docsAppt.patientMedicalDocumentIds ?? []).map(String));
    if (linkedIds.size === 0) { setLinkedDocs([]); return; }
    setDocsLoading(true);
    // Use the resolved patientProfileId or fall back to fetching profile
    const fetchDocs = patientProfileId
      ? Promise.resolve(patientProfileId)
      : patientService.getById(user.id).then((p) => { setPatientProfileId(p._id); return p._id; });
    fetchDocs
      .then((pid) => medicalReportService.list(pid, { limit: 100 }))
      .then((allDocs) => setLinkedDocs(allDocs.filter((d) => linkedIds.has(String(d._id)))))
      .catch(() => notify.error('Failed to load attachments'))
      .finally(() => setDocsLoading(false));
  }, [docsAppt]);

  const handleCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      await appointmentService.cancel(cancelTarget._id, cancelReason.trim());
      notify.success('Cancellation requested', 'An admin will review your request.');
      setAppointments((prev) =>
        prev.map((a) => a._id === cancelTarget._id
          ? { ...a, status: APPOINTMENT_STATUS.CANCELLATION_REQUESTED }
          : a
        )
      );
      setCancelTarget(null);
      setCancelReason('');
    } catch (e) {
      notify.error('Cancel failed', e.message);
    } finally {
      setCancelling(false);
    }
  };

  const handlePaymentSuccess = (confirmedAppt) => {
    setPayingAppt(null);
    notify.success('Payment successful! Appointment confirmed.');
    setAppointments((prev) =>
      prev.map((a) => a._id === confirmedAppt._id ? { ...a, ...confirmedAppt } : a)
    );
  };

  const handleFilterChange = (val) => {
    // val is undefined when the Select is cleared ("All / upcoming")
    const next = val || null;
    setStatusFilter(next);
    setPage(1);
    load(next, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    load(statusFilter, newPage);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} style={{ margin: 0 }}>My Appointments</Title>
          <Text type="secondary">View and manage all your appointments</Text>
        </div>
        <Link to="/patient/appointments/book">
          <Button type="primary" icon={<CalendarOutlined />}>Book Appointment</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <Select
          allowClear
          placeholder="Upcoming confirmed (default)"
          value={statusFilter || undefined}
          onChange={handleFilterChange}
          className="w-full sm:w-64"
          options={Object.values(APPOINTMENT_STATUS).map((s) => ({
            value: s,
            label: APPOINTMENT_STATUS_LABELS[s],
          }))}
        />
        <Button icon={<ReloadOutlined />} onClick={() => load()}>Refresh</Button>
        <Text type="secondary" className="sm:ml-auto">
          {total} appointment{total !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : appointments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={statusFilter ? `No ${APPOINTMENT_STATUS_LABELS[statusFilter]?.toLowerCase()} appointments` : 'No appointments found'}
        >
          <Link to="/patient/appointments/book">
            <Button type="primary">Book your first appointment</Button>
          </Link>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt._id}
              appt={appt}
              onRequestCancel={(a) => { setCancelTarget(a); setCancelReason(''); }}
              cancelling={cancelling}
              onVideoCall={() => setVideoAppt(appt)}
              onPayNow={() => setPayingAppt(appt)}
              onViewDocs={() => setDocsAppt(appt)}
              patientProfileId={patientProfileId}
              expanded={expandedApptId === appt._id}
              onToggleExpand={(id) =>
                setExpandedApptId((prev) => (prev === id ? null : id))
              }
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={handlePageChange}
            showSizeChanger={false}
            responsive
            showTotal={(t) => `${t} total`}
          />
        </div>
      )}

      {/* Cancel reason modal */}
      <Modal
        title="Request Cancellation"
        open={!!cancelTarget}
        onCancel={() => { setCancelTarget(null); setCancelReason(''); }}
        footer={[
          <Button key="back" disabled={cancelling} onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Back</Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={cancelling}
            disabled={!cancelReason.trim()}
            onClick={handleCancel}
          >
            Submit Request
          </Button>,
        ]}
        destroyOnClose
      >
        <p className="text-gray-600 mb-3">
          Your cancellation request will be reviewed by an admin. Please provide a reason below.
        </p>
        <Input.TextArea
          rows={4}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Schedule conflict, feeling better, need to reschedule — please describe your reason for cancellation."
          maxLength={500}
          showCount
        />
      </Modal>

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

      {/* Payment modal for pending-payment appointments */}
      <PaymentModal
        open={!!payingAppt}
        appointment={payingAppt}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setPayingAppt(null)}
      />

      {/* Attached Documents Modal */}
      <Modal
        open={!!docsAppt}
        title={
          <span className="flex items-center gap-2">
            <PaperClipOutlined className="text-blue-500" />
            Attached Medical Documents
          </span>
        }
        footer={null}
        onCancel={() => setDocsAppt(null)}
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
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={async () => {
                        try {
                          const url = await medicalReportApi.getViewUrl(patientProfileId, doc._id);
                          window.open(url, '_blank');
                        } catch {
                          notify.error('Failed to open document');
                        }
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title="Download" key="dl">
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={async () => {
                        try {
                          await medicalReportApi.download(patientProfileId, doc._id, doc.originalName);
                        } catch {
                          notify.error('Failed to download document');
                        }
                      }}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined className="text-blue-400 text-xl mt-1" />}
                  title={doc.originalName}
                  description={
                    <span className="flex gap-2 flex-wrap">
                      <Tag color="blue">{doc.category?.replace('_', ' ')}</Tag>
                      {doc.description && (
                        <span className="text-gray-500 text-xs">{doc.description}</span>
                      )}
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

function AppointmentCard({
  appt, onRequestCancel, cancelling,
  onVideoCall, onPayNow, onViewDocs,
  patientProfileId, expanded, onToggleExpand,
}) {
  const isCancellable  = CANCELLABLE.includes(appt.status);
  const isVideo        = appt.type === 'video';
  const isConfirmed    = appt.status === APPOINTMENT_STATUS.CONFIRMED;
  const isCompleted    = appt.status === APPOINTMENT_STATUS.COMPLETED;
  const needsPayment   = appt.paymentStatus === 'pending' && appt.status === APPOINTMENT_STATUS.PENDING;
  const hasAttachments = (appt.patientMedicalDocumentIds?.length ?? 0) > 0;
  const hasReport      = isCompleted && (
    appt.consultationNotes?.diagnosis ||
    (appt.prescription?.medications?.length ?? 0) > 0
  );

  return (
    <div>
      <Card
        className={`rounded-2xl shadow-sm border-0 transition-all duration-200 ${
          expanded ? 'ring-1 ring-green-200 shadow-md' : ''
        }`}
        bodyStyle={{ padding: '20px 24px' }}
      >
        {/* ── Top row ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4 flex-1 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isCompleted ? 'bg-green-50' : 'bg-blue-50'
              }`}
            >
              <MedicineBoxOutlined
                className={`text-xl ${isCompleted ? 'text-green-500' : 'text-blue-500'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-gray-800 text-base">{appt.doctorName}</span>
                <Tag color="blue" className="font-mono text-xs">{appt.tokenNumber}</Tag>
              </div>
              <div className="text-sm text-gray-500 mb-2">{appt.doctorSpecialty}</div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <CalendarOutlined />
                  {dayjs.utc(appt.scheduledAt).format('DD MMM YYYY')}
                </span>
                <span className="flex items-center gap-1">
                  <ClockCircleOutlined />
                  {dayjs.utc(appt.scheduledAt).format('h:mm A')}
                </span>
                <span className="flex items-center gap-1">
                  {isVideo ? <VideoCameraOutlined /> : <UserOutlined />}
                  {isVideo ? 'Video Call' : 'In-Person'}
                </span>
              </div>
              {appt.reason && (
                <div className="mt-2 text-sm text-gray-500 truncate max-w-full sm:max-w-md">
                  <span className="font-medium text-gray-600">Reason:</span> {appt.reason}
                </div>
              )}
            </div>
          </div>

          {/* Status tags */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Tag color={APPOINTMENT_STATUS_COLORS[appt.status]}>
              {APPOINTMENT_STATUS_LABELS[appt.status] ?? appt.status}
            </Tag>
            {appt.paymentStatus === 'paid'    && <Tag color="green">Paid</Tag>}
            {appt.paymentStatus === 'pending' && <Tag color="orange">Unpaid</Tag>}
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          {/* Left: transactional actions */}
          <div className="flex flex-wrap items-center gap-2">
            {isConfirmed && isVideo && (
              <Button type="primary" size="small" icon={<VideoCameraOutlined />} onClick={onVideoCall}>
                Join Call
              </Button>
            )}
            {needsPayment && (
              <Button type="primary" size="small" icon={<CreditCardOutlined />} onClick={onPayNow}>
                Pay Now
              </Button>
            )}
            {hasAttachments && (
              <Tooltip title={`Attached documents (${appt.patientMedicalDocumentIds.length})`}>
                <Button size="small" icon={<PaperClipOutlined />} onClick={onViewDocs} />
              </Tooltip>
            )}
            {isCancellable && (
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => onRequestCancel(appt)}
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Right: consultation toggle (all completed appointments) */}
          {isCompleted && (
            <Button
              type={expanded ? 'primary' : 'default'}
              ghost={expanded}
              icon={expanded ? <UpOutlined /> : <FileDoneOutlined />}
              onClick={() => onToggleExpand(appt._id)}
              style={
                !expanded
                  ? { borderColor: '#16a34a', color: '#15803d', background: '#f0fdf4' }
                  : { borderColor: '#16a34a', color: '#15803d' }
              }
            >
              {expanded ? 'Close Report' : 'View Consultation'}
              {!expanded && hasReport && (
                <span className="ml-1.5 inline-flex w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* ── Expandable consultation panel ── */}
      {expanded && isCompleted && (
        <PatientConsultationPanel appt={appt} patientProfileId={patientProfileId} />
      )}
    </div>
  );
}
