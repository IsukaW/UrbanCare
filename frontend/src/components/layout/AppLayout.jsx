import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NavBar from './NavBar';

const { Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout>
        <NavBar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        <Content
          style={{
            minHeight: 'calc(100vh - 56px)',
            background: '#f0f2f5',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
