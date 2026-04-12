import React, { useState, useEffect } from 'react';
import { Layout, Drawer } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NavBar from './NavBar';

const { Content } = Layout;

const MOBILE_BREAKPOINT = 768;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={240}
          styles={{ body: { padding: 0 }, header: { display: 'none' } }}
        >
          <Sidebar
            collapsed={false}
            onCollapse={() => {}}
            onNavigate={() => setMobileOpen(false)}
          />
        </Drawer>
      )}
      <Layout>
        <NavBar
          collapsed={collapsed}
          onToggle={
            isMobile
              ? () => setMobileOpen((prev) => !prev)
              : () => setCollapsed((prev) => !prev)
          }
        />
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
