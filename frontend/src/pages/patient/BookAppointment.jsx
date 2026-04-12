import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Select, DatePicker,
  Typography, Spin, Tag, Radio, Alert,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';
import { useSearchParams } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function BookAppointment() {
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();

  const [doctors, setDoctors]               = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate]     = useState(null);
  const [slots, setSlots]                   = useState([]);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [selectedSlot, setSelectedSlot]     = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [form]                              = Form.useForm();

  // ── Load all doctors on mount ─────────────────────────────────────────────
  useEffect(() => {
    appointmentService
      .listDoctors()
      .then((data) => {
        setDoctors(data);
        const preselectedId = searchParams.get('doctorId');
        if (preselectedId) {
          setSelectedDoctor(preselectedId);
          form.setFieldValue('doctorId', preselectedId);
        }
      })
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoadingDoctors(false));
  }, []);

  // ── Fetch slots when doctor + date selected ───────────────────────────────
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);

    appointmentService
      .getDoctorSlots(selectedDoctor, dateStr)
      .then((res) => {
        const available = res.slots ?? [];
        setSlots(available);
        if (available.length === 0) {
          notify.warning(
            'No slots available',
            `No available slots on ${dayjs(selectedDate).format('DD MMM YYYY')}. Try another date.`
          );
        }
      })
      .catch((e) => notify.error('Failed to check availability', e.message))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, selectedDate]);

  // ── Book ──────────────────────────────────────────────────────────────────
  const handleBook = async (values) => {
    if (!selectedSlot) {
      notify.error('No slot selected', 'Please select a time slot.');
      return;
    }

    setSaving(true);
    try {
      await appointmentService.book({
        patientId: user.id,
        doctorId: selectedDoctor,
        slotId: selectedSlot.slotId,
        type: values.type,
        reason: values.reason,
        patientEmail: user.email,
        patientPhoneNumber: user.phoneNumber,
      });

      notify.success('Appointment Booked!', 'Your appointment has been submitted successfully.');
      form.resetFields();
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSlots([]);
      setSelectedSlot(null);
    } catch (e) {
      notify.error('Booking failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>Book Appointment</Title>
        <Text type="secondary">Schedule a visit with a doctor</Text>
      </div>

      <Card className="rounded-2xl shadow-sm border-0 max-w-2xl">
        {loadingDoctors ? (
          <div className="flex justify-center py-10"><Spin /></div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleBook} size="large">

            {/* Doctor */}
            <Form.Item
              name="doctorId"
              label="Doctor"
              rules={[{ required: true, message: 'Please select a doctor' }]}
            >
              <Select
                placeholder="Search by name or specialty"
                showSearch
                optionFilterProp="children"
                onChange={(val) => {
                  setSelectedDoctor(val);
                  setSelectedDate(null);
                  setSlots([]);
                  setSelectedSlot(null);
                  form.setFieldValue('date', null);
                }}
              >
                {doctors.map((d) => (
                  <Option key={d._id} value={d._id}>
                    <div className="flex items-center gap-2">
                      <UserOutlined className="text-blue-400" />
                      <span>
                        Dr. {d.fullName}
                        <span className="text-gray-400 text-xs ml-2">— {d.specialization}</span>
                      </span>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Date */}
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select a date' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD MMM YYYY"
                disabled={!selectedDoctor}
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                onChange={(val) => setSelectedDate(val)}
                placeholder={selectedDoctor ? 'Select date' : 'Select a doctor first'}
              />
            </Form.Item>

            {/* Time Slots */}
            <Form.Item label="Available Time Slots">
              {!selectedDoctor || !selectedDate ? (
                <div className="text-gray-400 text-sm py-2">
                  Select a doctor and date to see available slots.
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center gap-2 py-2">
                  <Spin size="small" />
                  <span className="text-gray-400 text-sm">Checking availability...</span>
                </div>
              ) : slots.length === 0 ? (
                <Alert
                  type="warning"
                  message="No available slots on this date"
                  description="Please try a different date."
                  showIcon
                  className="rounded-xl"
                />
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {slots.map((slot) => {
                      const available = slot.availableTokens ?? (slot.maxTokens - slot.reservedTokens);
                      const isFull    = available <= 0;
                      const isSelected = selectedSlot?.slotId === slot.slotId;

                      return (
                        <div
                          key={slot.slotId}
                          onClick={() => !isFull && setSelectedSlot(slot)}
                          className={`
                            border rounded-xl p-3 transition-all
                            ${isFull ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:border-blue-400'}
                            ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                          `}
                        >
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <ClockCircleOutlined className="text-blue-400" />
                            {slot.startTime} — {slot.endTime}
                          </div>
                          <div className="mt-1">
                            {isFull ? (
                              <Tag color="red">Fully Booked</Tag>
                            ) : (
                              <Tag color="green">
                                {available} slot{available !== 1 ? 's' : ''} available
                              </Tag>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedSlot && (
                    <Alert
                      type="success"
                      message={`Selected: ${selectedSlot.startTime} — ${selectedSlot.endTime}`}
                      showIcon
                      className="rounded-xl"
                    />
                  )}
                </div>
              )}
            </Form.Item>

            {/* Appointment Type */}
            <Form.Item
              name="type"
              label="Appointment Type"
              initialValue="in-person"
              rules={[{ required: true }]}
            >
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="in-person">In-Person</Radio.Button>
                <Radio.Button value="video">Video Call</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {/* Reason */}
            <Form.Item
              name="reason"
              label="Reason for Visit"
              rules={[
                { required: true, message: 'Please describe your reason' },
                { min: 3, message: 'At least 3 characters required' },
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Describe your symptoms or reason for the visit…"
                maxLength={500}
                showCount
              />
            </Form.Item>

            {/* Submit */}
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