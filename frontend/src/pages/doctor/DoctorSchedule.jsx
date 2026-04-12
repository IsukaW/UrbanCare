import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card,
  Typography,
  Spin,
  Alert,
  Button,
  Modal,
  Space,
  Tag,
} from 'antd';
import { CalendarOutlined, MedicineBoxOutlined, LeftOutlined, RightOutlined, CheckOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { doctorService } from '../../services/doctor/doctor.service';
import useAuthStore from '../../store/authStore';
import { fetchDoctorProfileForSession } from '../../utils/doctorSession';
import {
  mondayOfWeekContaining,
  formatWeekStartMonday,
  addDays,
  getSlotsForWeek,
} from '../../utils/doctorScheduleWeek';
import {
  normalizeScheduleArrayForApi,
  slotsFromProfileForUi,
} from '../../utils/doctorScheduleSchema';

const { Title, Text } = Typography;

const SLOT_STARTS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function endFromStart(start) {
  const [h, m] = start.split(':').map(Number);
  return `${pad2(h + 2)}:${pad2(m)}`;
}

function slotKey(dayOfWeek, startTime, endTime) {
  return `${dayOfWeek}_${startTime}_${endTime}`;
}

function sameWeekMonday(a, b) {
  return a.getTime() === b.getTime();
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
}

export default function DoctorSchedule() {
  const user = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [displayWeekStart, setDisplayWeekStart] = useState(() => mondayOfWeekContaining(new Date()));
  // Mobile: which day column (0=Mon … 6=Sun) is selected
  const [selectedDayOffset, setSelectedDayOffset] = useState(() => {
    const today = new Date().getDay(); // 0=Sun
    return today === 0 ? 6 : today - 1; // convert to Mon-based offset
  });

  const loadProfile = useCallback(() => {
    if (!user) return Promise.resolve();
    return fetchDoctorProfileForSession(user)
      .then((p) => {
        setProfile(p);
        if (!p) setError('');
      })
      .catch((e) => {
        if (!e.message?.includes?.('404') && !e.message?.includes?.('not found')) {
          setError(e.message || 'Could not load profile');
        }
        setProfile(null);
      });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setProfile(null);
      return;
    }
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, [user, loadProfile]);

  const mon = displayWeekStart;
  const schedule = useMemo(() => {
    if (!profile) return [];
    const raw = getSlotsForWeek(profile, mon);
    return slotsFromProfileForUi(raw);
  }, [profile, mon]);

  const scheduleKeys = useMemo(
    () => new Set(schedule.map((s) => slotKey(s.dayOfWeek, s.startTime, s.endTime))),
    [schedule]
  );

  const doctorDocId = profile?._id ? String(profile._id) : null;

  const updateLocalSchedule = useCallback(
    (nextSchedule) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const weekStartMonday = formatWeekStartMonday(mon);
        const currentWeekly = Array.isArray(prev.weeklyAvailability) ? prev.weeklyAvailability : [];
        const idx = currentWeekly.findIndex((w) => w.weekStartMonday === weekStartMonday);
        const nextWeekly =
          idx >= 0
            ? [...currentWeekly.slice(0, idx), { weekStartMonday, slots: nextSchedule }, ...currentWeekly.slice(idx + 1)]
            : [...currentWeekly, { weekStartMonday, slots: nextSchedule }];
        return { ...prev, weeklyAvailability: nextWeekly };
      });
    },
    [mon]
  );

  const persistSchedule = async (nextSchedule) => {
    if (!doctorDocId) return;
    const weekStartMonday = formatWeekStartMonday(mon);
    let apiSchedule;
    try {
      apiSchedule = normalizeScheduleArrayForApi(nextSchedule);
    } catch (err) {
      setError(err.message || 'Invalid schedule data');
      throw err;
    }

    const previousProfile = profile;
    updateLocalSchedule(nextSchedule);
    setSaving(true);
    try {
      const doc = await doctorService.updateSchedule(doctorDocId, weekStartMonday, apiSchedule);
      setProfile(doc);
    } catch (e) {
      setError(e.message || 'Could not update schedule');
      if (previousProfile) setProfile(previousProfile);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const onSlotClick = (dayOfWeek, startTime, endTime) => {
    if (!doctorDocId || saving) return;
    const key = slotKey(dayOfWeek, startTime, endTime);
    const exists = scheduleKeys.has(key);

    const colOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const slotDate = formatWeekStartMonday(addDays(mon, colOffset));

    if (exists) {
      Modal.confirm({
        title: 'Remove availability?',
        content: 'This removes this slot for this calendar week only.',
        okText: 'Remove',
        okButtonProps: { danger: true },
        onOk: () => {
          const next = schedule.filter((s) => slotKey(s.dayOfWeek, s.startTime, s.endTime) !== key);
          return persistSchedule(next);
        },
      });
    } else {
      const next = [...schedule, { dayOfWeek, startTime, endTime, date: slotDate }];
      persistSchedule(next);
    }
  };

  const sun = addDays(mon, 6);
  const weekKey = mon.getTime();
  const weekLabel = `${mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${sun.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const thisWeekMonday = mondayOfWeekContaining(new Date());
  const viewingCurrentWeek = sameWeekMonday(mon, thisWeekMonday);

  const goPrevWeek = () => setDisplayWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setDisplayWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setDisplayWeekStart(mondayOfWeekContaining(new Date()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <Title level={3} style={{ margin: 0 }}>
          My schedule
        </Title>
        <Text type="secondary">Availability is saved per week — new weeks start empty until you fill them</Text>
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
            Complete your profile before managing your schedule.
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

          {/* Week navigation — always visible above the calendar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <Text className="font-medium text-slate-700 text-sm">{weekLabel}</Text>
            <Space size="small" wrap>
              <Button size="small" icon={<LeftOutlined />} onClick={goPrevWeek} aria-label="Previous week" />
              <Button size="small" icon={<RightOutlined />} onClick={goNextWeek} aria-label="Next week" />
              <Button
                size="small"
                type={viewingCurrentWeek ? 'default' : 'primary'}
                onClick={goThisWeek}
              >
                This week
              </Button>
            </Space>
          </div>

          {isMobile ? (
            /* ── Mobile: day-picker + vertical slot list ── */
            <Card className="rounded-2xl shadow-sm border-0">
              {/* Day selector */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {Array.from({ length: 7 }, (_, c) => {
                  const dayDate = addDays(mon, c);
                  const isSelected = selectedDayOffset === c;
                  const dow = dayDate.getDay();
                  const hasSlots = SLOT_STARTS.some((start) =>
                    scheduleKeys.has(slotKey(dow, start, endFromStart(start)))
                  );
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedDayOffset(c)}
                      className={[
                        'flex flex-col items-center py-2 rounded-xl border transition-colors',
                        isSelected
                          ? 'bg-blue-500 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 active:bg-slate-100',
                      ].join(' ')}
                    >
                      <span className="text-[10px] font-semibold uppercase leading-none mb-1">
                        {dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-bold leading-none">{dayDate.getDate()}</span>
                      {hasSlots && (
                        <span
                          className={[
                            'w-1.5 h-1.5 rounded-full mt-1',
                            isSelected ? 'bg-white/80' : 'bg-blue-500',
                          ].join(' ')}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Time slots for selected day */}
              <div className="flex flex-col gap-2">
                {SLOT_STARTS.map((start) => {
                  const end = endFromStart(start);
                  const selectedDate = addDays(mon, selectedDayOffset);
                  const dow = selectedDate.getDay();
                  const key = slotKey(dow, start, end);
                  const isOn = scheduleKeys.has(key);

                  return (
                    <button
                      key={start}
                      type="button"
                      disabled={saving}
                      onClick={() => onSlotClick(dow, start, end)}
                      className={[
                        'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors w-full text-left',
                        isOn
                          ? 'bg-blue-500 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 active:bg-slate-100',
                        saving ? 'opacity-60 cursor-wait' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <span className="font-medium text-sm">
                        {start} — {end}
                      </span>
                      {isOn ? (
                        <Tag
                          className="m-0 border-0 bg-white/20 text-white text-xs"
                          style={{ lineHeight: '20px' }}
                        >
                          <CheckOutlined className="mr-1" />
                          Available
                        </Tag>
                      ) : (
                        <span className="text-xs text-slate-400">Tap to set</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Text type="secondary" className="block mt-4 text-xs">
                Tap a slot to toggle availability for this week only.
              </Text>
            </Card>
          ) : (
            /* ── Desktop: full week grid ── */
            <Card className="rounded-2xl shadow-sm border-0">
              <Text type="secondary" className="block mb-3 text-sm">
                {!viewingCurrentWeek && (
                  <span className="text-amber-700/90">Viewing another week · </span>
                )}
                Monday–Sunday · 2-hour blocks, 6:00 AM–10:00 PM · each week is separate
              </Text>

              <div className="overflow-x-auto">
                <div
                  key={weekKey}
                  className="grid gap-1 min-w-[640px]"
                  style={{
                    gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))',
                  }}
                >
                  <div />
                  {Array.from({ length: 7 }, (_, c) => {
                    const dayDate = addDays(mon, c);
                    return (
                      <div
                        key={`h-${weekKey}-${c}`}
                        className="text-center pb-2 border-b border-slate-100"
                      >
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
                      <React.Fragment key={`${weekKey}-${start}`}>
                        <div className="text-[10px] text-slate-500 flex items-center justify-end pr-1 text-right leading-tight">
                          {start}
                          <br />
                          {end}
                        </div>
                        {Array.from({ length: 7 }, (_, c) => {
                          const cellDate = addDays(mon, c);
                          const dow = cellDate.getDay();
                          const key = slotKey(dow, start, end);
                          const on = scheduleKeys.has(key);
                          return (
                            <button
                              key={`${weekKey}-${c}-${start}`}
                              type="button"
                              disabled={saving}
                              onClick={() => onSlotClick(dow, start, end)}
                              title={`${cellDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} · ${start}–${end}`}
                              className={[
                                'min-h-9 rounded-md border text-[0] transition-colors',
                                on
                                  ? 'bg-blue-500 border-blue-700 hover:bg-blue-600'
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
          )}
        </>
      )}
    </div>
  );
}
