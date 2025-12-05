"use client";

import { useState, useEffect } from "react";
import { Card, Empty, Tag, Spin, App } from "antd";
import { MessageSquare, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { conversationService } from "@/services/conversationService";
import type { ConversationListItem } from "@/types/conversation";

interface AssociatedConversationsProps {
  patientId?: number | null;
  patientName?: string;
  timelineId?: number | null;
  maxHeight?: string;
  showTitle?: boolean;
  onConversationClick?: (conversationId: number) => void;
}


export function AssociatedConversations({
  patientId,
  patientName,
  timelineId,
  maxHeight = "400px",
  showTitle = true,
  onConversationClick,
}: AssociatedConversationsProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchConversations();
    }
  }, [patientId, timelineId]);

  const fetchConversations = async () => {
    if (!patientId) return;

    setLoading(true);
    try {
      // 获取所有医生门户的对话
      const data = await conversationService.getList("doctor");

      // 根据患者ID过滤 (未来可以加上时间线ID过滤)
      const filtered = data.filter((conv) => {
        const matchesPatient = conv.patient_id === patientId;
        // TODO: 当后端支持时添加时间线ID过滤
        // const matchesTimeline = !timelineId || conv.timeline_id === timelineId;
        return matchesPatient;
      });

      // 按更新时间倒序排列
      filtered.sort((a, b) => (b.update_time || b.create_time) - (a.update_time || a.create_time));

      setConversations(filtered);
    } catch (error) {
      console.error("Failed to fetch associated conversations:", error);
      message.error("加载关联对话失败");
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: number) => {
    // If parent provided a callback, use it; otherwise use default navigation
    if (onConversationClick) {
      onConversationClick(conversationId);
    } else {
      // Fallback: navigate to chat page with conversation ID
      router.push(`/doctor?conversation_id=${conversationId}`);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  const getStatusColor = (status?: string) => {
    const statusColors: Record<string, string> = {
      open: "blue",
      in_progress: "orange",
      resolved: "green",
      closed: "default",
    };
    return statusColors[status || "open"] || "default";
  };

  const getStatusText = (status?: string) => {
    const statusText: Record<string, string> = {
      open: "待处理",
      in_progress: "进行中",
      resolved: "已解决",
      closed: "已关闭",
    };
    return statusText[status || "open"] || "待处理";
  };

  if (!patientId) {
    return null;
  }

  return (
    <Card
      title={
        showTitle ? (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#D94527]" />
            <span>关联对话</span>
            {patientName && (
              <span className="text-sm text-gray-500 font-normal">
                - {patientName}
              </span>
            )}
            {conversations.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">
                (共{conversations.length}条)
              </span>
            )}
          </div>
        ) : undefined
      }
      className="w-full"
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{ maxHeight, overflowY: "auto" }}
        className="px-4 py-2"
      >
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Spin />
          </div>
        ) : conversations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-gray-400">
                暂无关联对话
                <br />
                <span className="text-xs">
                  在聊天界面关联患者后，对话将显示在此处
                </span>
              </span>
            }
            className="py-8"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.conversation_id}
                className="cursor-pointer hover:shadow-md transition-all p-3 rounded-lg border border-gray-200 bg-white hover:border-[#D94527] group"
                onClick={() => handleConversationClick(conversation.conversation_id)}
              >
                {/* 标题和状态 */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 font-medium text-sm text-gray-900 line-clamp-1 group-hover:text-[#D94527]">
                    {conversation.conversation_title || "未命名对话"}
                  </div>
                  {conversation.conversation_status && (
                    <Tag
                      color={getStatusColor(conversation.conversation_status)}
                      className="flex-shrink-0 text-xs"
                    >
                      {getStatusText(conversation.conversation_status)}
                    </Tag>
                  )}
                </div>

                {/* 摘要 */}
                {conversation.summary && (
                  <div className="text-xs text-gray-500 mb-2 line-clamp-2 min-h-[2.5rem]">
                    {conversation.summary}
                  </div>
                )}

                {/* 标签 */}
                {conversation.tags && conversation.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    {conversation.tags.slice(0, 2).map((tag, index) => (
                      <Tag key={index} className="text-xs m-0">
                        {tag}
                      </Tag>
                    ))}
                    {conversation.tags.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{conversation.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* 时间戳 */}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(conversation.update_time || conversation.create_time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
