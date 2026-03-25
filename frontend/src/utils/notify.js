import { notification } from 'antd';

// All toast notifications come from here so the style is consistent.
// They appear in the top-right corner and auto-dismiss after 4 seconds.

const baseConfig = {
  placement: 'topRight',
  duration: 4,
};

export const notify = {
  success(message, description) {
    notification.success({ ...baseConfig, message, description });
  },

  error(message, description) {
    // Keep error toasts a little longer so the user has time to read them
    notification.error({ ...baseConfig, duration: 6, message, description });
  },

  warning(message, description) {
    notification.warning({ ...baseConfig, message, description });
  },

  info(message, description) {
    notification.info({ ...baseConfig, message, description });
  },
};
