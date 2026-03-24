export const APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const APPOINTMENT_STATUS_COLORS = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
};

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
