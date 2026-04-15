import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ROLES } from '../constants/roles';
import { Button } from 'antd';
import {
  CalendarOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  VideoCameraOutlined,
  StarFilled,
  ArrowRightOutlined,
  CheckCircleFilled,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  MenuOutlined,
  CloseOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import logo from '../images/UrbanCare_logo.png';

/* ─── tiny reusable fade-in hook ─── */
function useFadeIn(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function FadeSection({ children, className = '', delay = 0 }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── data ─── */
const STATS = [
  { icon: <UserOutlined />, value: '50K+', label: 'Happy Patients' },
  { icon: <TeamOutlined />, value: '800+', label: 'Expert Doctors' },
  { icon: <MedicineBoxOutlined />, value: '120+', label: 'Specialties' },
  { icon: <TrophyOutlined />, value: '15+', label: 'Years of Excellence' },
];

const FEATURES = [
  {
    icon: <CalendarOutlined style={{ fontSize: 32 }} />,
    title: 'Easy Appointment Booking',
    desc: 'Book, reschedule, or cancel appointments in seconds. Receive instant confirmations and smart reminders.',
    color: 'from-blue-500 to-indigo-600',
    bg: '#EFF6FF',
  },
  {
    icon: <VideoCameraOutlined style={{ fontSize: 32 }} />,
    title: 'Video Consultations',
    desc: 'Connect with your doctor from home via secure, HD video calls — no travel required.',
    color: 'from-violet-500 to-purple-600',
    bg: '#F5F3FF',
  },
  {
    icon: <HeartOutlined style={{ fontSize: 32 }} />,
    title: 'Complete Medical Records',
    desc: 'Your full health history, prescriptions, and lab reports — securely organised in one place.',
    color: 'from-rose-500 to-pink-600',
    bg: '#FFF1F2',
  },
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 32 }} />,
    title: 'Verified Specialists',
    desc: 'Every doctor is credential-verified and board-certified so you always get trusted care.',
    color: 'from-emerald-500 to-teal-600',
    bg: '#ECFDF5',
  },
  {
    icon: <MedicineBoxOutlined style={{ fontSize: 32 }} />,
    title: 'AI Symptom Checker',
    desc: 'Our intelligent symptom checker guides you to the right specialist before your visit.',
    color: 'from-amber-500 to-orange-600',
    bg: '#FFFBEB',
  },
  {
    icon: <GlobalOutlined style={{ fontSize: 32 }} />,
    title: '24 / 7 Support',
    desc: 'Round-the-clock assistance from our healthcare support team whenever you need help.',
    color: 'from-cyan-500 to-sky-600',
    bg: '#ECFEFF',
  },
];

const STEPS = [
  { num: '01', title: 'Create Your Account', desc: 'Sign up in under 2 minutes with your basic details.' },
  { num: '02', title: 'Find a Doctor', desc: 'Browse verified specialists by specialty, rating, or availability.' },
  { num: '03', title: 'Book an Appointment', desc: 'Pick a convenient time slot and confirm with one click.' },
  { num: '04', title: 'Get Quality Care', desc: 'Attend in-person or via video and receive your care summary.' },
];

const SPECIALTIES = [
  { emoji: '🫀', name: 'Cardiology' },
  { emoji: '🧠', name: 'Neurology' },
  { emoji: '🦷', name: 'Dentistry' },
  { emoji: '👶', name: 'Pediatrics' },
  { emoji: '🦞', name: 'Orthopedics' },
  { emoji: '👁️', name: 'Ophthalmology' },
  { emoji: '🩺', name: 'General Practice' },
  { emoji: '🧬', name: 'Oncology' },
];

const TESTIMONIALS = [
  {
    name: 'Amara Perera',
    role: 'Patient',
    text: 'UrbanCare made booking a cardiologist ridiculously simple. Within 10 minutes I had a confirmed slot and a reminder on my phone.',
    rating: 5,
    avatar: 'AP',
    color: '#4F46E5',
  },
  {
    name: 'Dr. Roshan Silva',
    role: 'Cardiologist',
    text: 'Managing my schedule has never been easier. The portal keeps me organised and my patients love the digital summaries.',
    rating: 5,
    avatar: 'RS',
    color: '#0891B2',
  },
  {
    name: 'Nalini Fernando',
    role: 'Patient',
    text: 'The video consultation feature is a game-changer. I consulted a specialist without leaving my house — absolutely superb.',
    rating: 5,
    avatar: 'NF',
    color: '#059669',
  },
];

