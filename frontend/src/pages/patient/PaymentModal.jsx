import React, { useState } from 'react';
import { Modal, Button, Divider, Typography, Tag, Spin, Alert } from 'antd';
import {
  CreditCardOutlined,
  LockOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';

const { Text, Title } = Typography;

const CONSULTATION_FEE = 500; // LKR

/**
 * PaymentModal — shown after a pending appointment is created.
 *
 * Props:
 *   open          boolean
 *   appointment   { _id, doctorName, doctorSpecialty, scheduledAt, tokenNumber, type }
 *   onSuccess     (confirmedAppointment) => void
 *   onCancel      () => void
 */
export default function PaymentModal({ open, appointment, onSuccess, onCancel }) {
  const [step, setStep] = useState('review'); // 'review' | 'processing' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const appt = appointment || {};

  const handlePay = async () => {
    setStep('processing');
    setErrorMsg('');
    try {
      // 1. Create a Stripe PaymentIntent for this appointment
      const intent = await appointmentService.createPaymentIntent(appt._id, CONSULTATION_FEE);

      // 2. Confirm it server-side using a Stripe test payment method
      await appointmentService.confirmPaymentIntent(intent.paymentIntentId, 'pm_card_visa');

      // 3. Mark the appointment as confirmed in our system
      const confirmed = await appointmentService.confirmPayment(appt._id, intent.paymentIntentId);

      setStep('success');
      setTimeout(() => onSuccess(confirmed), 1500);
    } catch (e) {
      setErrorMsg(e.message || 'Payment failed. Please try again.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('review');
    setErrorMsg('');
  };

  return (
    <Modal
      open={open}
      onCancel={step === 'processing' ? undefined : onCancel}
      footer={null}
      closable={step !== 'processing'}
      maskClosable={step !== 'processing'}
      width={440}
      centered
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          <CreditCardOutlined className="text-blue-500 text-lg" />
        </div>
        <div>
          <Title level={5} style={{ margin: 0 }}>Complete Payment</Title>
          <Text type="secondary" className="text-xs">Secure payment powered by Stripe</Text>
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* ── Appointment Summary ─────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-50 p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <Text type="secondary">Doctor</Text>
          <Text strong>{appt.doctorName}</Text>
        </div>
        <div className="flex justify-between text-sm">
          <Text type="secondary">Specialty</Text>
          <Text>{appt.doctorSpecialty}</Text>
        </div>
        {appt.scheduledAt && (
          <div className="flex justify-between text-sm">
            <Text type="secondary">Date & Time</Text>
            <Text>{dayjs.utc(appt.scheduledAt).format('DD MMM YYYY, h:mm A')}</Text>
          </div>
        )}
        {appt.tokenNumber && (
          <div className="flex justify-between text-sm">
            <Text type="secondary">Token</Text>
            <Tag color="blue">#{appt.tokenNumber}</Tag>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <Text type="secondary">Type</Text>
          <Tag color={appt.type === 'video' ? 'purple' : 'green'}>
            {appt.type === 'video' ? 'Video Call' : 'In-Person'}
          </Tag>
        </div>
      </div>

      {/* ── Simulated Card Display ──────────────────────────────────── */}
      {(step === 'review' || step === 'error') && (
        <div
          className="rounded-xl p-4 mb-4 text-white"
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)' }}
        >
          <div className="flex justify-between items-start mb-6">
            <CreditCardOutlined style={{ fontSize: 28, opacity: 0.9 }} />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>TEST CARD</Text>
          </div>
          <div className="font-mono text-base tracking-widest mb-4">
            4242  4242  4242  4242
          </div>
          <div className="flex justify-between text-xs" style={{ opacity: 0.85 }}>
            <div>
              <div style={{ opacity: 0.7 }}>CARDHOLDER</div>
              <div>Test User</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>EXPIRES</div>
              <div>12/26</div>
            </div>
            <div>
              <div style={{ opacity: 0.7 }}>CVV</div>
              <div>123</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Amount ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-4">
        <Text type="secondary">Consultation Fee</Text>
        <Title level={4} style={{ margin: 0, color: '#1d4ed8' }}>
          LKR {CONSULTATION_FEE.toLocaleString()}.00
        </Title>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* ── States ─────────────────────────────────────────────────── */}
      {step === 'processing' && (
        <div className="flex flex-col items-center py-6 gap-3">
          <Spin size="large" />
          <Text type="secondary">Processing payment…</Text>
        </div>
      )}

      {step === 'success' && (
        <div className="flex flex-col items-center py-6 gap-3">
          <CheckCircleOutlined style={{ fontSize: 48, color: '#22c55e' }} />
          <Title level={5} style={{ margin: 0, color: '#22c55e' }}>Payment Successful!</Title>
          <Text type="secondary">Your appointment has been confirmed.</Text>
        </div>
      )}

      {step === 'error' && (
        <Alert
          type="error"
          message="Payment Failed"
          description={errorMsg}
          showIcon
          className="rounded-xl mb-4"
        />
      )}

      {/* ── Actions ────────────────────────────────────────────────── */}
      {(step === 'review' || step === 'error') && (
        <div className="flex gap-3">
          <Button
            block
            onClick={onCancel}
            size="large"
            style={{ borderRadius: 10 }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            block
            size="large"
            icon={<LockOutlined />}
            onClick={step === 'error' ? handleRetry : handlePay}
            style={{ borderRadius: 10, background: '#1d4ed8', borderColor: '#1d4ed8' }}
          >
            {step === 'error' ? 'Retry Payment' : `Pay LKR ${CONSULTATION_FEE.toLocaleString()}`}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center gap-1 mt-3">
        <LockOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>256-bit SSL secured · Stripe test mode</Text>
      </div>
    </Modal>
  );
}
