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
    <div className="p-6 h-full">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>Book Appointment</Title>
        <Text type="secondary">Schedule a visit with a doctor</Text>
      </div>

      {loadingDoctors ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleBook} size="large">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left column ── */}
            <div className="flex flex-col gap-6">

              {/* Doctor */}
              <Card className="rounded-2xl shadow-sm border-0">
                <div className="mb-4 font-semibold text-base text-gray-700">Select Doctor</div>
                <Form.Item
                  name="doctorId"
                  rules={[{ required: true, message: 'Please select a doctor' }]}
                  style={{ marginBottom: 0 }}
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
              </Card>

              {/* Date */}
              <Card className="rounded-2xl shadow-sm border-0">
                <div className="mb-4 font-semibold text-base text-gray-700">Select Date</div>
                <Form.Item
                  name="date"
                  rules={[{ required: true, message: 'Please select a date' }]}
                  style={{ marginBottom: 0 }}
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
              </Card>

              {/* Time Slots */}
              <Card className="rounded-2xl shadow-sm border-0 flex-1">
                <div className="mb-4 font-semibold text-base text-gray-700">Available Time Slots</div>
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
              </Card>
            </div>

            {/* ── Right column ── */}
            <div className="flex flex-col gap-6">

              {/* Appointment Type */}
              <Card className="rounded-2xl shadow-sm border-0">
                <div className="mb-4 font-semibold text-base text-gray-700">Appointment Type</div>
                <Form.Item
                  name="type"
                  initialValue="in-person"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                    <Radio.Button value="in-person" style={{ width: '50%', textAlign: 'center' }}>In-Person</Radio.Button>
                    <Radio.Button value="video" style={{ width: '50%', textAlign: 'center' }}>Video Call</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Card>

              {/* Reason */}
              <Card className="rounded-2xl shadow-sm border-0 flex-1">
                <div className="mb-4 font-semibold text-base text-gray-700">Reason for Visit</div>
                <Form.Item
                  name="reason"
                  rules={[
                    { required: true, message: 'Please describe your reason' },
                    { min: 3, message: 'At least 3 characters required' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <TextArea
                    rows={8}
                    placeholder="Describe your symptoms or reason for the visit…"
                    maxLength={500}
                    showCount
                    style={{ resize: 'none' }}
                  />
                </Form.Item>
              </Card>

              {/* Submit */}
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                block
                icon={<CalendarOutlined />}
                style={{ height: 48 }}
              >
                Book Appointment
              </Button>
            </div>

          </div>
        </Form>
      )}
    </div>
  );
}