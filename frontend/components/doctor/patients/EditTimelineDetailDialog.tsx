"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { App } from "antd";
import { Plus, X, Upload } from "lucide-react";
import patientService from "@/services/patientService";

interface EditTimelineDetailDialogProps {
  open: boolean;
  onClose: () => void;
  timelineId: number;
  onSuccess: () => void;
}

export function EditTimelineDetailDialog({
  open,
  onClose,
  timelineId,
  onSuccess,
}: EditTimelineDetailDialogProps) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    doctor_notes: "",
    pathology_findings: "",
    medications: [""],
  });

  const [images, setImages] = useState<
    Array<{ image_type: string; image_label: string; image_url: string; display_order: number }>
  >([]);

  const [metrics, setMetrics] = useState<
    Array<{
      metric_name: string;
      metric_full_name: string;
      metric_value: string;
      metric_unit: string;
      metric_trend: string;
      metric_status: string;
    }>
  >([]);

  const handleAddMedication = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, ""],
    });
  };

  const handleRemoveMedication = (index: number) => {
    const newMedications = formData.medications.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: newMedications });
  };

  const handleMedicationChange = (index: number, value: string) => {
    const newMedications = [...formData.medications];
    newMedications[index] = value;
    setFormData({ ...formData, medications: newMedications });
  };

  const handleAddImage = () => {
    setImages([
      ...images,
      { image_type: "病理切片", image_label: "", image_url: "", display_order: images.length },
    ]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageChange = (index: number, field: string, value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    setImages(newImages);
  };

  const handleAddMetric = () => {
    setMetrics([
      ...metrics,
      {
        metric_name: "",
        metric_full_name: "",
        metric_value: "",
        metric_unit: "",
        metric_trend: "normal",
        metric_status: "normal",
      },
    ]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const handleMetricChange = (index: number, field: string, value: string) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setMetrics(newMetrics);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Save timeline detail
      const cleanMedications = formData.medications.filter((m) => m.trim() !== "");
      await patientService.saveTimelineDetail({
        timeline_id: timelineId,
        doctor_notes: formData.doctor_notes,
        pathology_findings: formData.pathology_findings,
        medications: cleanMedications,
      });

      // Create images
      for (const img of images) {
        if (img.image_url && img.image_label) {
          await patientService.createMedicalImage({
            timeline_id: timelineId,
            image_type: img.image_type,
            image_label: img.image_label,
            image_url: img.image_url,
            display_order: img.display_order,
          });
        }
      }

      // Create metrics
      const validMetrics = metrics.filter((m) => m.metric_name && m.metric_value);
      if (validMetrics.length > 0) {
        await patientService.batchCreateMetrics({
          metrics: validMetrics.map((m) => ({
            timeline_id: timelineId,
            ...m,
          })),
        });
      }

      message.success("保存成功");
      onSuccess();
      handleClose();
    } catch (error) {
      message.error("保存失败，请重试");
      console.error("Failed to save timeline detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      doctor_notes: "",
      pathology_findings: "",
      medications: [""],
    });
    setImages([]);
    setMetrics([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑时间线详情</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Doctor Notes */}
          <div className="space-y-2">
            <Label htmlFor="doctor_notes">医生观察记录</Label>
            <Textarea
              id="doctor_notes"
              placeholder="请输入医生观察记录"
              value={formData.doctor_notes}
              onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
              rows={4}
            />
          </div>

          {/* Pathology Findings */}
          <div className="space-y-2">
            <Label htmlFor="pathology_findings">病理发现</Label>
            <Textarea
              id="pathology_findings"
              placeholder="请输入病理发现"
              value={formData.pathology_findings}
              onChange={(e) => setFormData({ ...formData, pathology_findings: e.target.value })}
              rows={4}
            />
          </div>

          {/* Medications */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>用药方案</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddMedication}>
                <Plus className="h-4 w-4 mr-1" />
                添加药物
              </Button>
            </div>
            <div className="space-y-2">
              {formData.medications.map((med, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="例如：甲氨蝶呤 10mg 每周一次"
                    value={med}
                    onChange={(e) => handleMedicationChange(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMedication(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>医学影像</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddImage}>
                <Upload className="h-4 w-4 mr-1" />
                添加影像
              </Button>
            </div>
            <div className="space-y-3">
              {images.map((img, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">影像类型</Label>
                          <Input
                            placeholder="病理切片"
                            value={img.image_type}
                            onChange={(e) => handleImageChange(index, "image_type", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">影像标签</Label>
                          <Input
                            placeholder="关节X光片"
                            value={img.image_label}
                            onChange={(e) => handleImageChange(index, "image_label", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label className="text-xs">影像URL</Label>
                          <Input
                            placeholder="https://example.com/image.jpg"
                            value={img.image_url}
                            onChange={(e) => handleImageChange(index, "image_url", e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>检查指标</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddMetric}>
                <Plus className="h-4 w-4 mr-1" />
                添加指标
              </Button>
            </div>
            <div className="space-y-3">
              {metrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">指标名称</Label>
                          <Input
                            placeholder="RF"
                            value={metric.metric_name}
                            onChange={(e) => handleMetricChange(index, "metric_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">全称</Label>
                          <Input
                            placeholder="类风湿因子"
                            value={metric.metric_full_name}
                            onChange={(e) => handleMetricChange(index, "metric_full_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">数值</Label>
                          <Input
                            placeholder="125"
                            value={metric.metric_value}
                            onChange={(e) => handleMetricChange(index, "metric_value", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">单位</Label>
                          <Input
                            placeholder="IU/mL"
                            value={metric.metric_unit}
                            onChange={(e) => handleMetricChange(index, "metric_unit", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">趋势</Label>
                          <Input
                            placeholder="up/down/normal/abnormal"
                            value={metric.metric_trend}
                            onChange={(e) => handleMetricChange(index, "metric_trend", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">状态</Label>
                          <Input
                            placeholder="error/warning/normal/improving"
                            value={metric.metric_status}
                            onChange={(e) => handleMetricChange(index, "metric_status", e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMetric(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" className="bg-[#D94527] hover:bg-[#C13D1F]" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
