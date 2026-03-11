"use client";

import { useState, useEffect, useRef } from "react";
import type { ChatTemplate } from "@/services/chatTemplateService";

interface ChatCommandPickerProps {
  templates: ChatTemplate[];
  query: string;
  visible: boolean;
  accentColor?: string;
  onSelect: (template: ChatTemplate) => void;
  onClose: () => void;
}

export function ChatCommandPicker({
  templates,
  query,
  visible,
  accentColor = "#DA7756",
  onSelect,
  onClose,
}: ChatCommandPickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = templates.filter((t) => {
    const q = query.toLowerCase();
    return (
      t.slash_command.toLowerCase().includes(q) ||
      t.template_name.toLowerCase().includes(q)
    );
  });

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[activeIndex]) {
          onSelect(filtered[activeIndex]);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [visible, filtered, activeIndex, onSelect, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [visible, onClose]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#E8E2D6] rounded-lg shadow-lg z-50 overflow-hidden"
      style={{ maxHeight: 240 }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
        {filtered.map((tpl, idx) => (
          <div
            key={tpl.template_id}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-50"
            style={idx === activeIndex ? { backgroundColor: `${accentColor}1A` } : undefined}
            onMouseEnter={() => setActiveIndex(idx)}
            onMouseDown={(e) => {
              e.preventDefault(); // prevent textarea blur
              onSelect(tpl);
            }}
          >
            <span className="font-mono text-sm font-semibold" style={{ color: accentColor }}>
              /{tpl.slash_command}
            </span>
            <span className="text-sm text-gray-600">{tpl.template_name}</span>
            {(tpl.fields || []).length > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                {tpl.fields.length} 个参数
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
