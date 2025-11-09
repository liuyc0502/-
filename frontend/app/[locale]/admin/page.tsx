"use client";

import { usePortalAuth } from "@/hooks/usePortalAuth";
import { ChatInterface } from "@/app/chat/internal/chatInterface";

export default function AdminPage() {
  const { isLoading } = usePortalAuth("admin");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  return <ChatInterface variant="admin" />;
}
