import React, { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Divider,
  Input,
  List,
  Tag,
  Typography,
} from 'antd';
import {
  BulbOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { patientService } from '../../services/patient/patient.service';
import { notify } from '../../utils/notify';

const { Title, Text, Paragraph } = Typography;

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const addSymptom = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (trimmed.length < 2) {
      notify.warning('Too short', 'Symptom must be at least 2 characters.');
      return;
    }
    if (symptoms.length >= 10) {
      notify.warning('Limit reached', 'You can add up to 10 symptoms.');
      return;
    }
    if (symptoms.includes(trimmed)) {
      notify.warning('Duplicate', 'This symptom is already in the list.');
      return;
    }
    setSymptoms((prev) => [...prev, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeSymptom = (symptom) => {
    setSymptoms((prev) => prev.filter((s) => s !== symptom));
    if (result) setResult(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSymptom();
    }
  };

  const handleAnalyse = async () => {
    if (symptoms.length === 0) {
      notify.warning('No symptoms', 'Please add at least one symptom before analysing.');
      return;
    }
    setAnalysing(true);
    setResult(null);
    try {
      const data = await patientService.analyseSymptoms(symptoms);
      setResult(data);
    } catch (e) {
      notify.error('Analysis failed', e.message);
    } finally {
      setAnalysing(false);
    }
  };

  const handleClear = () => {
    setSymptoms([]);
    setResult(null);
    setInputValue('');
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          AI Symptom Checker
        </Title>
        <Text type="secondary">Describe your symptoms and get AI-powered health insights</Text>
      </div>

      <Card className="rounded-2xl shadow-sm border-0">
        {/* Symptom Input */}
        <div className="mb-4">
          <Text type="secondary" className="block mb-2">
            Enter your symptoms one at a time (up to 10)
          </Text>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. headache, fever, sore throat"
              size="large"
              disabled={analysing}
              maxLength={200}
            />
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={addSymptom}
              disabled={analysing || !inputValue.trim()}
              size="large"
            >
              Add
            </Button>
          </div>
        </div>

        {/* Symptom Tags */}
        {symptoms.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Tag
                key={symptom}
                closable
                onClose={() => removeSymptom(symptom)}
                color="blue"
                className="text-sm py-1 px-2"
              >
                {symptom}
              </Tag>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            type="primary"
            onClick={handleAnalyse}
            loading={analysing}
            disabled={symptoms.length === 0}
            size="large"
            icon={<ExperimentOutlined />}
          >
            {analysing ? 'Analysing...' : 'Analyse Symptoms'}
          </Button>
          {(symptoms.length > 0 || result) && (
            <Button size="large" onClick={handleClear} disabled={analysing}>
              Clear
            </Button>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            <Divider />

            {/* Possible Conditions */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <MedicineBoxOutlined className="text-red-400 text-lg" />
                <Text strong className="text-base">Possible Conditions</Text>
              </div>
              <List
                dataSource={result.possibleConditions}
                renderItem={(condition) => (
                  <List.Item className="border-0 px-0 py-2">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag color="red">{condition.name}</Tag>
                      </div>
                      <Paragraph className="text-gray-500 mb-0 text-sm">
                        {condition.description}
                      </Paragraph>
                    </div>
                  </List.Item>
                )}
              />
            </div>

            {/* Recommended Specialties */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <TeamOutlined className="text-green-500 text-lg" />
                <Text strong className="text-base">Recommended Specialties</Text>
              </div>
              <List
                dataSource={result.recommendedSpecialties}
                renderItem={(item) => (
                  <List.Item className="border-0 px-0 py-2">
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag color="green">{item.specialty}</Tag>
                      </div>
                      <Paragraph className="text-gray-500 mb-0 text-sm">
                        {item.reason}
                      </Paragraph>
                    </div>
                  </List.Item>
                )}
              />
            </div>

            {/* General Advice */}
            {result.generalAdvice && (
              <div className="mb-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <BulbOutlined className="text-blue-500 text-lg" />
                  <Text strong className="text-base">General Advice</Text>
                </div>
                <Paragraph className="text-gray-600 mb-0">{result.generalAdvice}</Paragraph>
              </div>
            )}

            {/* Disclaimer */}
            <Alert
              type="warning"
              showIcon
              message="Medical Disclaimer"
              description={result.disclaimer}
              className="rounded-xl"
            />
          </>
        )}
      </Card>
    </div>
  );
}
