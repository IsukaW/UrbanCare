import React, { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Progress,
  Select,
  Slider,
  Steps,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  ExperimentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { patientService } from '../../services/patient/patient.service';
import { notify } from '../../utils/notify';

const { Title, Text, Paragraph } = Typography;

// static data

const BODY_AREAS = [
  { id: 'Head',    emoji: '🧠', label: 'Head' },
  { id: 'Throat',  emoji: '🫁', label: 'Throat' },
  { id: 'Chest',   emoji: '❤️', label: 'Chest' },
  { id: 'Abdomen', emoji: '🫃', label: 'Abdomen' },
  { id: 'Back',    emoji: '🦴', label: 'Back' },
  { id: 'Limbs',   emoji: '🦵', label: 'Limbs' },
  { id: 'Skin',    emoji: '🩹', label: 'Skin' },
  { id: 'General', emoji: '🌡️', label: 'General' },
];

const SYMPTOM_MAP = {
  Head:    ['Headache', 'Dizziness', 'Blurred vision', 'Runny nose', 'Ear pain', 'Eye redness', 'Migraine', 'Confusion'],
  Throat:  ['Sore throat', 'Difficulty swallowing', 'Hoarse voice', 'Swollen glands', 'Persistent cough'],
  Chest:   ['Chest pain', 'Shortness of breath', 'Heart palpitations', 'Chest tightness', 'Wheezing'],
  Abdomen: ['Nausea', 'Vomiting', 'Stomach pain', 'Bloating', 'Diarrhea', 'Constipation', 'Loss of appetite'],
  Back:    ['Lower back pain', 'Upper back pain', 'Back stiffness', 'Muscle spasms'],
  Limbs:   ['Joint pain', 'Swelling', 'Muscle weakness', 'Numbness', 'Tingling', 'Leg cramps'],
  Skin:    ['Rash', 'Itching', 'Hives', 'Dry skin', 'Blisters', 'Bruising'],
  General: ['Fever', 'Fatigue', 'Chills', 'Night sweats', 'Unexplained weight loss', 'Insomnia'],
};

const ALL_MAPPED = new Set(Object.values(SYMPTOM_MAP).flat());

const DURATION_OPTIONS = [
  { value: 'less_than_day',     label: 'Less than a day' },
  { value: '1_3_days',          label: '1–3 days' },
  { value: '4_7_days',          label: '4–7 days' },
  { value: '1_2_weeks',         label: '1–2 weeks' },
  { value: 'more_than_2_weeks', label: 'More than 2 weeks' },
  { value: 'chronic',           label: 'Ongoing / Chronic' },
];

const AGE_GROUPS = [
  { value: 'child',  label: 'Child (0–12)' },
  { value: 'teen',   label: 'Teen (13–17)' },
  { value: 'adult',  label: 'Adult (18–64)' },
  { value: 'senior', label: 'Senior (65+)' },
];

const SEVERITY_MARKS = { 1: 'Mild', 5: 'Moderate', 10: 'Severe' };

const URGENCY = {
  low:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low',    sub: 'Self-care may be sufficient' },
  medium: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Medium', sub: 'Consider seeing a doctor' },
  high:   { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'High',   sub: 'Seek medical attention soon' },
};

const STEP_ITEMS = [
  { title: 'Body Areas' },
  { title: 'Symptoms' },
  { title: 'Details' },
  { title: 'Results' },
];

// helpers

function severityColor(v) {
  if (v <= 3) return '#22c55e';
  if (v <= 6) return '#f59e0b';
  return '#ef4444';
}

// component

export default function SymptomChecker() {
  const [step, setStep] = useState(0);
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [duration, setDuration] = useState(null);
  const [ageGroup, setAgeGroup] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const customInputRef = useRef(null);

  // state helpers

  const toggleArea = (id) => {
    const willSelect = !selectedAreas.includes(id);
    const newAreas = willSelect
      ? [...selectedAreas, id]
      : selectedAreas.filter((a) => a !== id);
    setSelectedAreas(newAreas);
    if (!willSelect) {
      const remaining = new Set(newAreas.flatMap((a) => SYMPTOM_MAP[a] ?? []));
      setSelectedSymptoms((prev) => prev.filter((s) => !ALL_MAPPED.has(s) || remaining.has(s)));
    }
  };

  const toggleSymptom = (symptom) =>
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );

  const addCustom = () => {
    const t = customInput.trim();
    if (!t || t.length < 2) return;
    if (selectedSymptoms.map((s) => s.toLowerCase()).includes(t.toLowerCase())) {
      notify.warning('Duplicate', 'Already in your list.');
      return;
    }
    setSelectedSymptoms((prev) => [...prev, t]);
    setCustomInput('');
    customInputRef.current?.focus();
  };

  const handleAnalyse = async () => {
    setAnalysing(true);
    setResult(null);
    setStep(3);
    try {
      const data = await patientService.analyseSymptoms({
        symptoms: selectedSymptoms,
        bodyAreas: selectedAreas,
        duration,
        ageGroup,
        severity,
      });
      setResult(data);
    } catch (e) {
      notify.error('Analysis failed', e.message);
      setStep(2);
    } finally {
      setAnalysing(false);
    }
  };

  const restart = () => {
    setStep(0);
    setSelectedAreas([]);
    setSelectedSymptoms([]);
    setCustomInput('');
    setDuration(null);
    setAgeGroup(null);
    setSeverity(5);
    setResult(null);
  };

  const canProceed = [
    selectedAreas.length > 0,
    selectedSymptoms.length > 0,
    !!(duration && ageGroup),
  ][step] ?? true;

  // step renders

  const renderStep0 = () => (
    <div>
      <div className="mb-5">
        <Title level={4} style={{ marginBottom: 4 }}>Where do you feel the symptoms?</Title>
        <Text type="secondary">Select all body areas that apply — you can pick more than one</Text>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {BODY_AREAS.map(({ id, emoji, label }) => {
          const selected = selectedAreas.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggleArea(id)}
              className={[
                'flex flex-col items-center justify-center gap-2 p-3 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer focus:outline-none',
                selected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/40',
              ].join(' ')}
              style={{ minHeight: 86 }}
            >
              <span className="text-3xl sm:text-4xl leading-none select-none">{emoji}</span>
              <Text className={`text-sm font-medium ${selected ? 'text-blue-600' : 'text-gray-700'}`}>
                {label}
              </Text>
              {selected && <CheckCircleFilled style={{ color: '#3b82f6', fontSize: 13 }} />}
            </button>
          );
        })}
      </div>
      {selectedAreas.length > 0 && (
        <Text type="secondary" className="text-xs block mt-3">
          {selectedAreas.length} area{selectedAreas.length > 1 ? 's' : ''} selected
        </Text>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="flex flex-col md:flex-row gap-6 min-h-0">
      {/* Symptom chips */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="mb-5">
          <Title level={4} style={{ marginBottom: 4 }}>What are you experiencing?</Title>
          <Text type="secondary">Tap to select symptoms — or type your own below</Text>
        </div>

        {selectedAreas.map((areaId) => (
          <div key={areaId} className="mb-5">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              {BODY_AREAS.find((a) => a.id === areaId)?.emoji} {areaId}
            </Text>
            <div className="flex flex-wrap gap-2">
              {(SYMPTOM_MAP[areaId] ?? []).map((s) => {
                const on = selectedSymptoms.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm border-2 transition-all focus:outline-none',
                      on
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-500',
                    ].join(' ')}
                  >
                    {on && <CheckCircleFilled className="mr-1.5" style={{ fontSize: 11 }} />}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom symptom input */}
        <div className="mt-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            ✏️ Other / Custom
          </Text>
          <div className="flex gap-2">
            <Input
              ref={customInputRef}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder="Describe a symptom…"
              maxLength={100}
            />
            <Button onClick={addCustom} disabled={!customInput.trim()}>Add</Button>
          </div>
          {selectedSymptoms.filter((s) => !ALL_MAPPED.has(s)).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSymptoms
                .filter((s) => !ALL_MAPPED.has(s))
                .map((s) => (
                  <Tag
                    key={s}
                    closable
                    onClose={() => toggleSymptom(s)}
                    color="purple"
                    className="rounded-full"
                  >
                    {s}
                  </Tag>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected summary */}
      {selectedSymptoms.length > 0 && (
        <div className="rounded-2xl p-4 bg-blue-50 border border-blue-100 overflow-y-auto w-full md:w-56 md:flex-shrink-0 md:self-start md:max-h-[480px]">
          <Text className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-3">
            Selected ({selectedSymptoms.length})
          </Text>
          <div className="flex flex-col gap-1.5">
            {selectedSymptoms.map((s) => (
              <div key={s} className="flex items-center justify-between gap-1 group">
                <Text className="text-sm text-blue-800 truncate flex-1">{s}</Text>
                <button
                  onClick={() => toggleSymptom(s)}
                  className="text-blue-300 hover:text-blue-600 focus:outline-none text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Controls */}
      <div className="flex-1">
        <div className="mb-5">
          <Title level={4} style={{ marginBottom: 4 }}>A little more context</Title>
          <Text type="secondary">Helps the AI give you more accurate insights</Text>
        </div>
        <div className="space-y-7">
          <div>
            <Text strong className="block mb-2">How long have you had these symptoms?</Text>
            <Select
              value={duration}
              onChange={setDuration}
              placeholder="Select duration"
              size="large"
              style={{ width: '100%' }}
              options={DURATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <Text strong className="block mb-2">Age group</Text>
            <Select
              value={ageGroup}
              onChange={setAgeGroup}
              placeholder="Select age group"
              size="large"
              style={{ width: '100%' }}
              options={AGE_GROUPS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div>
            <Text strong className="block mb-3">
              Symptom severity:{' '}
              <span style={{ color: severityColor(severity) }}>
                {severity}/10 — {severity <= 3 ? 'Mild' : severity <= 6 ? 'Moderate' : 'Severe'}
              </span>
            </Text>
            <Slider
              min={1}
              max={10}
              value={severity}
              onChange={setSeverity}
              marks={SEVERITY_MARKS}
              styles={{ track: { backgroundColor: severityColor(severity) } }}
            />
          </div>
        </div>
      </div>

      {/* Live summary */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 w-full md:w-64 md:flex-shrink-0 md:self-start">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-4">
          Your Summary
        </Text>
        <div className="space-y-4">
          <div>
            <Text className="text-xs text-gray-400 block mb-1.5">Body areas</Text>
            <div className="flex flex-wrap gap-1">
              {selectedAreas.map((a) => {
                const area = BODY_AREAS.find((b) => b.id === a);
                return (
                  <Tag key={a} color="blue" className="rounded-full text-xs m-0">
                    {area?.emoji} {a}
                  </Tag>
                );
              })}
            </div>
          </div>
          <div>
            <Text className="text-xs text-gray-400 block mb-1.5">
              Symptoms ({selectedSymptoms.length})
            </Text>
            <div className="flex flex-wrap gap-1">
              {selectedSymptoms.map((s) => (
                <Tag key={s} className="rounded-full text-xs m-0">{s}</Tag>
              ))}
            </div>
          </div>
          {duration && (
            <div>
              <Text className="text-xs text-gray-400 block mb-0.5">Duration</Text>
              <Text className="text-sm text-gray-700">
                {DURATION_OPTIONS.find((o) => o.value === duration)?.label}
              </Text>
            </div>
          )}
          {ageGroup && (
            <div>
              <Text className="text-xs text-gray-400 block mb-0.5">Age group</Text>
              <Text className="text-sm text-gray-700">
                {AGE_GROUPS.find((o) => o.value === ageGroup)?.label}
              </Text>
            </div>
          )}
          <div>
            <Text className="text-xs text-gray-400 block mb-0.5">Severity</Text>
            <Text className="text-sm font-semibold" style={{ color: severityColor(severity) }}>
              {severity}/10
            </Text>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (analysing) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
            style={{ background: 'linear-gradient(135deg, #dbeafe, #ede9fe)' }}
          >
            <ExperimentOutlined style={{ fontSize: 40, color: '#6366f1' }} />
          </div>
          <div className="text-center">
            <Title level={4} style={{ marginBottom: 4 }}>Analysing your symptoms…</Title>
            <Text type="secondary">Our AI is reviewing your information</Text>
          </div>
          <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 rounded-full animate-pulse"
              style={{ width: '65%' }}
            />
          </div>
        </div>
      );
    }

    if (!result) return null;

    const urgencyKey = result.urgencyLevel?.toLowerCase();
    const urgencyCfg = URGENCY[urgencyKey];

    return (
      <div className="space-y-5 pb-4">
        {/* Summary headline */}
        {result.summary && (
          <div
            className="p-5 rounded-2xl border border-blue-100"
            style={{ background: 'linear-gradient(135deg, #eff6ff, #eef2ff)' }}
          >
            <Text className="text-xs font-semibold text-indigo-500 uppercase tracking-wider block mb-1">
              AI Summary
            </Text>
            <Paragraph className="text-gray-800 text-base mb-0 font-medium">
              {result.summary}
            </Paragraph>
          </div>
        )}

        {/* Urgency */}
        {urgencyCfg && (
          <div
            className="flex items-center gap-4 p-4 rounded-2xl border"
            style={{ background: urgencyCfg.bg, borderColor: urgencyCfg.border }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: urgencyCfg.color + '25' }}
            >
              <div className="w-3 h-3 rounded-full" style={{ background: urgencyCfg.color }} />
            </div>
            <div>
              <Text strong style={{ color: urgencyCfg.color }}>
                Urgency: {urgencyCfg.label}
              </Text>
              <Text className="text-sm block" style={{ color: urgencyCfg.color }}>
                {urgencyCfg.sub}
              </Text>
            </div>
          </div>
        )}

        {/* Two-column: Conditions + Specialties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Possible conditions */}
          {result.possibleConditions?.length > 0 && (
            <div className="rounded-2xl border border-gray-100 p-5 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🩺</span>
                <Text strong className="text-base">Possible Conditions</Text>
              </div>
              <div className="space-y-4">
                {result.possibleConditions.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <Text strong className="text-sm">{c.name}</Text>
                      {c.probability != null && (
                        <Text className="text-xs text-gray-400">{c.probability}%</Text>
                      )}
                    </div>
                    {c.probability != null && (
                      <Progress
                        percent={c.probability}
                        size="small"
                        showInfo={false}
                        strokeColor={
                          c.probability >= 70 ? '#ef4444' : c.probability >= 40 ? '#f59e0b' : '#22c55e'
                        }
                        className="mb-1.5"
                      />
                    )}
                    {c.description && (
                      <Text className="text-xs text-gray-500">{c.description}</Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended specialties */}
          {result.recommendedSpecialties?.length > 0 && (
            <div className="rounded-2xl border border-gray-100 p-5 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">👨‍⚕️</span>
                <Text strong className="text-base">See a Specialist</Text>
              </div>
              <div className="space-y-3">
                {result.recommendedSpecialties.map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-green-50 border border-green-100">
                    <Tag color="green" className="rounded-full mb-1">{item.specialty}</Tag>
                    {item.reason && (
                      <Text className="text-xs text-gray-500 block">{item.reason}</Text>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* General advice */}
        {result.generalAdvice && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span>💡</span>
              <Text strong>General Advice</Text>
            </div>
            <Paragraph className="text-gray-600 mb-0">{result.generalAdvice}</Paragraph>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations?.length > 0 && (
          <div className="rounded-2xl border border-gray-100 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <span>✅</span>
              <Text strong className="text-base">Recommendations</Text>
            </div>
            <ul className="space-y-2 m-0 pl-0 list-none">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0 font-bold">→</span>
                  <Text className="text-sm text-gray-700">{rec}</Text>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <Alert
          type="warning"
          showIcon
          message="Medical Disclaimer"
          description={
            result.disclaimer ??
            'This tool provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.'
          }
          className="rounded-2xl"
        />

        {/* Restart */}
        <div className="flex justify-center pt-2">
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={restart}
            style={{ borderRadius: 9999 }}
          >
            Start a New Check
          </Button>
        </div>
      </div>
    );
  };

  // render

  const isResultStep = step === 3;

  return (
    <div className="p-4 md:p-6 flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="mb-5">
        <Title level={3} style={{ margin: 0 }}>AI Symptom Checker</Title>
        <Text type="secondary">
          Answer a few quick questions to get personalised health insights
        </Text>
      </div>

      {/* Step indicator */}
      <div className="mb-7">
        <Steps current={step} size="small" items={STEP_ITEMS} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Navigation */}
      {!isResultStep && (
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-100">
          <Button
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0 || analysing}
            style={{ borderRadius: 9999 }}
          >
            Back
          </Button>

          {step === 2 ? (
            <Button
              type="primary"
              size="large"
              icon={<ExperimentOutlined />}
              onClick={handleAnalyse}
              loading={analysing}
              disabled={!canProceed}
              style={{ borderRadius: 9999, paddingLeft: 24, paddingRight: 24 }}
            >
              {analysing ? 'Analysing…' : 'Analyse Symptoms'}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              style={{ borderRadius: 9999 }}
            >
              Continue <ArrowRightOutlined />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
