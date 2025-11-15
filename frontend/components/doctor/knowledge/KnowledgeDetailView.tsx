"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { doctorKnowledgeService } from "@/services/doctorKnowledgeService";
import { message } from "antd";

interface KnowledgeDetailViewProps {
  knowledgeId: string; // This is actually the file path
  onBack: () => void;
}

export function KnowledgeDetailView({ knowledgeId, onBack }: KnowledgeDetailViewProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    loadFileContent();
  }, [knowledgeId]);

  const loadFileContent = async () => {
    try {
      setLoading(true);
      const fileContent = await doctorKnowledgeService.getFileContent(knowledgeId);
      setContent(fileContent.content);

      // Extract file name from path
      const parts = knowledgeId.split("/");
      const name = parts[parts.length - 1].replace(".md", "");
      setFileName(name);
    } catch (error) {
      message.error("Failed to load file content");
      console.error("Failed to load file:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#FAFAFA] border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回知识库
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{fileName || "加载中..."}</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="text-lg text-gray-600">加载中...</div>
              </div>
            </div>
          ) : (
            <Card className="bg-white border-gray-200 max-w-4xl mx-auto">
              <CardContent className="p-8">
                <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#D94527] prose-strong:text-gray-900 prose-code:text-[#D94527] prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </article>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
