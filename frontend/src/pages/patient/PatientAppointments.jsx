import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Button, Tag, Select, Spin, Empty, Popconfirm, Badge, Tooltip, Pagination,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, UserOutlined,
  CloseCircleOutlined, VideoCameraOutlined, ReloadOutlined,
  MedicineBoxOutlined, CreditCardOutlined,
} from '@ant-design/icons';
import { notify } from '../../utils/notify';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import {
  APPOINTMENT_STATUS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_LABELS,
} from '../../constants/appointment';
import useAuthStore from '../../store/authStore';
import { Link } from 'react-router-dom';
import VideoCall from '../../components/VideoCall';
import PaymentModal from './PaymentModal';

const { Title, Text } = Typography;

const CANCELLABLE = [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING];

export default function PatientAppointments() {
  const user = useAuthStore((s) => s.user);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelling, setCancelling]     = useState(null);
  const [videoAppt, setVideoAppt]       = useState(null);
  const [payingAppt, setPayingAppt]     = useState(null);
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const PAGE_SIZE = 10;

  const load = async (status = statusFilter, currentPage = page) => {
    setLoading(true);
    try {
      const { appointments: list, pagination } = await appointmentService.list(
        Object.fromEntries(
          Object.entries({ ...(status ? { status } : {}), page: currentPage, limit: PAGE_SIZE })
            .filter(([, v]) => v)
        )
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

  const handleCancel = async (appt) => {
    setCancelling(appt._id);
    try {
      await appointmentService.cancel(appt._id, 'Cancelled by patient');
      notify.success('Appointment cancelled');
      setAppointments((prev) =>
        prev.map((a) => a._id === appt._id ? { ...a, status: 'cancelled' } : a)
      );
    } catch (e) {
      notify.error('Cancel failed', e.message);
    } finally {
      setCancelling(null);
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
    setStatusFilter(val);
    setPage(1);
    load(val, 1);
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
          placeholder="Filter by status"
          value={statusFilter || undefined}
          onChange={handleFilterChange}
          className="w-full sm:w-56"
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
              onCancel={handleCancel}
              cancelling={cancelling}
              onVideoCall={() => setVideoAppt(appt)}
              onPayNow={() => setPayingAppt(appt)}
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
    </div>
  );
}

function AppointmentCard({ appt, onCancel, cancelling, onVideoCall, onPayNow }) {
  const isCancellable  = CANCELLABLE.includes(appt.status);
  const isVideo        = appt.type === 'video';
  const isConfirmed    = appt.status === APPOINTMENT_STATUS.CONFIRMED;
  const needsPayment   = appt.paymentStatus === 'pending' && appt.status === APPOINTMENT_STATUS.PENDING;

  return (
    <Card
      className="rounded-2xl shadow-sm border-0"
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: main info */}
        <div className="flex gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <MedicineBoxOutlined className="text-blue-500 text-xl" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Doctor + token */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-800 text-base">{appt.doctorName}</span>
              <Tag color="blue" className="font-mono text-xs">{appt.tokenNumber}</Tag>
            </div>

            <div className="text-sm text-gray-500 mb-2">{appt.doctorSpecialty}</div>

            {/* Date / time / type */}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <CalendarOutlined />
                {dayjs(appt.scheduledAt).format('DD MMM YYYY')}
              </span>
              <span className="flex items-center gap-1">
                <ClockCircleOutlined />
                {dayjs(appt.scheduledAt).format('h:mm A')}
              </span>
              <span className="flex items-center gap-1">
                {isVideo ? <VideoCameraOutlined /> : <UserOutlined />}
                {isVideo ? 'Video Call' : 'In-Person'}
              </span>
            </div>

            {/* Reason */}
            {appt.reason && (
              <div className="mt-2 text-sm text-gray-500 truncate max-w-full sm:max-w-md">
                <span className="font-medium text-gray-600">Reason:</span> {appt.reason}
              </div>
            )}
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 sm:shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
          <div className="flex gap-2 flex-wrap">
            <Tag color={APPOINTMENT_STATUS_COLORS[appt.status]}>
              {APPOINTMENT_STATUS_LABELS[appt.status] ?? appt.status}
            </Tag>
            {appt.paymentStatus === 'paid' && <Tag color="green">Paid</Tag>}
            {appt.paymentStatus === 'pending' && <Tag color="orange">Unpaid</Tag>}
          </div>

          <div className="flex gap-2 flex-wrap">
            {isConfirmed && isVideo && (
              <Button
                type="primary"
                size="small"
                icon={<VideoCameraOutlined />}
                onClick={onVideoCall}
              >
                Join Call
              </Button>
            )}
            {needsPayment && (
              <Button
                type="primary"
                size="small"
                icon={<CreditCardOutlined />}
                onClick={onPayNow}
              >
                Pay Now
              </Button>
            )}
            {isCancellable && (
              <Popconfirm
                title="Cancel this appointment?"
                description="This action cannot be undone."
                onConfirm={() => onCancel(appt)}
                okText="Yes, cancel"
                okType="danger"
              >
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  loading={cancelling === appt._id}
                >
                  Cancel
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
