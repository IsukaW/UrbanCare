import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Typography,
  Spin,
  Alert,
  Button,
  Modal,
  Space,
} from 'antd';
import {
  CalendarOutlined,
  MedicineBoxOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { doctorService } from '../../services/doctor/doctor.service';
import useAuthStore from '../../store/authStore';

const { Title, Text } = Typography;

const SLOT_STARTS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function endFromStart(start) {
  const [h, m] = start.split(':').map(Number);
  return `${pad2(h + 2)}:${pad2(m)}`;
}

function mondayOfWeekContaining(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(date, n) {
  const x = new Date(date.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function slotMatches(s, dayOfWeek, startTime, endTime) {
  return s.dayOfWeek === dayOfWeek && s.startTime === startTime && s.endTime === endTime;
}

function sameWeekMonday(a, b) {
  return a.getTime() === b.getTime();
}

export default function DoctorDashboard() {
  const user = useAuthStore((s) => s.user);
  const doctorId = user?._id ?? user?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [displayWeekStart, setDisplayWeekStart] = useState(() => mondayOfWeekContaining(new Date()));

  const loadProfile = useCallback(() => {
    if (!doctorId) return Promise.resolve();
    return doctorService
      .getById(doctorId)
      .then(setProfile)
      .catch((e) => {
        if (!e.message.includes('404') && !e.message.includes('not found')) {
          setError(e.message);
        }
        setProfile(null);
      });
  }, [doctorId]);

  useEffect(() => {
    if (!doctorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, [doctorId, loadProfile]);

  const schedule = profile?.schedule ?? [];

  const persistSchedule = async (nextSchedule) => {
    if (!doctorId) return;
    setSaving(true);
    try {
      const doc = await doctorService.updateSchedule(doctorId, nextSchedule);
      setProfile(doc);
    } catch (e) {
      setError(e.message || 'Could not update schedule');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const onSlotClick = (dayOfWeek, startTime, endTime) => {
    if (!doctorId || saving) return;
    const exists = schedule.some((s) => slotMatches(s, dayOfWeek, startTime, endTime));

    if (exists) {
      Modal.confirm({
        title: 'Remove availability?',
        content: 'This removes this recurring weekly slot.',
        okText: 'Remove',
        okButtonProps: { danger: true },
        onOk: () => {
          const next = schedule.filter((s) => !slotMatches(s, dayOfWeek, startTime, endTime));
          return persistSchedule(next);
        },
      });
    } else {
      const next = [...schedule, { dayOfWeek, startTime, endTime }];
      persistSchedule(next);
    }
  };

  const mon = displayWeekStart;
  const sun = addDays(mon, 6);
  const weekLabel = `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const thisWeekMonday = mondayOfWeekContaining(new Date());
  const viewingCurrentWeek = sameWeekMonday(mon, thisWeekMonday);

  const goPrevWeek = () => setDisplayWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setDisplayWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setDisplayWeekStart(thisWeekMonday);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Welcome, Dr. {user?.firstName}
          </Title>
          <Text type="secondary">Set your weekly availability and open appointments</Text>
        </div>
        <Space wrap>
          <Link to="/doctor/profile">
            <Button>Profile</Button>
          </Link>
          <Link to="/doctor/appointments">
            <Button type="primary">My appointments</Button>
          </Link>
        </Space>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          closable
          onClose={() => setError('')}
          className="mb-4"
        />
      )}

      {!profile ? (
        <Card className="rounded-2xl shadow-sm border-0 text-center py-12">
          <MedicineBoxOutlined className="text-4xl text-blue-400 mb-3" />
          <Title level={4}>No doctor profile</Title>
          <Text type="secondary" className="block mb-4">
            Complete your profile to manage schedule here.
          </Text>
          <Link to="/doctor/profile">
            <Button type="primary" size="large">
              Go to profile
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card size="small" className="rounded-xl border-slate-100 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Text strong className="text-base">
                {profile.fullName}
              </Text>
              <Text type="secondary">{profile.specialization}</Text>
              <Text type="secondary">{profile.yearsOfExperience ?? 0} yrs experience</Text>
            </div>
          </Card>

          <Card
            className="rounded-2xl shadow-sm border-0"
            title={
              <span className="flex flex-wrap items-center gap-2">
                <CalendarOutlined />
                My schedule
              </span>
            }
            extra={
              <Space wrap size="small">
                <Button icon={<LeftOutlined />} onClick={goPrevWeek} aria-label="Previous week">
                  Previous
                </Button>
                <Button icon={<RightOutlined />} onClick={goNextWeek} aria-label="Next week">
                  Next
                </Button>
                <Button type={viewingCurrentWeek ? 'default' : 'primary'} onClick={goThisWeek}>
                  This week
                </Button>
              </Space>
            }
          >
            <Text type="secondary" className="block mb-3 text-sm">
              <span className="font-medium text-slate-700">{weekLabel}</span>
              {!viewingCurrentWeek && (
                <span className="text-amber-700/90"> · viewing another week · availability still applies every week</span>
              )}
              <span className="block mt-1">
                Monday–Sunday · 2-hour blocks, 6:00 AM–10:00 PM · click a cell to mark available (dark green); click again to remove
              </span>
            </Text>

            <div className="overflow-x-auto">
              <div
                className="grid gap-1 min-w-[640px]"
                style={{
                  gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))',
                }}
              >
                <div />
                {Array.from({ length: 7 }, (_, c) => {
                  const dayDate = addDays(mon, c);
                  return (
                    <div key={c} className="text-center pb-2 border-b border-slate-100">
                      <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
                        {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{dayDate.getDate()}</div>
                    </div>
                  );
                })}

                {SLOT_STARTS.map((start) => {
                  const end = endFromStart(start);
                  return (
                    <React.Fragment key={start}>
                      <div className="text-[10px] text-slate-500 flex items-center justify-end pr-1 text-right leading-tight">
                        {start}
                        <br />
                        {end}
                      </div>
                      {Array.from({ length: 7 }, (_, c) => {
                        const cellDate = addDays(mon, c);
                        const dow = cellDate.getDay();
                        const on = schedule.some((s) => slotMatches(s, dow, start, end));
                        return (
                          <button
                            key={`${dow}-${start}`}
                            type="button"
                            disabled={saving}
                            onClick={() => onSlotClick(dow, start, end)}
                            className={[
                              'min-h-9 rounded-md border text-[0] transition-colors',
                              on
                                ? 'bg-green-800 border-green-950 hover:bg-green-900'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100',
                              saving ? 'opacity-60 cursor-wait' : 'cursor-pointer',
                            ].join(' ')}
                            aria-pressed={on}
                            aria-label={`${cellDate.toDateString()} ${start}–${end}`}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
