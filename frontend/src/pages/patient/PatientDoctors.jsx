import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button, Tag, Spin, Input, Select, Empty, Avatar,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointment/appointment.service';
import { documentService } from '../../services/common/document.service';
import { notify } from '../../utils/notify';

const { Title, Text } = Typography;
const { Option } = Select;

// fetches the doctor's profile photo and shows it; falls back to an icon avatar
function DoctorAvatar({ documentId, size = 72 }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!documentId) return;
    let url = null;
    documentService.getViewUrl(documentId)
      .then((objectUrl) => { url = objectUrl; setSrc(objectUrl); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [documentId]);

  return (
    <Avatar
      size={size}
      src={src || undefined}
      icon={!src ? <UserOutlined /> : undefined}
      className="mb-3"
      style={{ background: src ? 'transparent' : '#1677ff', flexShrink: 0 }}
    />
  );
}

const SPECIALIZATIONS = [
  'Cardiology', 'Neurology', 'Dermatology', 'Orthopedics',
  'Pediatrics', 'Gynecology', 'Psychiatry', 'General Practice',
  'ENT', 'Ophthalmology', 'Urology', 'Oncology', 'Other'
];

export default function PatientDoctors() {
  const navigate = useNavigate();

  const [doctors, setDoctors]         = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [specialty, setSpecialty]     = useState(null);

  // load doctors
  useEffect(() => {
    appointmentService
      .listDoctors()
      .then((data) => {
        setDoctors(data);
        setFiltered(data);
      })
      .catch((e) => notify.error('Failed to load doctors', e.message))
      .finally(() => setLoading(false));
  }, []);

  // filter doctors when search or specialty changes
  useEffect(() => {
    let result = [...doctors];

    if (search.trim()) {
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(search.toLowerCase()) ||
          d.specialization.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (specialty) {
      result = result.filter((d) =>
        d.specialization.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    setFiltered(result);
  }, [search, specialty, doctors]);

  // go to booking form with doctor pre-selected
  const handleBook = (doctorId) => {
    navigate(`/patient/appointments/book?doctorId=${doctorId}`);
  };

  // render
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          Our Doctors
        </Title>
        <Text type="secondary">Browse and book appointments with our specialists</Text>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl shadow-sm border-0 mb-6">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by name or specialty..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 0 }}
            allowClear
          />
          <Select
            placeholder="Filter by specialty"
            value={specialty}
            onChange={setSpecialty}
            allowClear
            style={{ flex: '1 1 180px', minWidth: 0 }}
          >
            {SPECIALIZATIONS.map((s) => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Doctor cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl shadow-sm border-0">
          <Empty description="No doctors found" />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((doctor) => (
            <Col key={doctor._id} xs={24} sm={12} md={8} lg={6}>
              <Card
                className="rounded-2xl shadow-sm border-0 hover:shadow-md transition-all h-full"
                bodyStyle={{ padding: 20 }}
              >
                {/* Avatar + Name */}
                <div className="flex flex-col items-center text-center mb-4">
                  <DoctorAvatar documentId={doctor.profilePhotoDocumentId} size={72} />
                  <div className="font-bold text-gray-800 text-base">
                    {doctor.fullName}
                  </div>
                  <Tag color="blue" className="mt-1">
                    {doctor.specialization}
                  </Tag>
                </div>

                {/* Details */}
                <div className="space-y-1 mb-4">
                  {doctor.yearsOfExperience > 0 && (
                    <div className="text-xs text-gray-500 text-center">
                      {doctor.yearsOfExperience} years of experience
                    </div>
                  )}
                  {doctor.qualifications?.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {doctor.qualifications.slice(0, 2).map((q) => (
                        <Tag key={q} className="text-xs">
                          {q}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                {/* Book button */}
                <Button
                  type="primary"
                  block
                  icon={<CalendarOutlined />}
                  onClick={() => handleBook(doctor._id)}
                >
                  Book Appointment
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}