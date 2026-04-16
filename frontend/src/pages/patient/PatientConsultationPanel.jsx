// PatientConsultationPanel.jsx
// Expandable panel shown inside a patient's appointment card.
// Tabs: Doctor Info | Consultation | Prescription | History | Documents
import React, { useEffect, useState, useCallback } from 'react';
import {
  Tabs, Tag, Spin, Empty, Typography, Tooltip, Button, Divider, Timeline,
} from 'antd';
import {
  UserOutlined, FileDoneOutlined, MedicineBoxOutlined, HistoryOutlined,
  FileTextOutlined, EyeOutlined, DownloadOutlined, CalendarOutlined,
  CheckCircleOutlined, ExperimentOutlined, HeartOutlined, TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { notify } from '../../utils/notify';
import { doctorService } from '../../services/doctor/doctor.service';
import { medicalReportService } from '../../services/patient/medicalReport.service';
import { medicalReportApi } from '../../services/patient/medicalReport.api';
import { patientService } from '../../services/patient/patient.service';
import useAuthStore from '../../store/authStore';

const { Text } = Typography;

// category label / colour map for documents
const CATEGORY_CFG = {
  lab_report:     { label: 'Lab Report',     color: 'purple'  },
  prescription:   { label: 'Prescription',   color: 'blue'    },
  medical_report: { label: 'Medical Report', color: 'cyan'    },
  imaging:        { label: 'Imaging',        color: 'geekblue'},
  other:          { label: 'Other',          color: 'default' },
};

// PatientConsultationPanel — shows appointment details for a patient
// Props: appt (appointment object), patientProfileId (MongoDB _id, may be null on first render)
export default function PatientConsultationPanel({ appt, patientProfileId }) {
  const user = useAuthStore((s) => s.user);

  const [activeTab,     setActiveTab]     = useState('doctor');
  const [doctor,        setDoctor]        = useState(null);
  const [patientData,   setPatientData]   = useState(null);
  const [docs,          setDocs]          = useState([]);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingDocs,   setLoadingDocs]   = useState(false);
  const [docsLoaded,    setDocsLoaded]    = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);

  const consultation = appt.consultationNotes ?? {};
  const prescription = appt.prescription ?? {};
  const medications  = prescription.medications ?? [];

  const hasConsultation = !!(
    consultation.diagnosis || consultation.observations ||
    consultation.recommendations || consultation.followUpDate
  );
  const hasPrescription = medications.length > 0;

  // fetch doctor profile on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingDoctor(true);
    (async () => {
      try {
        const d = await doctorService.getById(appt.doctorId);
        if (!cancelled) setDoctor(d);
      } catch { /* non-fatal */ }
      finally { if (!cancelled) setLoadingDoctor(false); }

      // Also load patient profile once (for history tab)
      try {
        const p = await patientService.getById(user.id);
        if (!cancelled) setPatientData(p);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [appt.doctorId, user.id]);

  // lazy-load documents when documents tab is opened
  const loadDocs = useCallback(async () => {
    if (docsLoaded || !patientProfileId) return;
    const linkedIds = new Set((appt.patientMedicalDocumentIds ?? []).map(String));
    if (linkedIds.size === 0) {
      setDocs([]);
      setDocsLoaded(true);
      return;
    }
    setLoadingDocs(true);
    try {
      const all = await medicalReportService.list(patientProfileId, { limit: 100 });
      setDocs(all.filter((d) => linkedIds.has(String(d._id))));
      setDocsLoaded(true);
    } catch {
      notify.error('Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  }, [patientProfileId, docsLoaded, appt.patientMedicalDocumentIds]);

  useEffect(() => {
    if (activeTab === 'docs') loadDocs();
  }, [activeTab, loadDocs]);

  // pdf download
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await generatePatientPDF(appt, patientData, consultation, medications);
    } catch (e) {
      notify.error('Failed to generate PDF', e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  // build tab items
  const tabItems = [
    {
      key: 'doctor',
      label: <span className="flex items-center gap-1.5 text-xs"><TeamOutlined />Doctor</span>,
      children: <DoctorInfoTab doctor={doctor} loading={loadingDoctor} appt={appt} />,
    },
    {
      key: 'summary',
      label: <span className="flex items-center gap-1.5 text-xs"><FileDoneOutlined />Consultation</span>,
      children: <ConsultationTab consultation={consultation} hasConsultation={hasConsultation} />,
    },
    {
      key: 'prescription',
      label: (
        <span className="flex items-center gap-1.5 text-xs">
          <MedicineBoxOutlined />Prescription
          {hasPrescription && (
            <span className="ml-1 inline-flex items-center justify-center bg-blue-500 text-white rounded-full w-4 h-4 text-[10px] font-bold leading-none">
              {medications.length}
            </span>
          )}
        </span>
      ),
      children: <PrescriptionTab medications={medications} hasPrescription={hasPrescription} />,
    },
    {
      key: 'history',
      label: <span className="flex items-center gap-1.5 text-xs"><HistoryOutlined />History</span>,
      children: <HistoryTab patientData={patientData} />,
    },
    {
      key: 'docs',
      label: <span className="flex items-center gap-1.5 text-xs"><FileTextOutlined />Documents</span>,
      children: (
        <DocumentsTab
          docs={docs}
          loading={loadingDocs}
          patientProfileId={patientProfileId}
          patientLoading={!patientProfileId}
        />
      ),
    },
  ];

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden shadow-md"
      style={{
        border: '1px solid #bbf7d0',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)',
      }}
    >
      {/* ── Banner ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-white/50 border-b border-green-100 backdrop-blur-sm">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white">
            <CheckCircleOutlined className="text-base" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
              Consultation Report
            </div>
            <div className="text-sm font-semibold text-gray-700">
              Dr. {appt.doctorName}
            </div>
          </div>
        </div>

        <Divider type="vertical" style={{ height: 26, borderColor: '#bbf7d0' }} />

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarOutlined />
          {dayjs.utc(appt.scheduledAt).format('DD MMM YYYY')}
        </div>

        {appt.doctorSpecialty && (
          <Tag color="cyan" className="text-xs m-0 shrink-0">{appt.doctorSpecialty}</Tag>
        )}

        {/* No data notice */}
        {!hasConsultation && !hasPrescription && (
          <span className="text-xs text-amber-500 italic">
            Consultation details not recorded yet
          </span>
        )}

        {/* PDF button */}
        {(hasConsultation || hasPrescription) && (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={pdfLoading}
            onClick={handleDownloadPDF}
            className="ml-auto shrink-0"
            style={{ borderColor: '#16a34a', color: '#16a34a' }}
          >
            Download PDF
          </Button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
          tabBarStyle={{ marginBottom: 14 }}
          className="patient-panel-tabs"
        />
      </div>
    </div>
  );
}

// tab: doctor info
function DoctorInfoTab({ doctor, loading, appt }) {
  if (loading) return <div className="flex justify-center py-10"><Spin /></div>;

  return (
    <div className="space-y-3">
      {/* Doctor card */}
      <div className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {(doctor?.fullName ?? appt.doctorName)?.[0]?.toUpperCase() || 'D'}
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">
            Dr. {doctor?.fullName ?? appt.doctorName}
          </div>
          <div className="text-sm text-gray-500">
            {doctor?.specialization ?? appt.doctorSpecialty}
          </div>
          {doctor?.yearsOfExperience > 0 && (
            <Tag color="teal" className="mt-1 text-xs">
              {doctor.yearsOfExperience} yrs experience
            </Tag>
          )}
        </div>
      </div>

      {/* Qualifications */}
      {doctor?.qualifications?.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Qualifications
          </div>
          <div className="flex flex-wrap gap-2">
            {doctor.qualifications.map((q, i) => (
              <Tag key={i} color="blue" className="text-xs">{q}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* Appointment type */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Appointment Details
        </div>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          {[
            ['Type',       appt.type === 'video' ? '📹 Video Call' : '🏥 In-Person'],
            ['Token',      appt.tokenNumber],
            ['Date',       dayjs.utc(appt.scheduledAt).format('DD MMM YYYY')],
            ['Time',       dayjs.utc(appt.scheduledAt).format('h:mm A')],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="text-gray-400 text-xs block">{label}</span>
              <span className="font-medium text-gray-700">{value || '—'}</span>
            </div>
          ))}
        </div>
        {appt.reason && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-gray-400 text-xs block mb-1">Visit Reason</span>
            <span className="text-sm text-gray-700">{appt.reason}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// tab: consultation summary
function ConsultationTab({ consultation, hasConsultation }) {
  if (!hasConsultation) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text type="secondary" className="text-sm">
            The doctor has not recorded consultation notes yet.
          </Text>
        }
      />
    );
  }

  const fields = [
    {
      label:      'Diagnosis',
      value:      consultation.diagnosis,
      icon:       <ExperimentOutlined />,
      bg:         'bg-red-50 border-red-100',
      labelColor: 'text-red-600',
    },
    {
      label:      'Observations',
      value:      consultation.observations,
      icon:       <FileTextOutlined />,
      bg:         'bg-blue-50 border-blue-100',
      labelColor: 'text-blue-600',
    },
    {
      label:      'Recommendations',
      value:      consultation.recommendations,
      icon:       <FileDoneOutlined />,
      bg:         'bg-purple-50 border-purple-100',
      labelColor: 'text-purple-600',
    },
    consultation.followUpDate
      ? {
          label:      'Follow-Up Date',
          value:      dayjs(consultation.followUpDate).format('DD MMMM YYYY'),
          icon:       <CalendarOutlined />,
          bg:         'bg-green-50 border-green-100',
          labelColor: 'text-green-600',
        }
      : null,
  ].filter(Boolean).filter((f) => f.value?.trim?.());

  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.label} className={`rounded-xl border p-4 ${f.bg}`}>
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-2 ${f.labelColor}`}>
            {f.icon} {f.label}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap m-0">
            {f.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// tab: prescription
function PrescriptionTab({ medications, hasPrescription }) {
  if (!hasPrescription) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Text type="secondary" className="text-sm">
            No prescription has been issued for this appointment.
          </Text>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((med, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
          {/* Name header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {idx + 1}
            </div>
            <span className="font-semibold text-gray-800 text-sm">{med.name}</span>
          </div>

          {/* Detail chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Dosage',    value: med.dosage,    bg: 'bg-sky-50    text-sky-700'     },
              { label: 'Frequency', value: med.frequency, bg: 'bg-indigo-50 text-indigo-700'  },
              { label: 'Duration',  value: med.duration,  bg: 'bg-violet-50 text-violet-700'  },
            ].filter((f) => f.value?.trim?.()).map((f) => (
              <div key={f.label} className={`rounded-lg px-3 py-2 ${f.bg}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">
                  {f.label}
                </div>
                <div className="text-sm font-medium">{f.value}</div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {(med.notes || med.instructions) && (
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <span className="font-medium text-gray-600">Note: </span>
              {med.notes || med.instructions}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// tab: medical history (read-only timeline)
function HistoryTab({ patientData }) {
  if (!patientData) {
    return <div className="flex justify-center py-10"><Spin tip="Loading history…" /></div>;
  }

  const history = [...(patientData.medicalHistory ?? [])].reverse();

  // Patient info summary
  const age = patientData.dateOfBirth
    ? dayjs().diff(dayjs(patientData.dateOfBirth), 'year')
    : null;

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Blood Type', value: patientData.bloodType || '—', icon: <HeartOutlined />, color: 'text-red-500 bg-red-50' },
          { label: 'Age',        value: age ? `${age} yrs`    : '—', icon: <UserOutlined />,  color: 'text-blue-500 bg-blue-50' },
          {
            label: 'Allergies',
            value: patientData.allergies?.length ? patientData.allergies.length : '0',
            icon: <ExperimentOutlined />,
            color: 'text-orange-500 bg-orange-50',
          },
          {
            label: 'Records',
            value: history.length,
            icon: <HistoryOutlined />,
            color: 'text-purple-500 bg-purple-50',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-2 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <div className="text-xs text-gray-400">{s.label}</div>
              <div className="text-sm font-bold text-gray-700">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Allergies */}
      {patientData.allergies?.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-100 px-4 py-3">
          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">
            Known Allergies
          </div>
          <div className="flex flex-wrap gap-1.5">
            {patientData.allergies.map((a, i) => (
              <Tag key={i} color="orange" className="text-xs m-0">{a}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* History timeline */}
      {history.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text type="secondary" className="text-sm">No medical history on file</Text>}
        />
      ) : (
        <Timeline
          mode="left"
          items={history.map((entry, i) => ({
            color: i === 0 ? '#16a34a' : '#9ca3af',
            label: (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {entry.recordedAt ? dayjs(entry.recordedAt).format('DD MMM YYYY') : '—'}
              </span>
            ),
            children: (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-1">
                <div className="font-semibold text-gray-800 text-sm mb-1">{entry.diagnosis}</div>
                {entry.treatment && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium text-gray-500">Treatment: </span>
                    {entry.treatment}
                  </div>
                )}
                {entry.notes && (
                  <div className="text-xs text-gray-400 italic">{entry.notes}</div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
}

// tab: documents
function DocumentsTab({ docs, loading, patientProfileId, patientLoading }) {
  if (patientLoading || loading) {
    return <div className="flex justify-center py-10"><Spin tip="Loading documents…" /></div>;
  }

  if (docs.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<Text type="secondary" className="text-sm">No medical documents on file</Text>}
      />
    );
  }

  // Group by category
  const grouped = docs.reduce((acc, doc) => {
    const cat = doc.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, items]) => {
        const cfg = CATEGORY_CFG[cat] || CATEGORY_CFG.other;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Tag color={cfg.color} className="text-xs font-medium">{cfg.label}</Tag>
              <span className="text-xs text-gray-400">{items.length} file{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {items.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:border-blue-200 transition-colors shadow-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileTextOutlined className="text-blue-500 text-base" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm truncate">{doc.originalName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.uploadedAt && (
                        <span className="text-xs text-gray-400">
                          {dayjs(doc.uploadedAt).format('DD MMM YYYY')}
                        </span>
                      )}
                      {doc.description && (
                        <span className="text-xs text-gray-500 truncate">{doc.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip title="View">
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={async () => {
                          try {
                            window.open(
                              await medicalReportApi.getViewUrl(patientProfileId, doc._id),
                              '_blank',
                            );
                          } catch {
                            notify.error('Failed to open document');
                          }
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Download">
                      <Button
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            await medicalReportApi.download(patientProfileId, doc._id, doc.originalName);
                          } catch {
                            notify.error('Failed to download');
                          }
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// pdf generator — patient copy (green-branded, dynamically imported)
async function generatePatientPDF(appt, patient, consultation, medications) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc       = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW     = doc.internal.pageSize.getWidth();
  const pageH     = doc.internal.pageSize.getHeight();
  const margin    = 18;
  const rightEdge = pageW - margin;
  let y = 0;

  // header
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageW, 48, 'F');
  doc.setFillColor(4, 120, 87);
  doc.rect(0, 40, pageW, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('UrbanCare', margin, 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Medical Consultation Report  —  Patient Copy', margin, 25);
  doc.text('Confidential — For personal records only', margin, 31);

  const rLines = [
    `Dr. ${appt.doctorName}`,
    appt.doctorSpecialty || '',
    `Date: ${dayjs().format('DD MMM YYYY')}`,
    `Appt ID: …${(appt._id || '').slice(-8)}`,
  ].filter(Boolean);
  doc.setFontSize(8);
  rLines.forEach((line, i) => doc.text(line, rightEdge, 10 + i * 5.5, { align: 'right' }));

  y = 58;
  doc.setTextColor(15, 23, 42);

  // patient info box
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin, y - 3, pageW - 2 * margin, 38, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y - 3, pageW - 2 * margin, 38, 2, 2, 'S');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('Patient Information', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const colW   = (pageW - 2 * margin - 8) / 2;
  const pFields = [
    ['Name',       patient?.fullName || 'N/A'],
    ['Date of Birth', patient?.dateOfBirth ? dayjs(patient.dateOfBirth).format('DD MMM YYYY') : 'N/A'],
    ['Blood Type', patient?.bloodType || 'N/A'],
    ['Allergies',  patient?.allergies?.length ? patient.allergies.join(', ') : 'None'],
  ];
  pFields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = margin + 4 + col * (colW + 8);
    const ly  = y + 14 + row * 9;
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}: `, x, ly);
    doc.setFont('helvetica', 'normal');
    doc.text(value, x + doc.getTextWidth(`${label}: `), ly);
  });
  y += 44;

  // consultation notes
  const cFields = [
    ['Diagnosis',       consultation.diagnosis],
    ['Observations',    consultation.observations],
    ['Recommendations', consultation.recommendations],
    consultation.followUpDate
      ? ['Follow-Up Date', dayjs(consultation.followUpDate).format('DD MMM YYYY')]
      : null,
  ].filter(Boolean).filter(([, v]) => v?.trim?.());

  if (cFields.length > 0) {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Consultation Notes', margin, y);
    y += 5;
    doc.setDrawColor(110, 231, 183);
    doc.line(margin, y, rightEdge, y);
    y += 5;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    cFields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, pageW - 2 * margin - 30);
      doc.text(lines, margin + 30, y);
      y += lines.length * 5.5 + 3;
      if (y > pageH - 40) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  // prescription
  const meds = medications.filter((m) => m.name?.trim?.());
  if (meds.length > 0) {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Prescription', margin, y);
    y += 5;
    doc.setDrawColor(110, 231, 183);
    doc.line(margin, y, rightEdge, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Medication', 'Dosage', 'Frequency', 'Duration', 'Notes']],
      body: meds.map((m) => [
        m.name,
        m.dosage               || '—',
        m.frequency            || '—',
        m.duration             || '—',
        m.notes || m.instructions || '—',
      ]),
      theme: 'striped',
      headStyles:         { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles:         { fontSize: 8 },
      alternateRowStyles: { fillColor: [236, 253, 245] },
      margin:             { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 'auto' },
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // footer
  const footerY = pageH - 22;
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, footerY - 2, rightEdge, footerY - 2);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Attending: Dr. ${appt.doctorName}  ·  ${appt.doctorSpecialty || ''}`,
    margin, footerY + 3,
  );
  doc.text(
    'UrbanCare Medical Platform  ·  support@urbancare.health',
    pageW / 2, footerY + 3, { align: 'center' },
  );
  doc.text(
    'Computer-generated document — valid without physical signature.',
    pageW / 2, footerY + 9, { align: 'center' },
  );
  doc.text(
    'DISCLAIMER: This report is for personal records only. Always consult your doctor.',
    pageW / 2, footerY + 15, { align: 'center' },
  );
  doc.text(dayjs().format('DD MMM YYYY, HH:mm'), rightEdge, footerY + 3, { align: 'right' });

  doc.save(`UrbanCare_Report_${(appt._id || '').slice(-8)}_${dayjs().format('YYYYMMDD')}.pdf`);
}
