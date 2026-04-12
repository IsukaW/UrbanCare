export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  CANCELLATION_REQUESTED: 'cancellation_requested',
  RESCHEDULED: 'rescheduled',
});

export const APPOINTMENT_STATUS_COLORS = {
  pending: 'orange',
  confirmed: 'blue',
  completed: 'green',
  cancelled: 'red',
  cancellation_requested: 'volcano',
  rescheduled: 'purple',
};

export const APPOINTMENT_STATUS_LABELS = {
  pending: 'Pending Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancellation_requested: 'Cancellation Requested',
  rescheduled: 'Rescheduled',
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
