import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, Row, Col, Upload, Divider } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  PhoneOutlined,
  FilePdfOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/common/auth.service';
import useAuthStore from '../../store/authStore';
import { ROLES } from '../../constants/roles';
import { notify } from '../../utils/notify';
import { doctorClient } from '../../utils/httpClients';

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
  const [mode, setMode] = useState('user'); // 'user' | 'doctor'
  const [doctorFileList, setDoctorFileList] = useState([]);

  const handleUserRegister = async (values) => {
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

  const handleDoctorRegister = async (values) => {
    setLoading(true);
    try {
      if (!doctorFileList.length) {
        throw new Error('Please upload at least one certificate PDF.');
      }

      const fd = new FormData();
      fd.append('email', values.email);
      fd.append('password', values.password);
      fd.append('fullName', values.fullName);
      fd.append('specialization', values.specialization);
      if (values.qualifications) fd.append('qualifications', values.qualifications);
      if (values.yearsOfExperience !== undefined && values.yearsOfExperience !== '' && values.yearsOfExperience !== null) {
        fd.append('yearsOfExperience', String(values.yearsOfExperience));
      }
      doctorFileList.forEach((f) => {
        // Ant Upload stores the raw File at originFileObj
        if (f.originFileObj) fd.append('certificates', f.originFileObj);
      });

      await doctorClient.post('/doctors/register', fd);

      notify.success('Request submitted', 'Your sign in request is pending admin approval.');
      setDoctorFileList([]);
    } catch (err) {
      notify.error('Doctor registration failed', err.message);
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
        {/* Curved toggle button */}
        <div className="flex justify-end -mt-2 mb-2">
          <Button
            shape="round"
            type={mode === 'doctor' ? 'primary' : 'default'}
            icon={<MedicineBoxOutlined />}
            onClick={() => setMode((m) => (m === 'doctor' ? 'user' : 'doctor'))}
          >
            {mode === 'doctor' ? 'Register as a User' : 'Sign in as a Doctor'}
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">U</span>
          </div>
          <Title level={2} style={{ margin: 0 }}>
            {mode === 'doctor' ? 'Doctor Registration' : 'Create Account'}
          </Title>
          <Text type="secondary" className="text-sm">
            {mode === 'doctor' ? 'Submit a request to join as a doctor' : 'Join UrbanCare today'}
          </Text>
        </div>

        {mode === 'doctor' ? (
          <Form layout="vertical" onFinish={handleDoctorRegister} size="large" requiredMark={false}>
            <Form.Item
              name="email"
              label="Email (Username)"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email (e.g. name@gmail.com)' },
              ]}
            >
              <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="name@gmail.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }, { min: 8, message: 'Minimum 8 characters' }]}
              hasFeedback
            >
              <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Min 8 characters" />
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
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Re-enter your password" />
            </Form.Item>

            <Divider className="my-3" />

            <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Full name is required' }]}>
              <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Dr. Shehan Niral" />
            </Form.Item>

            <Form.Item
              name="specialization"
              label="Specialization"
              rules={[{ required: true, message: 'Specialization is required' }]}
            >
              <Input placeholder="e.g., Cardiology" />
            </Form.Item>

            <Form.Item name="qualifications" label="Qualifications (comma separated)">
              <Input placeholder="MBBS, MD, ..." />
            </Form.Item>

            <Form.Item name="yearsOfExperience" label="Years of Experience">
              <Input type="number" min={0} placeholder="0" />
            </Form.Item>

            <Divider className="my-3" />

            <Form.Item label="Certificates (PDF)" required>
              <Upload
                multiple
                accept="application/pdf,.pdf"
                fileList={doctorFileList}
                onChange={({ fileList }) => setDoctorFileList(fileList)}
                beforeUpload={(file) => {
                  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
                  if (!isPdf) {
                    notify.error('Invalid file', 'Only PDF files are allowed.');
                    return Upload.LIST_IGNORE;
                  }
                  return false; // prevent auto upload (we submit as FormData on form submit)
                }}
              >
                <Button icon={<FilePdfOutlined />}>Upload certificate PDFs</Button>
              </Upload>
              <Text type="secondary" className="text-xs block mt-2">
                Upload qualification certificate PDFs as proof (at least 1 file required).
              </Text>
            </Form.Item>

            <Form.Item className="mb-2">
              <Button type="primary" htmlType="submit" loading={loading} block className="h-11 font-semibold">
                Submit for Approval
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form layout="vertical" onFinish={handleUserRegister} size="large" requiredMark={false}>
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
                { pattern: /[A-Z]/, message: 'Must contain at least one uppercase letter' },
                { pattern: /[0-9]/, message: 'Must contain at least one number' },
                { pattern: /[!@#$%^&*(),.?\":{}|<>]/, message: 'Must contain at least one special character' },
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
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
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
              <Button type="primary" htmlType="submit" loading={loading} block className="h-11 font-semibold">
                Create Account
              </Button>
            </Form.Item>
          </Form>
        )}

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
