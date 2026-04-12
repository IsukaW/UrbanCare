import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Select, DatePicker, Typography, Spin, Steps, Result,
} from 'antd';
import { notify } from '../../utils/notify';
import { CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { doctorService } from '../../services/doctor/doctor.service';
import { appointmentService } from '../../services/appointment/appointment.service';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function BookAppointment() {
  const user = useAuthStore((s) => s.user);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    doctorService
      .list()
      .then(setDoctors)
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoadingDoctors(false));
  }, []);

  const handleBook = async (values) => {
    setSaving(true);
    try {
      const payload = {
        patientId: user.id,
        doctorId: values.doctorId,
        scheduledAt: values.scheduledAt.toISOString(),
        reason: values.reason,
        patientEmail: user.email,
        patientPhoneNumber: user.phoneNumber,
      };
      const appt = await appointmentService.create(payload);
      setSuccess(appt);
      form.resetFields();
    } catch (e) {
      notify.error('Booking failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="p-6">
        <Card className="rounded-2xl shadow-sm border-0 max-w-lg mx-auto">
          <Result
            status="success"
            title="Appointment Booked!"
            subTitle={
              <div>
                <div>
                  Scheduled for{' '}
                  <strong>
                    {dayjs(success.scheduledAt).format('DD MMM YYYY, HH:mm')}
                  </strong>
                </div>
                <div className="text-xs text-gray-400 mt-1">ID: {success._id}</div>
              </div>
            }
            extra={[
              <Button type="primary" key="book" onClick={() => setSuccess(null)}>
                Book Another
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Book Appointment
        </Title>
        <Text type="secondary">Schedule a visit with a doctor</Text>
      </div>

      <Card className="rounded-2xl shadow-sm border-0 max-w-lg">
        {loadingDoctors ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleBook} size="large">
            <Form.Item
              name="doctorId"
              label="Select Doctor"
              rules={[{ required: true, message: 'Please select a doctor' }]}
            >
              <Select
                placeholder="Choose a doctor"
                showSearch
                optionFilterProp="children"
              >
                {doctors.map((d) => (
                  <Option key={d._id} value={d._id}>
                    Dr. {d.fullName} — {d.specialization}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="scheduledAt"
              label="Date & Time"
              rules={[{ required: true, message: 'Please select a date and time' }]}
            >
              <DatePicker
                showTime={{ format: 'HH:mm', minuteStep: 15 }}
                format="DD MMM YYYY HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Reason for Visit"
              rules={[{ required: true, message: 'Please describe your reason' }]}
            >
              <TextArea
                rows={3}
                placeholder="Describe your symptoms or reason for the visit…"
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
              icon={<CalendarOutlined />}
              className="h-11"
            >
              Book Appointment
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