/* ═══════════════════════════════════════════════════════ */
const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.DOCTOR]: '/doctor/dashboard',
  [ROLES.PATIENT]: '/patient/dashboard',
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // If already logged in, skip landing and go straight to dashboard
  if (token && user) {
    return <Navigate to={ROLE_HOME[user.role] ?? '/login'} replace />;
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
          transition: 'all 0.3s ease',
          padding: '0 24px',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 80 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logo} alt="UrbanCare" style={{ height: 60, width: 'auto' }} />
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex" style={{ gap: 36, alignItems: 'center' }}>
            {['Features', 'How It Works', 'Specialties', 'Testimonials'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  color: scrolled ? '#374151' : '#fff',
                  textDecoration: 'none', fontWeight: 500, fontSize: 15,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.color = '#1677ff')}
                onMouseLeave={(e) => (e.target.style.color = scrolled ? '#374151' : '#fff')}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex" style={{ gap: 12 }}>
            <Button
              onClick={() => navigate('/login')}
              style={{
                borderColor: scrolled ? '#1677ff' : '#fff',
                color: scrolled ? '#1677ff' : '#fff',
                background: 'transparent',
                fontWeight: 600,
                borderRadius: 8,
              }}
            >
              Sign In
            </Button>
            <Button
              type="primary"
              onClick={() => navigate('/register')}
              style={{ borderRadius: 8, fontWeight: 600, background: '#1677ff' }}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: scrolled ? '#374151' : '#fff', fontSize: 22 }}
          >
            {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: '#fff', padding: '16px 24px 24px', borderTop: '1px solid #f0f0f0' }}>
            {['Features', 'How It Works', 'Specialties', 'Testimonials'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'block', padding: '10px 0', color: '#374151', textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}
              >
                {item}
              </a>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button onClick={() => navigate('/login')} style={{ flex: 1 }}>Sign In</Button>
              <Button type="primary" onClick={() => navigate('/register')} style={{ flex: 1, background: '#1677ff' }}>Get Started</Button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 40%, #1677ff 80%, #38BDF8 100%)',
          display: 'flex', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
          padding: '100px 24px 60px',
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(56,189,248,0.12)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          {/* Left content */}
          <div style={{ flex: '1 1 480px', color: '#fff' }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.15)', borderRadius: 100,
                padding: '6px 16px', marginBottom: 24, backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <HeartOutlined style={{ color: '#f87171' }} />
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>Trusted by 50,000+ Patients</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.12, margin: '0 0 24px', letterSpacing: '-1px' }}>
              Healthcare That <br />
              <span style={{ background: 'linear-gradient(90deg, #38BDF8, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Comes to You
              </span>
            </h1>

            <p style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', margin: '0 0 40px', maxWidth: 500 }}>
              Book appointments, consult specialists via video, and manage your entire health journey — all in one beautifully simple platform.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  background: '#fff', color: '#1677ff',
                  border: 'none', borderRadius: 10, padding: '14px 32px',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}
              >
                Book Appointment <ArrowRightOutlined />
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  border: '2px solid rgba(255,255,255,0.4)', borderRadius: 10, padding: '14px 32px',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                Sign In
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 24, marginTop: 48, flexWrap: 'wrap' }}>
              {['HIPAA Compliant', 'ISO 27001', '256-bit Encryption'].map((badge) => (
                <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  <CheckCircleFilled style={{ color: '#4ade80', fontSize: 14 }} />
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {/* Right floating card group */}
          <div style={{ flex: '0 1 420px', position: 'relative', minHeight: 400, display: 'flex', justifyContent: 'center' }}>
            {/* Main card */}
            <div style={{
              background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)',
              borderRadius: 24, padding: 28, border: '1px solid rgba(255,255,255,0.2)',
              width: 320, boxShadow: '0 32px 64px rgba(0,0,0,0.2)',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#38BDF8,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🩺
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Dr. Kavinda Perera</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Cardiologist · 4.9 ★</div>
                </div>
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>Select your appointment slot:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {['9:00 AM', '10:30 AM', '2:00 PM', '3:30 PM', '4:00 PM', '5:00 PM'].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      padding: '8px 4px', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 600,
                      background: i === 1 ? '#1677ff' : 'rgba(255,255,255,0.12)',
                      border: i === 1 ? 'none' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <button style={{ width: '100%', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Confirm Booking
              </button>
            </div>

            {/* Floating notification */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              background: '#fff', borderRadius: 14, padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', gap: 10, minWidth: 190,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleFilled style={{ color: '#16a34a', fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>Appointment Confirmed</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Tomorrow, 10:30 AM</div>
              </div>
            </div>

            {/* Floating rating badge */}
            <div style={{
              position: 'absolute', bottom: 10, left: -30,
              background: '#1677ff', borderRadius: 14, padding: '14px 18px',
              boxShadow: '0 8px 24px rgba(22,119,255,0.4)',
              color: '#fff', textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>4.9</div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                {[1,2,3,4,5].map((i) => <StarFilled key={i} style={{ fontSize: 10, color: '#fbbf24' }} />)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>Avg. Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
            {STATS.map(({ icon, value, label }, i) => (
              <FadeSection key={label} delay={i * 80}>
                <div
                  style={{
                    padding: '36px 20px', textAlign: 'center',
                    borderRight: i < STATS.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                >
                  <div style={{ fontSize: 28, color: '#1677ff', marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>{label}</div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: '#F8FAFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeSection>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{ background: '#EFF6FF', color: '#1677ff', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>
                PLATFORM FEATURES
              </span>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0F172A', margin: '16px 0 16px', letterSpacing: '-0.5px' }}>
                Everything You Need for Better Healthcare
              </h2>
              <p style={{ fontSize: 17, color: '#6b7280', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
                A complete digital health platform built for patients, doctors, and administrators.
              </p>
            </div>
          </FadeSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {FEATURES.map(({ icon, title, desc, color, bg }, i) => (
              <FadeSection key={title} delay={i * 80}>
                <div
                  style={{
                    background: '#fff', borderRadius: 20, padding: 28,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    transition: 'transform 0.25s, box-shadow 0.25s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <div style={{ background: `linear-gradient(135deg,${color.split(' ')[1]},${color.split(' ')[3]})` === 'linear-gradient(135deg,undefined,undefined)' ? '#1677ff' : 'transparent' }}>
                      <span style={{ fontSize: 28 }}>{React.cloneElement(icon, { style: { background: `linear-gradient(135deg, #1677ff, #7c3aed)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28 } })}</span>
                    </div>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>{title}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>{desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ background: '#fff', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeSection>
            <div style={{ textAlign: 'center', marginBottom: 72 }}>
              <span style={{ background: '#EFF6FF', color: '#1677ff', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>
                HOW IT WORKS
              </span>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0F172A', margin: '16px 0 16px', letterSpacing: '-0.5px' }}>
                Get Started in 4 Simple Steps
              </h2>
              <p style={{ fontSize: 17, color: '#6b7280', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
                From signup to your first consultation — it takes just a few minutes.
              </p>
            </div>
          </FadeSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, position: 'relative' }}>
            {STEPS.map(({ num, title, desc }, i) => (
              <FadeSection key={num} delay={i * 100}>
                <div style={{ textAlign: 'center', padding: '0 16px' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1677ff, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: '0 8px 24px rgba(22,119,255,0.3)',
                  }}>
                    <span style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{num}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 10px' }}>{title}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>{desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPECIALTIES ── */}
      <section id="specialties" style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeSection>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', color: '#93C5FD', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>
                SPECIALTIES
              </span>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#fff', margin: '16px 0 16px', letterSpacing: '-0.5px' }}>
                World-Class Specialists Across<br />Every Medical Field
              </h2>
            </div>
          </FadeSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {SPECIALTIES.map(({ emoji, name }, i) => (
              <FadeSection key={name} delay={i * 60}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16, padding: '24px 16px', textAlign: 'center',
                    cursor: 'pointer', transition: 'background 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(22,119,255,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{emoji}</div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{name}</div>
                </div>
              </FadeSection>
            ))}
          </div>

          <FadeSection delay={200}>
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  background: '#1677ff', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 24px rgba(22,119,255,0.4)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                Explore All Specialties <ArrowRightOutlined />
              </button>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ background: '#F8FAFF', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeSection>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <span style={{ background: '#EFF6FF', color: '#1677ff', padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 700 }}>
                TESTIMONIALS
              </span>
              <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#0F172A', margin: '16px 0 0', letterSpacing: '-0.5px' }}>
                Loved by Patients & Doctors
              </h2>
            </div>
          </FadeSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {TESTIMONIALS.map(({ name, role, text, rating, avatar, color }, i) => (
              <FadeSection key={name} delay={i * 100}>
                <div
                  style={{
                    background: '#fff', borderRadius: 20, padding: 28,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    transition: 'transform 0.25s, box-shadow 0.25s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                    {Array.from({ length: rating }).map((_, j) => (
                      <StarFilled key={j} style={{ color: '#fbbf24', fontSize: 16 }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.75, margin: '0 0 24px', fontStyle: 'italic' }}>
                    "{text}"
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15,
                    }}>
                      {avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>{name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{role}</div>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', background: '#fff' }}>
        <FadeSection>
          <div
            style={{
              maxWidth: 900, margin: '0 auto', textAlign: 'center',
              background: 'linear-gradient(135deg, #1677ff 0%, #7c3aed 100%)',
              borderRadius: 28, padding: 'clamp(40px, 6vw, 80px) clamp(24px, 6vw, 80px)',
              boxShadow: '0 24px 80px rgba(22,119,255,0.3)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Decorative */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: -80, left: -40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
              <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
                Ready to Take Control of Your Health?
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', margin: '0 0 40px', lineHeight: 1.7, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
                Join thousands of patients and doctors already experiencing the future of healthcare on UrbanCare.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    background: '#fff', color: '#1677ff', border: 'none',
                    borderRadius: 10, padding: '14px 36px', fontSize: 16, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  Create Free Account <ArrowRightOutlined />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    border: '2px solid rgba(255,255,255,0.4)', borderRadius: 10,
                    padding: '14px 36px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
                    backdropFilter: 'blur(8px)', transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0F172A', color: '#fff', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <img src={logo} alt="UrbanCare" style={{ height: 36, marginBottom: 16, filter: 'brightness(0) invert(1)' }} />
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
                Your trusted digital health companion — connecting patients with world-class care.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {['📱', '🐦', '💼', '📘'].map((icon, i) => (
                  <div
                    key={i}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'background 0.2s', fontSize: 16,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1677ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Quick Links</h4>
              {['About Us', 'Our Doctors', 'Services', 'Blog', 'Careers'].map((link) => (
                <div key={link} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.target.style.color = '#60a5fa')}
                    onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}>
                    {link}
                  </a>
                </div>
              ))}
            </div>

            {/* For Patients */}
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>For Patients</h4>
              {['Book Appointment', 'Find a Doctor', 'Video Consult', 'Medical Records', 'Symptom Checker'].map((link) => (
                <div key={link} style={{ marginBottom: 10 }}>
                  <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => (e.target.style.color = '#60a5fa')}
                    onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}>
                    {link}
                  </a>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Contact Us</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, color: '#94a3b8', fontSize: 14, alignItems: 'flex-start' }}>
                  <EnvironmentOutlined style={{ marginTop: 2, color: '#60a5fa' }} />
                  <span>123 Health Avenue, Colombo 07, Sri Lanka</span>
                </div>
                <div style={{ display: 'flex', gap: 10, color: '#94a3b8', fontSize: 14 }}>
                  <PhoneOutlined style={{ color: '#60a5fa' }} />
                  <span>+94 11 234 5678</span>
                </div>
                <div style={{ display: 'flex', gap: 10, color: '#94a3b8', fontSize: 14 }}>
                  <MailOutlined style={{ color: '#60a5fa' }} />
                  <span>hello@urbancare.lk</span>
                </div>
                <div style={{ display: 'flex', gap: 10, color: '#94a3b8', fontSize: 14 }}>
                  <ClockCircleOutlined style={{ color: '#60a5fa' }} />
                  <span>Mon–Fri: 8AM–8PM | Sat: 9AM–5PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ color: '#64748b', fontSize: 13 }}>
              © {new Date().getFullYear()} UrbanCare. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((link) => (
                <a key={link} href="#" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.target.style.color = '#60a5fa')}
                  onMouseLeave={(e) => (e.target.style.color = '#64748b')}>
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
