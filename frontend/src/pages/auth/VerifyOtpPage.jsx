import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Typography, Card, Alert } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/common/auth.service';
import { notify } from '../../utils/notify';
import logo from '../../images/UrbanCare_logo.png';

const { Title, Text } = Typography;

const OTP_DURATION_SECONDS = 5 * 60; // 5 minutes

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email ?? '';

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_DURATION_SECONDS);
  const [expired, setExpired] = useState(false);

  // Redirect away if no email in state
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      setExpired(true);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  const handleSubmit = async ({ code }) => {
    if (expired) {
      notify.error('Code expired', 'Please request a new code.');
      return;
    }
    setLoading(true);
    try {
      const resetToken = await authService.verifyCode(email, code);
      navigate('/reset-password', { state: { resetToken } });
    } catch (err) {
      notify.error('Verification failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      await authService.forgotPassword(email);
      setSecondsLeft(OTP_DURATION_SECONDS);
      setExpired(false);
      notify.success('Code resent', 'A new code has been sent to your email.');
    } catch (err) {
      notify.error('Resend failed', err.message);
    } finally {
      setResending(false);
    }
  }, [email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card
        className="w-full shadow-2xl rounded-2xl"
        style={{ maxWidth: 440, border: 'none' }}
        bodyStyle={{ padding: '12px 28px 20px' }}
      >
        <div className="text-center mb-3">
          <img
            src={logo}
            alt="UrbanCare"
            style={{ width: 220, height: 'auto', margin: '-30px auto -20px', display: 'block' }}
          />
          <Title level={2} style={{ margin: 0 }}>
            Enter Verification Code
          </Title>
          <Text type="secondary" className="text-sm">
            We sent a 6-digit code to <strong>{email}</strong>
          </Text>
        </div>

        {expired ? (
          <Alert
            type="error"
            message="Code expired"
            description="Your code has expired. Click 'Resend Code' to get a new one."
            showIcon
            className="mb-4"
          />
        ) : (
          <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold mb-6">
            <ClockCircleOutlined />
            <span>
              Code expires in {minutes}:{seconds}
            </span>
          </div>
        )}

        <Form layout="vertical" onFinish={handleSubmit} size="large" requiredMark={false}>
          <Form.Item
            name="code"
            label="6-digit Code"
            rules={[
              { required: true, message: 'Please enter the code' },
              { len: 6, message: 'Code must be exactly 6 digits' },
              { pattern: /^\d+$/, message: 'Code must contain only digits' },
            ]}
          >
            <Input
              placeholder="000000"
              maxLength={6}
              className="text-center text-xl tracking-widest"
            />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={expired}
              block
              className="h-11 font-semibold"
            >
              Verify Code
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-3 flex flex-col gap-2">
          <Button
            type="link"
            loading={resending}
            onClick={handleResend}
            className="text-sm"
          >
            Resend Code
          </Button>
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center justify-center gap-1">
            <ArrowLeftOutlined className="text-xs" /> Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
