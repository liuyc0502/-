"use client";

import { useState } from "react";
import { Modal, Button, Radio } from "antd";
import { FileImageOutlined, UserOutlined, FileTextOutlined } from "@ant-design/icons";
import type { UploadPurpose } from "@/types/annotation";

interface ImageUploadPurposeModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  onSelectPurpose: (purpose: UploadPurpose, imageUrl: string) => void;
}

export function ImageUploadPurposeModal({
  visible,
  imageUrl,
  onClose,
  onSelectPurpose,
}: ImageUploadPurposeModalProps) {
  const [selectedPurpose, setSelectedPurpose] = useState<UploadPurpose>("analysis");

  const handleConfirm = () => {
    onSelectPurpose(selectedPurpose, imageUrl);
    onClose();
  };

  return (
    <Modal
      title="选择图片用途"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确认
        </Button>,
      ]}
      width={500}
    >
      <div className="space-y-4 py-4">
        <Radio.Group
          value={selectedPurpose}
          onChange={(e) => setSelectedPurpose(e.target.value)}
          className="w-full"
        >
          <div className="space-y-3">
            <Radio value="analysis" className="w-full p-3 border rounded hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <FileImageOutlined className="text-2xl text-blue-500" />
                <div className="flex-1">
                  <div className="font-medium text-base">病例图片分析</div>
                  <div className="text-sm text-gray-500 mt-1">
                    进入标注模式，圈画区域并进行AI分析
                  </div>
                </div>
              </div>
            </Radio>

            <Radio value="patient_record" className="w-full p-3 border rounded hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <UserOutlined className="text-2xl text-green-500" />
                <div className="flex-1">
                  <div className="font-medium text-base">患者档案录入</div>
                  <div className="text-sm text-gray-500 mt-1">
                    OCR识别文档后自动填充患者表单
                  </div>
                </div>
              </div>
            </Radio>

            <Radio value="case_record" className="w-full p-3 border rounded hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <FileTextOutlined className="text-2xl text-orange-500" />
                <div className="flex-1">
                  <div className="font-medium text-base">病例库录入</div>
                  <div className="text-sm text-gray-500 mt-1">
                    OCR识别文档后自动填充病例表单
                  </div>
                </div>
              </div>
            </Radio>
          </div>
        </Radio.Group>

        {imageUrl && (
          <div className="mt-4 border rounded p-2 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">图片预览：</p>
            <img
              src={imageUrl}
              alt="Preview"
              className="max-h-48 mx-auto object-contain rounded"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
