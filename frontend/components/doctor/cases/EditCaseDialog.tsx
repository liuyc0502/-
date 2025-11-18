"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, InputNumber, Tabs, message } from "antd";
import { medicalCaseService, type MedicalCaseDetail } from "@/services/medicalCaseService";

const { TextArea } = Input;
const { TabPane } = Tabs;

interface EditCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  caseData: MedicalCaseDetail;
}

const diseaseTypes = [
  "类风湿",
  "红斑狼疮",
  "强直性脊柱炎",
  "痛风",
  "骨关节炎",
  "干燥综合征",
  "其他"
];

export function EditCaseDialog({ open, onClose, onSuccess, caseData }: EditCaseDialogProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // Initialize form with existing data when dialog opens
  useEffect(() => {
    if (open && caseData) {
      form.setFieldsValue({
        // Basic info
        case_no: caseData.case_no,
        diagnosis: caseData.diagnosis,
        disease_type: caseData.disease_type,
        age: caseData.age,
        gender: caseData.gender,
        chief_complaint: caseData.chief_complaint,
        category: caseData.category,
        is_classic: caseData.is_classic,

        // Detail info
        present_illness_history: caseData.detail?.present_illness_history,
        past_medical_history: caseData.detail?.past_medical_history,
        family_history: caseData.detail?.family_history,
        physical_examination: typeof caseData.detail?.physical_examination === 'string'
          ? caseData.detail.physical_examination
          : JSON.stringify(caseData.detail?.physical_examination || {}, null, 2),
        imaging_results: typeof caseData.detail?.imaging_results === 'string'
          ? caseData.detail.imaging_results
          : JSON.stringify(caseData.detail?.imaging_results || {}, null, 2),
        diagnosis_basis: caseData.detail?.diagnosis_basis,
        treatment_plan: caseData.detail?.treatment_plan,
        medications: caseData.detail?.medications?.join('\n'),
        prognosis: caseData.detail?.prognosis,
        clinical_notes: caseData.detail?.clinical_notes,
      });
    }
  }, [open, caseData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Update basic case info
      const basicData = {
        case_no: values.case_no,
        diagnosis: values.diagnosis,
        disease_type: values.disease_type,
        age: values.age,
        gender: values.gender,
        chief_complaint: values.chief_complaint,
        category: values.category,
        is_classic: values.is_classic,
      };

      await medicalCaseService.update(caseData.case_id, basicData);

      // Update case detail
      const detailData = {
        case_id: caseData.case_id,
        present_illness_history: values.present_illness_history,
        past_medical_history: values.past_medical_history,
        family_history: values.family_history,
        physical_examination: values.physical_examination,
        imaging_results: values.imaging_results,
        diagnosis_basis: values.diagnosis_basis,
        treatment_plan: values.treatment_plan,
        medications: values.medications ? values.medications.split('\n').filter((m: string) => m.trim()) : [],
        prognosis: values.prognosis,
        clinical_notes: values.clinical_notes,
      };

      await medicalCaseService.createDetail(detailData);

      message.success("病例更新成功！");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update case:", error);
      message.error("更新病例失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setActiveTab("basic");
    onClose();
  };

  return (
    <Modal
      title="编辑病例"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={900}
      okText="保存"
      cancelText="取消"
      style={{ top: 20 }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="mt-4">
        {/* Basic Information Tab */}
        <TabPane tab="基本信息" key="basic">
          <Form form={form} layout="vertical">
            <Form.Item name="case_no" label="病例编号">
              <Input placeholder="例如：#0234" disabled />
            </Form.Item>

            <Form.Item
              name="diagnosis"
              label="诊断"
              rules={[{ required: true, message: "请输入诊断" }]}
            >
              <Input placeholder="例如：类风湿关节炎" />
            </Form.Item>

            <Form.Item
              name="disease_type"
              label="疾病类型"
              rules={[{ required: true, message: "请选择疾病类型" }]}
            >
              <Select placeholder="请选择疾病类型">
                {diseaseTypes.map(type => (
                  <Select.Option key={type} value={type}>
                    {type}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="age"
                label="年龄"
                rules={[{ required: true, message: "请输入年龄" }]}
              >
                <InputNumber min={0} max={150} placeholder="58" className="w-full" />
              </Form.Item>

              <Form.Item
                name="gender"
                label="性别"
                rules={[{ required: true, message: "请选择性别" }]}
              >
                <Select placeholder="请选择性别">
                  <Select.Option value="男">男</Select.Option>
                  <Select.Option value="女">女</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="chief_complaint" label="主诉">
              <TextArea rows={3} placeholder="例如：双膝关节肿痛3个月，伴晨僵" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="category" label="病例类别">
                <Select placeholder="请选择病例类别">
                  <Select.Option value="classic">经典病例</Select.Option>
                  <Select.Option value="rare">罕见病例</Select.Option>
                  <Select.Option value="typical">典型病例</Select.Option>
                  <Select.Option value="complex">复杂病例</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="is_classic" label="标记为经典病例">
                <Select placeholder="是否标记为经典病例">
                  <Select.Option value={true}>是</Select.Option>
                  <Select.Option value={false}>否</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </Form>
        </TabPane>

        {/* Medical History Tab */}
        <TabPane tab="病史" key="history">
          <Form form={form} layout="vertical">
            <Form.Item name="present_illness_history" label="现病史">
              <TextArea
                rows={6}
                placeholder="详细描述患者本次发病的经过..."
              />
            </Form.Item>

            <Form.Item name="past_medical_history" label="既往史">
              <TextArea
                rows={4}
                placeholder="患者既往的疾病史、手术史、过敏史等..."
              />
            </Form.Item>

            <Form.Item name="family_history" label="家族史">
              <TextArea
                rows={3}
                placeholder="家族成员的健康状况和遗传性疾病..."
              />
            </Form.Item>
          </Form>
        </TabPane>

        {/* Examination Tab */}
        <TabPane tab="检查" key="examination">
          <Form form={form} layout="vertical">
            <Form.Item name="physical_examination" label="体格检查">
              <TextArea
                rows={6}
                placeholder="体格检查结果，可以是文本或JSON格式..."
              />
            </Form.Item>

            <Form.Item name="imaging_results" label="影像学检查">
              <TextArea
                rows={6}
                placeholder="X线、CT、MRI等影像学检查结果..."
              />
            </Form.Item>
          </Form>
        </TabPane>

        {/* Diagnosis & Treatment Tab */}
        <TabPane tab="诊疗方案" key="treatment">
          <Form form={form} layout="vertical">
            <Form.Item name="diagnosis_basis" label="诊断依据">
              <TextArea
                rows={4}
                placeholder="诊断依据和鉴别诊断..."
              />
            </Form.Item>

            <Form.Item name="treatment_plan" label="治疗方案">
              <TextArea
                rows={5}
                placeholder="详细的治疗方案，包括药物治疗、非药物治疗等..."
              />
            </Form.Item>

            <Form.Item
              name="medications"
              label="用药方案"
              tooltip="每行一个药物，例如：甲氨蝶呤 15mg 口服 每周一次"
            >
              <TextArea
                rows={6}
                placeholder="甲氨蝶呤 (Methotrexate) 15mg 口服，每周一次&#10;叶酸 5mg 口服，每日一次（避开甲氨蝶呤当天）&#10;塞来昔布 200mg 口服，每日两次"
              />
            </Form.Item>

            <Form.Item name="prognosis" label="预后">
              <TextArea
                rows={4}
                placeholder="治疗效果、随访情况、预后评估..."
              />
            </Form.Item>
          </Form>
        </TabPane>

        {/* Clinical Notes Tab */}
        <TabPane tab="临床备注" key="notes">
          <Form form={form} layout="vertical">
            <Form.Item name="clinical_notes" label="临床备注">
              <TextArea
                rows={12}
                placeholder="其他临床相关信息、特殊注意事项等..."
              />
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 提示：点击上方标签页可以编辑不同类别的信息。所有字段都是可选的，您可以根据需要填写。
        </p>
      </div>
    </Modal>
  );
}