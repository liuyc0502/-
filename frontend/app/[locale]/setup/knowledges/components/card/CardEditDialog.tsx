import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Tag, message } from "antd";
import { doctorKnowledgeService, CardCreateParams } from "@/services/doctorKnowledgeService";

const { TextArea } = Input;
const { Option } = Select;

interface CardEditDialogProps {
  visible: boolean;
  onClose: () => void;
  filePath: string;
  fileName: string;
  knowledgeId: number;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS = [
  "解剖学",
  "病理学",
  "诊断标准",
  "药物信息",
  "治疗方案",
  "其他"
];

export function CardEditDialog({
  visible,
  onClose,
  filePath,
  fileName,
  knowledgeId,
  onSuccess
}: CardEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [cardSummary, setCardSummary] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Load existing card data if available
  useEffect(() => {
    if (visible && filePath) {
      loadCardData();
    }
  }, [visible, filePath]);

  const loadCardData = async () => {
    try {
      const card = await doctorKnowledgeService.getCard(filePath);
      if (card) {
        setCardTitle(card.card_title || "");
        setCardSummary(card.card_summary || "");
        setCategory(card.category || "");
        setTags(card.tags || []);
      } else {
        // Initialize with file name as default title
        setCardTitle(fileName.replace(".md", ""));
        setCardSummary("");
        setCategory("");
        setTags([]);
      }
    } catch (error) {
      console.error("Failed to load card:", error);
      // Initialize with defaults on error
      setCardTitle(fileName.replace(".md", ""));
      setCardSummary("");
      setCategory("");
      setTags([]);
    }
  };

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!cardTitle.trim()) {
      message.error("请输入卡片标题");
      return;
    }

    try {
      setLoading(true);

      const cardData: CardCreateParams = {
        file_path: filePath,
        knowledge_id: knowledgeId,
        card_title: cardTitle.trim(),
        card_summary: cardSummary.trim(),
        category: category,
        tags: tags
      };

      await doctorKnowledgeService.saveCard(cardData);
      message.success("卡片保存成功");

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error("Failed to save card:", error);
      message.error("保存卡片失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      title="自定义知识卡片"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      <div className="space-y-4 py-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            卡片标题 <span className="text-red-500">*</span>
          </label>
          <Input
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            placeholder="输入卡片标题"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            卡片摘要
          </label>
          <TextArea
            value={cardSummary}
            onChange={(e) => setCardSummary(e.target.value)}
            placeholder="输入卡片摘要描述..."
            rows={4}
            maxLength={1000}
            showCount
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分类
          </label>
          <Select
            value={category}
            onChange={setCategory}
            placeholder="选择分类"
            style={{ width: "100%" }}
            allowClear
          >
            {CATEGORY_OPTIONS.map(cat => (
              <Option key={cat} value={cat}>{cat}</Option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            标签
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onPressEnter={handleAddTag}
              placeholder="输入标签后按回车添加"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Tag
                key={tag}
                closable
                onClose={() => handleRemoveTag(tag)}
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <p><strong>文件路径:</strong> {filePath}</p>
          <p className="mt-1">该卡片将在医生端知识库中展示</p>
        </div>
      </div>
    </Modal>
  );
}
