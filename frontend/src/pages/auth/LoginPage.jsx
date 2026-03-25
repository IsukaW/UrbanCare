import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/common/auth.service';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../constants/roles';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;

const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.DOCTOR]: '/doctor/dashboard',
  [ROLES.PATIENT]: '/patient/dashboard',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { token, user } = await authService.login(values);
      setAuth(token, user);
      notify.success('Welcome back!', `Signed in as ${user.firstName}`);
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (err) {
      // Show the exact message from the backend (e.g. "Invalid email or password")
      notify.error('Sign in failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card
        className="w-full shadow-2xl rounded-2xl"
        style={{ maxWidth: 440, border: 'none' }}
        bodyStyle={{ padding: '40px 40px 32px' }}
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            UrbanCare
          </Title>
          <Text type="secondary" className="text-sm">
            Sign in to your account
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

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="••••••••" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-11 font-semibold"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text type="secondary" className="text-sm">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
              Register
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
