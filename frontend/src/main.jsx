import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import App from './App';
import './index.css';

// Slot times in the DB are stored as UTC strings that represent the
// intended local appointment time (e.g. 15:30Z → "3:30 PM").
// Using the utc plugin with .utc() prevents the browser's local TZ
// from shifting the displayed time.
dayjs.extend(utc);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
