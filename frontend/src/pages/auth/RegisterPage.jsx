import React, { useState } from 'react';
import { Form, Input, Button, Select, Typography, Alert, Card, Row, Col } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/common/auth.service';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../constants/roles';

const { Title, Text } = Typography;
const { Option } = Select;

const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.DOCTOR]: '/doctor/dashboard',
  [ROLES.PATIENT]: '/patient/dashboard',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authService.register(values);
      setAuth(token, user);
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
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

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            className="mb-6"
            onClose={() => setError('')}
          />
        )}

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
                <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="John" />
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
                <Input placeholder="Doe" />
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
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Minimum 8 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Min 8 characters" />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Phone Number (optional)">
            <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="+1234567890" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select placeholder="Select your role">
              <Option value={ROLES.PATIENT}>Patient</Option>
              <Option value={ROLES.DOCTOR}>Doctor</Option>
              <Option value={ROLES.ADMIN}>Admin</Option>
            </Select>
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
