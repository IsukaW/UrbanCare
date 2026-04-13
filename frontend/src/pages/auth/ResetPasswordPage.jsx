import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Card, Progress } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/common/auth.service';
import { notify } from '../../utils/notify';
import logo from '../../images/UrbanCare_logo.png';

const { Title, Text } = Typography;

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)', test: (p) => /\d/.test(p) },
  { label: 'One special character (!@#…)', test: (p) => /[\W_]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const percent = Math.round((passed / PASSWORD_RULES.length) * 100);
  const strokeColor =
    percent < 40 ? '#ef4444' : percent < 80 ? '#f59e0b' : '#22c55e';

  return (
    <div className="mt-1 mb-3">
      <Progress percent={percent} strokeColor={strokeColor} showInfo={false} size="small" />
      <ul className="mt-2 space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = password ? rule.test(password) : false;
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}
            >
              <CheckCircleOutlined className={ok ? 'text-green-500' : 'text-gray-300'} />
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken ?? '';

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!resetToken) navigate('/forgot-password', { replace: true });
  }, [resetToken, navigate]);

  const handleSubmit = async ({ newPassword }) => {
    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      notify.success('Password updated', 'You can now sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      notify.error('Reset failed', err.message);
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
            Set New Password
          </Title>
          <Text type="secondary" className="text-sm">
            Choose a strong password for your account.
          </Text>
        </div>

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          requiredMark={false}
          onValuesChange={({ newPassword }) => {
            if (newPassword !== undefined) setPassword(newPassword);
          }}
        >
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'New password is required' },
              { min: 8, message: 'Must be at least 8 characters' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
                message: 'Password does not meet requirements'
              }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="New password"
            />
          </Form.Item>

          <PasswordStrengthIndicator password={password} />

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                }
              })
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Confirm new password"
            />
          </Form.Item>

          <Form.Item className="mb-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-11 font-semibold"
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text type="secondary" className="text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign In
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
