import React, { useEffect, useState } from 'react';
import {
  Card, Typography, Button, Select, TimePicker, Form, Alert, Spin, message, Tag, Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { doctorService } from '../../services/doctor/doctor.service';
import useAuthStore from '../../store/authStore';
import { DAYS_OF_WEEK } from '../../constants/appointment';

const { Title, Text } = Typography;
const { Option } = Select;

export default function DoctorSchedule() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    doctorService
      .getById(user._id)
      .then((p) => {
        setProfile(p);
        setSchedule(p.schedule ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user._id]);

  const addSlot = (values) => {
    const slot = {
      dayOfWeek: values.dayOfWeek,
      startTime: values.timeRange[0].format('HH:mm'),
      endTime: values.timeRange[1].format('HH:mm'),
    };
    // Prevent duplicates
    if (schedule.some((s) => s.dayOfWeek === slot.dayOfWeek)) {
      message.warning('A slot for this day already exists. Remove it first.');
      return;
    }
    setSchedule((prev) => [...prev, slot].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    form.resetFields();
  };

  const removeSlot = (dayOfWeek) => {
    setSchedule((prev) => prev.filter((s) => s.dayOfWeek !== dayOfWeek));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await doctorService.updateSchedule(user._id, schedule);
      setSchedule(updated.schedule);
      message.success('Schedule saved!');
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Alert
          message="No doctor profile found"
          description="Please create your doctor profile first."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Manage Schedule
        </Title>
        <Text type="secondary">Set your available days and times</Text>
      </div>

      {error && <Alert message={error} type="error" className="mb-4" />}

      {/* Current Schedule */}
      <Card
        className="rounded-2xl shadow-sm border-0 mb-6"
        title="Current Schedule"
        extra={
          <Button type="primary" loading={saving} onClick={handleSave} disabled={!schedule.length}>
            Save Schedule
          </Button>
        }
      >
        {schedule.length === 0 ? (
          <div className="text-center py-6 text-gray-400">No schedule set</div>
        ) : (
          <div className="space-y-2">
            {schedule.map((slot) => {
              const day = DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek);
              return (
                <div
                  key={slot.dayOfWeek}
                  className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="font-semibold text-blue-700">{day?.label}</span>
                    <span className="text-gray-500 text-sm ml-3">
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </div>
                  <Popconfirm
                    title="Remove this day?"
                    onConfirm={() => removeSlot(slot.dayOfWeek)}
                    okText="Remove"
                    okType="danger"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                    />
                  </Popconfirm>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add new slot */}
      <Card className="rounded-2xl shadow-sm border-0" title="Add Availability">
        <Form form={form} layout="inline" onFinish={addSlot}>
          <Form.Item name="dayOfWeek" rules={[{ required: true, message: 'Day required' }]}>
            <Select placeholder="Day" style={{ width: 130 }}>
              {DAYS_OF_WEEK.map((d) => (
                <Option key={d.value} value={d.value}>
                  {d.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="timeRange"
            rules={[{ required: true, message: 'Time required' }]}
          >
            <TimePicker.RangePicker format="HH:mm" minuteStep={15} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              Add
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
