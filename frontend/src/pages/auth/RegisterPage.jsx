import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, Row, Col } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { token, user } = await authService.register({ ...values, role: ROLES.PATIENT });
      setAuth(token, user);
      notify.success('Account created!', `Welcome to UrbanCare, ${user.firstName}`);
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (err) {
      // Show the exact message from the backend (e.g. "Email is already registered")
      notify.error('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <Card
        className="w-full shadow-2xl rounded-2xl"
        style={{ maxWidth: 520, border: 'none' }}
        bodyStyle={{ padding: '40px 40px 32px' }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            Create Account
          </Title>
          <Text type="secondary" className="text-sm">
            Join UrbanCare today
          </Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} size="large" requiredMark={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[
                  { required: true, message: 'Required' },
                  { min: 2, message: 'Min 2 characters' },
                ]}
              >
                <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Isuka" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[
                  { required: true, message: 'Required' },
                  { min: 2, message: 'Min 2 characters' },
                ]}
              >
                <Input placeholder="Wataliyadda" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="you@gmail.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Minimum 8 characters' },
              {
                pattern: /[A-Z]/,
                message: 'Must contain at least one uppercase letter',
              },
              {
                pattern: /[0-9]/,
                message: 'Must contain at least one number',
              },
              {
                pattern: /[!@#$%^&*(),.?":{}|<>]/,
                message: 'Must contain at least one special character',
              },
            ]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Min 8 chars, uppercase, number, symbol" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Re-enter your password" />
          </Form.Item>

          <Form.Item
            name="phoneNumber"
            label="Phone Number"
            rules={[{ required: true, message: 'Phone number is required' }]}
          >
            <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="+947XXXXXXXXX" />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-11 font-semibold"
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text type="secondary" className="text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
