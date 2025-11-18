"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Star,
  Share2,
  Edit,
  User,
  Calendar,
  FileText,
  TestTube,
  Stethoscope,
  Pill,
  TrendingUp,
  ClipboardList,
  StickyNote,
  Check,
  X,
  Image as ImageIcon,
  Tag as TagIcon,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input, Select, InputNumber, App, Modal, Form } from "antd";
import { medicalCaseService, type MedicalCaseDetail } from "@/services/medicalCaseService";
const { TextArea } = Input;
interface CaseDetailViewProps {
  caseId: string;
  onBack: () => void;
}
const diseaseTypes = ["类风湿", "红斑狼疮", "强直性脊柱炎", "痛风", "骨关节炎", "干燥综合征", "其他"];
const caseCategories = [
  { value: "classic", label: "经典病例" },
  { value: "rare", label: "罕见病例" },
  { value: "typical", label: "典型病例" },
  { value: "complex", label: "复杂病例" },
];
export function CaseDetailView({ caseId, onBack }: CaseDetailViewProps) {
  const { message, modal } = App.useApp();
  const [caseData, setCaseData] = useState<MedicalCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Modal states for editing
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isLabResultModalOpen, setIsLabResultModalOpen] = useState(false);
  const [imageForm] = Form.useForm();
  const [symptomForm] = Form.useForm();
  const [labResultForm] = Form.useForm();

  useEffect(() => {
    loadCaseDetail();
  }, [caseId]);
  const loadCaseDetail = async () => {
    try {
      setLoading(true);
      const data = await medicalCaseService.getDetail(parseInt(caseId));
      setCaseData(data);

      // Check if this case is in user's favorites
      try {
        const favoritesResponse = await medicalCaseService.getFavorites();
        const isFav = favoritesResponse.cases.some(
          (favCase) => favCase.case_id === parseInt(caseId)
        );
        setIsFavorited(isFav);
      } catch (error) {
        console.error("Failed to load favorite status:", error);
        // Don't show error message for favorite status check failure
      }
    } catch (error) {
      console.error("Failed to load case detail:", error);
      message.error("加载病例详情失败");
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValues({ [field]: currentValue });
  };
  const handleCancel = () => {
    setEditingField(null);
    setEditValues({});
  };
  const handleSave = async (field: string) => {
    try {
      let value = editValues[field];
      
      // Helper function to parse JSON string to object
      const parseJsonField = (val: string | undefined): Record<string, any> => {
        if (!val || val.trim() === "") {
          return {};
        }
        try {
          const parsed = JSON.parse(val);
          return typeof parsed === "object" && parsed !== null ? parsed : {};
        } catch (e) {
          // If not valid JSON, treat as plain text and wrap in an object
          return { text: val };
        }
      };

      // Parse JSON fields for detail updates
      if (field === "physical_examination" || field === "imaging_results") {
        value = parseJsonField(value);
      }

      // Convert medications from newline-separated string to array
      if (field === "medications" && typeof value === "string") {
        value = value
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }

      // Convert tags from comma-separated string to array
      if (field === "tags" && typeof value === "string") {
        value = value
          .split(/[,，]/) // Support both English and Chinese commas
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      }

      // Determine if it's a basic field or detail field
      const basicFields = [
        "case_title",
        "diagnosis",
        "disease_type",
        "age",
        "gender",
        "chief_complaint",
        "category",
        "is_classic",
        "tags",
      ];
      if (basicFields.includes(field)) {
        // Update basic case info
        await medicalCaseService.update(parseInt(caseId), { [field]: value });
      } else {
        // Update case detail
        await medicalCaseService.createDetail({
          case_id: parseInt(caseId),
          [field]: value,
        });
      }
      message.success("保存成功");
      await loadCaseDetail();
      setEditingField(null);
      setEditValues({});
    } catch (error) {
      console.error("Failed to save:", error);
      message.error("保存失败");
    }
  };
  const handleToggleFavorite = async () => {
    try {
      setFavoriteLoading(true);
      const action = isFavorited ? "remove" : "add";
      await medicalCaseService.toggleFavorite(parseInt(caseId), action);
      setIsFavorited(!isFavorited);
      message.success(isFavorited ? "已取消收藏" : "已添加收藏");
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      message.error("操作失败");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleDelete = () => {
    if (!caseData) return;

    modal.confirm({
      title: "确认删除",
      content: `确定要删除病例"${caseData.diagnosis || caseData.case_no}"吗？删除后将无法恢复。`,
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await medicalCaseService.delete(parseInt(caseId));
            message.success("删除成功");
            onBack();
            resolve();
          } catch (error) {
            console.error("Failed to delete case:", error);
            const errorMessage = error instanceof Error ? error.message : '删除失败';
            message.error(errorMessage);
            reject(error);
          }
        });
      },
    });
  };

  // Image handling functions
  const handleAddImage = async (values: any) => {
    try {
      await medicalCaseService.addImages(parseInt(caseId), [values]);
      message.success("添加影像成功");
      setIsImageModalOpen(false);
      imageForm.resetFields();
      await loadCaseDetail();
    } catch (error) {
      console.error("Failed to add image:", error);
      message.error("添加影像失败");
    }
  };

  const handleDeleteAllImages = () => {
    modal.confirm({
      title: "确认删除",
      content: "确定要删除所有影像资料吗？删除后将无法恢复。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await medicalCaseService.deleteImages(parseInt(caseId));
            message.success("删除成功");
            await loadCaseDetail();
            resolve();
          } catch (error) {
            console.error("Failed to delete images:", error);
            message.error("删除失败");
            reject(error);
          }
        });
      },
    });
  };

  // Symptom handling functions
  const handleAddSymptom = async (values: any) => {
    try {
      await medicalCaseService.addSymptoms(parseInt(caseId), [values]);
      message.success("添加症状成功");
      setIsSymptomModalOpen(false);
      symptomForm.resetFields();
      await loadCaseDetail();
    } catch (error) {
      console.error("Failed to add symptom:", error);
      message.error("添加症状失败");
    }
  };

  const handleDeleteAllSymptoms = () => {
    modal.confirm({
      title: "确认删除",
      content: "确定要删除所有症状吗？删除后将无法恢复。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await medicalCaseService.deleteSymptoms(parseInt(caseId));
            message.success("删除成功");
            await loadCaseDetail();
            resolve();
          } catch (error) {
            console.error("Failed to delete symptoms:", error);
            message.error("删除失败");
            reject(error);
          }
        });
      },
    });
  };

  // Lab result handling functions
  const handleAddLabResult = async (values: any) => {
    try {
      await medicalCaseService.addLabResults(parseInt(caseId), [values]);
      message.success("添加检查结果成功");
      setIsLabResultModalOpen(false);
      labResultForm.resetFields();
      await loadCaseDetail();
    } catch (error) {
      console.error("Failed to add lab result:", error);
      message.error("添加检查结果失败");
    }
  };

  const handleDeleteAllLabResults = () => {
    modal.confirm({
      title: "确认删除",
      content: "确定要删除所有实验室检查结果吗？删除后将无法恢复。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        return new Promise<void>(async (resolve, reject) => {
          try {
            await medicalCaseService.deleteLabResults(parseInt(caseId));
            message.success("删除成功");
            await loadCaseDetail();
            resolve();
          } catch (error) {
            console.error("Failed to delete lab results:", error);
            message.error("删除失败");
            reject(error);
          }
        });
      },
    });
  };
  const EditableField = ({
    field,
    value,
    label,
    type = "text",
    rows = 3,
    options = [],
  }: {
    field: string;
    value: any;
    label: string;
    type?: "text" | "textarea" | "number" | "select";
    rows?: number;
    options?: Array<{ value: any; label: string }>;
  }) => {
    const isEditing = editingField === field;
    const displayValue = value || <span className="text-gray-400 italic">暂无{label}</span>;
    return (
      <div className="group">
        <div className="flex items-start justify-between gap-2">
          {!isEditing ? (
            <>
              <div className="flex-1 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayValue}</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEdit(field, value)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <div className="flex-1 flex items-start gap-2">
              <div className="flex-1">
                {type === "textarea" ? (
                  <TextArea
                    value={editValues[field]}
                    onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                    rows={rows}
                    className="w-full"
                  />
                ) : type === "number" ? (
                  <InputNumber
                    value={editValues[field]}
                    onChange={(val) => setEditValues({ ...editValues, [field]: val })}
                    className="w-full"
                  />
                ) : type === "select" ? (
                  <Select
                    value={editValues[field]}
                    onChange={(val) => setEditValues({ ...editValues, [field]: val })}
                    className="w-full"
                    options={options}
                  />
                ) : (
                  <Input
                    value={editValues[field]}
                    onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                    className="w-full"
                  />
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => handleSave(field)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#D94527] border-r-transparent mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }
  if (!caseData) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到病例信息</p>
          <Button onClick={onBack}>返回病例库</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header with Tab Navigation */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {caseData.case_title || caseData.diagnosis || "病例详情"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                诊断: {caseData.diagnosis || "未填写"} · 病例编号: {caseData.case_no} · {caseData.gender} ·{" "}
                {caseData.age}岁
              </p>
              {(caseData.category || (caseData.tags && caseData.tags.length > 0)) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {caseData.category && (
                    <span className="px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                      {caseCategories.find((c) => c.value === caseData.category)?.label || caseData.category}
                    </span>
                  )}
                  {caseData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full flex items-center gap-1"
                    >
                      <TagIcon className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-14 p-1 gap-1">
              <TabsTrigger
                value="basic"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                基本信息
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                病史
              </TabsTrigger>
              <TabsTrigger
                value="examination"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                检查
              </TabsTrigger>
              <TabsTrigger
                value="treatment"
                className="data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-8 py-3 font-bold text-base"
              >
                诊疗
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Main Content */}
            <div className="col-span-12 lg:col-span-8">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Basic Information Tab */}
                <TabsContent value="basic" className="mt-0 space-y-4">
                  {/* Patient Info Card */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <User className="h-5 w-5 text-[#D94527]" />
                        患者信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <div>
                          <span className="text-gray-500 text-sm mb-1 block">病例标题</span>
                          <EditableField field="case_title" value={caseData.case_title} label="病例标题" />
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm mb-1 block">病例编号</span>
                          <p className="text-sm text-gray-900 font-semibold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            {caseData.case_no}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm mb-1 block">病例类别</span>
                          <EditableField
                            field="category"
                            value={caseData.category}
                            label="病例类别"
                            type="select"
                            options={caseCategories}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-gray-500 text-sm mb-1 block">性别</span>
                          <EditableField
                            field="gender"
                            value={caseData.gender}
                            label="性别信息"
                            type="select"
                            options={[
                              { value: "男", label: "男" },
                              { value: "女", label: "女" },
                            ]}
                          />
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm mb-1 block">年龄</span>
                          <EditableField field="age" value={caseData.age} label="年龄信息" type="number" />
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm mb-1 block">疾病类型</span>
                          <EditableField
                            field="disease_type"
                            value={caseData.disease_type}
                            label="疾病类型"
                            type="select"
                            options={diseaseTypes.map((t) => ({ value: t, label: t }))}
                          />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                        <span className="text-gray-500 text-sm mb-2 block">病例标签</span>
                        <div className="group">
                          <div className="flex items-start justify-between gap-2">
                            {editingField !== "tags" ? (
                              <>
                                <div className="flex-1">
                                  {caseData.tags && caseData.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {caseData.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full flex items-center gap-1"
                                        >
                                          <TagIcon className="h-3 w-3" />
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">暂无标签</p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit("tags", caseData.tags?.join(", ") || "")}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <div className="flex-1 flex items-start gap-2">
                                <div className="flex-1">
                                  <Input
                                    value={editValues["tags"]}
                                    onChange={(e) => setEditValues({ ...editValues, tags: e.target.value })}
                                    placeholder="输入标签，用逗号分隔，例如：关节炎,慢性病,重症"
                                    className="w-full"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">用逗号分隔多个标签</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSave("tags")}
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancel}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                        <span className="text-gray-500 text-sm mb-2 block">主诉</span>
                        <EditableField
                          field="chief_complaint"
                          value={caseData.chief_complaint}
                          label="主诉信息"
                          type="textarea"
                          rows={2}
                        />
                      </div>
                      {caseData.is_classic && (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            经典病例
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Image Gallery Card */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-[#D94527]" />
                          影像资料
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsImageModalOpen(true)}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            添加
                          </Button>
                          {caseData.images && caseData.images.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDeleteAllImages}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                              删除全部
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {caseData.images && caseData.images.length > 0 ? (
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {caseData.images.map((image) => (
                            <div key={image.image_id} className="flex-shrink-0 w-64 group cursor-pointer">
                              <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-[#D94527] transition-colors">
                                <img
                                  src={image.thumbnail_url || image.image_url}
                                  alt={image.image_description || image.image_type || "影像资料"}
                                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                  <div className="text-xs text-white/90 font-medium">{image.image_type || "影像"}</div>
                                  <div className="text-sm text-white font-semibold">
                                    {image.image_description || "点击查看"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[0, 1, 2].map((slot) => (
                            <div
                              key={slot}
                              className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50 text-gray-400"
                            >
                              <ImageIcon className="h-8 w-8 mb-3" />
                              <p className="text-sm font-semibold">待上传影像</p>
                              <p className="text-xs text-center text-gray-400 px-4">支持 X光 / CT / MRI 等检查图片</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-3">您可以在编辑面板中上传或替换影像资料</p>
                    </CardContent>
                  </Card>
                  {/* Diagnosis Card */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        诊断
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <EditableField field="diagnosis" value={caseData.diagnosis} label="诊断" />
                      {(caseData.detail?.diagnosis_basis || editingField === "diagnosis_basis") && (
                        <div className="pt-3 border-t border-blue-200">
                          <span className="text-sm text-blue-700 font-medium mb-2 block">诊断依据:</span>
                          <EditableField
                            field="diagnosis_basis"
                            value={caseData.detail?.diagnosis_basis}
                            label="诊断依据"
                            type="textarea"
                            rows={4}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Symptoms Card */}
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Stethoscope className="h-5 w-5 text-[#D94527]" />
                          症状表现
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsSymptomModalOpen(true)}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            添加
                          </Button>
                          {caseData.symptoms && caseData.symptoms.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDeleteAllSymptoms}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                              删除全部
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {caseData.symptoms && caseData.symptoms.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {caseData.symptoms.map((symptom, index) => (
                            <div
                              key={index}
                              className={`px-3 py-2 rounded-lg text-sm ${
                                symptom.is_key_symptom
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              <div className="font-semibold">{symptom.symptom_name}</div>
                              {symptom.symptom_description && (
                                <div className="text-xs mt-1 opacity-80">{symptom.symptom_description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">暂无症状信息</p>
                          <p className="text-xs mt-1">点击"添加"按钮添加症状</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* History Tab */}
                <TabsContent value="history" className="mt-0 space-y-4">
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#D94527]" />
                        现病史
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="present_illness_history"
                        value={caseData.detail?.present_illness_history}
                        label="现病史信息"
                        type="textarea"
                        rows={6}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#D94527]" />
                        既往史
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="past_medical_history"
                        value={caseData.detail?.past_medical_history}
                        label="既往史信息"
                        type="textarea"
                        rows={4}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <User className="h-5 w-5 text-[#D94527]" />
                        家族史
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="family_history"
                        value={caseData.detail?.family_history}
                        label="家族史信息"
                        type="textarea"
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Examination Tab */}
                <TabsContent value="examination" className="mt-0 space-y-4">
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-[#D94527]" />
                        体格检查
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="physical_examination"
                        value={
                          typeof caseData.detail?.physical_examination === "string"
                            ? caseData.detail.physical_examination
                            : JSON.stringify(caseData.detail?.physical_examination || "", null, 2)
                        }
                        label="体格检查信息"
                        type="textarea"
                        rows={6}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <TestTube className="h-5 w-5 text-[#D94527]" />
                          实验室检查
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsLabResultModalOpen(true)}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            添加
                          </Button>
                          {caseData.lab_results && caseData.lab_results.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDeleteAllLabResults}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                              删除全部
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {caseData.lab_results && caseData.lab_results.length > 0 ? (
                        <div className="space-y-2">
                          {caseData.lab_results.map((lab, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                            >
                              <span className="text-gray-700 font-medium">{lab.test_name}</span>
                              <div className="text-right">
                                <span className={`font-semibold ${lab.is_abnormal ? "text-red-600" : "text-gray-900"}`}>
                                  {lab.test_value} {lab.test_unit}
                                </span>
                                {lab.abnormal_indicator && (
                                  <span className="ml-1 text-red-600">{lab.abnormal_indicator}</span>
                                )}
                                {lab.normal_range && (
                                  <div className="text-xs text-gray-500 mt-0.5">正常范围: {lab.normal_range}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <TestTube className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">暂无实验室检查信息</p>
                          <p className="text-xs mt-1">点击"添加"按钮添加检查结果</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#D94527]" />
                        影像学检查
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="imaging_results"
                        value={
                          typeof caseData.detail?.imaging_results === "string"
                            ? caseData.detail.imaging_results
                            : JSON.stringify(caseData.detail?.imaging_results || "", null, 2)
                        }
                        label="影像学检查信息"
                        type="textarea"
                        rows={6}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* Treatment Tab */}
                <TabsContent value="treatment" className="mt-0 space-y-4">
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-[#D94527]" />
                        治疗方案
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="treatment_plan"
                        value={caseData.detail?.treatment_plan}
                        label="治疗方案信息"
                        type="textarea"
                        rows={5}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Pill className="h-5 w-5 text-[#D94527]" />
                        用药方案
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="medications"
                        value={caseData.detail?.medications?.join("\n")}
                        label="用药方案信息"
                        type="textarea"
                        rows={6}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#D94527]" />
                        预后
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="prognosis"
                        value={caseData.detail?.prognosis}
                        label="预后信息"
                        type="textarea"
                        rows={4}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-[#D94527]" />
                        临床备注
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EditableField
                        field="clinical_notes"
                        value={caseData.detail?.clinical_notes}
                        label="临床备注"
                        type="textarea"
                        rows={4}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            {/* Right Column - Actions & Stats */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              {/* Actions Card */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">操作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleToggleFavorite}
                    disabled={favoriteLoading}
                    className={`w-full ${isFavorited ? "bg-yellow-500 hover:bg-yellow-600" : "bg-white"}`}
                    variant={isFavorited ? "default" : "outline"}
                  >
                    {favoriteLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {isFavorited ? "取消收藏中..." : "收藏中..."}
                      </>
                    ) : (
                      <>
                        <Star className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                        {isFavorited ? "已收藏" : "收藏"}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    分享
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    删除病例
                  </Button>
                </CardContent>
              </Card>
              {/* Stats Card */}
              <Card className="bg-orange-50 border-orange-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-orange-900">病例统计</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-700">浏览次数</span>
                    <span className="text-lg font-bold text-orange-900">{caseData.view_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-700">症状数量</span>
                    <span className="text-lg font-bold text-orange-900">{caseData.symptoms?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-700">检查项目</span>
                    <span className="text-lg font-bold text-orange-900">{caseData.lab_results?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
              {/* AI Analysis Card */}
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    AI辅助分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-purple-800 space-y-3">
                  <div>
                    <p className="font-semibold mb-2">诊断要点:</p>
                    <ul className="space-y-1 pl-4 list-disc text-purple-700">
                      <li>临床症状分析</li>
                      <li>实验室指标异常</li>
                      <li>影像学特征</li>
                    </ul>
                  </div>
                  <div className="pt-3 border-t border-purple-200">
                    <p className="text-xs text-purple-600 italic">AI 深度分析功能即将上线...</p>
                  </div>
                </CardContent>
              </Card>
              {/* Quick Actions */}
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">快捷操作</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                    应用到患者
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                    加入对比
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                    导出病例
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <Modal
        title="添加影像资料"
        open={isImageModalOpen}
        onCancel={() => setIsImageModalOpen(false)}
        footer={null}
      >
        <Form
          form={imageForm}
          onFinish={handleAddImage}
          layout="vertical"
        >
          <Form.Item
            name="image_url"
            label="影像URL"
            rules={[{ required: true, message: '请输入影像URL' }]}
          >
            <Input placeholder="请输入影像文件的URL地址" />
          </Form.Item>
          <Form.Item
            name="image_type"
            label="影像类型"
          >
            <Select placeholder="请选择影像类型">
              <Select.Option value="X光">X光</Select.Option>
              <Select.Option value="CT">CT</Select.Option>
              <Select.Option value="MRI">MRI</Select.Option>
              <Select.Option value="病理切片">病理切片</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="image_description"
            label="影像描述"
          >
            <TextArea rows={3} placeholder="请描述影像发现或特征" />
          </Form.Item>
          <Form.Item
            name="thumbnail_url"
            label="缩略图URL（可选）"
          >
            <Input placeholder="可选：缩略图URL" />
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setIsImageModalOpen(false)}>取消</Button>
            <Button type="submit" className="bg-[#D94527] text-white hover:bg-[#C93D1F]">
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Symptom Modal */}
      <Modal
        title="添加症状"
        open={isSymptomModalOpen}
        onCancel={() => setIsSymptomModalOpen(false)}
        footer={null}
      >
        <Form
          form={symptomForm}
          onFinish={handleAddSymptom}
          layout="vertical"
        >
          <Form.Item
            name="symptom_name"
            label="症状名称"
            rules={[{ required: true, message: '请输入症状名称' }]}
          >
            <Input placeholder="例如：关节疼痛、晨僵" />
          </Form.Item>
          <Form.Item
            name="symptom_description"
            label="症状描述"
          >
            <TextArea rows={3} placeholder="详细描述症状表现、持续时间等" />
          </Form.Item>
          <Form.Item
            name="is_key_symptom"
            label="是否为关键症状"
            valuePropName="checked"
          >
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-gray-600">标记为诊断关键症状</span>
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setIsSymptomModalOpen(false)}>取消</Button>
            <Button type="submit" className="bg-[#D94527] text-white hover:bg-[#C93D1F]">
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Lab Result Modal */}
      <Modal
        title="添加实验室检查"
        open={isLabResultModalOpen}
        onCancel={() => setIsLabResultModalOpen(false)}
        footer={null}
      >
        <Form
          form={labResultForm}
          onFinish={handleAddLabResult}
          layout="vertical"
        >
          <Form.Item
            name="test_name"
            label="检查项目"
            rules={[{ required: true, message: '请输入检查项目名称' }]}
          >
            <Input placeholder="例如：CRP、RF、ESR" />
          </Form.Item>
          <Form.Item
            name="test_full_name"
            label="检查项目全称"
          >
            <Input placeholder="例如：C反应蛋白" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="test_value"
              label="检查结果"
              rules={[{ required: true, message: '请输入检查结果' }]}
            >
              <Input placeholder="例如：8.5" />
            </Form.Item>
            <Form.Item
              name="test_unit"
              label="单位"
            >
              <Input placeholder="例如：mg/L" />
            </Form.Item>
          </div>
          <Form.Item
            name="normal_range"
            label="正常范围"
          >
            <Input placeholder="例如：0-10 mg/L" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="is_abnormal"
              label="是否异常"
              valuePropName="checked"
            >
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-600">标记为异常</span>
            </Form.Item>
            <Form.Item
              name="abnormal_indicator"
              label="异常指示"
            >
              <Select placeholder="选择">
                <Select.Option value="↑">↑ 偏高</Select.Option>
                <Select.Option value="↓">↓ 偏低</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setIsLabResultModalOpen(false)}>取消</Button>
            <Button type="submit" className="bg-[#D94527] text-white hover:bg-[#C93D1F]">
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
