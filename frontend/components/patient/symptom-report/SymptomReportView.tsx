"use client";

import { useState, useEffect } from "react";

import { Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "antd";
import { useAuth } from "@/hooks/useAuth";
import patientService from "@/services/patientService";
import type { Patient, TimelineStage } from "@/types/patient";
import {
  type BodyPart,
  type SymptomFormData,
  BODY_PART_SYMPTOMS,
} from "@/types/symptomReport";

interface SymptomReportViewProps {
  onStartChat?: (formData: SymptomFormData) => void;
}

const BODY_PARTS: BodyPart[] = [
  "head_neck",
  "chest",
  "abdomen",
  "back",
  "limbs",
  "skin",
  "whole_body",
  "other",
];

const BODY_PART_LABELS: Record<BodyPart, string> = {
  head_neck: "头颈部",
  chest: "胸部",
  abdomen: "腹部",
  back: "腰背部",
  limbs: "四肢",
  skin: "皮肤",
  whole_body: "全身",
  other: "其他",
};

const DURATION_OPTIONS = [
  { value: "today", label: "今天开始" },
  { value: "days", label: "几天内" },
  { value: "1-2weeks", label: "1-2周" },
  { value: "weeks", label: "数周" },
  { value: "month+", label: "超过1个月" },
];

export function SymptomReportView({ onStartChat }: SymptomReportViewProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [historyRecords, setHistoryRecords] = useState<TimelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedParts, setSelectedParts] = useState<BodyPart[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>("");
  const [severity, setSeverity] = useState<number>(5);
  const [description, setDescription] = useState<string>("");

  // Load patient and history
  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        const patientData = await patientService.getPatientByEmail(user.email);
        setPatient(patientData);
        if (patientData) {
          const timelines = await patientService.getPatientTimeline(
            patientData.patient_id
          );
          const symptomRecords = timelines.filter(
            (tl: TimelineStage) => tl.stage_type === "symptom_report"
          );
          setHistoryRecords(symptomRecords);
        }
      } catch {
        // Silently handle — patient may not exist yet
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.email]);

  // Available symptoms based on selected body parts
  const availableSymptoms = selectedParts.flatMap(
    (part) => BODY_PART_SYMPTOMS[part]
  );
  const uniqueSymptoms = [...new Set(availableSymptoms)];

  const togglePart = (part: BodyPart) => {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = () => {
    if (selectedParts.length === 0) return;
    const formData: SymptomFormData = {
      body_parts: selectedParts,
      symptom_tags: selectedSymptoms,
      duration,
      severity,
      description: description || undefined,
    };
    onStartChat?.(formData);
  };

  const canSubmit = selectedParts.length > 0 && duration !== "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-app-surface overflow-hidden">
      {/* Header */}
      <div className="bg-app-surface border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">症状自报</h1>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "form" | "history")}
          >
            <TabsList className="h-14 gap-1 rounded-xl border border-gray-200 bg-transparent px-1">
              <TabsTrigger
                value="form"
                className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
              >
                新建症状报告
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="h-12 rounded-lg border border-transparent bg-transparent px-8 py-3 text-base font-bold text-gray-600 hover:bg-[#F6F0EA] data-[state=active]:border-[#D4D0CA] data-[state=active]:bg-[#E1DEDA] data-[state=active]:text-[#241A12] data-[state=active]:shadow-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
              >
                历史记录
                {historyRecords.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-[#E7E4DE] px-1.5 py-0.5 text-xs font-semibold text-[#5A534B]">
                    {historyRecords.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "form" ? (
          <div className="max-w-2xl mx-auto px-8 py-5">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6 space-y-5">
            {/* Body part selection */}
            <div>
              <label className="text-base font-medium text-gray-700 mb-3 block">
                不适部位
              </label>
              <div className="flex flex-wrap gap-2">
                {BODY_PARTS.map((part) => (
                  <button
                    key={part}
                    onClick={() => togglePart(part)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                      selectedParts.includes(part)
                        ? "bg-[#EFF7F5] text-[#6E977B] border-[#A8C5B0]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {BODY_PART_LABELS[part]}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptom tags */}
            {uniqueSymptoms.length > 0 && (
              <div>
                <label className="text-base font-medium text-gray-700 mb-3 block">
                  症状特征
                </label>
                <div className="flex flex-wrap gap-2">
                  {uniqueSymptoms.map((symptom) => (
                    <button
                      key={symptom}
                      onClick={() => toggleSymptom(symptom)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        selectedSymptoms.includes(symptom)
                          ? "bg-[#EFF7F5] text-[#6E977B] border-[#A8C5B0]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="text-base font-medium text-gray-700 mb-3 block">
                持续时长
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                      duration === opt.value
                        ? "bg-[#EFF7F5] text-[#6E977B] border-[#A8C5B0]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity slider */}
            <div>
              <label className="text-base font-medium text-gray-700 mb-3 block">
                严重程度
                <span className="ml-2 text-[#6E977B] font-semibold">
                  {severity}/10
                </span>
              </label>
              <Slider
                min={1}
                max={10}
                value={severity}
                onChange={(val: number) => setSeverity(val)}
                trackStyle={{ backgroundColor: "#6E977B" }}
                handleStyle={{ borderColor: "#6E977B" }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-base font-medium text-gray-700 mb-3 block">
                补充描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请描述其他不适或补充信息..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-[#A8C5B0] focus:outline-none focus:ring-1 focus:ring-[#EFF7F5] resize-none"
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full bg-[#6E977B] hover:bg-[#5E856C] text-white"
            >
              <Plus size={16} className="mr-1.5" />
              开始智能问诊
            </Button>
            </CardContent>
          </Card>
          </div>
        ) : (
          /* History tab */
          <div className="max-w-2xl mx-auto px-8 py-5">
            <CardContent className="p-6 space-y-3">
            {historyRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                暂无症状报告记录
              </div>
            ) : (
              historyRecords.map((record) => (
                <Card
                  key={record.timeline_id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {record.stage_title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {record.stage_date}
                        </p>
                        {record.diagnosis && (
                          <p className="text-xs text-gray-600 mt-1">
                            {record.diagnosis}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-400 flex-shrink-0"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            </CardContent>
          </div>
        )}
      </div>
    </div>
  );
}
