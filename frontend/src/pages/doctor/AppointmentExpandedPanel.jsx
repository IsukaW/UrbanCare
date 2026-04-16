import React, { useEffect, useState, useCallback } from 'react';
import {
  Tabs, Button, Tag, Spin, Empty, Descriptions, Timeline, Modal,
  Input, DatePicker, Typography, Tooltip, Divider,
} from 'antd';
import {
  UserOutlined, FileTextOutlined, HistoryOutlined, MedicineBoxOutlined,
  FileDoneOutlined, PlusOutlined, DeleteOutlined, DownloadOutlined,
  EyeOutlined, CheckCircleOutlined, SaveOutlined, CalendarOutlined,
  HeartOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { patientClient } from '../../utils/httpClients';
import { doctorService } from '../../services/doctor/doctor.service';
import { appointmentService } from '../../services/appointment/appointment.service';
import { medicalReportService } from '../../services/patient/medicalReport.service';
import { medicalReportApi } from '../../services/patient/medicalReport.api';
import { notify } from '../../utils/notify';
import { APPOINTMENT_STATUS } from '../../constants/appointment';

const { Text } = Typography;
const { TextArea } = Input;

// key counter for prescription rows
let _keyCounter = 0;
const nextKey = () => ++_keyCounter;

// map saved medications to panel format
function mapSavedMeds(prescription) {
  if (!prescription?.medications?.length) return [];
  return prescription.medications.map((m) => ({
    key: nextKey(),
    name:      m.name      || '',
    dosage:    m.dosage    || '',
    frequency: m.frequency || '',
    duration:  m.duration  || '',
    notes:     m.notes     || m.instructions || '',
  }));
}

// AppointmentExpandedPanel
// Props:
//   appt       - appointment object from the backend
//   onSaved    - called with the updated appointment after a save
//   onComplete - called with the updated appointment after marking complete
export default function AppointmentExpandedPanel({ appt, onSaved, onComplete }) {
  // remote data
  const [patient,       setPatient]       = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [medicalDocs,   setMedicalDocs]   = useState([]);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadingDocs,    setLoadingDocs]    = useState(false);
  const [docsLoaded,     setDocsLoaded]     = useState(false);

  // form state
  const [activeTab, setActiveTab] = useState('profile');
  const [prescriptionItems, setPrescriptionItems] = useState(() => mapSavedMeds(appt.prescription));
  const [consultation, setConsultation] = useState(() => ({
    diagnosis:       appt.consultationNotes?.diagnosis       || '',
    observations:    appt.consultationNotes?.observations    || '',
    recommendations: appt.consultationNotes?.recommendations || '',
    followUpDate:    appt.consultationNotes?.followUpDate
      ? dayjs(appt.consultationNotes.followUpDate)
      : null,
  }));

  // note modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [newNote,       setNewNote]       = useState({ diagnosis: '', treatment: '', notes: '' });
  const [savingNote,    setSavingNote]    = useState(false);

  // action loading
  const [saving,    setSaving]    = useState(false);
  const [completing, setCompleting] = useState(false);

  const isCompleted = appt.status === APPOINTMENT_STATUS.COMPLETED;

  // load patient profile + doctor profile on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingPatient(true);
      try {
        const { data } = await patientClient.get(`/patients/${appt.patientId}`);
        if (!cancelled) setPatient(data.patient ?? data);
      } catch (e) {
        if (!cancelled) notify.error('Failed to load patient profile', e.message);
      } finally {
        if (!cancelled) setLoadingPatient(false);
      }

      try {
        const d = await doctorService.getById(appt.doctorId);
        if (!cancelled) setDoctorProfile(d);
      } catch { /* non-critical — PDF still works with appointment fields */ }
    })();

    return () => { cancelled = true; };
  }, [appt.patientId, appt.doctorId]);

  // lazy-load medical docs when records tab is opened
  const loadMedicalDocs = useCallback(async () => {
    if (docsLoaded || !patient) return;
    const linkedIds = new Set((appt.patientMedicalDocumentIds ?? []).map(String));
    if (linkedIds.size === 0) {
      setMedicalDocs([]);
      setDocsLoaded(true);
      return;
    }
    setLoadingDocs(true);
    try {
      const all = await medicalReportService.list(patient._id, { limit: 100 });
      setMedicalDocs(all.filter((d) => linkedIds.has(String(d._id))));
      setDocsLoaded(true);
    } catch {
      notify.error('Failed to load medical documents');
    } finally {
      setLoadingDocs(false);
    }
  }, [patient, docsLoaded, appt.patientMedicalDocumentIds]);

  useEffect(() => {
    if (activeTab === 'records' && patient && !docsLoaded) {
      loadMedicalDocs();
    }
  }, [activeTab, patient, docsLoaded, loadMedicalDocs]);

  // prescription helpers
  const addMedication = () =>
    setPrescriptionItems((p) => [...p, { key: nextKey(), name: '', dosage: '', frequency: '', duration: '', notes: '' }]);

  const removeMedication = (key) =>
    setPrescriptionItems((p) => p.filter((item) => item.key !== key));

  const updateMedication = (key, field, value) =>
    setPrescriptionItems((p) => p.map((item) => item.key === key ? { ...item, [field]: value } : item));

  // build api payload
  const buildPayload = (includeComplete) => {
    const payload = {};
    const meds = prescriptionItems.filter((m) => m.name.trim());

    if (meds.length > 0 || appt.prescription) {
      payload.prescription = {
        medications: meds.map(({ name, dosage, frequency, duration, notes }) => ({
          name:      name.trim(),
          dosage:    dosage.trim(),
          frequency: frequency.trim(),
          duration:  duration.trim(),
          notes:     notes.trim(),
        })),
        notes:     consultation.diagnosis || '',
        issuedAt:  new Date().toISOString(),
      };
    }

    const hasConsult =
      consultation.diagnosis || consultation.observations ||
      consultation.recommendations || consultation.followUpDate;
    if (hasConsult) {
      payload.consultationNotes = {
        diagnosis:       consultation.diagnosis,
        observations:    consultation.observations,
        recommendations: consultation.recommendations,
        followUpDate:    consultation.followUpDate?.toISOString() ?? null,
      };
    }

    if (includeComplete) payload.status = 'completed';
    return payload;
  };

  // persist to backend
  const doSave = async (includeComplete) => {
    const payload = buildPayload(includeComplete);
    if (!Object.keys(payload).length) {
      notify.warn('Nothing to save — add prescription or consultation notes first.');
      return null;
    }

    const updated = await appointmentService.update(appt._id, payload);

    // Also push a medical-history entry if diagnosis was supplied
    if (consultation.diagnosis.trim() && patient) {
      try {
        await patientClient.patch(`/patients/${patient._id}/history`, {
          diagnosis: consultation.diagnosis.trim(),
          treatment: consultation.recommendations.trim() || '',
          notes:     consultation.observations.trim()    || '',
        });
      } catch (e) {
        notify.warn('Saved, but failed to update patient history: ' + e.message);
      }
    }

    return updated;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await doSave(false);
      if (updated) {
        await generateAndDownloadPDF(appt, patient, doctorProfile, consultation, prescriptionItems);
        notify.success('Consultation saved and PDF downloaded.');
        onSaved?.(updated);
      }
    } catch (e) {
      notify.error('Failed to save', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const updated = await doSave(true);
      if (updated) {
        await generateAndDownloadPDF(appt, patient, doctorProfile, consultation, prescriptionItems);
        notify.success('Appointment marked as completed. PDF downloaded.');
        onComplete?.(updated);
      }
    } catch (e) {
      notify.error('Failed to complete appointment', e.message);
    } finally {
      setCompleting(false);
    }
  };

  // add medical history note
  const handleAddNote = async () => {
    if (!newNote.diagnosis.trim()) {
      notify.warn('Diagnosis is required.');
      return;
    }
    if (!patient) { notify.warn('Patient data not loaded yet.'); return; }

    setSavingNote(true);
    try {
      await patientClient.patch(`/patients/${patient._id}/history`, {
        diagnosis: newNote.diagnosis.trim(),
        treatment: newNote.treatment.trim(),
        notes:     newNote.notes.trim(),
      });
      // Refresh patient to reflect new history entry
      const { data } = await patientClient.get(`/patients/${appt.patientId}`);
      setPatient(data.patient ?? data);
      setNoteModalOpen(false);
      setNewNote({ diagnosis: '', treatment: '', notes: '' });
      notify.success('Medical history note added.');
    } catch (e) {
      notify.error('Failed to add note', e.message);
    } finally {
      setSavingNote(false);
    }
  };

  const age = patient?.dateOfBirth ? dayjs().diff(dayjs(patient.dateOfBirth), 'year') : null;

  // tab definitions
  const tabItems = [
    {
      key: 'profile',
      label: <span className="flex items-center gap-1.5 text-xs"><UserOutlined />Profile</span>,
      children: <PatientProfileTab patient={patient} loading={loadingPatient} age={age} />,
    },
    {
      key: 'records',
      label: <span className="flex items-center gap-1.5 text-xs"><FileTextOutlined />Records</span>,
      children: (
        <MedicalRecordsTab docs={medicalDocs} loading={loadingDocs} patientId={patient?._id} patientLoading={loadingPatient} />
      ),
    },
    {
      key: 'history',
      label: <span className="flex items-center gap-1.5 text-xs"><HistoryOutlined />History</span>,
      children: (
        <MedicalHistoryTab
          patient={patient}
          loading={loadingPatient}
          onAddNote={() => setNoteModalOpen(true)}
          isCompleted={isCompleted}
        />
      ),
    },
    {
      key: 'prescription',
      label: <span className="flex items-center gap-1.5 text-xs"><MedicineBoxOutlined />Prescription</span>,
      children: (
        <PrescriptionTab
          items={prescriptionItems}
          onAdd={addMedication}
          onRemove={removeMedication}
          onUpdate={updateMedication}
          disabled={isCompleted}
        />
      ),
    },
    {
      key: 'summary',
      label: <span className="flex items-center gap-1.5 text-xs"><FileDoneOutlined />Consultation</span>,
      children: (
        <ConsultationTab
          consultation={consultation}
          onChange={setConsultation}
          disabled={isCompleted}
        />
      ),
    },
  ];

  // render
  return (
    <div
      className="mt-3 rounded-2xl border border-blue-100 shadow-md overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #eef2ff 100%)' }}
    >
      {/* ── Token + appointment meta banner ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-white/60 border-b border-blue-100 backdrop-blur-sm">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {appt.tokenNumber?.split('-').pop() ?? '#'}
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">Token</div>
            <div className="text-sm font-mono font-semibold text-gray-700">{appt.tokenNumber}</div>
          </div>
        </div>

        <Divider type="vertical" style={{ height: 28, borderColor: '#bfdbfe' }} />

        {appt.reason && (
          <div className="text-sm text-gray-600 min-w-0 flex-1">
            <span className="font-medium text-gray-500">Reason: </span>
            <span className="truncate">{appt.reason}</span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {appt.type && (
            <Tag color={appt.type === 'video' ? 'blue' : 'cyan'} className="text-xs m-0">
              {appt.type === 'video' ? '📹 Video' : '🏥 In-Person'}
            </Tag>
          )}
          {isCompleted && (
            <Tag color="green" icon={<CheckCircleOutlined />} className="text-xs font-medium m-0">
              Completed
            </Tag>
          )}
        </div>
      </div>

      {/* ── Tabbed content ───────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
          tabBarStyle={{ marginBottom: 12 }}
          className="consultation-panel-tabs"
        />
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="px-5 py-3 bg-white/60 border-t border-blue-100 flex flex-wrap items-center justify-end gap-2">
        {!isCompleted ? (
          <>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={completing}
              className="border-blue-400 text-blue-600 hover:bg-blue-50"
            >
              Save &amp; Download PDF
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleComplete}
              loading={completing}
              disabled={saving}
              style={{ background: '#16a34a', borderColor: '#16a34a' }}
            >
              Mark as Completed
            </Button>
          </>
        ) : (
          <Button
            icon={<DownloadOutlined />}
            onClick={() => generateAndDownloadPDF(appt, patient, doctorProfile, consultation, prescriptionItems)}
            disabled={!patient}
          >
            Re-download PDF
          </Button>
        )}
      </div>

      {/* ── Add history note modal ────────────────────────────────────────── */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <HistoryOutlined className="text-blue-500" />Add Medical History Note
          </span>
        }
        open={noteModalOpen}
        onCancel={() => setNoteModalOpen(false)}
        onOk={handleAddNote}
        okText="Add Note"
        confirmLoading={savingNote}
        okButtonProps={{ disabled: !newNote.diagnosis.trim() }}
        width={540}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Hypertension Stage 1"
              value={newNote.diagnosis}
              onChange={(e) => setNewNote((p) => ({ ...p, diagnosis: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment / Recommendations</label>
            <TextArea
              rows={2}
              placeholder="Prescribed treatment or follow-up actions"
              value={newNote.treatment}
              onChange={(e) => setNewNote((p) => ({ ...p, treatment: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes / Observations</label>
            <TextArea
              rows={2}
              placeholder="Clinical observations, remarks…"
              value={newNote.notes}
              onChange={(e) => setNewNote((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// tab: patient profile
function PatientProfileTab({ patient, loading, age }) {
  if (loading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (!patient) return <Empty description="Patient profile not available" />;

  return (
    <div className="space-y-3">
      {/* Avatar + name */}
      <div className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {patient.fullName?.[0]?.toUpperCase() || 'P'}
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">{patient.fullName}</div>
          <div className="text-xs text-gray-400 mt-0.5">Patient</div>
          {age !== null && <Tag color="blue" className="text-xs mt-1 mr-0">{age} yrs old</Tag>}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
        <Descriptions
          column={{ xs: 1, sm: 2 }}
          size="small"
          labelStyle={{ fontWeight: 600, color: '#6B7280', minWidth: 110 }}
          contentStyle={{ color: '#1F2937' }}
        >
          <Descriptions.Item label={<span><CalendarOutlined className="mr-1" />Date of Birth</span>}>
            {patient.dateOfBirth ? dayjs(patient.dateOfBirth).format('DD MMM YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<span><HeartOutlined className="mr-1" />Blood Type</span>}>
            {patient.bloodType ? <Tag color="red" className="font-mono">{patient.bloodType}</Tag> : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={<span><ExperimentOutlined className="mr-1" />Allergies</span>} span={2}>
            {patient.allergies?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map((a, i) => <Tag key={i} color="orange">{a}</Tag>)}
              </div>
            ) : <Text type="secondary" className="text-xs">None recorded</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="History Records" span={2}>
            <Tag color={patient.medicalHistory?.length > 0 ? 'geekblue' : 'default'}>
              {patient.medicalHistory?.length || 0} record{patient.medicalHistory?.length !== 1 ? 's' : ''}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );
}

// tab: medical records
const CATEGORY_COLORS = {
  lab_report:     'purple',
  prescription:   'blue',
  medical_report: 'cyan',
  imaging:        'geekblue',
  other:          'default',
};

function MedicalRecordsTab({ docs, loading, patientId, patientLoading }) {
  if (patientLoading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (!patientId)     return <div className="flex justify-center py-10"><Spin tip="Loading patient…" /></div>;
  if (loading)        return <div className="flex justify-center py-10"><Spin /></div>;

  if (docs.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<span className="text-gray-400 text-sm">No medical documents on file</span>}
      />
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div
          key={doc._id}
          className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-100 hover:border-blue-200 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <FileTextOutlined className="text-blue-500 text-base" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 text-sm truncate">{doc.originalName}</div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Tag color={CATEGORY_COLORS[doc.category] || 'default'} className="text-xs m-0">
                {doc.category?.replace('_', ' ') || 'Document'}
              </Tag>
              {doc.uploadedAt && (
                <span className="text-xs text-gray-400">{dayjs(doc.uploadedAt).format('DD MMM YYYY')}</span>
              )}
              {doc.description && (
                <span className="text-xs text-gray-500 truncate">{doc.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip title="View">
              <Button size="small" icon={<EyeOutlined />} onClick={async () => {
                try { window.open(await medicalReportApi.getViewUrl(patientId, doc._id), '_blank'); }
                catch { notify.error('Failed to open document'); }
              }} />
            </Tooltip>
            <Tooltip title="Download">
              <Button size="small" icon={<DownloadOutlined />} onClick={async () => {
                try { await medicalReportApi.download(patientId, doc._id, doc.originalName); }
                catch { notify.error('Failed to download'); }
              }} />
            </Tooltip>
          </div>
        </div>
      ))}
    </div>
  );
}

// tab: medical history
function MedicalHistoryTab({ patient, loading, onAddNote, isCompleted }) {
  if (loading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (!patient) return <Empty description="Patient data unavailable" />;

  const history = [...(patient.medicalHistory || [])].reverse();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Text type="secondary" className="text-xs">
          {history.length} record{history.length !== 1 ? 's' : ''}
        </Text>
        {!isCompleted && (
          <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={onAddNote}>
            Add Note
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-gray-400 text-sm">No medical history on file</span>}
        />
      ) : (
        <Timeline
          mode="left"
          items={history.map((entry, i) => ({
            color: i === 0 ? 'blue' : 'gray',
            label: (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {entry.recordedAt ? dayjs(entry.recordedAt).format('DD MMM YYYY') : '—'}
              </span>
            ),
            children: (
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm mb-1">
                <div className="font-semibold text-gray-800 text-sm mb-1">{entry.diagnosis}</div>
                {entry.treatment && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium text-gray-500">Treatment: </span>{entry.treatment}
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

// tab: prescription builder
function PrescriptionTab({ items, onAdd, onRemove, onUpdate, disabled }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <MedicineBoxOutlined className="text-5xl text-gray-200 mb-3" />
        <div className="text-sm text-gray-400 mb-4">No medications added yet</div>
        {!disabled && (
          <Button icon={<PlusOutlined />} type="primary" ghost onClick={onAdd}>
            Add Medication
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={item.key}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm relative"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-blue-700">Medication {idx + 1}</span>
            {!disabled && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onRemove(item.key)}
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Medication Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. Amoxicillin 500mg"
                value={item.name}
                onChange={(e) => onUpdate(item.key, 'name', e.target.value)}
                disabled={disabled}
                size="small"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dosage</label>
              <Input
                placeholder="e.g. 1 tablet"
                value={item.dosage}
                onChange={(e) => onUpdate(item.key, 'dosage', e.target.value)}
                disabled={disabled}
                size="small"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
              <Input
                placeholder="e.g. Twice daily"
                value={item.frequency}
                onChange={(e) => onUpdate(item.key, 'frequency', e.target.value)}
                disabled={disabled}
                size="small"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
              <Input
                placeholder="e.g. 7 days"
                value={item.duration}
                onChange={(e) => onUpdate(item.key, 'duration', e.target.value)}
                disabled={disabled}
                size="small"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Additional Notes</label>
              <Input
                placeholder="e.g. Take with food, avoid alcohol"
                value={item.notes}
                onChange={(e) => onUpdate(item.key, 'notes', e.target.value)}
                disabled={disabled}
                size="small"
              />
            </div>
          </div>
        </div>
      ))}

      {!disabled && (
        <Button
          icon={<PlusOutlined />}
          block
          type="dashed"
          onClick={onAdd}
          className="rounded-xl"
          style={{ borderColor: '#93c5fd', color: '#3b82f6' }}
        >
          Add Another Medication
        </Button>
      )}
    </div>
  );
}

// tab: consultation summary
function ConsultationTab({ consultation, onChange, disabled }) {
  const update = (field) => (e) =>
    onChange((p) => ({ ...p, [field]: typeof e === 'string' || e === null ? e : e.target.value }));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Diagnosis <span className="text-red-400">*</span>
        </label>
        <Input
          placeholder="e.g. Acute Pharyngitis"
          value={consultation.diagnosis}
          onChange={update('diagnosis')}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
        <TextArea
          rows={3}
          placeholder="Clinical observations, reported symptoms, vital signs…"
          value={consultation.observations}
          onChange={update('observations')}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
        <TextArea
          rows={3}
          placeholder="Lifestyle advice, follow-up actions, specialist referrals…"
          value={consultation.recommendations}
          onChange={update('recommendations')}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Date</label>
        <DatePicker
          value={consultation.followUpDate}
          onChange={(date) => onChange((p) => ({ ...p, followUpDate: date }))}
          disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
          disabled={disabled}
          className="w-full"
          format="DD MMM YYYY"
          placeholder="Select follow-up date"
        />
      </div>
    </div>
  );
}

// pdf generator  (dynamic import keeps bundle lean until first use)
async function generateAndDownloadPDF(appt, patient, doctorProfile, consultation, prescriptionItems) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc      = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const margin   = 18;
  const rightEdge = pageW - margin;
  let y = 0;

  // header band
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 48, 'F');
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 40, pageW, 8, 'F'); // accent stripe

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('UrbanCare', margin, 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Medical Consultation Report', margin, 25);
  doc.text('Confidential — For clinical use only', margin, 31);

  // Right side: doctor info
  const drLines = [
    appt.doctorName,
    appt.doctorSpecialty || '',
    ...(doctorProfile?.qualifications ?? []).slice(0, 2),
    `Date: ${dayjs().format('DD MMM YYYY')}`,
    `Appt: …${(appt._id || '').slice(-8)}`,
  ].filter(Boolean);

  doc.setFontSize(8);
  drLines.forEach((line, i) => {
    doc.text(line, rightEdge, 10 + i * 5.5, { align: 'right' });
  });

  y = 58;
  doc.setTextColor(15, 23, 42);

  // patient information box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y - 3, pageW - 2 * margin, 38, 2, 2, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(margin, y - 3, pageW - 2 * margin, 38, 2, 2, 'S');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Patient Information', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const colW    = (pageW - 2 * margin - 8) / 2;
  const pFields = [
    ['Name',       patient?.fullName       || 'N/A'],
    ['Date of Birth', patient?.dateOfBirth ? dayjs(patient.dateOfBirth).format('DD MMM YYYY') : 'N/A'],
    ['Blood Type', patient?.bloodType      || 'N/A'],
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
    doc.setTextColor(37, 99, 235);
    doc.text('Consultation Notes', margin, y);
    y += 5;
    doc.setDrawColor(147, 197, 253);
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

      // Page break guard
      if (y > pageH - 40) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  // prescription table
  const meds = prescriptionItems.filter((m) => m.name.trim());
  if (meds.length > 0) {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('Prescription', margin, y);
    y += 5;
    doc.setDrawColor(147, 197, 253);
    doc.line(margin, y, rightEdge, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['Medication', 'Dosage', 'Frequency', 'Duration', 'Notes']],
      body: meds.map((m) => [
        m.name,
        m.dosage    || '—',
        m.frequency || '—',
        m.duration  || '—',
        m.notes     || '—',
      ]),
      theme: 'striped',
      headStyles:           { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles:           { fontSize: 8 },
      alternateRowStyles:   { fillColor: [239, 246, 255] },
      margin:               { left: margin, right: margin },
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
    `${appt.doctorName}  ·  ${appt.doctorSpecialty || ''}`,
    margin, footerY + 3,
  );
  if (doctorProfile?._id) {
    doc.text(`Reg. No: ${doctorProfile._id.slice(-10).toUpperCase()}`, margin, footerY + 9);
  }
  doc.text(
    'UrbanCare Medical Platform  ·  support@urbancare.health',
    pageW / 2, footerY + 3, { align: 'center' },
  );
  doc.text(
    'Computer-generated document — valid without physical signature.',
    pageW / 2, footerY + 9, { align: 'center' },
  );
  doc.text(
    'DISCLAIMER: For clinical use only. Always verify with attending physician.',
    pageW / 2, footerY + 15, { align: 'center' },
  );
  doc.text(
    dayjs().format('DD MMM YYYY, HH:mm'),
    rightEdge, footerY + 3, { align: 'right' },
  );

  const fileName = `UrbanCare_${(appt._id || 'Report').slice(-8)}_${dayjs().format('YYYYMMDD')}.pdf`;
  doc.save(fileName);
}
