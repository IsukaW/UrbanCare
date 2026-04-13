import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/common/auth.service';
import { notify } from '../../utils/notify';
import logo from '../../images/UrbanCare_logo.png';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      // Always navigate regardless of whether the email exists (prevents enumeration)
      navigate('/verify-code', { state: { email } });
    } catch (err) {
      notify.error('Request failed', err.message);
    } finally {
      setLoading(false);
    }
  };

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
            Forgot Password
          </Title>
          <Text type="secondary" className="text-sm">
            Enter your registered email and we&apos;ll send you a reset code.
          </Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} size="large" requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="you@example.com" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-11 font-semibold"
            >
              Send Reset Code
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            <ArrowLeftOutlined className="text-xs" /> Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
