"use client";

import { usePortalAuth } from "@/hooks/usePortalAuth";
import { ChatInterface } from "@/app/chat/internal/chatInterface";

export default function DoctorPage() {
  const { isLoading } = usePortalAuth("doctor");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAFA] text-[#6B6B6B]">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      <ChatInterface variant="doctor" />
    </div>
  );
}
