import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Select, DatePicker,
  Typography, Spin, Tag, Radio, Alert, Tooltip, Upload, message,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  UploadOutlined,
  PaperClipOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { appointmentService } from '../../services/appointment/appointment.service';
import { patientService } from '../../services/patient/patient.service';
import { medicalReportService } from '../../services/patient/medicalReport.service';
import useAuthStore from '../../store/authStore';
import { notify } from '../../utils/notify';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PaymentModal from './PaymentModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function BookAppointment() {
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [doctors, setDoctors]               = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate]     = useState(null);
  const [slots, setSlots]                   = useState([]);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [selectedSlot, setSelectedSlot]     = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [form]                              = Form.useForm();
  const [pendingAppointment, setPendingAppointment] = useState(null);
  const [patientProfileId, setPatientProfileId] = useState(null);
  const [medicalRecords, setMedicalRecords]     = useState([]);
  const [loadingRecords, setLoadingRecords]     = useState(true);
  const [recordsError, setRecordsError]         = useState(false);
  // New files the patient wants to upload directly at booking time
  const [newFiles, setNewFiles]     = useState([]); // [{ uid, file, name, status, docId }]
  const [uploading, setUploading]   = useState(false);

  // load patient profile + medical records on mount
  useEffect(() => {
    patientService
      .getById(user.id)
      .then((profile) => {
        setPatientProfileId(profile._id);
        return medicalReportService.list(profile._id);
      })
      .then((records) => {
        setMedicalRecords(Array.isArray(records) ? records : []);
      })
      .catch(() => setRecordsError(true))
      .finally(() => setLoadingRecords(false));
  }, []);

  // load all doctors on mount
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

  // fetch slots when doctor + date selected
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

  // book
  const handleBook = async (values) => {
    if (!selectedSlot) {
      notify.error('No slot selected', 'Please select a time slot.');
      return;
    }

    setSaving(true);
    try {
      // 1. Upload any newly added files first so we have their IDs
      const uploadedIds = [];
      if (newFiles.length > 0 && patientProfileId) {
        setUploading(true);
        for (const item of newFiles) {
          if (item.docId) {
            // Already uploaded (fast re-submit)
            uploadedIds.push(item.docId);
            continue;
          }
          try {
            const result = await medicalReportService.upload(patientProfileId, item.file, {
              category: 'other',
              description: `Attached during appointment booking`,
            });
            uploadedIds.push(result._id ?? result.data?._id);
            // Mark as done in local state
            setNewFiles((prev) =>
              prev.map((f) => f.uid === item.uid ? { ...f, docId: result._id ?? result.data?._id, status: 'done' } : f)
            );
          } catch (uploadErr) {
            notify.error('File upload failed', `${item.name}: ${uploadErr.message}`);
            setSaving(false);
            setUploading(false);
            return;
          }
        }
        setUploading(false);
      }

      // 2. Combine: selected existing records + newly uploaded IDs
      const allDocIds = [...(values.medicalRecords ?? []), ...uploadedIds];

      // 3. Book the appointment
      const appointment = await appointmentService.book({
        patientId: user.id,
        doctorId: selectedDoctor,
        slotId: selectedSlot.slotId,
        type: values.type,
        reason: values.reason,
        patientEmail: user.email,
        patientPhoneNumber: user.phoneNumber,
        patientMedicalDocumentIds: allDocIds,
      });

      // Show payment modal before confirming
      setPendingAppointment(appointment);
    } catch (e) {
      notify.error('Booking failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    form.resetFields();
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setNewFiles([]);
  };

  const handlePaymentSuccess = (confirmedAppointment) => {
    setPendingAppointment(null);
    resetForm();
    notify.success(
      'Appointment Confirmed!',
      `Token #${confirmedAppointment?.tokenNumber || ''} — Payment received.`
    );
    navigate('/patient/appointments');
  };

  const handlePaymentCancel = () => {
    setPendingAppointment(null);
    // Appointment was created (pending) but not paid — user can try again or it stays pending
    notify.warning(
      'Payment Cancelled',
      'Your appointment is pending payment. You can complete it later.'
    );
    resetForm();
  };

  // render
  return (
    <div className="p-6 h-full">
      <PaymentModal
        open={!!pendingAppointment}
        appointment={pendingAppointment}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
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
                            {d.fullName}
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

              {/* Medical Records */}
              <Card className="rounded-2xl shadow-sm border-0">
                <div className="mb-1 font-semibold text-base text-gray-700">Attach Medical Documents</div>
                <div className="mb-3 text-xs text-gray-400">
                  Optional — share relevant documents with the doctor.
                </div>

                {/* ── Upload new files ── */}
                <div className="mb-4">
                  <div className="text-xs text-gray-500 font-medium mb-2">Upload new files</div>
                  <Upload
                    multiple
                    beforeUpload={(file) => {
                      const isAllowed =
                        file.type === 'application/pdf' ||
                        file.type.startsWith('image/');
                      if (!isAllowed) {
                        message.error(`${file.name} is not a PDF or image.`);
                        return Upload.LIST_IGNORE;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        message.error(`${file.name} exceeds 10 MB.`);
                        return Upload.LIST_IGNORE;
                      }
                      setNewFiles((prev) => [
                        ...prev,
                        { uid: file.uid, file, name: file.name, status: 'ready', docId: null },
                      ]);
                      return false; // prevent auto-upload; we upload on submit
                    }}
                    onRemove={(file) =>
                      setNewFiles((prev) => prev.filter((f) => f.uid !== file.uid))
                    }
                    fileList={newFiles.map((f) => ({
                      uid: f.uid,
                      name: f.name,
                      status: f.status === 'done' ? 'done' : 'ready',
                    }))}
                    accept=".pdf,image/*"
                    showUploadList={{
                      showRemoveIcon: true,
                      removeIcon: <DeleteOutlined />,
                    }}
                  >
                    <Button icon={<UploadOutlined />} className="w-full" disabled={!patientProfileId}>
                      {patientProfileId ? 'Choose files (PDF / Image)' : 'Loading profile…'}
                    </Button>
                  </Upload>
                </div>

                {/* ── Select from existing records ── */}
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-2">
                    Or select from saved records{' '}
                    <a href="/patient/medical-records" target="_blank" rel="noreferrer"
                      className="text-blue-500 underline">(manage)</a>
                  </div>
                  {recordsError ? (
                    <Alert
                      type="warning"
                      message="Could not load your medical records"
                      description="Make sure your patient profile is set up."
                      showIcon
                      className="rounded-xl"
                    />
                  ) : (
                    <Form.Item name="medicalRecords" style={{ marginBottom: 0 }}>
                      <Select
                        mode="multiple"
                        allowClear
                        loading={loadingRecords}
                        disabled={loadingRecords}
                        placeholder={
                          loadingRecords
                            ? 'Loading your records…'
                            : medicalRecords.length === 0
                            ? 'No saved records found'
                            : 'Select records to attach…'
                        }
                        optionFilterProp="label"
                        options={medicalRecords.map((r) => ({
                          value: r._id,
                          label: `${r.originalName} — ${r.category?.replace('_', ' ')}`,
                        }))}
                        notFoundContent={
                          loadingRecords ? (
                            <div className="flex items-center gap-2 py-2 justify-center">
                              <Spin size="small" />
                              <span className="text-gray-400 text-sm">Loading…</span>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-400 text-sm">
                              No saved records.{' '}
                              <a href="/patient/medical-records" target="_blank" rel="noreferrer"
                                className="text-blue-500 underline">Upload records</a>
                            </div>
                          )
                        }
                      />
                    </Form.Item>
                  )}
                </div>
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